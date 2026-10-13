import { ChallengeScenario } from '../types/installer';

export const CHALLENGE_SCENARIOS: ChallengeScenario[] = [
  {
    id: 'enterprise_luks_lvm',
    title: 'Servidor Empresarial Seguro (LUKS + LVM + XFS)',
    difficulty: 'Avanzado',
    targetOS: 'linux',
    description: 'Diseña un esquema de almacenamiento corporativo conforme a normativas de seguridad de datos. Requiere cifrado de disco completo LUKS, gestor de volúmenes LVM y el sistema de archivos de alto rendimiento XFS para la raíz.',
    requirementsSummary: [
      'Firmware UEFI con tabla de particiones GPT',
      'Partición EFI FAT32 montada en /boot/efi (>= 512 MiB)',
      'Partición de arranque no cifrada /boot en ext4 o xfs (>= 1024 MiB)',
      'Partición principal protegida con cifrado LUKS',
      'LVM activado sobre el contenedor seguro con Grupo de Volúmenes',
      'Volumen raíz (/) formateado en XFS (>= 20 GB)',
      'Volumen swap dedicado (>= 4 GB)'
    ],
    checkSuccess: (state) => {
      const feedback: string[] = [];
      let passed = true;

      if (state.osType !== 'linux') {
        feedback.push('El objetivo de este reto es una instalación de Linux.');
        return { completed: false, feedback };
      }

      if (state.hardware.firmware !== 'uefi') {
        feedback.push('El firmware debe ser UEFI.');
        passed = false;
      } else {
        feedback.push('Cumple: Firmware configurado en UEFI.');
      }

      const efiPart = state.disk.partitions.find(p => p.mountPoint === '/boot/efi');
      if (!efiPart || efiPart.fsType !== 'vfat' || efiPart.sizeMB < 400) {
        feedback.push('Falta la partición /boot/efi con sistema FAT32 (mínimo 512 MB).');
        passed = false;
      } else {
        feedback.push('Cumple: Partición /boot/efi en FAT32 detectada.');
      }

      const bootPart = state.disk.partitions.find(p => p.mountPoint === '/boot');
      if (!bootPart || bootPart.isEncrypted || bootPart.sizeMB < 900) {
        feedback.push('Falta la partición /boot externa (no cifrada, >= 1024 MB).');
        passed = false;
      } else {
        feedback.push('Cumple: Partición /boot independiente y accesible.');
      }

      if (!state.useWholeDiskEncryption) {
        feedback.push('El cifrado LUKS no está activado en el almacenamiento.');
        passed = false;
      } else {
        feedback.push('Cumple: Cifrado de disco LUKS activo.');
      }

      if (!state.useLvm) {
        feedback.push('Debes habilitar LVM (Logical Volume Management).');
        passed = false;
      } else {
        feedback.push('Cumple: Capa LVM habilitada.');
      }

      const rootPart = state.disk.partitions.find(p => p.mountPoint === '/');
      if (!rootPart) {
        feedback.push('Falta el volumen raíz (/ mount point).');
        passed = false;
      } else if (rootPart.fsType !== 'xfs') {
        feedback.push(`La raíz está formateada en ${rootPart.fsType.toUpperCase()}, pero el reto exige XFS por su alto rendimiento.`);
        passed = false;
      } else if (rootPart.sizeMB < 20000) {
        feedback.push('El volumen raíz debe tener al menos 20 GB.');
        passed = false;
      } else {
        feedback.push('Cumple: Raíz (/) configurada con sistema XFS (>= 20 GB).');
      }

      const swapPart = state.disk.partitions.find(p => p.mountPoint === 'swap' || p.fsType === 'swap');
      if (!swapPart || swapPart.sizeMB < 4000) {
        feedback.push('Falta volumen swap de al menos 4 GB.');
        passed = false;
      } else {
        feedback.push('Cumple: Espacio Swap asignado correctamente.');
      }

      return { completed: passed, feedback };
    }
  },
  {
    id: 'workstation_btrfs_snapshots',
    title: 'Estación de Trabajo con Btrfs y Respaldo /home',
    difficulty: 'Intermedio',
    targetOS: 'linux',
    description: 'Configura un equipo para desarrollo y productividad moderna que aproveche el sistema de archivos Copy-on-Write Btrfs en la raíz para instantáneas de rollback, junto con un /home separado.',
    requirementsSummary: [
      'Firmware UEFI con /boot/efi (FAT32)',
      'Partición raíz (/) formateada con Btrfs para snapshots automáticos',
      'Partición /home independiente para separar los datos personales de los binarios del SO',
      'Partición Swap para evitar saturación de memoria'
    ],
    checkSuccess: (state) => {
      const feedback: string[] = [];
      let passed = true;

      const efiPart = state.disk.partitions.find(p => p.mountPoint === '/boot/efi');
      if (!efiPart || efiPart.fsType !== 'vfat') {
        feedback.push('Falta /boot/efi en formato FAT32.');
        passed = false;
      } else {
        feedback.push('Cumple: Partición EFI presente.');
      }

      const rootPart = state.disk.partitions.find(p => p.mountPoint === '/');
      if (!rootPart || rootPart.fsType !== 'btrfs') {
        feedback.push('La partición raíz (/) debe estar formateada en Btrfs.');
        passed = false;
      } else {
        feedback.push('Cumple: Raíz configurada en Btrfs (soporte de snapshots).');
      }

      const homePart = state.disk.partitions.find(p => p.mountPoint === '/home');
      if (!homePart) {
        feedback.push('Falta partición dedicada para /home.');
        passed = false;
      } else {
        feedback.push('Cumple: Partición /home independiente detectada.');
      }

      const swapPart = state.disk.partitions.find(p => p.mountPoint === 'swap' || p.fsType === 'swap');
      if (!swapPart) {
        feedback.push('Falta partición swap para gestión de memoria.');
        passed = false;
      } else {
        feedback.push('Cumple: Memoria de intercambio Swap configurada.');
      }

      return { completed: passed, feedback };
    }
  },
  {
    id: 'windows_server_refs_storage',
    title: 'Windows Server 2025: Esquema Híbrido NTFS + ReFS',
    difficulty: 'Intermedio',
    targetOS: 'windows',
    description: 'Instala Windows Server con la partición del sistema C: en NTFS y un volumen secundario D: formateado con ReFS (Resilient File System) preparado para albergar discos duros virtuales Hyper-V.',
    requirementsSummary: [
      'Sistema Operativo Windows Server seleccionado',
      'Firmware UEFI',
      'Partición de Sistema EFI (FAT32)',
      'Partición primaria del sistema montada en C: formateada en NTFS',
      'Volumen secundario montado en D: formateado con ReFS'
    ],
    checkSuccess: (state) => {
      const feedback: string[] = [];
      let passed = true;

      if (state.osType !== 'windows') {
        feedback.push('Debes seleccionar el instalador de Windows Server.');
        return { completed: false, feedback };
      }

      const efiPart = state.disk.partitions.find(p => p.mountPoint === '/boot/efi' || p.flags?.includes('esp') || p.fsType === 'vfat');
      if (!efiPart) {
        feedback.push('Falta la partición de sistema EFI.');
        passed = false;
      } else {
        feedback.push('Cumple: Partición EFI de Windows presente.');
      }

      const cPart = state.disk.partitions.find(p => p.mountPoint === 'C:' || p.mountPoint === '/');
      if (!cPart || cPart.fsType !== 'ntfs') {
        feedback.push('La unidad del sistema C: debe estar formateada en NTFS.');
        passed = false;
      } else {
        feedback.push('Cumple: Unidad C: del sistema operativo en NTFS.');
      }

      const dPart = state.disk.partitions.find(p => p.mountPoint === 'D:' || p.mountPoint === '/data');
      if (!dPart || dPart.fsType !== 'refs') {
        feedback.push('Se requiere un volumen de almacenamiento secundario (D:) formateado en ReFS.');
        passed = false;
      } else {
        feedback.push('Cumple: Volumen D: formateado en ReFS para alta integridad.');
      }

      return { completed: passed, feedback };
    }
  }
];
