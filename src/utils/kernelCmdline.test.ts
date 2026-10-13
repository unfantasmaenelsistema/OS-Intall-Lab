import { describe, expect, it } from 'vitest';
import { buildKernelCmdline, procCmdline } from './kernelCmdline';
import { stateFromPreset } from './testFixtures';
import { BootloaderConfig, LinuxDistroId } from '../types/installer';

const BL: BootloaderConfig = {
  type: 'grub2', timeoutSec: 5, quietSplash: true, noModeSet: false,
  selinuxEnforcing: true, auditLogging: true, customParameters: 'console=ttyS0', installTargetESP: '/boot/efi'
};

const cmdline = (distroId: LinuxDistroId) =>
  buildKernelCmdline(stateFromPreset('linux_enterprise_luks_lvm', { distroId, bootloader: BL }), 'UUID-X');

describe('buildKernelCmdline', () => {
  it('cada initramfs recibe su propio parámetro de desbloqueo', () => {
    expect(cmdline('rocky')).toContain('rd.luks.uuid=UUID-X');
    expect(cmdline('arch')).toContain('cryptdevice=UUID=UUID-X:cryptroot');
    expect(cmdline('alpine')).toContain('cryptroot=UUID=UUID-X cryptdm=cryptroot');
    expect(cmdline('debian')).not.toMatch(/UUID-X/); // usa /etc/crypttab
  });

  it('el LSM y el modo silencioso dependen de la distribución', () => {
    expect(cmdline('fedora')).toContain('selinux=1 enforcing=1');
    expect(cmdline('fedora')).toContain('rhgb quiet');
    expect(cmdline('ubuntu')).toContain('apparmor=1 security=apparmor');
    expect(cmdline('ubuntu')).toContain('quiet splash');
    expect(cmdline('arch')).not.toMatch(/selinux|apparmor/);
  });

  it('mantiene root, auditoría y parámetros personalizados', () => {
    const line = cmdline('debian');
    expect(line.startsWith('root=/dev/mapper/vg_system-lv_root ro')).toBe(true);
    expect(line).toContain('audit=1');
    expect(line.endsWith('console=ttyS0')).toBe(true);
  });

  it('/proc/cmdline incluye el BOOT_IMAGE de la distribución', () => {
    const state = stateFromPreset('linux_simple', { distroId: 'arch', bootloader: BL });
    expect(procCmdline(state).startsWith('BOOT_IMAGE=/vmlinuz-linux ')).toBe(true);
  });
});
