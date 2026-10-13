import { DiskDevice, FilesystemType, PartitionItem } from '../types/installer';

/** Desplazamiento inicial de 1 MiB: alineación estándar de parted/fdisk para SSD y discos 4Kn. */
export const FIRST_PARTITION_START_MIB = 1;

export interface PhysicalPartition {
  /** Número de partición en la tabla (1, 2, 3...). */
  number: number;
  /** Nodo de dispositivo del kernel (p. ej. /dev/nvme0n1p3 o /dev/sda3). */
  device: string;
  startMiB: number;
  endMiB: number;
  sizeMB: number;
  /** Nombre GPT (PARTLABEL) que se pasará a parted. */
  label: string;
  /** Tipo de sistema de archivos que entiende parted, si aplica. */
  partedFs?: string;
  /** 'lvm-pv' para la partición contenedora del grupo de volúmenes. */
  role: 'regular' | 'lvm-pv';
  /** Ocupa el resto del disco: parted usará "100%" como final. */
  fillsDisk?: boolean;
  /** Partición del modelo a la que corresponde (no existe para el PV implícito). */
  source?: PartitionItem;
}

export interface DiskLayout {
  physical: PhysicalPartition[];
  logicalVolumes: PartitionItem[];
  /** Partición física sobre la que se crea el contenedor LUKS (si hay cifrado). */
  luksBacking?: PhysicalPartition;
  /** Dispositivo que se inicializa como PV de LVM (partición o /dev/mapper/cryptroot). */
  pvDevice?: string;
  /** Mapa id de partición del modelo -> dispositivo final a formatear/montar. */
  deviceFor: Record<string, string>;
}

/**
 * Nombre del nodo de partición según la convención del kernel:
 * si el disco termina en dígito (nvme0n1, mmcblk0, loop0) se añade "p".
 */
export function partitionDevice(diskPath: string, number: number): string {
  return /\d$/.test(diskPath) ? `${diskPath}p${number}` : `${diskPath}${number}`;
}

/** device-mapper duplica los guiones dentro de los nombres de VG/LV. */
export function lvMapperPath(vg: string, lv: string): string {
  return `/dev/mapper/${vg.replace(/-/g, '--')}-${lv.replace(/-/g, '--')}`;
}

/** Margen para la cabecera LUKS2 (16 MiB) y los metadatos de LVM. */
export const LVM_METADATA_MARGIN_MB = 64;

/**
 * Tamaño para lvcreate. Si los LV llenan el PV, el último toma el espacio
 * restante con -l 100%FREE, porque los metadatos ocupan algunos MiB.
 */
export function lvSizeSpec(layout: DiskLayout, lv: PartitionItem): string {
  const pv = layout.physical.find(pp => pp.role === 'lvm-pv');
  const lvTotal = layout.logicalVolumes.reduce((sum, v) => sum + v.sizeMB, 0);
  const isLast = layout.logicalVolumes[layout.logicalVolumes.length - 1] === lv;
  return pv && isLast && lvTotal + LVM_METADATA_MARGIN_MB > pv.sizeMB ? '-l 100%FREE' : `-L ${lv.sizeMB}M`;
}

/** Límite final tal como lo recibe parted. */
export function partedEnd(pp: PhysicalPartition): string {
  return pp.fillsDisk ? '100%' : `${pp.endMiB}MiB`;
}

export function partedFsType(fs: FilesystemType): string | undefined {
  switch (fs) {
    case 'vfat': return 'fat32';
    case 'swap': return 'linux-swap';
    case 'ext4':
    case 'xfs':
    case 'btrfs':
    case 'ntfs':
      return fs;
    default:
      return undefined;
  }
}

/**
 * Traduce el modelo de particiones del simulador (donde los volúmenes lógicos LVM
 * conviven en la misma lista que las particiones físicas) a la disposición real
 * en disco: particiones físicas con offsets, más una partición PV implícita que
 * aloja los volúmenes lógicos.
 */
export function computeDiskLayout(
  disk: DiskDevice,
  useLvm: boolean,
  useEncryption: boolean,
  lvmGroupName: string
): DiskLayout {
  const logicalVolumes = useLvm ? disk.partitions.filter(p => p.isLvmLV) : [];
  const physicalSources = disk.partitions.filter(p => !(useLvm && p.isLvmLV));

  const physical: PhysicalPartition[] = [];
  let cursor = FIRST_PARTITION_START_MIB;

  physicalSources.forEach(p => {
    const number = physical.length + 1;
    physical.push({
      number,
      device: partitionDevice(disk.devicePath, number),
      startMiB: cursor,
      endMiB: cursor + p.sizeMB,
      sizeMB: p.sizeMB,
      label: p.lvmLVName || mountLabel(p.mountPoint),
      partedFs: partedFsType(p.fsType),
      role: 'regular',
      source: p
    });
    cursor += p.sizeMB;
  });

  let pvPartition: PhysicalPartition | undefined;
  if (logicalVolumes.length > 0) {
    // Se reserva un 1% extra (mín. 64 MiB) para metadatos LVM y la cabecera LUKS2 (16 MiB).
    const lvTotal = logicalVolumes.reduce((sum, lv) => sum + lv.sizeMB, 0);
    const sizeMB = lvTotal + Math.max(LVM_METADATA_MARGIN_MB, Math.ceil(lvTotal * 0.01));
    const number = physical.length + 1;
    pvPartition = {
      number,
      device: partitionDevice(disk.devicePath, number),
      startMiB: cursor,
      endMiB: cursor + sizeMB,
      sizeMB,
      label: useEncryption ? 'cryptlvm' : 'lvm',
      role: 'lvm-pv'
    };
    physical.push(pvPartition);
  }

  // La última partición no puede invadir el final del disco (en GPT ahí está la tabla de respaldo).
  // Si el esquema llena el disco, se ajusta y parted la extiende hasta "100%".
  const last = physical[physical.length - 1];
  const usableEndMiB = disk.totalSizeMB - FIRST_PARTITION_START_MIB;
  if (last && last.endMiB > usableEndMiB && last.startMiB < usableEndMiB) {
    last.endMiB = usableEndMiB;
    last.sizeMB = usableEndMiB - last.startMiB;
    last.fillsDisk = true;
  }

  const deviceFor: Record<string, string> = {};
  physical.forEach(pp => {
    if (pp.source) deviceFor[pp.source.id] = pp.device;
  });

  let luksBacking: PhysicalPartition | undefined;
  let pvDevice: string | undefined;

  if (pvPartition) {
    luksBacking = useEncryption ? pvPartition : undefined;
    pvDevice = useEncryption ? '/dev/mapper/cryptroot' : pvPartition.device;
  } else if (useEncryption) {
    // Sin LVM se cifra directamente la partición raíz.
    luksBacking = physical.find(pp => pp.source?.mountPoint === '/');
    if (luksBacking?.source) deviceFor[luksBacking.source.id] = '/dev/mapper/cryptroot';
  }

  logicalVolumes.forEach(lv => {
    deviceFor[lv.id] = lvMapperPath(lvmGroupName, lv.lvmLVName || `lv_${lv.id}`);
  });

  return { physical, logicalVolumes, luksBacking, pvDevice, deviceFor };
}

function mountLabel(mountPoint?: string): string {
  if (!mountPoint) return 'data';
  if (mountPoint === '/') return 'root';
  if (mountPoint === 'swap') return 'swap';
  return mountPoint.replace(/^\//, '').replace(/\//g, '-') || 'data';
}
