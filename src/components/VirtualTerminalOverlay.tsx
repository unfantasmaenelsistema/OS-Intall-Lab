import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  X, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Check, 
  Pause, 
  Play, 
  HelpCircle, 
  Search,
  Cpu,
  Monitor,
  Sparkles,
  Tv
} from 'lucide-react';
import { InstallerState } from '../types/installer';
import { computeDiskLayout, lvSizeSpec, partedEnd } from '../utils/diskLayout';
import { keyInstallCommands } from '../utils/installScript';
import { getDistro } from '../data/distros';

export type TerminalTheme = 'dark_modern' | 'classic_crt' | 'matrix_green';

export interface ShellCommandEntry {
  id: string;
  timestamp: string;
  command: string;
  output: string[];
  category: 'partition' | 'crypto' | 'lvm' | 'fs' | 'mount' | 'packages' | 'bootloader' | 'system';
  educationalNote: string;
  exitCode: number;
}

interface ThemeConfig {
  id: TerminalTheme;
  name: string;
  badge: string;
  containerBg: string;
  headerBg: string;
  toolbarBg: string;
  terminalBg: string;
  promptUser: string;
  commandText: string;
  outputBorder: string;
  outputTextColor: string;
  cardBase: string;
  cardSelected: string;
  sidePanelBg: string;
  sidePanelBorder: string;
  bottomBarBg: string;
  cursorColor: string;
  tagClass: string;
  accentGlow?: string;
  hasScanlinesDefault: boolean;
}

const THEMES: Record<TerminalTheme, ThemeConfig> = {
  dark_modern: {
    id: 'dark_modern',
    name: 'Dark Modern',
    badge: 'Obsidian',
    containerBg: 'bg-slate-950 border-slate-800 text-slate-200',
    headerBg: 'bg-black border-slate-800 text-slate-200',
    toolbarBg: 'bg-slate-900/80 border-slate-800/80',
    terminalBg: 'bg-black/95 text-slate-200',
    promptUser: 'text-emerald-400 font-bold',
    commandText: 'text-white font-semibold',
    outputBorder: 'border-slate-800',
    outputTextColor: 'text-slate-400',
    cardBase: 'bg-slate-950/60 border-slate-900 hover:border-slate-800 hover:bg-slate-900/40',
    cardSelected: 'bg-slate-900 border-emerald-500/80 ring-1 ring-emerald-500/30',
    sidePanelBg: 'bg-slate-900/95',
    sidePanelBorder: 'border-slate-800',
    bottomBarBg: 'bg-black border-slate-800 text-slate-400',
    cursorColor: 'bg-emerald-400',
    tagClass: 'bg-slate-900 text-slate-400',
    hasScanlinesDefault: false,
  },
  classic_crt: {
    id: 'classic_crt',
    name: 'Classic CRT',
    badge: 'Fósforo Ámbar',
    containerBg: 'bg-[#0e0a03] border-amber-900/60 text-amber-200 shadow-[0_0_35px_rgba(245,158,11,0.15)]',
    headerBg: 'bg-[#150f04] border-amber-900/50 text-amber-200',
    toolbarBg: 'bg-[#181105]/95 border-amber-900/50',
    terminalBg: 'bg-[#090602] text-amber-200',
    promptUser: 'text-amber-400 font-bold drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]',
    commandText: 'text-amber-100 font-semibold drop-shadow-[0_0_5px_rgba(251,191,36,0.35)]',
    outputBorder: 'border-amber-900/60',
    outputTextColor: 'text-amber-300/80 drop-shadow-[0_0_3px_rgba(245,158,11,0.2)]',
    cardBase: 'bg-[#130d04]/80 border-amber-950 hover:border-amber-900/60 hover:bg-[#1a1205]/60',
    cardSelected: 'bg-[#261904] border-amber-500/80 ring-1 ring-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
    sidePanelBg: 'bg-[#140e05]/95',
    sidePanelBorder: 'border-amber-900/60',
    bottomBarBg: 'bg-[#0f0a03] border-amber-900/50 text-amber-400/70',
    cursorColor: 'bg-amber-400 shadow-[0_0_10px_#f59e0b]',
    tagClass: 'bg-amber-950/80 text-amber-400/90 border border-amber-900/50',
    accentGlow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]',
    hasScanlinesDefault: true,
  },
  matrix_green: {
    id: 'matrix_green',
    name: 'Matrix Green',
    badge: 'Fósforo Verde',
    containerBg: 'bg-[#020e05] border-emerald-900/70 text-emerald-300 shadow-[0_0_35px_rgba(16,185,129,0.15)]',
    headerBg: 'bg-[#041508] border-emerald-900/60 text-emerald-300',
    toolbarBg: 'bg-[#051c0b]/95 border-emerald-900/60',
    terminalBg: 'bg-[#010903] text-emerald-300',
    promptUser: 'text-green-400 font-bold drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]',
    commandText: 'text-emerald-100 font-semibold drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]',
    outputBorder: 'border-emerald-900/60',
    outputTextColor: 'text-emerald-400/80 drop-shadow-[0_0_3px_rgba(34,197,94,0.2)]',
    cardBase: 'bg-[#051a09]/80 border-emerald-950 hover:border-emerald-900/60 hover:bg-[#08240d]/60',
    cardSelected: 'bg-[#073012] border-emerald-400/90 ring-1 ring-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
    sidePanelBg: 'bg-[#041808]/95',
    sidePanelBorder: 'border-emerald-900/60',
    bottomBarBg: 'bg-[#020e05] border-emerald-900/60 text-emerald-500/70',
    cursorColor: 'bg-green-400 shadow-[0_0_10px_#22c55e]',
    tagClass: 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/50',
    accentGlow: 'drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]',
    hasScanlinesDefault: true,
  }
};

interface VirtualTerminalOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  state: InstallerState;
  progressPct: number;
  isPaused: boolean;
  onTogglePause: () => void;
}

export const VirtualTerminalOverlay: React.FC<VirtualTerminalOverlayProps> = ({
  isOpen,
  onClose,
  state,
  progressPct,
  isPaused,
  onTogglePause
}) => {
  const [currentTheme, setCurrentTheme] = useState<TerminalTheme>('dark_modern');
  const [enableScanlines, setEnableScanlines] = useState<boolean>(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<ShellCommandEntry | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const themeConfig = THEMES[currentTheme];

  // Generar dinámicamente el listado completo de comandos según el estado real del usuario
  const allCommands = React.useMemo<ShellCommandEntry[]>(() => {
    const list: ShellCommandEntry[] = [];
    const t = (sec: number) => `00:00:${sec < 10 ? '0' + sec : sec}`;
    let sec = 1;
    const layout = computeDiskLayout(state.disk, state.useLvm, state.useWholeDiskEncryption, state.lvmGroupName);
    const devFor = (p: { id: string; name: string }) => layout.deviceFor[p.id] || p.name;
    const luksDev = layout.luksBacking?.device ?? state.disk.devicePath;
    const rootItem = state.disk.partitions.find(p => p.mountPoint === '/');
    const distro = getDistro(state.distroId);
    const keyCmds = keyInstallCommands(state);

    // 1. Particionamiento
    list.push({
      id: 'cmd-parted-label',
      timestamp: t(sec++),
      command: `parted -s ${state.disk.devicePath} mklabel ${state.disk.tableType}`,
      output: [
        `Warning: The existing disk label on ${state.disk.devicePath} will be destroyed and all data will be lost.`,
        `Writing ${state.disk.tableType.toUpperCase()} partition table structure with backup secondary table at LBA ${Math.floor(state.disk.totalSizeMB * 2048 - 33)}.`
      ],
      category: 'partition',
      educationalNote: `Inicializa la tabla ${state.disk.tableType.toUpperCase()}. En GPT, añade un encabezado protector en LBA 0 y almacena una tabla secundaria de redundancia al final del disco físico para recuperación ante fallos de sectores.`,
      exitCode: 0
    });

    layout.physical.forEach(pp => {
      const partNum = pp.number;
      const startMB = pp.startMiB;
      const endMB = pp.endMiB;

      list.push({
        id: `cmd-parted-${partNum}`,
        timestamp: t(sec++),
        command: `parted -s -a optimal ${state.disk.devicePath} mkpart ${state.disk.tableType === 'gpt' ? `"${pp.label}"` : 'primary'}${pp.partedFs ? ` ${pp.partedFs}` : ''} ${startMB}MiB ${partedEnd(pp)}`,
        output: [
          `Aligned partition ${partNum} on 4096-byte hardware sector boundaries (LBA ${startMB * 2048} - ${endMB * 2048}).`
        ],
        category: 'partition',
        educationalNote: `Crea la partición ${partNum}. El parámetro '-a optimal' fuerza la alineación a bloques físicos de 4 KiB en memorias Flash NVMe/SSD, evitando la penalización de rendimiento por desalineación de escritura.`,
        exitCode: 0
      });

      if (pp.source?.flags?.includes('esp') || pp.source?.mountPoint === '/boot/efi') {
        list.push({
          id: `cmd-flag-esp-${partNum}`,
          timestamp: t(sec++),
          command: `parted -s ${state.disk.devicePath} set ${partNum} esp on`,
          output: [
            `Set ESP (EFI System Partition) GUID 'C12A7328-F81F-11D2-BA4B-00A0C93EC93B' on partition ${partNum}.`
          ],
          category: 'bootloader',
          educationalNote: `Asigna el GUID estándar de partición EFI. La especificación UEFI utiliza este identificador unívoco para indexar la unidad y cargar los binarios '.efi' desde la ROM de la placa base sin ayuda del sistema operativo.`,
          exitCode: 0
        });
      }
    });

    // 2. Cifrado LUKS2 si aplica
    if (state.useWholeDiskEncryption && layout.luksBacking) {
      const hasSeparateBoot = state.disk.partitions.some(p => p.mountPoint === '/boot');
      list.push({
        id: 'cmd-cryptsetup-format',
        timestamp: t(sec++),
        command: `cryptsetup luksFormat --type luks2 --cipher aes-xts-plain64 --key-size 512 --hash sha512 --pbkdf ${hasSeparateBoot ? 'argon2id' : 'pbkdf2'} ${luksDev}`,
        output: [
          `WARNING: This will overwrite data on ${luksDev} irrevocably.`,
          `Generating LUKS2 metadata header...`,
          hasSeparateBoot ? `Benchmarking memory parameters for Argon2id (iterations: 4, memory: 1048576 KiB)...` : `Benchmarking PBKDF2-sha512 (GRUB cryptodisk compatible)...`,
          `Key slot 0 created with 512-bit master volume key. Header size: 16 MiB.`
        ],
        category: 'crypto',
        educationalNote: `Cifra la partición física con el estándar LUKS2 usando cifrado simétrico AES en modo XTS con clave de 512 bits. ${hasSeparateBoot ? "La función de derivación Argon2id requiere 1 GB de RAM en el cálculo para neutralizar ataques de fuerza bruta mediante GPUs y ASICs dedicados." : "Se usa PBKDF2 porque /boot queda dentro del volumen cifrado y GRUB no sabe derivar claves Argon2id: con Argon2id el sistema no arrancaría."}`,
        exitCode: 0
      });

      list.push({
        id: 'cmd-cryptsetup-open',
        timestamp: t(sec++),
        command: `cryptsetup open --type luks2 ${luksDev} cryptroot`,
        output: [
          `Key slot 0 unlocked.`,
          `Created device-mapper virtual block device: /dev/mapper/cryptroot [MAJOR=253, MINOR=0].`
        ],
        category: 'crypto',
        educationalNote: `Crea el dispositivo virtual mapeado por el kernel en '/dev/mapper/cryptroot'. Toda lectura y escritura que pase por este nodo será descifrada o cifrada de forma transparente por las instrucciones hardware AES-NI del procesador.`,
        exitCode: 0
      });
    }

    // 3. LVM si aplica
    if (state.useLvm && state.osType === 'linux') {
      const pvDev = layout.pvDevice ?? `${luksDev}`;

      list.push({
        id: 'cmd-pvcreate',
        timestamp: t(sec++),
        command: `pvcreate --dataalignment 1m ${pvDev}`,
        output: [
          `Physical volume "${pvDev}" successfully created.`,
          `Created PV UUID: ${Math.random().toString(36).substring(2, 8)}-${Math.random().toString(36).substring(2, 8)}-${Math.random().toString(36).substring(2, 8)}`
        ],
        category: 'lvm',
        educationalNote: `Inicializa el Physical Volume (PV). Reserva los metadatos de LVM con una alineación de 1 MB para optimizar operaciones I/O en SSDs y permitir agregación dinámica al grupo de almacenamiento.`,
        exitCode: 0
      });

      list.push({
        id: 'cmd-vgcreate',
        timestamp: t(sec++),
        command: `vgcreate ${state.lvmGroupName} ${pvDev}`,
        output: [
          `Volume group "${state.lvmGroupName}" successfully created with physical extent size 4.00 MiB.`
        ],
        category: 'lvm',
        educationalNote: `Crea el Volume Group (VG) '${state.lvmGroupName}'. Este grupo actúa como un pool común de bloques lógicos (Extents de 4 MiB) desde el cual se pueden aprovisionar particiones dinámicas según las necesidades de la máquina.`,
        exitCode: 0
      });

      state.disk.partitions.filter(p => p.isLvmLV).forEach(lv => {
        const lvName = lv.lvmLVName || 'lv_vol';
        list.push({
          id: `cmd-lvcreate-${lvName}`,
          timestamp: t(sec++),
          command: `lvcreate -y ${lvSizeSpec(layout, lv)} -n ${lvName} ${state.lvmGroupName}`,
          output: [
            `Logical volume "${lvName}" created [Size: ${(lv.sizeMB / 1024).toFixed(1)} GiB, Extents: ${Math.ceil(lv.sizeMB / 4)}].`,
            `Mapped device node: ${layout.deviceFor[lv.id]}`
          ],
          category: 'lvm',
          educationalNote: `Crea el Logical Volume '${lvName}'. A diferencia de una partición fija, este volumen se puede extender en caliente con el comando 'lvextend' mientras el sistema está encendido si el disco se llena.`,
          exitCode: 0
        });
      });
    }

    // 4. Formateo de sistemas de archivos
    state.disk.partitions.forEach(p => {
      const dev = devFor(p);

      if (p.fsType === 'ext4') {
        list.push({
          id: `cmd-mkfs-ext4-${p.id}`,
          timestamp: t(sec++),
          command: `mkfs.ext4 -F -O 64bit,has_journal,extents,dir_index -L "${p.mountPoint === '/' ? 'root' : 'data'}" ${dev}`,
          output: [
            `Creating filesystem with ${Math.floor(p.sizeMB * 256)} 4k blocks and ${Math.floor(p.sizeMB * 64)} inodes`,
            `Filesystem UUID: ${Math.random().toString(36).substring(2, 10)}-${Math.random().toString(36).substring(2, 6)}`,
            `Allocating group tables: done`,
            `Writing inode tables: done`,
            `Creating journal (65536 blocks): done`,
            `Writing superblocks and filesystem accounting information: done`
          ],
          category: 'fs',
          educationalNote: `Formatea en ext4. Crea el diario (journal) para garantizar consistencia ante cortes de luz y activa 'dir_index' (árboles HTree) para acelerar búsquedas en directorios con decenas de miles de archivos.`,
          exitCode: 0
        });
      } else if (p.fsType === 'xfs') {
        list.push({
          id: `cmd-mkfs-xfs-${p.id}`,
          timestamp: t(sec++),
          command: `mkfs.xfs -f -m crc=1,finobt=1 -L "${p.mountPoint === '/' ? 'root' : 'data'}" ${dev}`,
          output: [
            `meta-data=${dev} isize=512    agcount=4, agsize=${Math.floor(p.sizeMB * 64)} blks`,
            `         =                       sectsz=4096  attr=2, projid32bit=1`,
            `         =                       crc=1        finobt=1, rmapbt=0, reflink=1`,
            `data     =                       bsize=4096   blocks=${Math.floor(p.sizeMB * 256)}, imaxpct=25`,
            `log      =internal log           bsize=4096   blocks=8192, version=2`,
            `naming   =version 2              bsize=4096   ascii-ci=0, ftype=1`
          ],
          category: 'fs',
          educationalNote: `Formatea en XFS con 4 Allocation Groups para paralelismo I/O y soporte de reflink. REPERCUSIÓN FORMATIVA: XFS está optimizado para alto rendimiento en servidores, pero NO admite reducción de tamaño en ningún caso.`,
          exitCode: 0
        });
      } else if (p.fsType === 'btrfs') {
        list.push({
          id: `cmd-mkfs-btrfs-${p.id}`,
          timestamp: t(sec++),
          command: `mkfs.btrfs -f -L "system_pool" ${dev}`,
          output: [
            `btrfs-progs v6.6`,
            `Label:              system_pool`,
            `UUID:               ${Math.random().toString(36).substring(2, 10)}`,
            `Node size:          16384`,
            `Sector size:        4096`,
            `Filesystem size:    ${(p.sizeMB / 1024).toFixed(1)}GiB`
          ],
          category: 'fs',
          educationalNote: `Formatea en Btrfs con diseño Copy-on-Write (CoW). Esto habilita snapshots instantáneos antes de actualizaciones críticas del kernel y sumas de verificación CRC32c para neutralizar la degradación silenciosa de datos (bit rot).`,
          exitCode: 0
        });
      } else if (p.fsType === 'vfat') {
        list.push({
          id: `cmd-mkfs-fat-${p.id}`,
          timestamp: t(sec++),
          command: `mkfs.fat -F32 -n "EFI" ${dev}`,
          output: [
            `mkfs.fat 4.2 (2021-01-31)`,
            `Creating FAT32 volume with 2 FAT tables, 512 bytes per sector.`
          ],
          category: 'fs',
          educationalNote: `Crea el sistema FAT32 en la partición EFI. Es el único sistema de archivos que las especificaciones de los fabricantes de placas base UEFI están obligados a leer nativamente sin software adicional.`,
          exitCode: 0
        });
      } else if (p.fsType === 'swap') {
        list.push({
          id: `cmd-mkswap-${p.id}`,
          timestamp: t(sec++),
          command: `mkswap -L "swap" ${dev}`,
          output: [
            `Setting up swapspace version 1, size = ${(p.sizeMB / 1024).toFixed(1)} GiB (${p.sizeMB * 1024 * 1024} bytes)`,
            `LABEL=swap, UUID=${Math.random().toString(36).substring(2, 10)}`
          ],
          category: 'fs',
          educationalNote: `Prepara el espacio de intercambio Swap. Permite al kernel paginar memoria inactiva y previene que el mecanismo OOM Killer mate servicios durante picos de carga imprevistos.`,
          exitCode: 0
        });
      }
    });

    // 5. Montaje de jerarquía
    list.push({
      id: 'cmd-mount-root',
      timestamp: t(sec++),
      command: `mount -o defaults,noatime ${rootItem ? devFor(rootItem) : state.disk.devicePath} /mnt`,
      output: [
        `Mounted target root filesystem to /mnt directory.`
      ],
      category: 'mount',
      educationalNote: `Monta la raíz con la opción 'noatime' para evitar escrituras redundantes de metadatos cada vez que se lee un archivo, prolongando la vida útil del disco NVMe y mejorando la velocidad de lectura.`,
      exitCode: 0
    });

    // 6. Sistema base, initramfs y cargador (según la distribución)
    list.push({
      id: 'cmd-base-install',
      timestamp: t(sec++),
      command: keyCmds.baseInstall,
      output: [
        `${distro.packageManager}: resolving dependencies from ${distro.mirrorUrl}`,
        `${distro.packageManager}: installing base system into /mnt (${distro.libc}, ${distro.init}, kernel ${distro.kernel.release})`,
        `${distro.packageManager}: base system installed successfully.`
      ],
      category: 'system',
      educationalNote: {
        deb: 'debootstrap descarga los paquetes "essential" de Debian/Ubuntu y crea un sistema mínimo en /mnt; el kernel y el resto se instalan después con apt dentro del chroot.',
        rpm: 'dnf --installroot instala los paquetes RPM directamente en /mnt usando los repositorios del sistema live; @core es el grupo mínimo de la familia Red Hat.',
        pacman: 'pacstrap (arch-install-scripts) instala el grupo base, el kernel y el firmware en /mnt; -K inicializa un anillo de claves pacman propio en el destino.',
        apk: 'apk --root --initdb crea una base de datos de paquetes vacía en /mnt e instala alpine-base (BusyBox, musl y OpenRC); es lo que hace setup-disk por debajo.'
      }[distro.family],
      exitCode: 0
    });

    list.push({
      id: 'cmd-initramfs',
      timestamp: t(sec++),
      command: keyCmds.initramfs,
      output: [
        `${distro.initramfs}: building image for kernel ${distro.kernel.release}`,
        ...(state.useWholeDiskEncryption ? [`${distro.initramfs}: including dm-crypt / cryptsetup support`] : []),
        ...(state.useLvm ? [`${distro.initramfs}: including LVM2 (device-mapper) support`] : []),
        `${distro.initramfs}: created /boot/${distro.kernel.initrd}`
      ],
      category: 'bootloader',
      educationalNote: {
        'initramfs-tools': 'update-initramfs regenera el initrd de Debian/Ubuntu. Los hooks de cryptsetup-initramfs y lvm2 leen /etc/crypttab para saber qué volumen desbloquear.',
        dracut: 'dracut construye el initramfs de la familia Red Hat por módulos (crypt, lvm…). El volumen se localiza con los parámetros rd.luks.uuid y rd.lvm.lv.',
        mkinitcpio: 'mkinitcpio -P regenera los initramfs de todos los kernels de Arch. Solo incluye lo que indiquen los HOOKS de /etc/mkinitcpio.conf: sin encrypt o lvm2 la raíz no se encuentra.',
        mkinitfs: 'mkinitfs genera el initramfs de Alpine a partir de las "features" de /etc/mkinitfs/mkinitfs.conf (cryptsetup, lvm…); el volumen se indica con cryptroot= en la línea del kernel.'
      }[distro.initramfs],
      exitCode: 0
    });

    list.push({
      id: 'cmd-bootloader',
      timestamp: t(sec++),
      command: keyCmds.bootloader,
      output: state.bootloader?.type === 'systemd_boot'
        ? ['Copied "/usr/lib/systemd/boot/efi/systemd-bootx64.efi" to "/boot/efi/EFI/systemd/systemd-bootx64.efi".', 'Created EFI boot entry "Linux Boot Manager".']
        : state.hardware.firmware === 'uefi'
          ? [`Boot entry added: Boot0001* ${distro.grub.menuName}`, `Loader: \EFI\${distro.grub.efiId}\${distro.family === 'rpm' ? 'shimx64.efi' : 'grubx64.efi'}`]
          : ['Installing for i386-pc platform.', 'Installation finished. No error reported.'],
      category: 'bootloader',
      educationalNote: distro.family === 'rpm' && state.hardware.firmware === 'uefi'
        ? `En ${distro.name} los binarios firmados (shim → GRUB) ya los instala el paquete; basta con registrar shimx64.efi en la NVRAM con efibootmgr para conservar Secure Boot.`
        : 'Copia el cargador a la ESP (o al sector de arranque en BIOS) y registra la entrada en la NVRAM de la placa base para que la máquina arranque este sistema por defecto.',
      exitCode: 0
    });

    list.push({
      id: 'cmd-useradd',
      timestamp: t(sec++),
      command: distro.family === 'apk'
        ? `chroot /mnt adduser -D -s ${distro.defaultShell} "${state.userConfig.adminUsername}" && chroot /mnt addgroup "${state.userConfig.adminUsername}" ${distro.adminGroup}`
        : `${distro.family === 'pacman' ? 'arch-chroot' : 'chroot'} /mnt useradd -m -s ${distro.defaultShell} -G ${distro.adminGroup} "${state.userConfig.adminUsername}"`,
      output: [
        `User '${state.userConfig.adminUsername}' created with home directory /home/${state.userConfig.adminUsername}.`,
        `Added user to supplementary administrative group: ${distro.adminGroup}.`
      ],
      category: 'system',
      educationalNote: distro.adminGroup === 'sudo'
        ? `En ${distro.name} el grupo administrativo es 'sudo' (no 'wheel'): /etc/sudoers ya concede privilegios a %sudo.`
        : `Añade el usuario al grupo 'wheel'. ${distro.family === 'apk' ? 'En Alpine hay que instalar sudo o doas y permitir al grupo wheel en su configuración.' : 'La política de /etc/sudoers concede privilegios a %wheel.'}`,
      exitCode: 0
    });

    // Inyección de comandos de fallo en la terminal virtual si están activos
    if (state.hardwareFailures?.badSectors) {
      list.push({
        id: 'cmd-fail-bad-sectors',
        timestamp: t(sec++),
        command: `dd if=/dev/zero of=${rootItem ? devFor(rootItem) : state.disk.devicePath} bs=4k count=100 conv=fdatasync`,
        output: [
          `dd: error writing '${rootItem ? devFor(rootItem) : state.disk.devicePath}': Input/output error`,
          `[kernel] blk_update_request: I/O error, dev nvme0n1, sector 4145674 op 0x1:(WRITE) flags 0x800`,
          `Command failed with exit code 5 (EIO: Input/Output Error)`
        ],
        category: 'fs',
        educationalNote: 'El driver del kernel reporta fallo I/O en sector defectuoso. La controladora NVMe no pudo reasignar el bloque debido al agotamiento de celdas de recambio.',
        exitCode: 5
      });
    }

    if (state.hardwareFailures?.networkDisconnect) {
      list.push({
        id: 'cmd-fail-net-disconnect',
        timestamp: t(sec++),
        command: `curl -sSfI ${distro.mirrorUrl}/`,
        output: [
          `curl: (7) Couldn't connect to server: Network is unreachable (enp1s0 carrier down)`,
          `${distro.packageManager}: failed to fetch package index from ${distro.mirrorUrl}`
        ],
        category: 'system',
        educationalNote: 'El kernel detecta interfaz enp1s0 sin portadora física (Link is DOWN). El instalador suspende la descarga remota.',
        exitCode: 7
      });
    }

    if (state.hardwareFailures?.ramBitFlip) {
      list.push({
        id: 'cmd-fail-ram-mce',
        timestamp: t(sec++),
        command: `dmesg | grep -i "hardware error"`,
        output: [
          `[  3.890120] [Hardware Error]: CPU 0: Machine Check Exception (MCE): Bank 5: Memory Controller uncorrected ECC error`,
          `[  3.890130] kernel: Tainted: G        W   M    ${distro.kernel.release} #1`
        ],
        category: 'system',
        educationalNote: 'Excepción MCE de memoria detectada. Se aconseja detener la instalación para evitar corrupción de datos en el sistema de archivos.',
        exitCode: 1
      });
    }

    if (state.hardwareFailures?.thermalThrottling) {
      list.push({
        id: 'cmd-fail-thermal',
        timestamp: t(sec++),
        command: `cat /sys/devices/system/cpu/cpu0/thermal_throttle/package_throttle_count`,
        output: [
          `CPU0 package temperature: 104°C (thermal throttling active)`,
          `Frequency clamped to 800 MHz to protect hardware integrity.`
        ],
        category: 'system',
        educationalNote: 'Sensor térmico ha superado el umbral Tjunction. CPU operando al mínimo reloj de seguridad.',
        exitCode: 0
      });
    }

    return list;
  }, [state]);

  // Filtrar según el progreso actual de la instalación (0 a 100%)
  const visibleCommandsCount = Math.max(
    1,
    Math.min(allCommands.length, Math.ceil((progressPct / 100) * allCommands.length))
  );
  const activeCommands = allCommands.slice(0, visibleCommandsCount);

  const filteredCommands = searchQuery.trim()
    ? activeCommands.filter(c => 
        c.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.output.some(o => o.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.educationalNote.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activeCommands;

  // Autoscroll to bottom when commands are added
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleCommandsCount, autoScroll]);

  const handleCopyAll = () => {
    const text = activeCommands.map(c => `# [${c.timestamp}]\n${c.command}\n${c.output.join('\n')}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md transition-all duration-150">
      <div 
        className={`rounded-xl flex flex-col shadow-2xl overflow-hidden transition-all duration-200 relative border ${themeConfig.containerBg} ${
          isMaximized 
            ? 'w-full h-full' 
            : 'w-full max-w-5xl h-[88vh] max-h-[850px]'
        }`}
      >
        {/* Efecto de Scanlines CRT Vintage (condicional para CRT y Matrix) */}
        {themeConfig.hasScanlinesDefault && enableScanlines && (
          <div 
            className="pointer-events-none absolute inset-0 z-30 opacity-25 mix-blend-overlay"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.45) 0px, rgba(0, 0, 0, 0.45) 1px, transparent 1px, transparent 2px)',
              backgroundSize: '100% 2px'
            }}
          />
        )}

        {/* 1. Barra de Título Superior de la Terminal */}
        <div className={`p-3 border-b flex items-center justify-between select-none relative z-20 ${themeConfig.headerBg}`}>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
            </div>
            <div className="flex items-center gap-2">
              <Terminal className={`w-4 h-4 ${themeConfig.promptUser}`} />
              <span className="font-mono text-xs font-bold tracking-wide">
                Terminal Virtual de Instalación (TTY2 · Backend Live Console)
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                currentTheme === 'classic_crt' 
                  ? 'bg-amber-950/80 border-amber-800 text-amber-300' 
                  : currentTheme === 'matrix_green'
                  ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                  : 'bg-emerald-950 border-emerald-800 text-emerald-300'
              }`}>
                {isPaused ? 'EN PAUSA' : 'EN VIVO'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Botón de Pausa/Reanudación del flujo */}
            <button
              type="button"
              onClick={onTogglePause}
              className={`p-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-1 ${
                isPaused 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
              title={isPaused ? 'Reanudar ejecución simulada' : 'Pausar ejecución para inspeccionar'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline text-[11px]">{isPaused ? 'Reanudar' : 'Pausar'}</span>
            </button>

            {/* Copiar logs */}
            <button
              type="button"
              onClick={handleCopyAll}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-900/60 transition-colors flex items-center gap-1 text-xs"
              title="Copiar todos los comandos y salidas"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline text-[11px]">{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            {/* Maximizar / Restaurar */}
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-900/60 transition-colors"
              title={isMaximized ? 'Restaurar ventana' : 'Maximizar ventana'}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Cerrar overlay */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-900/60 transition-colors"
              title="Cerrar Terminal Virtual (puedes volver a abrirla en cualquier momento)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Barra de Configuración de Temas Estéticos (Tema Switcher) */}
        <div className={`px-4 py-2 border-b flex flex-wrap items-center justify-between gap-3 text-xs relative z-20 ${themeConfig.toolbarBg}`}>
          {/* Selector de Temas Estéticos */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Tema:</span>
            </span>

            <div className="flex items-center gap-1 p-1 bg-black/60 rounded-lg border border-slate-800">
              {/* Tema 1: Dark Modern */}
              <button
                type="button"
                onClick={() => setCurrentTheme('dark_modern')}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                  currentTheme === 'dark_modern'
                    ? 'bg-slate-800 text-white font-bold shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tema Dark Modern: Interfaz oscura moderna y nítida"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                <span>Dark Modern</span>
              </button>

              {/* Tema 2: Classic CRT */}
              <button
                type="button"
                onClick={() => setCurrentTheme('classic_crt')}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                  currentTheme === 'classic_crt'
                    ? 'bg-[#2b1c06] text-amber-300 font-bold shadow-sm border border-amber-600/70 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                    : 'text-amber-500/80 hover:text-amber-300'
                }`}
                title="Tema Classic CRT: Pantalla vintage de fósforo ámbar con brillo cálido"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-[0_0_6px_#f59e0b]"></span>
                <span>Classic CRT</span>
              </button>

              {/* Tema 3: Matrix Green */}
              <button
                type="button"
                onClick={() => setCurrentTheme('matrix_green')}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                  currentTheme === 'matrix_green'
                    ? 'bg-[#083514] text-emerald-300 font-bold shadow-sm border border-emerald-500/70 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                    : 'text-emerald-500/80 hover:text-emerald-300'
                }`}
                title="Tema Matrix Green: Terminal cyber/hacker en fósforo verde"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block shadow-[0_0_6px_#22c55e]"></span>
                <span>Matrix Green</span>
              </button>
            </div>

            {/* Alternancia de Scanlines cuando un tema CRT está seleccionado */}
            {themeConfig.hasScanlinesDefault && (
              <button
                type="button"
                onClick={() => setEnableScanlines(!enableScanlines)}
                className={`px-2 py-1 rounded-md text-[11px] font-mono transition-all flex items-center gap-1 border ${
                  enableScanlines 
                    ? 'bg-slate-800 border-slate-700 text-white' 
                    : 'bg-black/40 border-slate-800 text-slate-500'
                }`}
                title="Activar/desactivar el efecto de líneas de barrido CRT"
              >
                <Tv className="w-3 h-3" />
                <span>Scanlines {enableScanlines ? 'ON' : 'OFF'}</span>
              </button>
            )}
          </div>

          {/* Campo de búsqueda y Auto-Scroll */}
          <div className="flex items-center gap-3">
            <div className="relative w-48 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar (mkfs, luks, lvm)..."
                className="w-full bg-black/60 border border-slate-800 rounded-md pl-8 pr-3 py-1 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 text-[10px]"
                />
                <span className="hidden sm:inline">Auto-scroll</span>
              </label>
            </div>
          </div>
        </div>

        {/* 3. Cuerpo Principal de la Terminal (Consola + Inspector Educativo Lateral) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden font-mono relative z-10">
          {/* Panel de Comandos de la Consola */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-3.5 text-xs select-text ${themeConfig.terminalBg}`}>
            <div className={`text-[11px] pb-2 border-b flex items-center justify-between opacity-70 ${themeConfig.outputBorder}`}>
              <span>Linux installer shell emulator · Theme: [{themeConfig.name}] · TTY2 Session</span>
              <span>POSIX sh / bash 5.2</span>
            </div>

            {filteredCommands.map((entry) => {
              const isSelected = selectedEntry?.id === entry.id;

              return (
                <div 
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? themeConfig.cardSelected
                      : themeConfig.cardBase
                  }`}
                >
                  {/* Línea de Comando ejecutado con prompt */}
                  <div className="flex items-start gap-2">
                    <span className="opacity-60 text-[10px] select-none pt-0.5">[{entry.timestamp}]</span>
                    <span className={`${themeConfig.promptUser} select-none`}>root@installer:#</span>
                    <span className={`${themeConfig.commandText} flex-1 break-all`}>
                      {entry.command}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntry(entry);
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] font-sans bg-black/60 hover:bg-black/90 border border-slate-800 text-amber-300 transition-colors flex items-center gap-1 select-none shrink-0"
                      title="Ver qué hace este comando en el sistema y repercusión"
                    >
                      <HelpCircle className="w-3 h-3 text-amber-400" />
                      <span>¿Qué hace?</span>
                    </button>
                  </div>

                  {/* Salida estándar del comando (stdout / stderr) */}
                  {entry.output.length > 0 && (
                    <div className={`mt-2 pl-4 border-l-2 text-[11px] space-y-0.5 leading-relaxed font-mono ${themeConfig.outputBorder} ${themeConfig.outputTextColor}`}>
                      {entry.output.map((line, lIdx) => (
                        <div key={lIdx} className={line.includes('WARNING') || line.includes('Warning') ? 'text-amber-300 font-semibold' : ''}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Exit code indicator */}
                  <div className="mt-1 flex items-center justify-between text-[10px] opacity-70">
                    <span className="font-mono">return code: {entry.exitCode} (SUCCESS)</span>
                    <span className={`font-sans uppercase text-[9px] px-1.5 py-0.5 rounded ${themeConfig.tagClass}`}>
                      {entry.category}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Prompt parpadeante mientras instala */}
            {progressPct < 100 && (
              <div className="flex items-center gap-2 text-xs pt-2">
                <span className={`${themeConfig.promptUser}`}>root@installer:#</span>
                <span className={`w-2 h-4 animate-pulse inline-block ${themeConfig.cursorColor}`}></span>
                <span className="opacity-70 text-[11px] font-sans">
                  {isPaused ? '(Ejecución en pausa)' : 'Procesando siguiente bloque en segundo plano...'}
                </span>
              </div>
            )}

            <div ref={terminalEndRef} />
          </div>

          {/* Panel Lateral: Inspector Didáctico del Comando Seleccionado */}
          <div className={`w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l p-4 flex flex-col justify-between overflow-y-auto text-xs ${themeConfig.sidePanelBorder} ${themeConfig.sidePanelBg}`}>
            {selectedEntry ? (
              <div className="space-y-4">
                <div className={`flex items-center justify-between border-b pb-2 ${themeConfig.sidePanelBorder}`}>
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold font-sans text-xs">Foco Formativo del Comando</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEntry(null)}
                    className="opacity-70 hover:opacity-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-sans opacity-70 block">Comando analizado:</span>
                  <pre className="p-2 bg-black/80 rounded border border-slate-800 text-emerald-400 font-mono text-[11px] break-all whitespace-pre-wrap">
                    {selectedEntry.command}
                  </pre>
                </div>

                <div className="space-y-1.5 p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 text-amber-200">
                  <span className="font-bold text-amber-300 font-sans text-xs flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-amber-400" />
                    <span>Repercusión en el Hardware y Kernel:</span>
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
                    {selectedEntry.educationalNote}
                  </p>
                </div>

                <div className="space-y-2 text-[11px] font-sans opacity-85">
                  <div className={`flex justify-between py-1 border-b ${themeConfig.sidePanelBorder}`}>
                    <span className="opacity-70">Categoría técnica:</span>
                    <span className="font-semibold uppercase font-mono">{selectedEntry.category}</span>
                  </div>
                  <div className={`flex justify-between py-1 border-b ${themeConfig.sidePanelBorder}`}>
                    <span className="opacity-70">Estado de retorno:</span>
                    <span className="font-mono text-emerald-400">0 (OK)</span>
                  </div>
                  <div className={`flex justify-between py-1 border-b ${themeConfig.sidePanelBorder}`}>
                    <span className="opacity-70">Momento de ejecución:</span>
                    <span className="font-mono">{selectedEntry.timestamp}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center opacity-70 space-y-3 my-auto">
                <div className="w-10 h-10 rounded-full bg-black/40 border border-slate-800 flex items-center justify-center mx-auto text-amber-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs font-sans">Inspector de Comandos</h4>
                  <p className="text-[11px] mt-1 leading-relaxed font-sans">
                    Haz clic en cualquier comando de la consola para ver qué hace a bajo nivel en los sectores del disco y qué consecuencias tiene.
                  </p>
                </div>
              </div>
            )}

            <div className="p-2.5 rounded bg-black/60 border border-slate-800/80 text-[10px] font-sans mt-4 opacity-80">
              Tip: Puedes alternar en cualquier momento entre los temas estéticos <strong>Dark Modern</strong>, <strong>Classic CRT</strong> y <strong>Matrix Green</strong> desde la barra de herramientas superior.
            </div>
          </div>
        </div>

        {/* 4. Barra Inferior del Overlay */}
        <div className={`p-2.5 border-t flex items-center justify-between text-xs select-none relative z-20 ${themeConfig.bottomBarBg}`}>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Progreso del despliegue: <strong className="font-mono">{progressPct}%</strong></span>
            <span>·</span>
            <span>Unidad objetivo: <strong className="font-mono">{state.disk.devicePath}</strong></span>
            <span>·</span>
            <span className="hidden sm:inline">Tema activo: <strong>{themeConfig.name}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition-colors font-sans"
            >
              Cerrar Terminal (Volver a Vista Principal)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
