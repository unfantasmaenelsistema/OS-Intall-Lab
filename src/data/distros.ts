import { FilesystemType, LinuxDistroId } from '../types/installer';

export type PackageFamily = 'deb' | 'rpm' | 'pacman' | 'apk';
export type NetworkStack = 'ifupdown' | 'netplan' | 'networkmanager' | 'systemd-networkd';
export type InitramfsTool = 'initramfs-tools' | 'dracut' | 'mkinitcpio' | 'mkinitfs';

export interface DistroDefinition {
  id: LinuxDistroId;
  name: string;
  version: string;
  /** Contenido de PRETTY_NAME en /etc/os-release. */
  prettyName: string;
  family: PackageFamily;
  packageManager: 'apt' | 'dnf' | 'pacman' | 'apk';
  releaseModel: string;
  description: string;
  highlights: string[];
  init: 'systemd' | 'openrc';
  /** Versión de systemd empaquetada (si la distribución lo usa). */
  systemdVersion?: string;
  libc: 'glibc' | 'musl';
  initramfs: InitramfsTool;
  network: NetworkStack;
  /** Módulo de seguridad (LSM) activo por defecto y parámetros de kernel para activarlo o desactivarlo. */
  lsm: { name: 'SELinux' | 'AppArmor'; enforceParams: string; disableParams: string } | null;
  defaultRootFs: FilesystemType;
  supportsBtrfsRoot: boolean;
  grub: {
    /** Binario de instalación (grub2-install en la familia RHEL, grub-install en el resto). */
    install: 'grub2-install' | 'grub-install';
    /** Comando para regenerar grub.cfg. */
    mkconfig: string;
    /** Directorio dentro de la ESP (\EFI\<efiId>\). */
    efiId: string;
    /** Nombre que aparece en el menú de GRUB y en la entrada NVRAM. */
    menuName: string;
  };
  kernel: {
    release: string;
    vmlinuz: string;
    initrd: string;
  };
  mirrorUrl: string;
  /** Grupo con privilegios de administración (sudo/doas). */
  adminGroup: 'wheel' | 'sudo';
  defaultShell: string;
  /** El cargador viene firmado (shim) y arranca con Secure Boot sin pasos extra. */
  secureBootReady: boolean;
  /** systemd-boot está empaquetado y soportado en la distribución. */
  systemdBootPackaged: boolean;
}

export const DISTROS: Record<LinuxDistroId, DistroDefinition> = {
  debian: {
    id: 'debian',
    name: 'Debian',
    version: '12 Bookworm',
    prettyName: 'Debian GNU/Linux 12 (bookworm)',
    family: 'deb',
    packageManager: 'apt',
    releaseModel: 'Estable (~2 años + LTS)',
    description: 'La distribución "universal": estabilidad conservadora, FHS clásico y base de Ubuntu y muchas otras.',
    highlights: [
      'Instalación base con debootstrap',
      'initramfs-tools + cryptsetup-initramfs (lee /etc/crypttab)',
      'Red con ifupdown (/etc/network/interfaces)',
      'AppArmor activo por defecto'
    ],
    init: 'systemd',
    systemdVersion: '252',
    libc: 'glibc',
    initramfs: 'initramfs-tools',
    network: 'ifupdown',
    lsm: { name: 'AppArmor', enforceParams: 'apparmor=1 security=apparmor', disableParams: 'apparmor=0' },
    defaultRootFs: 'ext4',
    supportsBtrfsRoot: true,
    grub: { install: 'grub-install', mkconfig: 'update-grub', efiId: 'debian', menuName: 'Debian GNU/Linux' },
    kernel: { release: '6.1.0-25-amd64', vmlinuz: 'vmlinuz-6.1.0-25-amd64', initrd: 'initrd.img-6.1.0-25-amd64' },
    mirrorUrl: 'http://deb.debian.org/debian',
    adminGroup: 'sudo',
    defaultShell: '/bin/bash',
    secureBootReady: true,
    systemdBootPackaged: true
  },
  ubuntu: {
    id: 'ubuntu',
    name: 'Ubuntu Server',
    version: '24.04 LTS Noble Numbat',
    prettyName: 'Ubuntu 24.04.1 LTS',
    family: 'deb',
    packageManager: 'apt',
    releaseModel: 'LTS (5 años, 10 con Ubuntu Pro)',
    description: 'Derivada de Debian orientada a nube y servidor, con kernels más recientes y Netplan para la red.',
    highlights: [
      'Instalación base con debootstrap (instalador oficial: Subiquity)',
      'initramfs-tools, igual que Debian',
      'Red declarativa con Netplan (renderer networkd)',
      'AppArmor activo y shim firmado para Secure Boot'
    ],
    init: 'systemd',
    systemdVersion: '255',
    libc: 'glibc',
    initramfs: 'initramfs-tools',
    network: 'netplan',
    lsm: { name: 'AppArmor', enforceParams: 'apparmor=1 security=apparmor', disableParams: 'apparmor=0' },
    defaultRootFs: 'ext4',
    supportsBtrfsRoot: true,
    grub: { install: 'grub-install', mkconfig: 'update-grub', efiId: 'ubuntu', menuName: 'Ubuntu' },
    kernel: { release: '6.8.0-45-generic', vmlinuz: 'vmlinuz-6.8.0-45-generic', initrd: 'initrd.img-6.8.0-45-generic' },
    mirrorUrl: 'http://archive.ubuntu.com/ubuntu',
    adminGroup: 'sudo',
    defaultShell: '/bin/bash',
    secureBootReady: true,
    systemdBootPackaged: true
  },
  fedora: {
    id: 'fedora',
    name: 'Fedora Server',
    version: '40',
    prettyName: 'Fedora Linux 40 (Server Edition)',
    family: 'rpm',
    packageManager: 'dnf',
    releaseModel: 'Semestral (~13 meses de soporte)',
    description: 'Laboratorio upstream de Red Hat: últimas versiones de kernel y systemd, Btrfs por defecto en escritorio.',
    highlights: [
      'Instalación con dnf --installroot',
      'dracut + entradas BLS gestionadas con grubby',
      'Btrfs con compresión zstd como sistema por defecto',
      'SELinux en modo enforcing'
    ],
    init: 'systemd',
    systemdVersion: '255',
    libc: 'glibc',
    initramfs: 'dracut',
    network: 'networkmanager',
    lsm: { name: 'SELinux', enforceParams: 'selinux=1 enforcing=1', disableParams: 'selinux=0' },
    defaultRootFs: 'btrfs',
    supportsBtrfsRoot: true,
    grub: { install: 'grub2-install', mkconfig: 'grub2-mkconfig -o /boot/grub2/grub.cfg', efiId: 'fedora', menuName: 'Fedora Linux' },
    kernel: { release: '6.10.12-200.fc40.x86_64', vmlinuz: 'vmlinuz-6.10.12-200.fc40.x86_64', initrd: 'initramfs-6.10.12-200.fc40.x86_64.img' },
    mirrorUrl: 'https://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os',
    adminGroup: 'wheel',
    defaultShell: '/bin/bash',
    secureBootReady: true,
    systemdBootPackaged: true
  },
  rocky: {
    id: 'rocky',
    name: 'Rocky Linux',
    version: '9.4 Blue Onyx',
    prettyName: 'Rocky Linux 9.4 (Blue Onyx)',
    family: 'rpm',
    packageManager: 'dnf',
    releaseModel: 'Empresarial (10 años, compatible RHEL)',
    description: 'Reconstrucción binaria de Red Hat Enterprise Linux: el estándar en servidores corporativos.',
    highlights: [
      'Instalación con dnf --installroot',
      'dracut + BLS + grubby, XFS como sistema por defecto',
      'Kernel 5.14 con backports (sin soporte Btrfs)',
      'SELinux en modo enforcing'
    ],
    init: 'systemd',
    systemdVersion: '252',
    libc: 'glibc',
    initramfs: 'dracut',
    network: 'networkmanager',
    lsm: { name: 'SELinux', enforceParams: 'selinux=1 enforcing=1', disableParams: 'selinux=0' },
    defaultRootFs: 'xfs',
    supportsBtrfsRoot: false,
    grub: { install: 'grub2-install', mkconfig: 'grub2-mkconfig -o /boot/grub2/grub.cfg', efiId: 'rocky', menuName: 'Rocky Linux' },
    kernel: { release: '5.14.0-427.13.1.el9_4.x86_64', vmlinuz: 'vmlinuz-5.14.0-427.13.1.el9_4.x86_64', initrd: 'initramfs-5.14.0-427.13.1.el9_4.x86_64.img' },
    mirrorUrl: 'https://dl.rockylinux.org/pub/rocky/9/BaseOS/x86_64/os',
    adminGroup: 'wheel',
    defaultShell: '/bin/bash',
    secureBootReady: true,
    systemdBootPackaged: false
  },
  arch: {
    id: 'arch',
    name: 'Arch Linux',
    version: 'Rolling',
    prettyName: 'Arch Linux',
    family: 'pacman',
    packageManager: 'pacman',
    releaseModel: 'Rolling release (sin versiones)',
    description: 'Minimalista y manual ("The Arch Way"): tú decides cada pieza; siempre en la última versión.',
    highlights: [
      'Instalación con pacstrap y genfstab',
      'mkinitcpio con HOOKS explícitos (encrypt, lvm2, resume)',
      'Red con systemd-networkd + systemd-resolved',
      'Sin LSM ni shim firmado por defecto'
    ],
    init: 'systemd',
    systemdVersion: '256',
    libc: 'glibc',
    initramfs: 'mkinitcpio',
    network: 'systemd-networkd',
    lsm: null,
    defaultRootFs: 'ext4',
    supportsBtrfsRoot: true,
    grub: { install: 'grub-install', mkconfig: 'grub-mkconfig -o /boot/grub/grub.cfg', efiId: 'GRUB', menuName: 'Arch Linux' },
    kernel: { release: '6.11.2-arch1-1', vmlinuz: 'vmlinuz-linux', initrd: 'initramfs-linux.img' },
    mirrorUrl: 'https://geo.mirror.pkgbuild.com',
    adminGroup: 'wheel',
    defaultShell: '/bin/bash',
    secureBootReady: false,
    systemdBootPackaged: true
  },
  alpine: {
    id: 'alpine',
    name: 'Alpine Linux',
    version: '3.20',
    prettyName: 'Alpine Linux v3.20',
    family: 'apk',
    packageManager: 'apk',
    releaseModel: 'Semestral (2 años por rama)',
    description: 'Ultraligera y orientada a seguridad: musl libc, BusyBox y OpenRC en lugar de systemd.',
    highlights: [
      'Instalación con apk --root (setup-disk en el instalador oficial)',
      'mkinitfs con features (cryptsetup, lvm) y parámetro cryptroot=',
      'Red con ifupdown-ng y servicios OpenRC (rc-update)',
      'musl libc: binarios glibc precompilados no funcionan'
    ],
    init: 'openrc',
    libc: 'musl',
    initramfs: 'mkinitfs',
    network: 'ifupdown',
    lsm: null,
    defaultRootFs: 'ext4',
    supportsBtrfsRoot: true,
    grub: { install: 'grub-install', mkconfig: 'grub-mkconfig -o /boot/grub/grub.cfg', efiId: 'alpine', menuName: 'Alpine Linux' },
    kernel: { release: '6.6.54-0-lts', vmlinuz: 'vmlinuz-lts', initrd: 'initramfs-lts' },
    mirrorUrl: 'https://dl-cdn.alpinelinux.org/alpine/v3.20/main',
    adminGroup: 'wheel',
    defaultShell: '/bin/ash',
    secureBootReady: false,
    systemdBootPackaged: false
  }
};

export const DISTRO_ORDER: LinuxDistroId[] = ['debian', 'ubuntu', 'fedora', 'rocky', 'arch', 'alpine'];

export const DEFAULT_DISTRO: LinuxDistroId = 'rocky';

export function getDistro(id: LinuxDistroId | undefined): DistroDefinition {
  return DISTROS[id ?? DEFAULT_DISTRO];
}

/** Nombre corto para cabeceras: "Debian 12 Bookworm", "Arch Linux (rolling)". */
export function distroLabel(d: DistroDefinition): string {
  return d.version === 'Rolling' ? `${d.name} (rolling)` : `${d.name} ${d.version}`;
}

/** Nombre de la pila de red tal como se muestra al usuario. */
export function networkStackLabel(d: DistroDefinition): string {
  switch (d.network) {
    case 'ifupdown': return d.family === 'apk' ? 'ifupdown-ng' : 'ifupdown';
    case 'netplan': return 'Netplan';
    case 'networkmanager': return 'NetworkManager';
    case 'systemd-networkd': return 'systemd-networkd';
  }
}
