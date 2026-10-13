import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  HardDrive, 
  Layers, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  Terminal, 
  Zap, 
  Copy, 
  Check, 
  Info, 
  Filter, 
  HelpCircle,
  X
} from 'lucide-react';
import { HardwareConfig, InstallerState } from '../types/installer';

export type EventSeverity = 'info' | 'warning' | 'module' | 'driver' | 'hardware';

export interface SystemLogEvent {
  id: string;
  kernelTime: string; // e.g. [    0.000000]
  subsystem: 'ACPI/BIOS' | 'CPU/RAM' | 'STORAGE' | 'CRYPTO' | 'NETWORK' | 'MODULES' | 'SECURITY';
  severity: EventSeverity;
  message: string;
  educationalDetail: string;
  hardwareRepercussion: string;
}

interface SystemEventLogProps {
  state: InstallerState;
  currentProgressPct: number;
}

export const SystemEventLog: React.FC<SystemEventLogProps> = ({
  state,
  currentProgressPct
}) => {
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectedEvent, setInspectedEvent] = useState<SystemLogEvent | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Generar eventos cronológicos realistas del kernel y subsistemas de hardware
  const events = useMemo<SystemLogEvent[]>(() => {
    const list: SystemLogEvent[] = [];

    // 1. Inicialización de placa base y firmware
    list.push({
      id: 'evt-01',
      kernelTime: '[    0.000000]',
      subsystem: 'ACPI/BIOS',
      severity: state.hardware.firmware === 'uefi' ? 'info' : 'warning',
      message: state.hardware.firmware === 'uefi'
        ? 'efi: EFI v2.80 by American Megatrends: Tables: ACPI 2.0, SMBIOS 3.3, ESRT, MPS'
        : 'bios: Legacy PC-AT BIOS 1985 compatibility mode active. MBR 512-byte boot sector limit.',
      educationalDetail: 'El kernel Linux inspecciona los descriptores de la memoria CMOS/ROM. En modo UEFI, recibe tablas de configuración ACPI completas con soporte de 64 bits.',
      hardwareRepercussion: state.hardware.firmware === 'uefi'
        ? 'Permite arranque seguro Secure Boot y acceso al runtime de variables NVRAM para el cargador GRUB.'
        : 'Limita el arranque a interrupciones BIOS INT 13h con direccionamiento máximo de 2.2 TB sin tabla GPT.'
    });

    list.push({
      id: 'evt-02',
      kernelTime: '[    0.012450]',
      subsystem: 'ACPI/BIOS',
      severity: 'warning',
      message: 'ACPI: [Firmware Bug]: BIOS _OSI("Linux") query ignored; defaulting to "Windows 2022" ACPI profile.',
      educationalDetail: 'Muchos fabricantes de placas base no implementan métodos específicos de Linux en sus tablas DSDT de ACPI y fuerzan compatibilidad con Windows.',
      hardwareRepercussion: 'El kernel Linux activa de forma automática heurísticas de emulación para el control de energía C-States y ventiladores.'
    });

    if (state.hardware.secureBoot) {
      list.push({
        id: 'evt-03',
        kernelTime: '[    0.045120]',
        subsystem: 'SECURITY',
        severity: 'info',
        message: 'secureboot: Secure Boot enabled; loading Microsoft UEFI CA and vendor PK/KEK certs.',
        educationalDetail: 'Verifica las firmas de clave pública de la NVRAM para validar que la imagen de shimx64.efi y el kernel no han sufrido alteraciones extraoficiales.',
        hardwareRepercussion: 'Impide la carga de módulos de kernel de terceros sin firmar y restringe el acceso directo a la memoria física mediante /dev/mem.'
      });
    }

    // 2. CPU y Memoria
    list.push({
      id: 'evt-04',
      kernelTime: '[    0.120530]',
      subsystem: 'CPU/RAM',
      severity: 'hardware',
      message: `smpboot: CPU0: ${state.hardware.cpuCores} vCPUs enumerated (HyperThreading enabled).`,
      educationalDetail: 'El planificador CFS (Completely Fair Scheduler) de Linux inicializa los grupos de afinidad en cada hilo del procesador.',
      hardwareRepercussion: 'Permite procesar operaciones multihilo paralelas en el particionado y formateo con XFS (Allocation Groups concurrentes).'
    });

    list.push({
      id: 'evt-05',
      kernelTime: '[    0.158400]',
      subsystem: 'CPU/RAM',
      severity: 'hardware',
      message: `Memory: ${state.hardware.ramMB}MB available (142MB reserved for kernel code, data, and bss).`,
      educationalDetail: 'Mapeo de la memoria física mediante el árbol e820 y descriptores UEFI GetMemoryMap.',
      hardwareRepercussion: state.hardware.ramMB <= 4096
        ? 'Aviso: Memoria ajustada (<= 4 GB). La falta de partición swap provocará que el kernel invoque el OOM Killer ante picos de uso.'
        : 'Memoria suficiente para asignar búferes de lectura y escritura en la memoria caché de páginas de disco (Page Cache).'
    });

    // 3. Módulos de aceleración de hardware
    list.push({
      id: 'evt-06',
      kernelTime: '[    0.342100]',
      subsystem: 'MODULES',
      severity: 'module',
      message: 'systemd[1]: Inserted module \'aesni_intel\' (Intel AES-NI acceleration instructions).',
      educationalDetail: 'Carga el controlador del kernel para aprovechar las instrucciones vectoriales AES por hardware del microprocesador.',
      hardwareRepercussion: 'Reduce el impacto del cifrado de disco LUKS2 en un 85%, permitiendo velocidades de transferencia NVMe superiores a 3.5 GB/s sin saturar la CPU.'
    });

    list.push({
      id: 'evt-07',
      kernelTime: '[    0.412890]',
      subsystem: 'MODULES',
      severity: 'module',
      message: 'systemd[1]: Inserted module \'crc32c_intel\' (Hardware CRC32c calculation).',
      educationalDetail: 'Módulo del kernel para acelerar el cálculo de sumas de verificación mediante hardware SSE4.2.',
      hardwareRepercussion: 'Vital para XFS y Btrfs: acelera la validación de integridad de metadatos para detectar corrupción silenciosa de datos.'
    });

    // 4. Almacenamiento NVMe y Controladores
    list.push({
      id: 'evt-08',
      kernelTime: '[    0.892010]',
      subsystem: 'STORAGE',
      severity: 'driver',
      message: `nvme nvme0: pci 0000:01:00.0, NVMe SSD controller (64 I/O queues, 4096-byte LBA sectors).`,
      educationalDetail: 'Inicialización del bus PCIe y asignación de colas I/O Submission/Completion Queue en el controlador de estado sólido.',
      hardwareRepercussion: 'Optimiza la latencia de acceso a menos de 20 microsegundos en comparación con los discos SATA tradicionales (AHCI).'
    });

    list.push({
      id: 'evt-09',
      kernelTime: '[    0.941200]',
      subsystem: 'STORAGE',
      severity: 'hardware',
      message: `${state.disk.devicePath.replace('/dev/', '')}: ${Math.floor(state.disk.totalSizeMB * 2048)} 512-byte logical sectors (${(state.disk.totalSizeMB / 1024).toFixed(0)} GB / ${(state.disk.totalSizeMB / 1024 / 1.024).toFixed(0)} GiB)`,
      educationalDetail: 'El kernel detecta el tamaño geométrico total y el direccionamiento LBA (Logical Block Addressing).',
      hardwareRepercussion: 'Define el espacio exacto disponible para crear particiones sin desbordar los cilindros del dispositivo.'
    });

    // 5. Cifrado LUKS y Device Mapper
    if (state.useWholeDiskEncryption) {
      list.push({
        id: 'evt-10',
        kernelTime: '[    1.240500]',
        subsystem: 'CRYPTO',
        severity: 'module',
        message: 'systemd[1]: Inserted module \'dm_crypt\' (Device Mapper target for transparent disk encryption).',
        educationalDetail: 'Subsistema de cifrado de bloques virtuales del kernel Linux.',
        hardwareRepercussion: 'Permite a cryptsetup crear dispositivos en /dev/mapper/ que descifran datos al vuelo.'
      });

      list.push({
        id: 'evt-11',
        kernelTime: '[    1.820100]',
        subsystem: 'CRYPTO',
        severity: 'info',
        message: 'cryptsetup: /dev/nvme0n1p3 unlocked as /dev/mapper/cryptroot using cipher aes-xts-plain64 (512-bit).',
        educationalDetail: 'Derivación de clave maestra mediante Argon2id e inicialización del descriptor de bloques en memoria.',
        hardwareRepercussion: 'Protección absoluta contra acceso indebido si el disco es retirado del chasis del ordenador.'
      });
    }

    // 6. LVM (Logical Volume Management)
    if (state.useLvm) {
      list.push({
        id: 'evt-12',
        kernelTime: '[    2.150000]',
        subsystem: 'MODULES',
        severity: 'module',
        message: 'systemd[1]: Inserted module \'dm_mod\' (Kernel Device Mapper driver).',
        educationalDetail: 'Capa fundamental de Linux para abstraer dispositivos físicos y mapear bloques dinámicos.',
        hardwareRepercussion: 'Habilita LVM2, RAID por software y multipath sin necesidad de reiniciar la máquina.'
      });

      list.push({
        id: 'evt-13',
        kernelTime: '[    2.650400]',
        subsystem: 'STORAGE',
        severity: 'info',
        message: `lvm2: Volume Group '${state.lvmGroupName}' activated with ${state.disk.partitions.filter(p => p.isLvmLV).length} logical volumes.`,
        educationalDetail: 'Activación de la tabla de metadatos de volúmenes lógicos en memoria del kernel.',
        hardwareRepercussion: 'Permite a los administradores de sistemas redimensionar volúmenes en caliente (lvextend) sin tiempos de inactividad.'
      });
    }

    // 7. Sistemas de archivos montados
    state.disk.partitions.forEach(p => {
      if (p.fsType === 'xfs') {
        list.push({
          id: `evt-fs-xfs-${p.id}`,
          kernelTime: '[    3.410900]',
          subsystem: 'MODULES',
          severity: 'module',
          message: 'systemd[1]: Inserted module \'xfs\' (Silicon Graphics XFS filesystem driver with CRC metadatas).',
          educationalDetail: 'Carga el sistema de archivos de alto rendimiento XFS con paralelismo nativo en árboles B-Tree.',
          hardwareRepercussion: 'Excelente velocidad en bases de datos. REPERCUSIÓN: El kernel no soporta reducción de particiones XFS.'
        });
      } else if (p.fsType === 'btrfs') {
        list.push({
          id: `evt-fs-btrfs-${p.id}`,
          kernelTime: '[    3.450100]',
          subsystem: 'MODULES',
          severity: 'module',
          message: 'systemd[1]: Inserted module \'btrfs\' (B-tree CoW filesystem driver with zstd compression).',
          educationalDetail: 'Driver con arquitectura Copy-on-Write para soporte de snapshots e instantáneas sin coste inicial.',
          hardwareRepercussion: 'Permite recuperar versiones anteriores de archivos tras actualizaciones defectuosas.'
        });
      }
    });

    // 8. Red e Interfaces
    list.push({
      id: 'evt-14',
      kernelTime: '[    4.120400]',
      subsystem: 'NETWORK',
      severity: 'driver',
      message: 'virtio_net 0000:00:03.0 enp1s0: renamed network interface from eth0. Link is UP, 10000 Mbps Full Duplex.',
      educationalDetail: 'El subsistema udev aplica la nomenclatura predictiva de interfaces de red (Predictable Network Interface Names).',
      hardwareRepercussion: 'Garantiza que la interfaz de red no cambie de identificador entre reinicios cuando se añaden tarjetas PCIe adicionales.'
    });

    // 9. INYECCIÓN DE FALLOS DE HARDWARE EN TIEMPO REAL (Diagnostic Stress Test)
    if (state.hardwareFailures?.badSectors) {
      list.push({
        id: 'fail-bad-sectors',
        kernelTime: '[    4.520890]',
        subsystem: 'STORAGE',
        severity: 'warning',
        message: 'blk_update_request: I/O error, dev nvme0n1, sector 4145674 op 0x1:(WRITE) flags 0x800 phys_seg 1 prio class 2',
        educationalDetail: 'El controlador del kernel NVMe intentó escribir en un bloque físico de la memoria Flash NAND cuya celda está degradada. La controladora SSD reporta fallo de E/S irrecuperable (EIO 5).',
        hardwareRepercussion: 'El proceso mkfs o la descompresión de paquetes se suspende inmediatamente para evitar escribir datos truncados. En producción exige sustitución del disco o reasignación de sectores.'
      });
      list.push({
        id: 'fail-smart-critical',
        kernelTime: '[    4.521100]',
        subsystem: 'STORAGE',
        severity: 'warning',
        message: 'smartd: Device: /dev/nvme0n1, SMART Health Status: FAILING. Available Spare below threshold (0x01)',
        educationalDetail: 'El daemon de telemetría SMART detecta que la reserva de bloques de repuesto (Spare Blocks) se ha agotado por completo.',
        hardwareRepercussion: 'Riesgo crítico de pérdida total de datos si se continúa con el despliegue.'
      });
    }

    if (state.hardwareFailures?.networkDisconnect) {
      list.push({
        id: 'fail-net-down',
        kernelTime: '[    4.710320]',
        subsystem: 'NETWORK',
        severity: 'warning',
        message: 'virtio_net 0000:00:03.0 enp1s0: Link is DOWN (physical carrier lost / cable unplugged).',
        educationalDetail: 'El transceptor físico Ethernet PHY detecta pérdida de modulación eléctrica en el par trenzado (cable desconectado o caída de switch).',
        hardwareRepercussion: 'El gestor de paquetes no puede contactar con los repositorios espejo de software en red, interrumpiendo la descarga.'
      });
      list.push({
        id: 'fail-dhcp-timeout',
        kernelTime: '[    4.780100]',
        subsystem: 'NETWORK',
        severity: 'warning',
        message: 'NetworkManager[841]: <warn> [dhcp4]: request timed out on enp1s0; DNS name resolution unreachable.',
        educationalDetail: 'El cliente DHCP no recibe respuesta tras enviar tramas DHCPDISCOVER repetidas.',
        hardwareRepercussion: 'Se anula la concesión IP y los servicios de red quedan inoperativos hasta restaurar el medio físico.'
      });
    }

    if (state.hardwareFailures?.ramBitFlip) {
      list.push({
        id: 'fail-ram-mce',
        kernelTime: '[    3.890120]',
        subsystem: 'CPU/RAM',
        severity: 'warning',
        message: '[Hardware Error]: CPU 0: Machine Check Exception (MCE): Bank 5: Memory Controller uncorrected ECC error at 0x7fff4021a000.',
        educationalDetail: 'El procesador detecta una inversión de bit (Bit-Flip) no corregible en las celdas de los módulos de memoria RAM física.',
        hardwareRepercussion: 'El kernel activa la bandera de sistema contaminado (Kernel Tainted) y congela operaciones críticas para evitar escribir datos corruptos en el disco.'
      });
    }

    if (state.hardwareFailures?.thermalThrottling) {
      list.push({
        id: 'fail-cpu-thermal',
        kernelTime: '[    2.480100]',
        subsystem: 'CPU/RAM',
        severity: 'warning',
        message: 'CPU0: Package temperature 104°C, above thermal threshold, cpu clock throttled (status: 0x88490000).',
        educationalDetail: 'El sensor térmico del procesador detecta que la temperatura interna ha sobrepasado los 100°C debido a fallo en la refrigeración o ventilador.',
        hardwareRepercussion: 'La CPU reduce de golpe su frecuencia a 800 MHz para evitar fundirse, multiplicando por 5 el tiempo de instalación de paquetes.'
      });
    }

    return list;
  }, [state]);

  // Filtrar eventos según el progreso del instalador para simular aparición progresiva en tiempo real
  const visibleEventsCount = Math.max(
    3,
    Math.min(events.length, Math.ceil((currentProgressPct / 100) * events.length))
  );
  const activeEvents = events.slice(0, visibleEventsCount);

  // Filtrado por usuario
  const filteredEvents = activeEvents.filter(ev => {
    const matchesSubsystem = selectedSubsystem === 'all' || ev.subsystem.toLowerCase() === selectedSubsystem.toLowerCase();
    const matchesSeverity = selectedSeverity === 'all' || ev.severity.toLowerCase() === selectedSeverity.toLowerCase();
    const matchesSearch = !searchQuery.trim() || 
      ev.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.subsystem.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.educationalDetail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubsystem && matchesSeverity && matchesSearch;
  });

  const counts = useMemo(() => {
    return {
      total: activeEvents.length,
      warnings: activeEvents.filter(e => e.severity === 'warning').length,
      modules: activeEvents.filter(e => e.severity === 'module').length,
      drivers: activeEvents.filter(e => e.severity === 'driver' || e.severity === 'hardware').length,
    };
  }, [activeEvents]);

  const handleCopyLogs = () => {
    const text = activeEvents.map(e => `${e.kernelTime} [${e.subsystem}] (${e.severity.toUpperCase()}) ${e.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSeverityBadge = (sev: EventSeverity) => {
    switch (sev) {
      case 'warning':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/80';
      case 'module':
        return 'bg-purple-950/70 text-purple-300 border-purple-800/80';
      case 'driver':
      case 'hardware':
        return 'bg-sky-950/70 text-sky-300 border-sky-800/80';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-800';
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl text-slate-200">
      {/* Encabezado del Log de Eventos */}
      <div className="p-3.5 bg-black border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-xs tracking-tight">Registro de Eventos del Sistema (dmesg / Kernel Event Log)</h3>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
                {counts.total} eventos
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Diagnóstico en tiempo real: inicialización de hardware, módulos del kernel y controladores
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Métricas rápidas */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            {counts.warnings > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>{counts.warnings} avisos</span>
              </span>
            )}
            <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-400" />
              <span>{counts.modules} módulos</span>
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyLogs}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono border border-slate-800 transition-colors flex items-center gap-1.5"
            title="Copiar log completo"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="px-3.5 py-2.5 bg-slate-900/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Selector de Subsistema */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          <span className="text-[11px] text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Filtro:</span>
          </span>
          {['all', 'ACPI/BIOS', 'STORAGE', 'CRYPTO', 'MODULES', 'NETWORK'].map(sub => (
            <button
              key={sub}
              type="button"
              onClick={() => setSelectedSubsystem(sub)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                selectedSubsystem === sub
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 font-bold'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {sub === 'all' ? 'Todos' : sub}
            </button>
          ))}
        </div>

        {/* Buscador de texto */}
        <div className="relative w-48 sm:w-56">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar evento (p. ej. aesni, nvme)..."
            className="w-full bg-slate-950 border border-slate-800 rounded px-2 pl-8 py-1 text-[11px] font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Contenedor de Registros */}
      <div className="p-3 max-h-72 overflow-y-auto space-y-2 font-mono text-xs bg-black/90 divide-y divide-slate-900">
        {filteredEvents.map(event => (
          <div
            key={event.id}
            onClick={() => setInspectedEvent(event)}
            className={`pt-2 pb-1 px-2 rounded cursor-pointer transition-colors hover:bg-slate-900/60 flex items-start gap-2.5 ${
              inspectedEvent?.id === event.id ? 'bg-slate-900 border border-sky-500/40' : ''
            }`}
          >
            <span className="text-slate-500 text-[10px] select-none shrink-0 pt-0.5">{event.kernelTime}</span>

            <span className={`px-1.5 py-0.2 rounded text-[9px] border uppercase font-sans shrink-0 ${getSeverityBadge(event.severity)}`}>
              {event.subsystem}
            </span>

            <div className="flex-1 min-w-0">
              <span className={`break-words ${
                event.severity === 'warning' 
                  ? 'text-amber-300 font-semibold' 
                  : event.severity === 'module'
                  ? 'text-purple-300'
                  : event.severity === 'driver' || event.severity === 'hardware'
                  ? 'text-sky-300'
                  : 'text-slate-200'
              }`}>
                {event.message}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setInspectedEvent(event);
              }}
              className="text-slate-500 hover:text-amber-300 p-0.5 rounded transition-colors shrink-0"
              title="Ver análisis técnico de este evento"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {filteredEvents.length === 0 && (
          <div className="py-8 text-center text-slate-500 text-xs">
            No se encontraron eventos coincidentes con los filtros seleccionados.
          </div>
        )}
      </div>

      {/* Panel Inferior: Inspector Didáctico del Evento Seleccionado */}
      {inspectedEvent && (
        <div className="p-4 bg-slate-900 border-t border-slate-800 text-xs space-y-3 relative">
          <button
            type="button"
            onClick={() => setInspectedEvent(null)}
            className="absolute top-3 right-3 text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-sky-400 font-sans font-bold">
            <Cpu className="w-4 h-4" />
            <span>Foco Formativo: Diagnóstico del Kernel ({inspectedEvent.subsystem})</span>
          </div>

          <div className="font-mono text-[11px] p-2 bg-black rounded border border-slate-800 text-slate-200">
            {inspectedEvent.kernelTime} {inspectedEvent.message}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-sans">
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
              <span className="font-semibold text-sky-300 block">¿Qué significa este evento?:</span>
              <p className="text-slate-300 leading-relaxed">{inspectedEvent.educationalDetail}</p>
            </div>

            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
              <span className="font-semibold text-amber-300 block">Repercusión en el Hardware y Sistema:</span>
              <p className="text-slate-300 leading-relaxed">{inspectedEvent.hardwareRepercussion}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
