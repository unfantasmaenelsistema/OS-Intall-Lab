import { DiskDevice, OSType } from '../types/installer';

export interface PartitionPreset {
  id: string;
  name: string;
  osType: OSType;
  description: string;
  useLvm: boolean;
  lvmGroupName?: string;
  useWholeDiskEncryption: boolean;
  diskEncryptionPassphrase?: string;
  generateDisk: (totalMB: number) => DiskDevice;
}

export const PARTITION_PRESETS: PartitionPreset[] = [
  {
    id: 'linux_simple',
    name: 'Linux Estándar (UEFI + ext4 + Swap)',
    osType: 'linux',
    description: 'Esquema clásico y robusto para estaciones de trabajo y servidores básicos sin LVM.',
    useLvm: false,
    useWholeDiskEncryption: false,
    generateDisk: (totalMB: number) => {
      const efiSize = 512;
      const swapSize = 8192;
      const rootSize = Math.max(10240, totalMB - efiSize - swapSize);

      return {
        id: 'nvme0n1',
        devicePath: '/dev/nvme0n1',
        model: 'Samsung 980 PRO NVMe SSD',
        totalSizeMB: totalMB,
        tableType: 'gpt',
        partitions: [
          {
            id: 'part-1',
            name: '/dev/nvme0n1p1',
            mountPoint: '/boot/efi',
            fsType: 'vfat',
            sizeMB: efiSize,
            flags: ['esp', 'boot'],
            description: 'Partición del Sistema EFI para arranque UEFI'
          },
          {
            id: 'part-2',
            name: '/dev/nvme0n1p2',
            mountPoint: '/',
            fsType: 'ext4',
            sizeMB: rootSize,
            description: 'Sistema de archivos raíz principal en ext4'
          },
          {
            id: 'part-3',
            name: '/dev/nvme0n1p3',
            mountPoint: 'swap',
            fsType: 'swap',
            sizeMB: swapSize,
            description: 'Área de intercambio de memoria virtual'
          }
        ]
      };
    }
  },
  {
    id: 'linux_enterprise_luks_lvm',
    name: 'Servidor Empresarial (LUKS + LVM + XFS)',
    osType: 'linux',
    description: 'Esquema corporativo Red Hat / Enterprise Linux con cifrado completo dm-crypt/LUKS2 y volúmenes LVM dinámicos.',
    useLvm: true,
    lvmGroupName: 'vg_system',
    useWholeDiskEncryption: true,
    diskEncryptionPassphrase: 'SuperSecretAdminKey2026!',
    generateDisk: (totalMB: number) => {
      const efiSize = 512;
      const bootSize = 1024;
      const remaining = totalMB - efiSize - bootSize;
      const rootSize = 35840; // 35 GB
      const varSize = 25600; // 25 GB
      const swapSize = 8192; // 8 GB
      const homeSize = Math.max(10240, remaining - rootSize - varSize - swapSize);

      return {
        id: 'nvme0n1',
        devicePath: '/dev/nvme0n1',
        model: 'Samsung 980 PRO NVMe SSD',
        totalSizeMB: totalMB,
        tableType: 'gpt',
        partitions: [
          {
            id: 'part-1',
            name: '/dev/nvme0n1p1',
            mountPoint: '/boot/efi',
            fsType: 'vfat',
            sizeMB: efiSize,
            flags: ['esp', 'boot'],
            description: 'Partición del Sistema EFI (no cifrada para arranque firmware)'
          },
          {
            id: 'part-2',
            name: '/dev/nvme0n1p2',
            mountPoint: '/boot',
            fsType: 'xfs',
            sizeMB: bootSize,
            description: 'Arranque Linux: contiene vmlinuz e initramfs'
          },
          {
            id: 'part-3',
            name: '/dev/mapper/vg_system-lv_root',
            mountPoint: '/',
            fsType: 'xfs',
            sizeMB: rootSize,
            isLvmLV: true,
            lvmLVName: 'lv_root',
            lvmVG: 'vg_system',
            isEncrypted: true,
            encryptionType: 'luks2',
            description: 'Volumen Lógico Raíz cifrado en XFS de alto rendimiento'
          },
          {
            id: 'part-4',
            name: '/dev/mapper/vg_system-lv_var',
            mountPoint: '/var',
            fsType: 'xfs',
            sizeMB: varSize,
            isLvmLV: true,
            lvmLVName: 'lv_var',
            lvmVG: 'vg_system',
            isEncrypted: true,
            encryptionType: 'luks2',
            description: 'Aislamiento de logs, bases de datos y spoolers'
          },
          {
            id: 'part-5',
            name: '/dev/mapper/vg_system-lv_home',
            mountPoint: '/home',
            fsType: 'ext4',
            sizeMB: homeSize,
            isLvmLV: true,
            lvmLVName: 'lv_home',
            lvmVG: 'vg_system',
            isEncrypted: true,
            encryptionType: 'luks2',
            description: 'Espacio personal de usuarios cifrado'
          },
          {
            id: 'part-6',
            name: '/dev/mapper/vg_system-lv_swap',
            mountPoint: 'swap',
            fsType: 'swap',
            sizeMB: swapSize,
            isLvmLV: true,
            lvmLVName: 'lv_swap',
            lvmVG: 'vg_system',
            isEncrypted: true,
            encryptionType: 'luks2',
            description: 'Swap cifrado para prevenir filtración de datos de memoria'
          }
        ]
      };
    }
  },
  {
    id: 'linux_btrfs_snapshots',
    name: 'Modern Workstation (Btrfs con Snapshots)',
    osType: 'linux',
    description: 'Esquema moderno con sistema Copy-on-Write Btrfs para rollback instantáneo y protección contra corrupción silenciosa.',
    useLvm: false,
    useWholeDiskEncryption: false,
    generateDisk: (totalMB: number) => {
      const efiSize = 512;
      const swapSize = 8192;
      const remaining = totalMB - efiSize - swapSize;
      const rootSize = Math.floor(remaining * 0.4);
      const homeSize = remaining - rootSize;

      return {
        id: 'nvme0n1',
        devicePath: '/dev/nvme0n1',
        model: 'Samsung 980 PRO NVMe SSD',
        totalSizeMB: totalMB,
        tableType: 'gpt',
        partitions: [
          {
            id: 'part-1',
            name: '/dev/nvme0n1p1',
            mountPoint: '/boot/efi',
            fsType: 'vfat',
            sizeMB: efiSize,
            flags: ['esp', 'boot'],
            description: 'Partición EFI'
          },
          {
            id: 'part-2',
            name: '/dev/nvme0n1p2',
            mountPoint: '/',
            fsType: 'btrfs',
            sizeMB: rootSize,
            description: 'Raíz Btrfs (admite subvolumen @, compresión zstd e instantáneas)'
          },
          {
            id: 'part-3',
            name: '/dev/nvme0n1p3',
            mountPoint: '/home',
            fsType: 'btrfs',
            sizeMB: homeSize,
            description: 'Partición Btrfs independiente para /home con snapshots propios'
          },
          {
            id: 'part-4',
            name: '/dev/nvme0n1p4',
            mountPoint: 'swap',
            fsType: 'swap',
            sizeMB: swapSize,
            description: 'Swap'
          }
        ]
      };
    }
  },
  {
    id: 'windows_server_standard',
    name: 'Windows Server 2025 (NTFS + ReFS Storage Pool)',
    osType: 'windows',
    description: 'Esquema recomendado para Windows Server con partición del SO en NTFS y volumen de datos en ReFS para VMs Hyper-V.',
    useLvm: false,
    useWholeDiskEncryption: false,
    generateDisk: (totalMB: number) => {
      const efiSize = 512;
      const msrSize = 16;
      const remaining = totalMB - efiSize - msrSize;
      const cSize = Math.min(122880, Math.floor(remaining * 0.5)); // ~120 GB
      const dSize = remaining - cSize;

      return {
        id: 'disk0',
        devicePath: 'Disco 0',
        model: 'Samsung 980 PRO NVMe SSD',
        totalSizeMB: totalMB,
        tableType: 'gpt',
        partitions: [
          {
            id: 'part-1',
            name: 'Disco 0 Partición 1 (Sistema)',
            mountPoint: '/boot/efi',
            fsType: 'vfat',
            sizeMB: efiSize,
            flags: ['esp', 'sistema'],
            description: 'Partición de sistema EFI (FAT32)'
          },
          {
            id: 'part-2',
            name: 'Disco 0 Partición 2 (MSR)',
            mountPoint: undefined,
            fsType: 'raw',
            sizeMB: msrSize,
            flags: ['msr'],
            description: 'Partición reservada de Microsoft (MSR)'
          },
          {
            id: 'part-3',
            name: 'Disco 0 Partición 3 (Principal C:)',
            mountPoint: 'C:',
            fsType: 'ntfs',
            sizeMB: cSize,
            description: 'Volumen del Sistema Operativo Windows Server en NTFS'
          },
          {
            id: 'part-4',
            name: 'Disco 0 Partición 4 (Almacenamiento D:)',
            mountPoint: 'D:',
            fsType: 'refs',
            sizeMB: dSize,
            description: 'Volumen de alta integridad ReFS para VMs Hyper-V'
          }
        ]
      };
    }
  }
];
