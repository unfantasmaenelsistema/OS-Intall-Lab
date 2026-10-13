import { InstallerState, PartitionItem } from '../types/installer';
import { DistroDefinition, getDistro, networkStackLabel } from '../data/distros';
import { computeDiskLayout, DiskLayout, lvSizeSpec, partedEnd } from './diskLayout';
import { buildKernelCmdline } from './kernelCmdline';

/**
 * Genera el script equivalente a lo que ejecutaría el instalador.
 * Linux: flujo manual de referencia para la distribución elegida (debootstrap,
 * dnf --installroot, pacstrap o apk --root), con su initramfs, cargador y red.
 * Windows: script de diskpart + DISM + bcdboot desde WinPE.
 */
export function generateInstallScript(state: InstallerState): string {
  return state.osType === 'linux' ? generateLinuxScript(state) : generateWindowsScript(state);
}

function fsLabel(p: PartitionItem): string {
  if (p.mountPoint === '/') return 'root';
  if (p.mountPoint === 'swap') return 'swap';
  if (p.mountPoint === '/boot/efi') return 'EFI';
  return (p.mountPoint || 'data').replace(/^\//, '').replace(/\//g, '_').slice(0, 11) || 'data';
}

function fsPassNo(p: PartitionItem): number {
  if (p.mountPoint === '/') return p.fsType === 'ext4' ? 1 : 0;
  if (p.fsType === 'ext4' || p.fsType === 'vfat') return 2;
  return 0; // XFS y Btrfs no usan fsck en el arranque
}

const uuidOf = (device: string) => `$(blkid -s UUID -o value ${device})`;

interface ScriptContext {
  state: InstallerState;
  distro: DistroDefinition;
  layout: DiskLayout;
  isUefi: boolean;
  useSystemdBoot: boolean;
  encrypted: boolean;
  hasSeparateBoot: boolean;
  /** Prefijo para ejecutar dentro del sistema instalado. */
  chroot: string;
  dev: (p: PartitionItem) => string;
}

function buildContext(state: InstallerState): ScriptContext {
  const { disk } = state;
  const distro = getDistro(state.distroId);
  const layout = computeDiskLayout(disk, state.useLvm, state.useWholeDiskEncryption, state.lvmGroupName);
  return {
    state,
    distro,
    layout,
    isUefi: state.hardware.firmware === 'uefi',
    useSystemdBoot: state.bootloader?.type === 'systemd_boot',
    encrypted: state.useWholeDiskEncryption && !!layout.luksBacking,
    hasSeparateBoot: disk.partitions.some(p => p.mountPoint === '/boot'),
    chroot: distro.family === 'pacman' ? 'arch-chroot /mnt' : 'chroot /mnt',
    dev: (p: PartitionItem) => layout.deviceFor[p.id] || p.name
  };
}

/**
 * Comandos clave de cada fase, para las vistas animadas (instalación y terminal virtual).
 * Son las mismas líneas que aparecen en el script completo.
 */
export function keyInstallCommands(state: InstallerState): { baseInstall: string; initramfs: string; bootloader: string } {
  const ctx = buildContext(state);
  const base = baseInstall(ctx);
  const initrd = initramfs(ctx);
  const params = buildKernelCmdline(state, ctx.layout.luksBacking ? uuidOf(ctx.layout.luksBacking.device) : undefined);
  const boot = (ctx.useSystemdBoot ? systemdBoot(ctx, params) : grub(ctx, params))
    .filter(l => /grub2?-install|efibootmgr|bootctl/.test(l));
  return {
    baseInstall: base.find(l => /debootstrap|dnf|pacstrap|apk /.test(l)) || base[0],
    initramfs: initrd[initrd.length - 1],
    bootloader: boot[0] || ''
  };
}

export function generateLinuxScript(state: InstallerState): string {
  const ctx = buildContext(state);
  const { disk } = state;
  const { distro, layout, dev, chroot } = ctx;

  const cmds: string[] = [
    '#!/usr/bin/env bash',
    `# Script de referencia generado por el simulador para ${distro.prettyName}.`,
    `# Ejecútalo desde el entorno live de ${distro.name}, que trae ${baseInstallTool(distro)}.`,
    `# ATENCIÓN: destruye todos los datos de ${disk.devicePath}. Revísalo antes de ejecutarlo.`,
    'set -euo pipefail',
    '',
    '# --- 1. Tabla de particiones ---',
    `parted -s ${disk.devicePath} mklabel ${disk.tableType === 'gpt' ? 'gpt' : 'msdos'}`
  ];

  layout.physical.forEach(pp => {
    const desc = pp.role === 'lvm-pv'
      ? `PV de LVM${layout.luksBacking === pp ? ' (dentro de LUKS2)' : ''}`
      : pp.source?.mountPoint || 'sin montaje';
    cmds.push(`\n# Partición ${pp.number}: ${desc} (${pp.sizeMB} MiB)`);
    const name = disk.tableType === 'gpt' ? `"${pp.label}"` : 'primary';
    cmds.push(`parted -s -a optimal ${disk.devicePath} mkpart ${name}${pp.partedFs ? ` ${pp.partedFs}` : ''} ${pp.startMiB}MiB ${partedEnd(pp)}`);

    const flags = pp.source?.flags || [];
    if (flags.includes('esp') || pp.source?.mountPoint === '/boot/efi') {
      cmds.push(`parted -s ${disk.devicePath} set ${pp.number} esp on`);
    }
    if (flags.includes('bios_grub')) {
      cmds.push(`parted -s ${disk.devicePath} set ${pp.number} bios_grub on`);
    }
    if (pp.role === 'lvm-pv' && !layout.luksBacking) {
      cmds.push(`parted -s ${disk.devicePath} set ${pp.number} lvm on`);
    }
  });

  if (ctx.encrypted && layout.luksBacking) {
    const target = layout.luksBacking.device;
    cmds.push('\n# --- 2. Cifrado de disco con dm-crypt / LUKS2 ---');
    if (ctx.hasSeparateBoot) {
      cmds.push(`cryptsetup luksFormat --type luks2 --cipher aes-xts-plain64 --key-size 512 --hash sha512 --pbkdf argon2id ${target}`);
    } else {
      cmds.push('# /boot queda dentro de LUKS: GRUB debe abrir el volumen y no soporta Argon2id -> PBKDF2.');
      cmds.push(`cryptsetup luksFormat --type luks2 --cipher aes-xts-plain64 --key-size 512 --hash sha512 --pbkdf pbkdf2 ${target}`);
    }
    cmds.push(`cryptsetup open ${target} cryptroot`);
  }

  if (state.useLvm && layout.pvDevice) {
    cmds.push('\n# --- 3. Configuración LVM (Logical Volume Management) ---');
    cmds.push(`pvcreate ${layout.pvDevice}`);
    cmds.push(`vgcreate ${state.lvmGroupName} ${layout.pvDevice}`);
    layout.logicalVolumes.forEach(lv => {
      cmds.push(`lvcreate -y ${lvSizeSpec(layout, lv)} -n ${lv.lvmLVName || `lv_${lv.id}`} ${state.lvmGroupName}`);
    });
  }

  cmds.push('\n# --- 4. Formateo de sistemas de archivos ---');
  disk.partitions.forEach(p => {
    const target = dev(p);
    const label = fsLabel(p);
    if (p.fsType === 'ext4') cmds.push(`mkfs.ext4 -F -L "${label}" ${target}`);
    else if (p.fsType === 'xfs') cmds.push(`mkfs.xfs -f -L "${label}" ${target}`);
    else if (p.fsType === 'btrfs') cmds.push(`mkfs.btrfs -f -L "${label}" ${target}`);
    else if (p.fsType === 'vfat') cmds.push(`mkfs.fat -F32 -n "${label.toUpperCase()}" ${target}`);
    else if (p.fsType === 'swap') cmds.push(`mkswap -L "swap" ${target}`);
  });

  const mounted = mountedPartitions(state);
  const swaps = disk.partitions.filter(p => p.fsType === 'swap' || p.mountPoint === 'swap');

  cmds.push('\n# --- 5. Montaje de la jerarquía de directorios ---');
  mounted.forEach(p => {
    const target = p.mountPoint === '/' ? '/mnt' : `/mnt${p.mountPoint}`;
    if (p.mountPoint !== '/') cmds.push(`mkdir -p ${target}`);
    cmds.push(`mount ${dev(p)} ${target}`);
  });
  swaps.forEach(p => cmds.push(`swapon ${dev(p)}`));

  cmds.push(`\n# --- 6. Instalación del sistema base (${distro.packageManager}) ---`);
  cmds.push(...baseInstall(ctx));

  cmds.push('\n# --- 7. Tabla de montajes y volúmenes cifrados ---');
  if (distro.family === 'pacman') {
    cmds.push('genfstab -U /mnt >> /mnt/etc/fstab');
  } else {
    cmds.push('# fstab con UUIDs (más robusto que los nombres de dispositivo)');
    mounted.forEach(p => {
      cmds.push(`echo "UUID=${uuidOf(dev(p))} ${p.mountPoint} ${p.fsType} defaults 0 ${fsPassNo(p)}" >> /mnt/etc/fstab`);
    });
    swaps.forEach(p => {
      cmds.push(`echo "UUID=${uuidOf(dev(p))} none swap defaults 0 0" >> /mnt/etc/fstab`);
    });
  }
  if (ctx.encrypted && layout.luksBacking) {
    if (distro.family === 'deb' || distro.family === 'rpm') {
      cmds.push(`echo "cryptroot UUID=${uuidOf(layout.luksBacking.device)} none luks,discard" > /mnt/etc/crypttab`);
    } else {
      cmds.push(`# ${distro.name} desbloquea la raíz desde el initramfs con parámetros de kernel, sin /etc/crypttab.`);
    }
  }

  cmds.push(`\n# --- 8. Initramfs (${distro.initramfs}) ---`);
  cmds.push(...initramfs(ctx));

  const kernelParams = buildKernelCmdline(state, layout.luksBacking ? uuidOf(layout.luksBacking.device) : undefined);
  cmds.push(`\n# --- 9. Cargador de arranque (${ctx.useSystemdBoot ? 'systemd-boot' : 'GRUB 2'}) ---`);
  cmds.push(...(ctx.useSystemdBoot ? systemdBoot(ctx, kernelParams) : grub(ctx, kernelParams)));

  cmds.push(`\n# --- 10. Red (${networkStackLabel(distro)}) ---`);
  cmds.push(...networkConfig(ctx));

  cmds.push('\n# --- 11. Sistema: nombre de host, servicios y usuario administrador ---');
  cmds.push(...systemSetup(ctx));

  return cmds.join('\n');
}

function mountedPartitions(state: InstallerState): PartitionItem[] {
  const depth = (p: PartitionItem) => p.mountPoint!.split('/').filter(Boolean).length;
  return state.disk.partitions
    .filter(p => p.mountPoint?.startsWith('/'))
    .sort((a, b) => depth(a) - depth(b));
}

function baseInstallTool(d: DistroDefinition): string {
  switch (d.family) {
    case 'deb': return 'debootstrap';
    case 'rpm': return 'dnf';
    case 'pacman': return 'pacstrap (arch-install-scripts)';
    case 'apk': return 'apk-tools';
  }
}

/** Paquetes del cargador según distribución y firmware. */
function bootPackages(ctx: ScriptContext): string[] {
  const { distro, isUefi, useSystemdBoot } = ctx;
  if (useSystemdBoot) {
    if (distro.family === 'rpm') return ['systemd-boot-unsigned'];
    if (distro.family === 'deb') return ['systemd-boot'];
    return []; // Arch: incluido en systemd
  }
  switch (distro.family) {
    case 'deb':
      if (!isUefi) return ['grub-pc'];
      return distro.id === 'ubuntu' ? ['grub-efi-amd64-signed', 'shim-signed'] : ['grub-efi-amd64', 'shim-signed'];
    case 'rpm': return isUefi ? ['grub2-efi-x64', 'shim-x64', 'efibootmgr'] : ['grub2-pc'];
    case 'pacman': return isUefi ? ['grub', 'efibootmgr'] : ['grub'];
    case 'apk': return isUefi ? ['grub', 'grub-efi', 'efibootmgr'] : ['grub', 'grub-bios'];
  }
}

function storagePackages(ctx: ScriptContext): string[] {
  const pkgs: string[] = [];
  if (ctx.state.useLvm) pkgs.push('lvm2');
  if (ctx.encrypted) pkgs.push('cryptsetup');
  if (ctx.encrypted && ctx.distro.family === 'deb') pkgs.push('cryptsetup-initramfs');
  const fsTypes = new Set(ctx.state.disk.partitions.map(p => p.fsType));
  if (fsTypes.has('xfs')) pkgs.push('xfsprogs');
  if (fsTypes.has('btrfs')) pkgs.push('btrfs-progs');
  return pkgs;
}

function bindMounts(): string {
  return 'for d in dev proc sys run; do mount --rbind /$d /mnt/$d; done';
}

function baseInstall(ctx: ScriptContext): string[] {
  const { distro, chroot } = ctx;
  const bridge = ctx.state.network?.bridge.enabled;
  const extra = [...storagePackages(ctx), ...bootPackages(ctx)];

  switch (distro.family) {
    case 'deb': {
      const suite = distro.id === 'ubuntu' ? 'noble' : 'bookworm';
      const kernel = distro.id === 'ubuntu' ? 'linux-image-generic' : 'linux-image-amd64';
      if (bridge && distro.network === 'ifupdown') extra.push('bridge-utils');
      return [
        `debootstrap --arch amd64 ${suite} /mnt ${distro.mirrorUrl}`,
        bindMounts(),
        `${chroot} apt-get update`,
        `DEBIAN_FRONTEND=noninteractive ${chroot} apt-get install -y ${[kernel, ...extra].join(' ')}`
      ];
    }
    case 'rpm': {
      const releasever = distro.id === 'fedora' ? '40' : '9';
      return [
        `dnf --installroot=/mnt --releasever=${releasever} --setopt=install_weak_deps=False install -y ${['@core', 'kernel', 'NetworkManager', ...extra].join(' ')}`,
        bindMounts()
      ];
    }
    case 'pacman':
      return [`pacstrap -K /mnt ${['base', 'linux', 'linux-firmware', ...extra].join(' ')}`];
    case 'apk': {
      if (bridge) extra.push('bridge');
      return [
        `apk --root /mnt --initdb --keys-dir /etc/apk/keys --repositories-file /etc/apk/repositories add ${['alpine-base', 'linux-lts', 'mkinitfs', ...extra].join(' ')}`,
        'cp /etc/apk/repositories /mnt/etc/apk/repositories',
        bindMounts()
      ];
    }
  }
}

function initramfs(ctx: ScriptContext): string[] {
  const { distro, chroot, state } = ctx;
  switch (distro.initramfs) {
    case 'initramfs-tools':
      return [
        '# cryptsetup-initramfs y lvm2 añaden sus scripts leyendo /etc/crypttab y /etc/fstab',
        `${chroot} update-initramfs -u -k all`
      ];
    case 'dracut':
      return [`${chroot} dracut --regenerate-all --force`];
    case 'mkinitcpio': {
      const hasSwap = state.disk.partitions.some(p => p.fsType === 'swap');
      const hooks = [
        'base', 'udev', 'autodetect', 'microcode', 'modconf', 'kms', 'keyboard', 'keymap', 'consolefont', 'block',
        ...(ctx.encrypted ? ['encrypt'] : []),
        ...(state.useLvm ? ['lvm2'] : []),
        ...(hasSwap ? ['resume'] : []),
        'filesystems', 'fsck'
      ];
      return [
        '# El orden importa: encrypt antes de lvm2 (el PV está dentro de LUKS) y ambos antes de filesystems',
        `sed -i 's/^HOOKS=.*/HOOKS=(${hooks.join(' ')})/' /mnt/etc/mkinitcpio.conf`,
        `${chroot} mkinitcpio -P`
      ];
    }
    case 'mkinitfs': {
      const fsTypes = [...new Set(state.disk.partitions.map(p => p.fsType).filter(f => ['ext4', 'xfs', 'btrfs'].includes(f)))];
      const features = [
        'ata', 'base', 'ide', 'scsi', 'usb', 'virtio', 'nvme', 'keymap', ...fsTypes,
        ...(ctx.encrypted ? ['cryptsetup'] : []),
        ...(state.useLvm ? ['lvm'] : [])
      ];
      return [
        `sed -i 's/^features=.*/features="${features.join(' ')}"/' /mnt/etc/mkinitfs/mkinitfs.conf`,
        `${chroot} mkinitfs ${distro.kernel.release}`
      ];
    }
  }
}

function espPartitionNumber(ctx: ScriptContext): number {
  const esp = ctx.layout.physical.find(pp => pp.source?.flags?.includes('esp') || pp.source?.mountPoint === '/boot/efi');
  return esp?.number ?? 1;
}

function grub(ctx: ScriptContext, kernelParams: string): string[] {
  const { distro, chroot, state, isUefi } = ctx;
  const lines: string[] = [];
  const grubDefault = '/mnt/etc/default/grub';

  if (ctx.encrypted && !ctx.hasSeparateBoot) {
    lines.push(`echo 'GRUB_ENABLE_CRYPTODISK=y' >> ${grubDefault}`);
  }
  lines.push(`echo "GRUB_CMDLINE_LINUX=\\"${kernelParams}\\"" >> ${grubDefault}`);

  if (distro.family === 'rpm' && isUefi) {
    // grub2-install está desaconsejado en EFI: rompe la cadena firmada shim -> grubx64.efi
    lines.push(`# En ${distro.name}, shim-x64 y grub2-efi-x64 ya dejan los binarios firmados en /boot/efi/EFI/${distro.grub.efiId}/;`);
    lines.push('# solo hay que registrar shim en la NVRAM (grub2-install rompería la cadena de Secure Boot).');
    lines.push(`efibootmgr --create --disk ${state.disk.devicePath} --part ${espPartitionNumber(ctx)} --loader '\\EFI\\${distro.grub.efiId}\\shimx64.efi' --label "${distro.grub.menuName}"`);
  } else if (isUefi) {
    lines.push(`${chroot} ${distro.grub.install} --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=${distro.grub.efiId}`);
  } else {
    lines.push(`${chroot} ${distro.grub.install} --target=i386-pc ${state.disk.devicePath}`);
  }

  lines.push(`${chroot} ${distro.grub.mkconfig}`);
  if (distro.family === 'rpm') {
    lines.push('# Las entradas BLS (/boot/loader/entries) guardan sus propios argumentos: se actualizan con grubby');
    lines.push(`${chroot} grubby --update-kernel=ALL --args="${kernelParams}"`);
  }
  return lines;
}

function systemdBoot(ctx: ScriptContext, kernelParams: string): string[] {
  const { distro, chroot } = ctx;
  const k = distro.kernel;
  return [
    `${chroot} bootctl install --esp-path=/boot/efi`,
    '# systemd-boot solo lee la ESP: el kernel y el initramfs deben estar en ella',
    `cp /mnt/boot/${k.vmlinuz} /mnt/boot/${k.initrd} /mnt/boot/efi/`,
    `cat <<EOF > /mnt/boot/efi/loader/entries/${distro.id}.conf\ntitle   ${distro.prettyName}\nlinux   /${k.vmlinuz}\ninitrd  /${k.initrd}\noptions ${kernelParams}\nEOF`
  ];
}

interface AddressConfig {
  mode: 'dhcp' | 'static' | 'none';
  address: string;
  prefix: number;
  gateway: string;
  dns: string[];
}

function addressOf(cfg: { ipMode: string; ipv4Address: string; prefixLength: number; gateway: string; primaryDns: string; secondaryDns: string }): AddressConfig {
  const mode = cfg.ipMode === 'dhcp' ? 'dhcp' : cfg.ipMode === 'static' ? 'static' : 'none';
  return {
    mode,
    address: cfg.ipv4Address,
    prefix: cfg.prefixLength,
    gateway: cfg.gateway,
    dns: [cfg.primaryDns, cfg.secondaryDns].filter(Boolean)
  };
}

function networkConfig(ctx: ScriptContext): string[] {
  const { distro, state } = ctx;
  const bridge = state.network?.bridge;
  const iface = state.network?.interfaces[0];
  const ifName = iface?.name || 'enp1s0';
  const primary: AddressConfig = iface ? addressOf(iface) : { mode: 'dhcp', address: '', prefix: 24, gateway: '', dns: [] };
  const bridged = !!bridge?.enabled;
  const brAddr = bridge ? addressOf(bridge) : primary;
  const addr = bridged ? brAddr : primary;
  const name = bridged ? bridge!.name : ifName;

  switch (distro.network) {
    case 'ifupdown': {
      const stanza = (n: string, a: AddressConfig, extra: string[] = []) => {
        if (a.mode === 'none') return `auto ${n}\niface ${n} inet manual${extra.map(e => `\n    ${e}`).join('')}`;
        const body = a.mode === 'static' ? [`address ${a.address}/${a.prefix}`, `gateway ${a.gateway}`] : [];
        return `auto ${n}\niface ${n} inet ${a.mode}${[...extra, ...body].map(e => `\n    ${e}`).join('')}`;
      };
      const blocks = ['auto lo\niface lo inet loopback'];
      if (bridged) {
        blocks.push(stanza(name, addr, [`bridge-ports ${bridge!.memberInterfaces.join(' ')}`, `bridge-stp ${bridge!.stp ? 'on' : 'off'}`]));
      } else {
        blocks.push(stanza(name, addr));
      }
      const lines = [`cat <<'EOF' > /mnt/etc/network/interfaces\n${blocks.join('\n\n')}\nEOF`];
      if (addr.mode === 'static' && addr.dns.length) {
        lines.push(`printf '${addr.dns.map(d => `nameserver ${d}`).join('\\n')}\\n' > /mnt/etc/resolv.conf`);
      }
      return lines;
    }
    case 'netplan': {
      const addrYaml = (a: AddressConfig, indent: string) => a.mode === 'dhcp'
        ? `${indent}dhcp4: true`
        : a.mode === 'static'
          ? `${indent}addresses: [${a.address}/${a.prefix}]\n${indent}routes: [{ to: default, via: ${a.gateway} }]\n${indent}nameservers: { addresses: [${a.dns.join(', ')}] }`
          : `${indent}dhcp4: false`;
      const yaml = bridged
        ? `network:\n  version: 2\n  renderer: networkd\n  ethernets:\n${bridge!.memberInterfaces.map(m => `    ${m}:\n      dhcp4: false`).join('\n')}\n  bridges:\n    ${name}:\n      interfaces: [${bridge!.memberInterfaces.join(', ')}]\n      parameters: { stp: ${bridge!.stp} }\n${addrYaml(addr, '      ')}`
        : `network:\n  version: 2\n  renderer: networkd\n  ethernets:\n    ${name}:\n${addrYaml(addr, '      ')}`;
      return [
        `cat <<'EOF' > /mnt/etc/netplan/01-netcfg.yaml\n${yaml}\nEOF`,
        'chmod 600 /mnt/etc/netplan/01-netcfg.yaml'
      ];
    }
    case 'networkmanager': {
      const dir = '/mnt/etc/NetworkManager/system-connections';
      const ipv4 = (a: AddressConfig) => a.mode === 'static'
        ? `method=manual\naddress1=${a.address}/${a.prefix},${a.gateway}\ndns=${a.dns.join(';')};`
        : a.mode === 'dhcp' ? 'method=auto' : 'method=disabled';
      const lines = [`mkdir -p ${dir}`];
      if (bridged) {
        lines.push(`cat <<'EOF' > ${dir}/${name}.nmconnection\n[connection]\nid=${name}\ntype=bridge\ninterface-name=${name}\n\n[bridge]\nstp=${bridge!.stp}\n\n[ipv4]\n${ipv4(addr)}\nEOF`);
        bridge!.memberInterfaces.forEach(m => {
          lines.push(`cat <<'EOF' > ${dir}/${m}.nmconnection\n[connection]\nid=${m}\ntype=ethernet\ninterface-name=${m}\nmaster=${name}\nslave-type=bridge\nEOF`);
        });
      } else {
        lines.push(`cat <<'EOF' > ${dir}/${name}.nmconnection\n[connection]\nid=${name}\ntype=ethernet\ninterface-name=${name}\n\n[ipv4]\n${ipv4(addr)}\nEOF`);
      }
      lines.push(`chmod 600 ${dir}/*.nmconnection`);
      return lines;
    }
    case 'systemd-networkd': {
      const dir = '/mnt/etc/systemd/network';
      const network = (a: AddressConfig) => a.mode === 'static'
        ? `Address=${a.address}/${a.prefix}\nGateway=${a.gateway}\n${a.dns.map(d => `DNS=${d}`).join('\n')}`
        : a.mode === 'dhcp' ? 'DHCP=ipv4' : 'LinkLocalAddressing=no';
      const lines: string[] = [];
      if (bridged) {
        lines.push(`cat <<'EOF' > ${dir}/10-${name}.netdev\n[NetDev]\nName=${name}\nKind=bridge\n\n[Bridge]\nSTP=${bridge!.stp ? 'yes' : 'no'}\nEOF`);
        bridge!.memberInterfaces.forEach(m => {
          lines.push(`cat <<'EOF' > ${dir}/20-${m}.network\n[Match]\nName=${m}\n\n[Network]\nBridge=${name}\nEOF`);
        });
        lines.push(`cat <<'EOF' > ${dir}/30-${name}.network\n[Match]\nName=${name}\n\n[Network]\n${network(addr)}\nEOF`);
      } else {
        lines.push(`cat <<'EOF' > ${dir}/20-${name}.network\n[Match]\nName=${name}\n\n[Network]\n${network(addr)}\nEOF`);
      }
      lines.push('ln -sf /run/systemd/resolve/stub-resolv.conf /mnt/etc/resolv.conf');
      return lines;
    }
  }
}

function systemSetup(ctx: ScriptContext): string[] {
  const { distro, chroot, state } = ctx;
  const hostname = state.network?.hostname || state.userConfig.hostname;
  const lines = [`echo "${hostname}" > /mnt/etc/hostname`];

  if (distro.init === 'openrc') {
    lines.push(`${chroot} rc-update add networking boot`);
    if (state.useLvm) lines.push(`${chroot} rc-update add lvm boot`);
    if (state.userConfig.enableSSH) lines.push(`${chroot} rc-update add sshd default`);
  } else {
    const units: string[] = [];
    if (distro.network === 'networkmanager') units.push('NetworkManager');
    if (distro.network === 'systemd-networkd') units.push('systemd-networkd', 'systemd-resolved');
    if (state.userConfig.enableSSH) units.push(distro.family === 'deb' ? 'ssh' : 'sshd');
    if (units.length) lines.push(`${chroot} systemctl enable ${units.join(' ')}`);
  }

  const user = state.userConfig.createAdminUser ? state.userConfig.adminUsername : '';
  if (user) {
    if (distro.family === 'apk') {
      // BusyBox: adduser/addgroup en lugar de useradd
      lines.push(`${chroot} adduser -D -s ${distro.defaultShell} ${user}`);
      if (state.userConfig.adminHasSudo) lines.push(`${chroot} addgroup ${user} ${distro.adminGroup}`);
    } else {
      const groups = state.userConfig.adminHasSudo ? ` -G ${distro.adminGroup}` : '';
      lines.push(`${chroot} useradd -m -s ${distro.defaultShell}${groups} ${user}`);
    }
    lines.push(`${chroot} passwd ${user}`);
  }

  if (distro.lsm?.name === 'SELinux') {
    lines.push('# Los ficheros se crearon fuera de SELinux: forzar el reetiquetado en el primer arranque');
    lines.push('touch /mnt/.autorelabel');
  }
  return lines;
}

export function generateWindowsScript(state: InstallerState): string {
  const { disk } = state;
  const diskNumber = disk.devicePath.match(/\d+/)?.[0] ?? '0';
  const isUefi = state.hardware.firmware === 'uefi';
  const lines: string[] = [
    '# Script de referencia para WinPE. ATENCIÓN: "clean" borra el disco completo.',
    '# 1) Guarda el bloque diskpart como disk.txt y ejecútalo con: diskpart /s disk.txt',
    `select disk ${diskNumber}`,
    'clean',
    `convert ${disk.tableType === 'gpt' ? 'gpt' : 'mbr'}`
  ];

  const usedLetters = new Set(['X']); // X: es la unidad RAM de WinPE
  const systemLetter = 'C';

  disk.partitions.forEach((p, idx) => {
    const isLast = idx === disk.partitions.length - 1;
    const size = isLast ? '' : ` size=${p.sizeMB}`;
    const flags = p.flags || [];
    if (flags.includes('esp') || p.mountPoint === '/boot/efi') {
      lines.push(`create partition efi${size}`);
      lines.push('format quick fs=fat32 label="System"');
      lines.push('assign letter=S');
      usedLetters.add('S');
    } else if (flags.includes('msr')) {
      lines.push(`create partition msr${size}`);
    } else {
      lines.push(`create partition primary${size}`);
      if (p.fsType === 'ntfs' || p.fsType === 'refs') {
        const letter = /^[A-Z]:$/i.test(p.mountPoint || '') ? p.mountPoint![0].toUpperCase() : undefined;
        lines.push(`format quick fs=${p.fsType} label="${letter === 'C' ? 'Windows' : `Datos_${idx + 1}`}"`);
        if (letter) {
          lines.push(`assign letter=${letter}`);
          usedLetters.add(letter);
        }
      }
      if (!isUefi && p.mountPoint === 'C:') lines.push('active');
    }
  });
  lines.push('exit');

  // Unidad libre para referirse al medio de instalación sin colisionar con las letras asignadas.
  const mediaLetter = 'EFGHIJKLMNOPQRTUVWYZ'.split('').find(l => !usedLetters.has(l)) || 'Z';

  lines.push('');
  lines.push(`# 2) Aplicar la imagen (ajusta ${mediaLetter}: a la letra real del medio de instalación)`);
  lines.push(`dism /Apply-Image /ImageFile:${mediaLetter}:\\sources\\install.wim /Index:2 /ApplyDir:${systemLetter}:\\`);
  lines.push(isUefi
    ? `bcdboot ${systemLetter}:\\Windows /s S: /f UEFI`
    : `bcdboot ${systemLetter}:\\Windows /s ${systemLetter}: /f BIOS`);

  const iface = state.network?.interfaces[0];
  if (iface && iface.ipMode === 'static') {
    lines.push('');
    lines.push('# 3) Tras el primer arranque: red estática y administración remota (PowerShell)');
    lines.push(`New-NetIPAddress -InterfaceAlias "${iface.name}" -IPAddress "${iface.ipv4Address}" -PrefixLength ${iface.prefixLength} -DefaultGateway "${iface.gateway}"`);
    const dns = [iface.primaryDns, iface.secondaryDns].filter(Boolean).map(d => `"${d}"`).join(', ');
    lines.push(`Set-DnsClientServerAddress -InterfaceAlias "${iface.name}" -ServerAddresses (${dns})`);
    lines.push('Enable-PSRemoting -Force');
  } else {
    lines.push('');
    lines.push('# 3) Tras el primer arranque: administración remota (la red usa DHCP)');
    lines.push('Enable-PSRemoting -Force');
  }

  return lines.join('\n');
}
