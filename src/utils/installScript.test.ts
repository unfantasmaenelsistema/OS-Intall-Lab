import { describe, expect, it } from 'vitest';
import { generateLinuxScript, generateWindowsScript } from './installScript';
import { stateFromPreset } from './testFixtures';

describe('generateLinuxScript', () => {
  it('genera mkpart con los tamaños reales y sin particiones para los LV', () => {
    const state = stateFromPreset('linux_enterprise_luks_lvm');
    const script = generateLinuxScript(state);
    const mkparts = script.split('\n').filter(l => l.includes(' mkpart '));
    const physicalCount = state.disk.partitions.filter(p => !p.isLvmLV).length + 1; // + PV
    expect(mkparts).toHaveLength(physicalCount);
    expect(script).toContain('mkpart "boot-efi" fat32 1MiB 513MiB');
    expect(script).not.toMatch(/mkpart "lv_/);
  });

  it('cifra el PV, no una partición fija p3', () => {
    const state = stateFromPreset('linux_enterprise_luks_lvm');
    const script = generateLinuxScript(state);
    const pvNumber = state.disk.partitions.filter(p => !p.isLvmLV).length + 1;
    expect(script).toContain(`cryptsetup open /dev/nvme0n1p${pvNumber} cryptroot`);
    expect(script).toContain('pvcreate /dev/mapper/cryptroot');
  });

  it('usa Argon2id con /boot separado y PBKDF2 cuando /boot va dentro de LUKS', () => {
    const withBoot = generateLinuxScript(stateFromPreset('linux_enterprise_luks_lvm'));
    expect(withBoot).toContain('--pbkdf argon2id');

    const noBoot = generateLinuxScript(stateFromPreset('linux_simple', { useWholeDiskEncryption: true }));
    expect(noBoot).toContain('--pbkdf pbkdf2');
    expect(noBoot).toContain('GRUB_ENABLE_CRYPTODISK=y');
  });

  it('monta la jerarquía antes de instalar y ejecuta dracut/GRUB dentro del chroot', () => {
    const script = generateLinuxScript(stateFromPreset('linux_simple'));
    const mountRoot = script.indexOf('mount /dev/nvme0n1p');
    const install = script.indexOf('dnf --installroot=/mnt');
    expect(mountRoot).toBeGreaterThan(-1);
    expect(mountRoot).toBeLessThan(install);
    expect(script).toContain('chroot /mnt dracut');
    expect(script).toContain('chroot /mnt grub2-install --target=x86_64-efi --efi-directory=/boot/efi');
    expect(script).not.toContain('netplan');
  });

  it('instala GRUB en el MBR del disco con firmware BIOS', () => {
    const state = stateFromPreset('linux_simple');
    const script = generateLinuxScript({ ...state, hardware: { ...state.hardware, firmware: 'bios' } });
    expect(script).toContain('grub2-install --target=i386-pc /dev/nvme0n1');
  });
});

describe('generateWindowsScript', () => {
  it('asigna S: a la ESP y no aplica la imagen desde un volumen recién formateado', () => {
    const script = generateWindowsScript(stateFromPreset('windows_server_standard'));
    expect(script).toMatch(/create partition efi[^\n]*\nformat quick fs=fat32 label="System"\nassign letter=S/);
    expect(script).toContain('create partition msr');
    expect(script).toContain('bcdboot C:\\Windows /s S: /f UEFI');
    expect(script).not.toContain('/ImageFile:D:');
    expect(script).not.toContain('/ImageFile:S:');
  });
});
