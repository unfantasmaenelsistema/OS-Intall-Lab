import { FilesystemType } from '../types/installer';

export interface FsInfo {
  name: string;
  label: string;
  badge: string;
  os: 'Linux' | 'Windows' | 'Cross-platform';
  description: string;
  strengths: string[];
  weaknesses: string[];
  idealUseCases: string[];
  technicalSpecs: {
    maxFileSize: string;
    maxFsSize: string;
    journaling: string;
    cowSupport: boolean;
    shrinkable: boolean;
    snapshotSupport: boolean;
  };
  educationalRepercussion: string;
}

export const FILESYSTEMS_INFO: Record<FilesystemType, FsInfo> = {
  ext4: {
    name: 'ext4',
    label: 'Fourth Extended Filesystem',
    badge: 'Estándar Linux',
    os: 'Linux',
    description: 'El sistema de archivos más maduro y fiable del ecosistema GNU/Linux. Introdujo asignación retrasada (delayed allocation) y extensiones (extents).',
    strengths: [
      'Fiabilidad probada durante más de 15 años',
      'Excelente compatibilidad con cualquier herramienta o distro',
      'Permite desfragmentación y comprobación de integridad con fsck veloz',
      'Capacidad de redimensionarse tanto en aumento como en reducción (offline)'
    ],
    weaknesses: [
      'Sin soporte nativo de instantáneas (snapshots) a nivel de sistema de archivos (depende de LVM)',
      'No tiene protección nativa contra corrupción silenciosa (bit-rot sin checksum de datos)',
      'Escalabilidad menor que XFS en almacenamiento masivo multinodo'
    ],
    idealUseCases: ['Partición raíz (/), /home en equipos de escritorio y servidores estándar.'],
    technicalSpecs: {
      maxFileSize: '16 TiB',
      maxFsSize: '1 EiB',
      journaling: 'Sí (Ordered, Journal, Writeback)',
      cowSupport: false,
      shrinkable: true,
      snapshotSupport: false
    },
    educationalRepercussion: 'Al elegir ext4 garantizas estabilidad máxima y compatibilidad con cualquier cargador de arranque o herramienta forense. Si cometes un error en el tamaño, podrás reducirlo posteriormente si está desmontado.'
  },
  xfs: {
    name: 'xfs',
    label: 'Silicon Graphics XFS',
    badge: 'Empresarial Red Hat / SLES',
    os: 'Linux',
    description: 'Sistema de archivos de 64 bits con asignación basada en B-Trees y múltiples Allocation Groups (AGs) para operaciones de E/S altamente paralelas.',
    strengths: [
      'Rendimiento sobresaliente en ficheros grandes y E/S multihilo concurrente',
      'Estandarizado como predeterminado en Red Hat Enterprise Linux (RHEL) y Rocky/CentOS',
      'Metadatos protegidos con sumas de comprobación CRC32c'
    ],
    weaknesses: [
      'NO SE PUEDE REDUCIR (shrink) de tamaño jamás; una vez ampliado o creado, solo puede crecer',
      'Mayor consumo de metadatos en ficheros diminutos respecto a ext4'
    ],
    idealUseCases: ['Servidores de bases de datos (PostgreSQL, MariaDB), big data, partición raíz en servidores empresariales.'],
    technicalSpecs: {
      maxFileSize: '8 EiB',
      maxFsSize: '8 EiB',
      journaling: 'Sí (Metadata Journaling)',
      cowSupport: true,
      shrinkable: false,
      snapshotSupport: false
    },
    educationalRepercussion: 'REPERCUSIÓN CRÍTICA: XFS es ultra rápido en servidores de producción, pero una vez asignado el tamaño de la partición NO PODRÁS DISMINUIRLO. Si sobredimensionas una partición XFS, el espacio queda fijado permanentemente a menos que reformatees y restaures copia de seguridad.'
  },
  btrfs: {
    name: 'btrfs',
    label: 'B-tree Filesystem (Butter / B-tree FS)',
    badge: 'Copy-on-Write & Snapshots',
    os: 'Linux',
    description: 'Sistema de archivos avanzado con diseño Copy-on-Write (CoW), gestión integrada de volúmenes RAID, sumas de verificación de datos y metadatos, y subvolúmenes dinámicos.',
    strengths: [
      'Instantáneas (snapshots) casi instantáneas y sin coste de espacio inicial',
      'Detección y autorreparación de corrupción silenciosa (bit-rot)',
      'Subvolúmenes que comparten un mismo grupo de almacenamiento dinámico (como @ y @home)',
      'Compresión transparente al vuelo (zstd, lzo)'
    ],
    weaknesses: [
      'Comportamiento de fragmentación en archivos grandes modificados aleatoriamente (como máquinas virtuales .qcow2 o motores de base de datos) si no se activa la bandera nodatacow',
      'Mayor consumo de CPU debido a cálculo continuo de checksums y asignación CoW'
    ],
    idealUseCases: ['Estaciones de trabajo modernas (Fedora, openSUSE), estaciones de desarrollo, snapshots automáticos con Snapper/Timeshift antes de actualizaciones.'],
    technicalSpecs: {
      maxFileSize: '16 EiB',
      maxFsSize: '16 EiB',
      journaling: 'No necesario (diseño CoW inherente)',
      cowSupport: true,
      shrinkable: true,
      snapshotSupport: true
    },
    educationalRepercussion: 'Permite crear instantáneas del sistema antes de actualizar paquetes (`dnf` o `apt`). Si una actualización rompe el arranque, puedes volver atrás en segundos. Sin embargo, en bases de datos con escrituras continuas necesitarás deshabilitar CoW para no fragmentar el rendimiento.'
  },
  vfat: {
    name: 'vfat',
    label: 'FAT32 (VFAT) - EFI System',
    badge: 'Obligatorio UEFI',
    os: 'Cross-platform',
    description: 'Formato estándar compatible con la especificación UEFI (Unified Extensible Firmware Interface) para la partición ESP (/boot/efi).',
    strengths: [
      'Leído directamente por el firmware de la placa base UEFI sin drivers de SO',
      'Soportado de forma nativa por absolutamente todos los sistemas operativos'
    ],
    weaknesses: [
      'Sin permisos de usuario POSIX ni journaling',
      'Límite de archivo de 4 GiB (irrelevante para cargadores de arranque EFI que pesan pocos MiB)'
    ],
    idealUseCases: ['Partición de arranque UEFI (/boot/efi) con bandera ESP (EFI System Partition). Tamaño recomendado: 512 MiB a 1 GiB.'],
    technicalSpecs: {
      maxFileSize: '4 GiB',
      maxFsSize: '2 TiB',
      journaling: 'No',
      cowSupport: false,
      shrinkable: true,
      snapshotSupport: false
    },
    educationalRepercussion: 'Sin esta partición en modo UEFI, la máquina simplemente no arrancará. La BIOS/UEFI busca un archivo `\\EFI\\BOOT\\BOOTX64.EFI` o `\\EFI\\fedora\\shimx64.efi` en un sistema FAT32 para iniciar el sistema.'
  },
  swap: {
    name: 'swap',
    label: 'Espacio de Intercambio (Swap)',
    badge: 'Memoria Virtual',
    os: 'Linux',
    description: 'Área dedicada del disco que el kernel Linux utiliza como memoria virtual cuando la memoria RAM física se llena, y para almacenar la imagen de hibernación (Suspend to Disk).',
    strengths: [
      'Evita que el OOM Killer (Out Of Memory) mate procesos críticos cuando se agota la RAM',
      'Permite hibernar el equipo guardando el estado completo de la memoria',
      'Permite al kernel mover páginas anónimas poco usadas fuera de la RAM para maximizar la caché de páginas de disco'
    ],
    weaknesses: [
      'El acceso a disco/SSD es órdenes de magnitud más lento que la RAM física (provoca thrashing si se satura)'
    ],
    idealUseCases: ['Partición swap dedicada o fichero swapfile. Recomendación: RAM <= 4GB: Swap = RAM x 1.5; RAM 8-16GB: Swap = 4-8GB.'],
    technicalSpecs: {
      maxFileSize: 'N/A',
      maxFsSize: 'N/A',
      journaling: 'No',
      cowSupport: false,
      shrinkable: true,
      snapshotSupport: false
    },
    educationalRepercussion: 'Si no creas swap y la máquina tiene poca RAM, un pico de consumo cerrará forzosamente servicios sin aviso. Si vas a usar hibernación, la swap debe ser al menos igual al tamaño de la RAM.'
  },
  ntfs: {
    name: 'ntfs',
    label: 'New Technology File System (NTFS)',
    badge: 'Estándar Windows',
    os: 'Windows',
    description: 'Sistema de archivos por defecto para Windows Server y Windows cliente, con listas de control de acceso (ACLs), compresión, cifrado EFS y diario USN.',
    strengths: [
      'Integración total con Active Directory y descriptores de seguridad de Windows',
      'Gran robustez frente a caídas repentinas de energía gracias al journal de metadatos'
    ],
    weaknesses: [
      'Soporte limitado en Linux sin controladores fuse o ntfs3 del kernel',
      'Susceptible a fragmentación a lo largo del tiempo'
    ],
    idealUseCases: ['Volumen del sistema operativo Windows Server (Unidad C:), almacenamiento general de archivos.'],
    technicalSpecs: {
      maxFileSize: '16 TiB',
      maxFsSize: '256 TiB',
      journaling: 'Sí ($LogFile)',
      cowSupport: false,
      shrinkable: true,
      snapshotSupport: true
    },
    educationalRepercussion: 'En Windows Server, la partición del sistema C: debe ser obligatoriamente NTFS. No es posible instalar el kernel de Windows en ReFS.'
  },
  refs: {
    name: 'refs',
    label: 'Resilient File System (ReFS)',
    badge: 'Windows Server Resiliente',
    os: 'Windows',
    description: 'Sistema de archivos avanzado de Microsoft para Windows Server diseñado para maximizar la disponibilidad de datos, escalabilidad masiva y clonación de bloques.',
    strengths: [
      'Integridad automática con sumas de verificación para evitar corrupción silenciosa',
      'Clonación acelerada de bloques para discos virtuales Hyper-V (.vhdx)',
      'Asignación optimizada para volúmenes Storage Spaces y grandes servidores de virtualización'
    ],
    weaknesses: [
      'No admite arranque del sistema operativo principal (no puede ser C:)',
      'No soporta compresión de archivos ni cuotas NTFS tradicionales'
    ],
    idealUseCases: ['Volúmenes secundarios dedicados para máquinas virtuales Hyper-V, servidores de copia de seguridad (Veeam) y grandes depósitos de datos.'],
    technicalSpecs: {
      maxFileSize: '35 PB',
      maxFsSize: '35 PB',
      journaling: 'Diseño B+ Tree CoW',
      cowSupport: true,
      shrinkable: false,
      snapshotSupport: true
    },
    educationalRepercussion: 'Excelente para crear un volumen D: en Windows Server para máquinas virtuales de alto rendimiento, pero NUNCA debes formatear el volumen de arranque C: en ReFS o la instalación fallará.'
  },
  raw: {
    name: 'raw',
    label: 'Sin Formato / Sin Asignar',
    badge: 'Espacio Libre',
    os: 'Cross-platform',
    description: 'Espacio sin formatear utilizado para particiones de arranque especiales (como bios_grub en GPT con BIOS clásica) o espacio libre reservado.',
    strengths: ['Permite que herramientas de bajo nivel escriban código binario directamente'],
    weaknesses: ['Inutilizable por usuarios para guardar archivos'],
    idealUseCases: ['Partición bios_grub (1 MiB) en discos GPT cuando el equipo arranca en modo BIOS tradicional.'],
    technicalSpecs: {
      maxFileSize: 'N/A',
      maxFsSize: 'N/A',
      journaling: 'No',
      cowSupport: false,
      shrinkable: false,
      snapshotSupport: false
    },
    educationalRepercussion: 'Si arrancas un disco GPT en placa base antigua sin UEFI, GRUB necesita 1 MB sin formato con bandera bios_grub para incrustar su etapa de arranque.'
  }
};

export interface MountPointGuidance {
  mountPoint: string;
  recommendedSize: string;
  minimumSize: string;
  suggestedFs: FilesystemType[];
  description: string;
  whySeparate: string;
  securityImpact: string;
}

export const MOUNT_POINTS_GUIDANCE: Record<string, MountPointGuidance> = {
  '/': {
    mountPoint: '/',
    recommendedSize: '25-50 GB',
    minimumSize: '10 GB',
    suggestedFs: ['ext4', 'xfs', 'btrfs'],
    description: 'Directorio raíz donde reside la estructura completa del sistema operativo (/usr, /etc, /bin, /lib).',
    whySeparate: 'Obligatorio en todos los sistemas Linux. Puede ser el único si se elige un particionado simple.',
    securityImpact: 'Si no se separan /home o /var, una descarga gigante o un desbordamiento de logs en /var llenará la raíz y bloqueará el sistema impidiendo el inicio de sesión.'
  },
  '/boot': {
    mountPoint: '/boot',
    recommendedSize: '1-2 GB',
    minimumSize: '512 MB',
    suggestedFs: ['ext4', 'xfs'],
    description: 'Contiene los núcleos del kernel Linux (vmlinuz), los discos RAM iniciales (initramfs) y la configuración de GRUB.',
    whySeparate: 'Crucial cuando se usa cifrado completo de disco (LUKS) o LVM complejo, para que el gestor de arranque pueda leer el kernel sin necesidad de descifrar toda la raíz.',
    securityImpact: 'Puede montarse como solo lectura (`ro`) tras el arranque para prevenir alteraciones maliciosas del kernel.'
  },
  '/boot/efi': {
    mountPoint: '/boot/efi',
    recommendedSize: '512 MB - 1 GB',
    minimumSize: '256 MB',
    suggestedFs: ['vfat'],
    description: 'Partición del Sistema EFI (ESP). Debe ser FAT32 para que el microcódigo de la placa base UEFI pueda leer los binarios .efi.',
    whySeparate: 'OBLIGATORIA en sistemas con firmware UEFI y tabla de particiones GPT.',
    securityImpact: 'Firmada mediante Secure Boot para certificar que el cargador shim y GRUB no han sido inyectados con malware de nivel ring-0.'
  },
  '/home': {
    mountPoint: '/home',
    recommendedSize: 'Variable (espacio restante)',
    minimumSize: '5 GB',
    suggestedFs: ['ext4', 'xfs', 'btrfs'],
    description: 'Directorios personales de los usuarios con sus documentos, configuraciones (~/.config) y descargas.',
    whySeparate: 'Permite reinstalar o actualizar la distribución Linux formateando `/` sin perder ni un solo dato personal de los usuarios.',
    securityImpact: 'Permite montar con opciones de seguridad estrictas como `nodev` y `nosuid` para evitar que usuarios ejecuten binarios que eleven privilegios.'
  },
  '/var': {
    mountPoint: '/var',
    recommendedSize: '15-40 GB',
    minimumSize: '5 GB',
    suggestedFs: ['xfs', 'ext4'],
    description: 'Datos variables del sistema: bases de datos (/var/lib/mysql), servidores web (/var/www), colas de correo y ficheros de registro (/var/log).',
    whySeparate: 'Evita ataques de denegación de servicio por llenado de disco provocado por registros (logs) masivos.',
    securityImpact: 'Aislar /var garantiza que los servicios continúen registrando eventos de auditoría incluso si el espacio del usuario se agota.'
  },
  'swap': {
    mountPoint: 'swap',
    recommendedSize: 'Equivalente a RAM (4-8 GB)',
    minimumSize: '1 GB',
    suggestedFs: ['swap'],
    description: 'Área de intercambio de memoria virtual en disco.',
    whySeparate: 'Evita fallos por falta de memoria RAM física (Out of Memory) y soporta hibernación.',
    securityImpact: 'Debe cifrarse si los datos en memoria contienen secretos empresariales, para que al apagarse la máquina no se puedan extraer claves desde el disco.'
  }
};

export interface TechConcept {
  id: string;
  title: string;
  shortDesc: string;
  category: 'Particionado' | 'Sistemas de Archivos' | 'LVM' | 'Cifrado' | 'Firmware';
  fullExplanation: string;
  pros: string[];
  cons: string[];
  realWorldScenario: string;
  commandSnippet?: string;
}

export const TECHNICAL_CONCEPTS: TechConcept[] = [
  {
    id: 'lvm',
    title: 'LVM (Logical Volume Management)',
    shortDesc: 'Abstracción flexible del almacenamiento por encima de las particiones físicas fijas.',
    category: 'LVM',
    fullExplanation: `El Administrador de Volúmenes Lógicos (LVM) introduce una capa entre los discos físicos y los sistemas de archivos:
1. **PV (Physical Volume)**: Discos o particiones asignados a LVM (p.ej. /dev/nvme0n1p2).
2. **VG (Volume Group)**: Fondo común de almacenamiento que agrupa uno o varios PVs (p.ej. 'vg_system').
3. **LV (Logical Volume)**: Volúmenes virtuales que se comportan como particiones dinámicas (p.ej. 'lv_root', 'lv_home').`,
    pros: [
      'Permite redimensionar volúmenes en caliente mientras el sistema está encendido (con `lvextend`)',
      'Permite añadir un nuevo disco físico al servidor e incorporarlo al mismo grupo sin reinstalar',
      'Soporta instantáneas (LVM snapshots) para copias de seguridad consistentes',
      'Permite distribuir almacenamiento en bandas (striping) o espejo (mirroring)'
    ],
    cons: [
      'Una capa adicional de complejidad conceptual y mantenimiento',
      'Si un PV falla sin redundancia en el VG, los volúmenes pueden verse comprometidos'
    ],
    realWorldScenario: 'En un servidor de producción que se queda sin espacio en /var, con LVM basta con ejecutar `lvextend -r -L +20G /dev/vg_system/lv_var` para duplicar el espacio en 2 segundos sin reiniciar.',
    commandSnippet: `pvcreate /dev/nvme0n1p3\nvgcreate vg_system /dev/nvme0n1p3\nlvcreate -L 30G -n lv_root vg_system\nlvcreate -l 100%FREE -n lv_home vg_system`
  },
  {
    id: 'luks',
    title: 'Cifrado de Disco LUKS (Linux Unified Key Setup)',
    shortDesc: 'Cifrado robusto a nivel de bloque para proteger los datos frente a robo físico o intrusiones.',
    category: 'Cifrado',
    fullExplanation: `LUKS2 es el estándar indiscutible para cifrado de almacenamiento en GNU/Linux. Funciona mediante el subsistema 'dm-crypt' del kernel.
- Se crea una cabecera segura en el disco con múltiples ranuras de claves (keyslots).
- La clave maestra del volumen se cifra con la contraseña del usuario mediante algoritmos de derivación resistentes a GPUs (Argon2id).
- Todo el volumen de datos pasa por un cifrado simétrico AES en modo XTS con claves de 256 o 512 bits.`,
    pros: [
      'Protección total frente al robo físico del portátil o retirada indebida de discos en un centro de datos',
      'Compatible con TPM 2.0 para desbloqueo automático seguro (con Clevis/systemd-cryptenroll)',
      'Gestión de múltiples contraseñas o claves de recuperación corporativas independientes'
    ],
    cons: [
      'Ligero impacto en latencia de CPU en operaciones intensivas de disco (mitigado por instrucciones AES-NI en procesadores modernos)',
      'Si pierdes la contraseña o se corrompe la cabecera LUKS sin copia de seguridad, los datos son IRRECUPERABLES'
    ],
    realWorldScenario: 'Obligatorio en cumplimiento de normativas GDPR, HIPAA y PCI-DSS para proteger datos personales de clientes frente al acceso físico a los servidores.',
    commandSnippet: `cryptsetup luksFormat --type luks2 --cipher aes-xts-plain64 /dev/nvme0n1p3\ncryptsetup open /dev/nvme0n1p3 cryptroot\n# Ahora /dev/mapper/cryptroot está disponible para LVM o formateo`
  },
  {
    id: 'uefi_vs_bios',
    title: 'Firmware: UEFI (GPT) vs BIOS Clásica (MBR)',
    shortDesc: 'Diferencia fundamental en cómo la placa base inicializa el hardware y localiza el cargador de arranque.',
    category: 'Firmware',
    fullExplanation: `**BIOS Clásica (Legacy MBR)**:
- Limitada a discos de hasta 2.2 Terabytes y un máximo de 4 particiones primarias.
- El arranque lee los primeros 512 bytes del disco (Master Boot Record) y ejecuta el código en modo real de 16 bits.

**UEFI (Modern GPT)**:
- Utiliza la tabla de particiones GUID (GPT), admitiendo hasta 128 particiones y discos de hasta 9.4 Zettabytes.
- Arranca en modo nativo de 64 bits y no ejecuta código crudo del MBR, sino que busca particiones formateadas en FAT32 con la bandera ESP y ejecuta binarios EFI firmados (.efi).`,
    pros: [
      'UEFI arranca mucho más rápido con soporte para Secure Boot',
      'GPT incluye redundancia con una tabla de particiones secundaria al final del disco',
      'Soporta direccionamiento de discos masivos modernos'
    ],
    cons: [
      'Requiere obligatoriamente crear una partición FAT32 dedicada (/boot/efi de al menos 256-512 MB)'
    ],
    realWorldScenario: 'Todos los equipos fabricados a partir de 2020 requieren UEFI. Configurar un instalador sin partición /boot/efi en modo UEFI provocará que la máquina no pueda iniciar tras la instalación.',
    commandSnippet: `# En GPT con UEFI:\nparted -s /dev/nvme0n1 mklabel gpt\nparted -s /dev/nvme0n1 mkpart "EFI System Partition" fat32 1MiB 513MiB\nparted -s /dev/nvme0n1 set 1 esp on`
  }
];
