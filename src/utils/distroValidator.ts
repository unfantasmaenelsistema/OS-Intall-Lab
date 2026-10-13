import { InstallerState, ValidationIssue } from '../types/installer';
import { getDistro } from '../data/distros';

const GLIBC_PROFILES = ['workstation_dev', 'server_gui'];
const SERVER_PROFILES = ['server_minimal', 'virtualization_host'];

/**
 * Reglas que dependen de la distribución elegida (y del cargador y el firmware),
 * complementarias a las de validatePartitionScheme.
 */
export function validateDistroChoices(state: InstallerState): ValidationIssue[] {
  if (state.osType !== 'linux') return [];
  const distro = getDistro(state.distroId);
  const issues: ValidationIssue[] = [];
  const root = state.disk.partitions.find(p => p.mountPoint === '/');
  const isUefi = state.hardware.firmware === 'uefi';
  const bootloader = state.bootloader?.type ?? 'grub2';

  // Btrfs en la familia RHEL
  if (root?.fsType === 'btrfs' && !distro.supportsBtrfsRoot) {
    issues.push({
      id: 'distro-btrfs-unsupported',
      type: 'error',
      title: `${distro.name} no soporta Btrfs`,
      message: `La raíz está en Btrfs, pero el kernel de ${distro.name} ${distro.version} no incluye el módulo btrfs.`,
      technicalImpact: 'Red Hat retiró Btrfs en RHEL 8 y sus reconstrucciones (Rocky, Alma) lo heredan: ni el kernel ni el initramfs pueden montar la raíz y el arranque termina en el shell de emergencia de dracut.',
      remedy: 'Usa XFS (el sistema por defecto en RHEL) o ext4 para la raíz.'
    });
  }

  if (distro.id === 'fedora' && root && root.fsType !== 'btrfs') {
    issues.push({
      id: 'distro-fedora-not-btrfs',
      type: 'info',
      title: 'Fedora usa Btrfs por defecto',
      message: `Has elegido ${root.fsType.toUpperCase()} para la raíz en lugar de Btrfs.`,
      technicalImpact: 'Es una configuración válida, pero pierdes la compresión zstd transparente y las instantáneas (snapshots) con las que Fedora permite volver atrás tras una actualización fallida.',
      remedy: 'Si quieres el comportamiento estándar de Fedora, formatea la raíz en Btrfs.'
    });
  }

  // Secure Boot: solo arrancan cargadores firmados con una clave de la base db
  if (isUefi && state.hardware.secureBoot && bootloader === 'grub2' && !distro.secureBootReady) {
    issues.push({
      id: 'distro-secureboot-unsigned',
      type: 'error',
      title: `${distro.name} no trae un cargador firmado para Secure Boot`,
      message: `Secure Boot está activo y el GRUB de ${distro.name} no está firmado con la clave de Microsoft (no usa shim).`,
      technicalImpact: 'El firmware UEFI solo ejecuta binarios EFI cuya firma esté en la base de datos db. Un grubx64.efi sin firmar se rechaza con "Security Violation" y la máquina no arranca.',
      remedy: distro.id === 'arch'
        ? 'Desactiva Secure Boot en el Paso 1, o firma el cargador con tus propias claves (sbctl) o instala shim-signed desde AUR.'
        : 'Desactiva Secure Boot en el Paso 1, o registra tus propias claves en el firmware y firma el cargador.'
    });
  }

  // systemd-boot
  if (bootloader === 'systemd_boot') {
    if (!isUefi) {
      issues.push({
        id: 'distro-systemd-boot-bios',
        type: 'error',
        title: 'systemd-boot requiere firmware UEFI',
        message: 'Has elegido systemd-boot con el firmware en modo BIOS clásico.',
        technicalImpact: 'systemd-boot es una aplicación EFI: no tiene código para el sector de arranque MBR y la BIOS nunca llegará a ejecutarlo.',
        remedy: 'Cambia el firmware a UEFI en el Paso 1 o usa GRUB 2.'
      });
    }
    if (!distro.systemdBootPackaged) {
      issues.push({
        id: 'distro-systemd-boot-unavailable',
        type: distro.id === 'rocky' ? 'error' : 'warning',
        title: `systemd-boot no está soportado en ${distro.name}`,
        message: distro.init === 'openrc'
          ? `${distro.name} usa OpenRC y su instalador (setup-disk) solo configura GRUB o extlinux.`
          : `${distro.name} ${distro.version} no empaqueta systemd-boot: el arranque se basa en GRUB 2 con entradas BLS.`,
        technicalImpact: 'Tendrías que compilar o traer el cargador de otra fuente y mantener a mano las entradas de cada kernel: las actualizaciones no lo harán por ti.',
        remedy: 'Usa GRUB 2, que es el cargador soportado por la distribución.'
      });
    }
    if (isUefi && state.hardware.secureBoot) {
      issues.push({
        id: 'distro-systemd-boot-secureboot',
        type: 'warning',
        title: 'systemd-boot sin firmar con Secure Boot activo',
        message: 'Los paquetes de systemd-boot de las distribuciones no vienen firmados con la clave de Microsoft.',
        technicalImpact: 'Con Secure Boot activo el firmware rechazará systemd-bootx64.efi salvo que lo firmes con claves propias (sbctl, sbsign) o lo cargues a través de shim.',
        remedy: 'Desactiva Secure Boot, firma el cargador con tus claves o usa GRUB con shim.'
      });
    }
  }

  // musl frente a glibc
  if (distro.libc === 'musl' && GLIBC_PROFILES.includes(state.selectedProfileId)) {
    issues.push({
      id: 'distro-musl-desktop',
      type: 'warning',
      title: 'Alpine (musl) en un perfil de escritorio o desarrollo',
      message: 'Alpine usa musl libc en lugar de glibc.',
      technicalImpact: 'Los binarios precompilados para glibc (muchos IDE, controladores propietarios o runtimes descargados de webs de terceros) no se ejecutan en musl sin capas de compatibilidad como gcompat, y algunas herramientas de escritorio no están empaquetadas.',
      remedy: 'Alpine brilla en servidores mínimos y contenedores; para escritorio o desarrollo es más cómodo Debian, Ubuntu o Fedora.'
    });
  }

  // Rolling release en servidores
  if (distro.id === 'arch' && SERVER_PROFILES.includes(state.selectedProfileId)) {
    issues.push({
      id: 'distro-arch-server',
      type: 'warning',
      title: 'Arch Linux (rolling release) en un servidor',
      message: 'Arch no tiene versiones estables ni ramas LTS: cada actualización puede traer cambios mayores de kernel y bibliotecas.',
      technicalImpact: 'En un servidor desatendido una actualización puede requerir intervención manual (avisos en archlinux.org/news) o cambiar el comportamiento de un servicio sin previo aviso.',
      remedy: 'Para servidores de producción suele preferirse Debian, Ubuntu LTS o Rocky Linux. Si usas Arch, instala también linux-lts y revisa las noticias antes de actualizar.'
    });
  }

  return issues;
}
