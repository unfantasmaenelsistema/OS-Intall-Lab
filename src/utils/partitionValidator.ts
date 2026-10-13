import { DiskDevice, HardwareConfig, OSType, ValidationIssue } from '../types/installer';

/** Límite de direccionamiento de MBR con sectores de 512 bytes: 2^32 sectores = 2 TiB. */
export const MBR_MAX_DISK_MB = 2 * 1024 * 1024;
export const LINUX_ROOT_RECOMMENDED_MB = 20 * 1024;
/** Mínimo oficial de Microsoft para Windows Server 2025. */
export const WINDOWS_C_MINIMUM_MB = 32 * 1024;
export const WINDOWS_C_RECOMMENDED_MB = 60 * 1024;
export const RAM_CRITICAL_MB: Record<OSType, number> = { linux: 1024, windows: 2048 };
export const RAM_LOW_MB = 4096;

export function validatePartitionScheme(
  disk: DiskDevice,
  hardware: HardwareConfig,
  osType: OSType,
  useLvm: boolean,
  useEncryption: boolean
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const partitions = disk.partitions;

  const totalAssignedMB = partitions.reduce((sum, p) => sum + p.sizeMB, 0);

  // 1. Capacidad de disco
  if (totalAssignedMB > disk.totalSizeMB) {
    issues.push({
      id: 'disk-overflow',
      type: 'error',
      title: 'Espacio de almacenamiento desbordado',
      message: `El total de particiones asignadas (${(totalAssignedMB / 1024).toFixed(1)} GB) supera la capacidad del disco (${(disk.totalSizeMB / 1024).toFixed(1)} GB).`,
      technicalImpact: 'La tabla de particiones contiene cilindros/sectores que sobrepasan el LBA máximo del medio físico, causando fallos de I/O al escribir la tabla.',
      remedy: 'Reduce el tamaño de una o más particiones o elimina particiones no deseadas.'
    });
  }

  // 1.1 Límite de MBR
  if (disk.tableType === 'mbr' && disk.totalSizeMB > MBR_MAX_DISK_MB) {
    issues.push({
      id: 'mbr-over-2tib',
      type: 'error',
      title: 'Tabla MBR en un disco de más de 2 TiB',
      message: `El disco mide ${(disk.totalSizeMB / 1024 / 1024).toFixed(2)} TiB y MBR solo puede direccionar 2 TiB.`,
      technicalImpact: 'MBR almacena el LBA de inicio y el tamaño de cada partición en campos de 32 bits: con sectores de 512 bytes el máximo es 2^32 × 512 B = 2 TiB. El espacio por encima de ese límite queda inaccesible.',
      remedy: 'Usa una tabla de particiones GPT (con UEFI, o con una partición bios_grub si el firmware es BIOS).'
    });
  }

  // 2. Validación de Firmware vs Partición de Arranque
  if (hardware.firmware === 'uefi') {
    const efiPart = partitions.find(p => p.mountPoint === '/boot/efi' || p.flags?.includes('esp'));
    
    if (!efiPart) {
      issues.push({
        id: 'missing-efi',
        type: 'error',
        title: 'Falta partición EFI System Partition (/boot/efi)',
        message: 'La máquina virtual tiene firmware UEFI activo, pero no se ha configurado ninguna partición de arranque EFI.',
        technicalImpact: 'El firmware de la placa base (ROM UEFI) no podrá encontrar ningún archivo ejecutable PE32+ (como shimx64.efi, grubx64.efi o bootmgfw.efi). La máquina no iniciará y mostrará pantalla de "No bootable device found".',
        remedy: 'Crea una partición de entre 256 MB y 1 GB, formateada en FAT32 (vfat), montada en /boot/efi y con la bandera ESP activada.'
      });
    } else if (efiPart.fsType !== 'vfat') {
      issues.push({
        id: 'efi-wrong-fs',
        type: 'error',
        title: 'Sistema de archivos inválido para EFI',
        message: `La partición EFI está formateada como ${efiPart.fsType.toUpperCase()}. Debe ser FAT32/vfat.`,
        technicalImpact: 'La especificación estándar UEFI dictamina que el firmware de placa base solo sabe leer sistemas FAT12/FAT16/FAT32 de forma nativa sin controladores externos.',
        remedy: 'Cambia el sistema de archivos de la partición EFI a FAT32 (vfat).'
      });
    } else if (efiPart.sizeMB < 200) {
      issues.push({
        id: 'efi-too-small',
        type: 'warning',
        title: 'Partición EFI pequeña (< 200 MB)',
        message: `La partición EFI mide solo ${efiPart.sizeMB} MB. Se recomiendan al menos 512 MB.`,
        technicalImpact: 'Si se instalan múltiples kernels, cargadores de rescate o entradas dual-boot con Windows, el espacio de 200 MB se agotará pronto impidiendo actualizaciones del kernel.',
        remedy: 'Aumenta el tamaño a 512 MB o 1 GB.'
      });
    }
  } else {
    // BIOS clásica
    if (disk.tableType === 'gpt') {
      const biosGrubPart = partitions.find(p => p.flags && p.flags.includes('bios_grub'));
      if (!biosGrubPart) {
        issues.push({
          id: 'missing-bios-grub',
          type: 'warning',
          title: 'Aviso de arranque BIOS en tabla GPT',
          message: 'Estás usando BIOS Tradicional (Legacy) sobre una tabla GPT sin partición bios_grub.',
          technicalImpact: 'El MBR tradicional no tiene suficiente espacio entre el sector 0 y la primera partición para incrustar el core.img de GRUB en discos GPT.',
          remedy: 'Crea una partición de 1 o 2 MB sin formato (raw) con la bandera bios_grub para que el instalador de GRUB pueda incrustar su etapa 2.'
        });
      }
    }
  }

  // 3. Validación de Partición Raíz o Volumen C:
  if (osType === 'linux') {
    const rootPart = partitions.find(p => p.mountPoint === '/');
    if (!rootPart) {
      issues.push({
        id: 'missing-root',
        type: 'error',
        title: 'Falta partición Raíz (/)',
        message: 'No existe ninguna partición con punto de montaje en la raíz (/ mount point).',
        technicalImpact: 'Linux no tiene un árbol de directorios donde desplegar los binarios del kernel, /bin, /lib, /usr ni /etc. La instalación no puede proceder.',
        remedy: 'Asigna el punto de montaje "/" a una partición formateada en ext4, XFS o Btrfs.'
      });
    } else {
      if (rootPart.fsType === 'vfat' || rootPart.fsType === 'swap') {
        issues.push({
          id: 'invalid-root-fs',
          type: 'error',
          title: 'Sistema de archivos no apto para la raíz',
          message: `La raíz está configurada en ${rootPart.fsType.toUpperCase()}.`,
          technicalImpact: 'FAT32 carece de permisos Unix (rwxr-xr-x), sockets, enlaces duros y simbólicos, UID/GID. El sistema no funcionará.',
          remedy: 'Formatea la raíz en ext4, XFS o Btrfs.'
        });
      }

      if (rootPart.sizeMB < LINUX_ROOT_RECOMMENDED_MB) {
        issues.push({
          id: 'root-too-small',
          type: 'warning',
          title: 'Espacio en raíz potencialmente insuficiente',
          message: `La raíz tiene ${(rootPart.sizeMB / 1024).toFixed(1)} GB. El mínimo recomendado son ${LINUX_ROOT_RECOMMENDED_MB / 1024} GB.`,
          technicalImpact: `Por debajo de ${LINUX_ROOT_RECOMMENDED_MB / 1024} GB, la caché del gestor de paquetes (apt/dnf), las imágenes initramfs del kernel y los registros de auditoría llenarán el disco rápidamente.`,
          remedy: 'Amplía la raíz a al menos 20-30 GB.'
        });
      }

      // Consecuencia formativa de XFS
      if (rootPart.fsType === 'xfs') {
        issues.push({
          id: 'xfs-shrink-consequence',
          type: 'info',
          title: 'Repercusión XFS: Rendimiento óptimo, sin reducción',
          message: 'Has seleccionado XFS para la raíz.',
          technicalImpact: 'XFS ofrece excelente paralelismo multihilo en bases de datos y ficheros grandes. REPERCUSIÓN: XFS NO admite reducción (shrink). Una vez ampliado el volumen, no podrás recuperar espacio para dárselo a otra partición.',
          remedy: 'Tenlo en cuenta al dimensionar el volumen si piensas redistribuir espacio en el futuro.'
        });
      }

      // Consecuencia formativa de Btrfs
      if (rootPart.fsType === 'btrfs') {
        issues.push({
          id: 'btrfs-consequence',
          type: 'info',
          title: 'Repercusión Btrfs: Instantáneas y CoW activados',
          message: 'Has seleccionado Btrfs para la raíz.',
          technicalImpact: 'Podrás realizar snapshots instantáneos antes de actualizaciones del sistema con herramientas como Snapper o Timeshift. Protección automática contra bit-rot mediante sumas de verificación.',
          remedy: 'Si vas a ejecutar máquinas virtuales o bases de datos pesadas en esta partición, desactiva Copy-on-Write (nodatacow) en esos directorios para evitar fragmentación.'
        });
      }
    }

    // 4. Validación de Swap
    const swapPart = partitions.find(p => p.mountPoint === 'swap' || p.fsType === 'swap');
    if (!swapPart) {
      const ramGB = hardware.ramMB / 1024;
      issues.push({
        id: 'no-swap-warning',
        type: 'warning',
        title: 'Sin espacio Swap configurado',
        message: 'No has creado ninguna partición Swap.',
        technicalImpact: `Tu máquina tiene ${ramGB} GB de RAM. Si una aplicación sufre una fuga de memoria o un pico de tráfico, el kernel invocará de inmediato el OOM Killer (Out Of Memory Killer) para matar procesos como la base de datos o el servidor web. Además, la hibernación estará desactivada.`,
        remedy: `Recomendado crear una partición Swap de ${ramGB <= 4 ? ramGB * 1.5 : ramGB} GB.`
      });
    }

    // 5. Cifrado LUKS y /boot
    if (useEncryption) {
      const bootPart = partitions.find(p => p.mountPoint === '/boot');
      if (!bootPart) {
        issues.push({
          id: 'luks-without-separate-boot',
          type: 'warning',
          title: 'Cifrado completo: /boot dentro de LUKS2 (GRUB no soporta Argon2id)',
          message: 'Todo el disco está cifrado y no has creado una partición /boot independiente fuera de LUKS.',
          technicalImpact: 'GRUB tendrá que abrir el contenedor (GRUB_ENABLE_CRYPTODISK) antes de leer el kernel, y su módulo cryptodisk no implementa Argon2id: un keyslot LUKS2 con Argon2id (el valor por defecto de cryptsetup) deja el sistema sin arranque. El simulador formatea ese keyslot con PBKDF2, que es más débil frente a ataques con GPU, y además GRUB descifra sin aceleración y el arranque se alarga varios segundos.',
          remedy: 'Crea una partición /boot de 1 GB sin cifrar para vmlinuz e initramfs. Así el keyslot puede usar Argon2id y el desbloqueo lo hace el initramfs.'
        });
      }
    }

    // 6. LVM
    if (useLvm) {
      issues.push({
        id: 'lvm-benefit-info',
        type: 'info',
        title: 'Ventaja LVM: Flexibilidad de redimensionamiento dinámico',
        message: 'El sistema utilizará Volúmenes Lógicos (LVM).',
        technicalImpact: 'No estás atado a particiones fijas en sectores continuos del disco. Si más adelante añades un segundo disco SSD o necesitas aumentar /home, podrás ejecutar lvextend en caliente sin reiniciar la máquina.',
        remedy: 'Conserva un poco de espacio libre en el Grupo de Volúmenes para crear snapshots o ampliar volúmenes sobre la marcha.'
      });
    }

  } else {
    // Windows Server
    const cDrive = partitions.find(p => p.mountPoint === 'C:');
    if (!cDrive) {
      issues.push({
        id: 'missing-c-drive',
        type: 'error',
        title: 'Falta partición del sistema Windows (C:)',
        message: 'Windows Server requiere una partición primaria para instalar el sistema operativo.',
        technicalImpact: 'El instalador de Windows no tiene un volumen de destino asignado para descomprimir la imagen install.wim.',
        remedy: `Crea una partición de al menos ${WINDOWS_C_RECOMMENDED_MB / 1024} GB formateada en NTFS con punto de montaje C:.`
      });
    } else {
      if (cDrive.fsType === 'refs') {
        issues.push({
          id: 'windows-c-refs-error',
          type: 'error',
          title: 'ReFS no admitido para la partición de arranque C:',
          message: 'La unidad C: está formateada en ReFS (Resilient File System).',
          technicalImpact: 'El gestor de arranque de Windows NT (bootmgr) no admite iniciar el núcleo del sistema operativo desde un volumen formateado en ReFS. La instalación fallará.',
          remedy: 'Cambia el sistema de archivos de la unidad C: a NTFS.'
        });
      }
      if (cDrive.sizeMB < WINDOWS_C_MINIMUM_MB) {
        issues.push({
          id: 'c-drive-below-minimum',
          type: 'error',
          title: 'Partición C: por debajo del mínimo de Windows Server',
          message: `La partición C: mide ${(cDrive.sizeMB / 1024).toFixed(1)} GB. Microsoft exige al menos ${WINDOWS_C_MINIMUM_MB / 1024} GB.`,
          technicalImpact: 'El programa de instalación de Windows comprueba el espacio libre antes de aplicar install.wim y se niega a continuar en volúmenes por debajo del mínimo.',
          remedy: `Aumenta la partición C: a ${WINDOWS_C_RECOMMENDED_MB / 1024} GB o más.`
        });
      } else if (cDrive.sizeMB < WINDOWS_C_RECOMMENDED_MB) {
        issues.push({
          id: 'c-drive-small',
          type: 'warning',
          title: 'Partición C: reducida para Windows Server',
          message: `La partición C: mide ${(cDrive.sizeMB / 1024).toFixed(1)} GB. El mínimo recomendado es ${WINDOWS_C_RECOMMENDED_MB / 1024} GB.`,
          technicalImpact: 'El directorio WinSxS, las actualizaciones mensuales de Windows Update y el archivo de paginación pagefile.sys consumirán rápidamente el espacio.',
          remedy: `Aumenta el tamaño a ${WINDOWS_C_RECOMMENDED_MB / 1024} GB o más.`
        });
      }
    }

    // MSR obligatoria en discos GPT de Windows
    if (disk.tableType === 'gpt' && !partitions.some(p => p.flags?.includes('msr'))) {
      issues.push({
        id: 'windows-missing-msr',
        type: 'warning',
        title: 'Falta la partición reservada de Microsoft (MSR)',
        message: 'En discos GPT, Windows espera una partición MSR de 16 MB justo después de la ESP.',
        technicalImpact: 'La MSR reserva espacio para operaciones del sistema, como la conversión a disco dinámico o el cifrado BitLocker. Sin ella, esas operaciones pueden fallar y el instalador gráfico la crea siempre.',
        remedy: 'Añade una partición sin formato de 16 MB con la bandera msr entre la ESP y C:.'
      });
    }

    // Verificar si hay ReFS en unidad secundaria
    const refsDrive = partitions.find(p => p.fsType === 'refs' && p.mountPoint !== 'C:');
    if (refsDrive) {
      issues.push({
        id: 'windows-refs-benefit',
        type: 'info',
        title: 'Volumen ReFS configurado para datos de alta integridad',
        message: `El volumen ${refsDrive.mountPoint || 'secundario'} está formateado en ReFS.`,
        technicalImpact: 'Excelente elección para servidores de virtualización Hyper-V y copias de seguridad: aprovecha la clonación acelerada de bloques para discos VHDX y la detección de corrupción de datos mediante sumas de verificación.',
        remedy: 'Ideal para hospedar bases de datos o máquinas virtuales.'
      });
    }
  }

  // 7. Validación de Requisitos de Hardware y Detección de Fallos Físicos
  // 7.1. Falta de Memoria RAM para el Sistema Operativo
  const ramGB = hardware.ramMB / 1024;
  const ramCriticalMB = RAM_CRITICAL_MB[osType];
  if (hardware.ramMB < ramCriticalMB) {
    issues.push({
      id: 'hw-ram-critical',
      type: 'error',
      title: `Memoria RAM insuficiente para la instalación (< ${ramCriticalMB / 1024} GB)`,
      message: `El host solo tiene asignados ${ramGB} GB (${hardware.ramMB} MB) de memoria RAM física.`,
      technicalImpact: 'El instalador del sistema operativo se desbordará al cargar el entorno ramdisk initramfs / WinPE. Se producirá un kernel panic por Out-of-Memory (OOM) o bloqueo completo durante la descompresión de paquetes.',
      remedy: 'Aumenta la memoria RAM asignada a al menos 4 GB o 8 GB en el Paso 1 (Hardware).'
    });
  } else if (hardware.ramMB < RAM_LOW_MB) {
    issues.push({
      id: 'hw-ram-low',
      type: 'warning',
      title: `Memoria RAM ajustada (${ramCriticalMB / 1024} GB a ${RAM_LOW_MB / 1024} GB)`,
      message: `El sistema dispone de ${ramGB} GB de RAM. Es el límite mínimo para entornos de producción.`,
      technicalImpact: 'La compilación de módulos del kernel en tiempo de instalación (DKMS) o la ejecución de servicios en segundo plano podría experimentar ralentizaciones significativas.',
      remedy: 'Recomendado asignar 8 GB o más si planeas instalar entornos gráficos o contenedores.'
    });
  }

  // 7.2. Detección por Validador de Fallos de Hardware Inyectados
  if (hardware.failures) {
    if (hardware.failures.badSectors) {
      issues.push({
        id: 'hw-fault-bad-sectors',
        type: 'error',
        title: 'Fallo de Hardware: Sectores defectuosos detectados en disco',
        message: `El subsistema S.M.A.R.T. de ${disk.devicePath} reporta sectores no reasignables (LBA 4145674 I/O Error).`,
        technicalImpact: 'El formateo o la escritura de bloques ext4/NTFS en estos sectores fallará con EIO (Input/output error). El instalador quedará bloqueado o la tabla de particiones se corromperá irremediablemente.',
        remedy: 'Desactiva el fallo de sectores defectuosos en el inyector de hardware, o sustituye la unidad de disco por una sana.'
      });
    }

    if (hardware.failures.ramBitFlip) {
      issues.push({
        id: 'hw-fault-ram-bitflip',
        type: 'error',
        title: 'Fallo de Hardware: Inestabilidad y corrupción de RAM (MCE Bit-Flip)',
        message: 'El controlador de memoria reporta excepciones Machine Check Exception (MCE) por bit-flips continuos.',
        technicalImpact: 'Los archivos binarios y firmas criptográficas se corrompen en tránsito en la memoria RAM antes de grabarse en disco. Provocará fallos de suma de comprobación (checksum mismatch) y kernel panics repentinos.',
        remedy: 'Reemplaza los módulos DIMM defectuosos desactivando el bit-flip en el inyector de fallos de hardware.'
      });
    }

    if (hardware.failures.thermalThrottling) {
      issues.push({
        id: 'hw-fault-thermal-throttling',
        type: 'warning',
        title: 'Fallo de Hardware: Estrangulamiento térmico de CPU (104°C)',
        message: 'Los sensores PROCHOT indican que la CPU supera los 100°C con estrangulamiento de frecuencia severo.',
        technicalImpact: 'El procesador reduce sus frecuencias al mínimo (800 MHz) para evitar destrucción física. El proceso de instalación se ralentizará drásticamente y podría reiniciarse espontáneamente por disparo térmico.',
        remedy: 'Verifica la pasta térmica o desactiva la inyección de sobrecalentamiento en el panel de fallos de hardware.'
      });
    }

    if (hardware.failures.networkDisconnect) {
      issues.push({
        id: 'hw-fault-nic-down',
        type: 'warning',
        title: 'Fallo de Hardware: Adaptador de red desconectado (Link Down)',
        message: 'La tarjeta de red (NIC) principal no detecta portadora ni enlace físico (NO-CARRIER).',
        technicalImpact: 'El instalador no podrá conectarse a los repositorios ni descargar actualizaciones de seguridad ni paquetes adicionales durante la instalación.',
        remedy: 'Restaura el enlace de red en el inyector de fallos o continúa en modo offline con los paquetes locales del medio de arranque.'
      });
    }
  }

  return issues;
}
