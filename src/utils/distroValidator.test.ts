import { describe, expect, it } from 'vitest';
import { validateDistroChoices } from './distroValidator';
import { HARDWARE, stateFromPreset } from './testFixtures';
import { BootloaderConfig, InstallerState, LinuxDistroId } from '../types/installer';

const GRUB: BootloaderConfig = {
  type: 'grub2', timeoutSec: 5, quietSplash: true, noModeSet: false,
  selinuxEnforcing: true, auditLogging: false, customParameters: '', installTargetESP: '/boot/efi'
};

const ids = (s: InstallerState) => validateDistroChoices(s).map(i => i.id);
const state = (distroId: LinuxDistroId, overrides: Partial<InstallerState> = {}) =>
  stateFromPreset('linux_simple', { distroId, bootloader: GRUB, ...overrides });

describe('validateDistroChoices', () => {
  it('no se aplica a Windows', () => {
    expect(validateDistroChoices(stateFromPreset('windows_server_standard'))).toEqual([]);
  });

  it('Rocky no puede arrancar desde Btrfs; Fedora sí', () => {
    expect(ids(stateFromPreset('linux_btrfs_snapshots', { distroId: 'rocky', bootloader: GRUB }))).toContain('distro-btrfs-unsupported');
    expect(ids(stateFromPreset('linux_btrfs_snapshots', { distroId: 'fedora', bootloader: GRUB }))).not.toContain('distro-btrfs-unsupported');
  });

  it('Fedora sin Btrfs genera un aviso informativo', () => {
    const issue = validateDistroChoices(state('fedora')).find(i => i.id === 'distro-fedora-not-btrfs');
    expect(issue?.type).toBe('info');
  });

  it('Secure Boot con GRUB sin firmar (Arch, Alpine) es un error; con shim no', () => {
    expect(ids(state('arch'))).toContain('distro-secureboot-unsigned');
    expect(ids(state('alpine'))).toContain('distro-secureboot-unsigned');
    expect(ids(state('debian'))).not.toContain('distro-secureboot-unsigned');
    const noSb = state('arch', { hardware: { ...HARDWARE, secureBoot: false } });
    expect(ids(noSb)).not.toContain('distro-secureboot-unsigned');
  });

  it('systemd-boot: no empaquetado en Rocky, solo UEFI y sin firmar', () => {
    const sdBoot = { ...GRUB, type: 'systemd_boot' as const };
    expect(ids(state('rocky', { bootloader: sdBoot }))).toContain('distro-systemd-boot-unavailable');
    expect(ids(state('debian', { bootloader: sdBoot }))).not.toContain('distro-systemd-boot-unavailable');
    expect(ids(state('debian', { bootloader: sdBoot }))).toContain('distro-systemd-boot-secureboot');
    const bios = state('arch', { bootloader: sdBoot, hardware: { ...HARDWARE, firmware: 'bios', secureBoot: false } });
    expect(ids(bios)).toContain('distro-systemd-boot-bios');
  });

  it('Alpine avisa en perfiles que dependen de glibc', () => {
    expect(ids(state('alpine', { selectedProfileId: 'workstation_dev' }))).toContain('distro-musl-desktop');
    expect(ids(state('alpine', { selectedProfileId: 'server_minimal' }))).not.toContain('distro-musl-desktop');
  });

  it('Arch avisa del modelo rolling en perfiles de servidor', () => {
    expect(ids(state('arch', { selectedProfileId: 'server_minimal' }))).toContain('distro-arch-server');
    expect(ids(state('arch', { selectedProfileId: 'workstation_dev' }))).not.toContain('distro-arch-server');
  });
});
