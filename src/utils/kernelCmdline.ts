import { InstallerState } from '../types/installer';
import { getDistro } from '../data/distros';
import { computeDiskLayout } from './diskLayout';

/** UUID ilustrativo para mostrar en pantalla cuando no hay un disco real. */
export const SAMPLE_LUKS_UUID = '3f9c1d2e-7a4b-4e6f-9b1a-5c8d2e7f0a14';

/**
 * Parámetros de kernel según la distribución. Cada generador de initramfs
 * descubre el volumen cifrado y LVM de forma distinta:
 *  - dracut (Fedora/Rocky): rd.luks.uuid= y rd.lvm.lv=
 *  - initramfs-tools (Debian/Ubuntu): lee /etc/crypttab, no necesita parámetros
 *  - mkinitcpio (Arch, hook encrypt): cryptdevice=UUID=...:cryptroot
 *  - mkinitfs (Alpine): cryptroot=UUID=... cryptdm=cryptroot
 * `luksUuid` puede ser un UUID o una expresión de shell como $(blkid ...).
 */
export function buildKernelParams(state: InstallerState, luksUuid: string = SAMPLE_LUKS_UUID): string[] {
  const distro = getDistro(state.distroId);
  const layout = computeDiskLayout(state.disk, state.useLvm, state.useWholeDiskEncryption, state.lvmGroupName);
  const dev = (id: string, fallback: string) => layout.deviceFor[id] || fallback;
  const root = state.disk.partitions.find(p => p.mountPoint === '/');
  const swap = state.disk.partitions.find(p => p.fsType === 'swap' || p.mountPoint === 'swap');
  const encrypted = state.useWholeDiskEncryption && !!layout.luksBacking;
  const bl = state.bootloader;

  const params: string[] = [];
  if (root) params.push(`root=${dev(root.id, root.name)}`);
  params.push('ro');

  if (encrypted) {
    switch (distro.initramfs) {
      case 'dracut': params.push(`rd.luks.uuid=${luksUuid}`); break;
      case 'mkinitcpio': params.push(`cryptdevice=UUID=${luksUuid}:cryptroot`); break;
      case 'mkinitfs': params.push(`cryptroot=UUID=${luksUuid}`, 'cryptdm=cryptroot'); break;
      case 'initramfs-tools': break; // usa /etc/crypttab
    }
  }

  if (distro.initramfs === 'dracut' && state.useLvm) {
    [root, swap].forEach(p => {
      if (p?.isLvmLV) params.push(`rd.lvm.lv=${state.lvmGroupName}/${p.lvmLVName}`);
    });
  }

  if (distro.initramfs === 'mkinitfs' && root) {
    params.push(`modules=sd-mod,usb-storage,${root.fsType}`, `rootfstype=${root.fsType}`);
  }

  // mkinitfs no implementa reanudación desde hibernación
  if (swap && distro.initramfs !== 'mkinitfs') params.push(`resume=${dev(swap.id, swap.name)}`);

  if (bl?.quietSplash) {
    params.push(distro.family === 'deb' ? 'quiet splash' : distro.family === 'rpm' ? 'rhgb quiet' : 'quiet');
  }
  if (bl?.noModeSet) params.push('nomodeset');
  if (distro.lsm && bl) params.push(bl.selinuxEnforcing ? distro.lsm.enforceParams : distro.lsm.disableParams);
  if (bl?.auditLogging) params.push('audit=1');
  if (bl?.customParameters?.trim()) params.push(bl.customParameters.trim());

  return params;
}

export function buildKernelCmdline(state: InstallerState, luksUuid?: string): string {
  return buildKernelParams(state, luksUuid).join(' ');
}

/** Línea completa tal como la ve el kernel en /proc/cmdline (incluye BOOT_IMAGE). */
export function procCmdline(state: InstallerState): string {
  const distro = getDistro(state.distroId);
  return `BOOT_IMAGE=/${distro.kernel.vmlinuz} ${buildKernelCmdline(state)}`;
}
