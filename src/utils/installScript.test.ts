import { describe, expect, it } from 'vitest';
import { generateLinuxScript, generateWindowsScript, keyInstallCommands } from './installScript';
import { stateFromPreset } from './testFixtures';
import { DISTRO_ORDER } from '../data/distros';
import { BootloaderConfig, LinuxDistroId } from '../types/installer';

const GRUB: BootloaderConfig = {
  type: 'grub2', timeoutSec: 5, quietSplash: true, noModeSet: false,
  selinuxEnforcing: true, auditLogging: false, customParameters: '', installTargetESP: '/boot/efi'
};

const luksLvm = (distroId: LinuxDistroId) =>
  stateFromPreset('linux_enterprise_luks_lvm', { distroId, bootloader: GRUB });

describe('generateLinuxScript (común a todas las distribuciones)', () => {
  it('genera mkpart con los tamaños reales y sin particiones para los LV', () => {
    const state = luksLvm('rocky');
    const script = generateLinuxScript(state);
    const mkparts = script.split('\n').filter(l => l.includes(' mkpart '));
    const physicalCount = state.disk.partitions.filter(p => !p.isLvmLV).length + 1; // + PV
    expect(mkparts).toHaveLength(physicalCount);
    expect(script).toContain('mkpart "boot-efi" fat32 1MiB 513MiB');
    expect(script).not.toMatch(/mkpart "lv_/);
  });

  it('cifra el PV, no una partición fija p3', () => {
    const state = luksLvm('debian');
    const script = generateLinuxScript(state);
    const pvNumber = state.disk.partitions.filter(p => !p.isLvmLV).length + 1;
    expect(script).toContain(`cryptsetup open /dev/nvme0n1p${pvNumber} cryptroot`);
    expect(script).toContain('pvcreate /dev/mapper/cryptroot');
  });

  it('usa Argon2id con /boot separado y PBKDF2 cuando /boot va dentro de LUKS', () => {
    expect(generateLinuxScript(luksLvm('arch'))).toContain('--pbkdf argon2id');

    const noBoot = generateLinuxScript(stateFromPreset('linux_simple', { useWholeDiskEncryption: true, bootloader: GRUB }));
    expect(noBoot).toContain('--pbkdf pbkdf2');
    expect(noBoot).toContain('GRUB_ENABLE_CRYPTODISK=y');
  });

  it.each(DISTRO_ORDER)('%s: monta antes de instalar y no mezcla herramientas de otras familias', id => {
    const script = generateLinuxScript(luksLvm(id));
    const mountRoot = script.indexOf('mount /dev/mapper/vg_system-lv_root /mnt');
    const { baseInstall } = keyInstallCommands(luksLvm(id));
    expect(mountRoot).toBeGreaterThan(-1);
    expect(mountRoot).toBeLessThan(script.indexOf(baseInstall));
    if (id !== 'fedora' && id !== 'rocky') expect(script).not.toMatch(/\bdnf\b|grub2-|dracut/);
    if (id !== 'debian' && id !== 'ubuntu') expect(script).not.toMatch(/apt-get|debootstrap|update-initramfs/);
  });
});

describe('generateLinuxScript por distribución', () => {
  it('Debian: debootstrap, crypttab + update-initramfs, grub-install/update-grub e ifupdown', () => {
    const base = luksLvm('debian');
    const script = generateLinuxScript({
      ...base,
      userConfig: { ...base.userConfig, createAdminUser: true, adminUsername: 'sysadmin', adminHasSudo: true }
    });
    expect(script).toContain('debootstrap --arch amd64 bookworm /mnt http://deb.debian.org/debian');
    expect(script).toContain('apt-get install -y linux-image-amd64');
    expect(script).toContain('cryptsetup-initramfs');
    expect(script).toContain('> /mnt/etc/crypttab');
    expect(script).toContain('update-initramfs -u -k all');
    expect(script).toContain('chroot /mnt grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=debian');
    expect(script).toContain('chroot /mnt update-grub');
    expect(script).toContain('/mnt/etc/network/interfaces');
    expect(script).toContain('apparmor=1');
    expect(script).not.toContain('rd.luks.uuid');
    expect(script).toContain('useradd -m -s /bin/bash -G sudo');
  });

  it('Ubuntu: suite noble, kernel generic, GRUB firmado y Netplan', () => {
    const script = generateLinuxScript(luksLvm('ubuntu'));
    expect(script).toContain('debootstrap --arch amd64 noble /mnt');
    expect(script).toContain('linux-image-generic');
    expect(script).toContain('grub-efi-amd64-signed shim-signed');
    expect(script).toContain('/mnt/etc/netplan/01-netcfg.yaml');
  });

  it('Rocky: dnf --installroot, dracut con rd.luks/rd.lvm, shim vía efibootmgr, grubby y autorelabel', () => {
    const script = generateLinuxScript(luksLvm('rocky'));
    expect(script).toContain('dnf --installroot=/mnt --releasever=9');
    expect(script).not.toContain('--use-host-config'); // opción solo de dnf5
    expect(script).toContain('chroot /mnt dracut --regenerate-all --force');
    expect(script).toMatch(/rd\.luks\.uuid=\$\(blkid -s UUID -o value \/dev\/nvme0n1p3\)/);
    expect(script).toContain('rd.lvm.lv=vg_system/lv_root');
    expect(script).toContain("efibootmgr --create --disk /dev/nvme0n1 --part 1 --loader '\\EFI\\rocky\\shimx64.efi'");
    expect(script).not.toMatch(/^chroot \/mnt grub2-install/m);
    expect(script).toContain('chroot /mnt grubby --update-kernel=ALL');
    expect(script).toContain('touch /mnt/.autorelabel');
    expect(script).toContain('NetworkManager/system-connections');
  });

  it('Fedora: releasever 40', () => {
    expect(generateLinuxScript(luksLvm('fedora'))).toContain('--releasever=40');
  });

  it('Arch: pacstrap, genfstab, HOOKS con encrypt antes de lvm2, cryptdevice= y systemd-networkd', () => {
    const script = generateLinuxScript(luksLvm('arch'));
    expect(script).toContain('pacstrap -K /mnt base linux linux-firmware');
    expect(script).toContain('genfstab -U /mnt >> /mnt/etc/fstab');
    expect(script).toMatch(/HOOKS=\(base udev .* block encrypt lvm2 resume filesystems fsck\)/);
    expect(script).toContain('arch-chroot /mnt mkinitcpio -P');
    expect(script).toContain('cryptdevice=UUID=');
    expect(script).toContain('arch-chroot /mnt grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=GRUB');
    expect(script).toContain('grub-mkconfig -o /boot/grub/grub.cfg');
    expect(script).toContain('/mnt/etc/systemd/network/');
    expect(script).toContain('systemctl enable systemd-networkd systemd-resolved');
    expect(script).not.toContain('/mnt/etc/crypttab');
  });

  it('Alpine: apk --root, mkinitfs con features, cryptroot= y servicios OpenRC', () => {
    const script = generateLinuxScript(luksLvm('alpine'));
    expect(script).toContain('apk --root /mnt --initdb');
    expect(script).toContain('alpine-base linux-lts mkinitfs');
    expect(script).toMatch(/features=".* cryptsetup lvm"/);
    expect(script).toContain('chroot /mnt mkinitfs 6.6.54-0-lts');
    expect(script).toContain('cryptroot=UUID=');
    expect(script).toContain('cryptdm=cryptroot');
    expect(script).not.toContain('resume=');
    expect(script).toContain('rc-update add networking boot');
    expect(script).toContain('rc-update add lvm boot');
    expect(script).not.toContain('systemctl');
  });

  it('BIOS: GRUB se instala en el disco con el binario de cada familia', () => {
    const bios = (id: LinuxDistroId) => {
      const s = luksLvm(id);
      return generateLinuxScript({ ...s, hardware: { ...s.hardware, firmware: 'bios' } });
    };
    expect(bios('rocky')).toContain('chroot /mnt grub2-install --target=i386-pc /dev/nvme0n1');
    expect(bios('debian')).toContain('chroot /mnt grub-install --target=i386-pc /dev/nvme0n1');
    expect(bios('debian')).toContain('grub-pc');
  });

  it('systemd-boot usa el kernel y el initramfs con los nombres de la distribución', () => {
    const state = { ...luksLvm('arch'), bootloader: { ...GRUB, type: 'systemd_boot' as const } };
    const script = generateLinuxScript(state);
    expect(script).toContain('bootctl install --esp-path=/boot/efi');
    expect(script).toContain('linux   /vmlinuz-linux');
    expect(script).toContain('initrd  /initramfs-linux.img');
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
