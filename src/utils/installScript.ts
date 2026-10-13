import { InstallerState, PartitionItem } from '../types/installer';
import { computeDiskLayout, lvSizeSpec, partedEnd } from './diskLayout';

/**
 * Genera el script equivalente a lo que ejecutaría el instalador.
 * Linux: flujo de referencia para la familia RHEL (Rocky / Alma / Fedora),
 * coherente con dnf + grub2 + dracut + NetworkManager.
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

export function generateLinuxScript(state: InstallerState): string {
  const { disk } = state;
  const isUefi = state.hardware.firmware === 'uefi';
  const layout = computeDiskLayout(disk, state.useLvm, state.useWholeDiskEncryption, state.lvmGroupName);
  const dev = (p: PartitionItem) => layout.deviceFor[p.id] || p.name;
  const hasSeparateBoot = disk.partitions.some(p => p.mountPoint === '/boot');

  const cmds: string[] = [
    '#!/usr/bin/env bash',
    '# Script de referencia generado por el simulador (familia RHEL: Rocky / Alma / Fedora).',
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

  if (state.useWholeDiskEncryption && layout.luksBacking) {
    const target = layout.luksBacking.device;
    cmds.push('\n# --- 2. Cifrado de disco con dm-crypt / LUKS2 ---');
    if (hasSeparateBoot) {
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

  const mounted = disk.partitions
    .filter(p => p.mountPoint?.startsWith('/'))
    .sort((a, b) => a.mountPoint!.split('/').filter(Boolean).length - b.mountPoint!.split('/').filter(Boolean).length);
  const swaps = disk.partitions.filter(p => p.fsType === 'swap' || p.mountPoint === 'swap');

  cmds.push('\n# --- 5. Montaje de la jerarquía de directorios ---');
  mounted.forEach(p => {
    const target = p.mountPoint === '/' ? '/mnt' : `/mnt${p.mountPoint}`;
    if (p.mountPoint !== '/') cmds.push(`mkdir -p ${target}`);
    cmds.push(`mount ${dev(p)} ${target}`);
  });
  swaps.forEach(p => cmds.push(`swapon ${dev(p)}`));

  cmds.push('\n# --- 6. Instalación del sistema base ---');
  cmds.push('dnf --installroot=/mnt --releasever=9 --use-host-config groupinstall -y "Minimal Install"');
  const bootPkgs = isUefi ? 'grub2-efi-x64 shim-x64 efibootmgr' : 'grub2-pc';
  cmds.push(`dnf --installroot=/mnt --releasever=9 --use-host-config install -y kernel ${state.bootloader?.type === 'systemd_boot' ? 'systemd-boot-unsigned' : bootPkgs} lvm2 cryptsetup NetworkManager`);

  cmds.push('\n# fstab con UUIDs (más robusto que los nombres de dispositivo)');
  mounted.forEach(p => {
    cmds.push(`echo "UUID=$(blkid -s UUID -o value ${dev(p)}) ${p.mountPoint} ${p.fsType} defaults 0 ${fsPassNo(p)}" >> /mnt/etc/fstab`);
  });
  swaps.forEach(p => {
    cmds.push(`echo "UUID=$(blkid -s UUID -o value ${dev(p)}) none swap defaults 0 0" >> /mnt/etc/fstab`);
  });

  if (state.useWholeDiskEncryption && layout.luksBacking) {
    cmds.push(`echo "cryptroot UUID=$(blkid -s UUID -o value ${layout.luksBacking.device}) none luks,discard" > /mnt/etc/crypttab`);
  }

  cmds.push('\n# Entrar en el sistema instalado (chroot) para el cargador e initramfs');
  cmds.push('for d in dev proc sys run; do mount --rbind /$d /mnt/$d; done');

  const rootPart = disk.partitions.find(p => p.mountPoint === '/');
  const swapPart = swaps[0];
  const kernelParams = [
    rootPart ? `root=${dev(rootPart)}` : '',
    'ro',
    state.useWholeDiskEncryption && layout.luksBacking
      ? `rd.luks.uuid=$(blkid -s UUID -o value ${layout.luksBacking.device})`
      : '',
    state.useLvm && rootPart?.isLvmLV ? `rd.lvm.lv=${state.lvmGroupName}/${rootPart.lvmLVName}` : '',
    swapPart ? `resume=${dev(swapPart)}` : '',
    state.bootloader?.quietSplash ? 'quiet splash' : '',
    state.bootloader?.noModeSet ? 'nomodeset' : '',
    state.bootloader?.customParameters || ''
  ].filter(Boolean).join(' ');

  if (state.bootloader?.type === 'systemd_boot') {
    cmds.push('\n# --- 7. Cargador de arranque systemd-boot ---');
    cmds.push('chroot /mnt bootctl install --esp-path=/boot/efi');
    cmds.push('KVER=$(ls /mnt/lib/modules | sort -V | tail -1)');
    cmds.push('chroot /mnt dracut --force --kver "$KVER"');
    cmds.push('cp /mnt/boot/vmlinuz-"$KVER" /mnt/boot/initramfs-"$KVER".img /mnt/boot/efi/');
    cmds.push(`cat <<EOF > /mnt/boot/efi/loader/entries/linux.conf\ntitle   Enterprise Linux ($KVER)\nlinux   /vmlinuz-$KVER\ninitrd  /initramfs-$KVER.img\noptions ${kernelParams}\nEOF`);
  } else {
    cmds.push('\n# --- 7. Initramfs y cargador de arranque GRUB 2 ---');
    if (state.useWholeDiskEncryption && !hasSeparateBoot) {
      cmds.push(`echo 'GRUB_ENABLE_CRYPTODISK=y' >> /mnt/etc/default/grub`);
    }
    cmds.push(`echo "GRUB_CMDLINE_LINUX=\\"${kernelParams}\\"" >> /mnt/etc/default/grub`);
    cmds.push('chroot /mnt dracut --regenerate-all --force');
    if (isUefi) {
      cmds.push('chroot /mnt grub2-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=rocky');
    } else {
      cmds.push(`chroot /mnt grub2-install --target=i386-pc ${disk.devicePath}`);
    }
    cmds.push('chroot /mnt grub2-mkconfig -o /boot/grub2/grub.cfg');
  }

  cmds.push('\n# --- 8. Configuración de red (NetworkManager keyfiles) ---');
  const nmDir = '/mnt/etc/NetworkManager/system-connections';
  cmds.push(`mkdir -p ${nmDir}`);
  const bridge = state.network?.bridge;
  if (bridge?.enabled) {
    cmds.push(`cat <<'EOF' > ${nmDir}/${bridge.name}.nmconnection\n[connection]\nid=${bridge.name}\ntype=bridge\ninterface-name=${bridge.name}\n\n[bridge]\nstp=${bridge.stp}\n\n[ipv4]\n${bridge.ipMode === 'static' ? `method=manual\naddress1=${bridge.ipv4Address}/${bridge.prefixLength},${bridge.gateway}\ndns=${bridge.primaryDns};` : 'method=auto'}\nEOF`);
    bridge.memberInterfaces.forEach(member => {
      cmds.push(`cat <<'EOF' > ${nmDir}/${member}.nmconnection\n[connection]\nid=${member}\ntype=ethernet\ninterface-name=${member}\nmaster=${bridge.name}\nslave-type=bridge\nEOF`);
    });
  } else {
    const iface = state.network?.interfaces[0];
    const name = iface?.name || 'enp1s0';
    const ipv4 = iface?.ipMode === 'static'
      ? `method=manual\naddress1=${iface.ipv4Address}/${iface.prefixLength},${iface.gateway}\ndns=${iface.primaryDns};`
      : 'method=auto';
    cmds.push(`cat <<'EOF' > ${nmDir}/${name}.nmconnection\n[connection]\nid=${name}\ntype=ethernet\ninterface-name=${name}\n\n[ipv4]\n${ipv4}\nEOF`);
  }
  cmds.push(`chmod 600 ${nmDir}/*.nmconnection`);

  return cmds.join('\n');
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
