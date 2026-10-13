import React, { useState, useEffect, useMemo } from 'react';
import { 
  Terminal, 
  Monitor, 
  CheckCircle2, 
  RotateCcw, 
  HardDrive, 
  ShieldCheck, 
  Cpu, 
  Layers,
  ArrowRight,
  Maximize2,
  Pause,
  Play,
  HelpCircle,
  ExternalLink,
  Activity,
  AlertTriangle,
  Flame,
  WifiOff,
  ShieldAlert,
  Wrench
} from 'lucide-react';
import { InstallerState, HardwareFailuresConfig } from '../types/installer';
import { VirtualTerminalOverlay } from './VirtualTerminalOverlay';
import { SystemEventLog } from './SystemEventLog';
import { HardwareFailuresControl } from './HardwareFailuresControl';
import { RescueModeShell } from './RescueModeShell';
import { KernelPanicScreen } from './KernelPanicScreen';

interface InstallingStepProps {
  state: InstallerState;
  onFinishInstall: () => void;
}

export const InstallingStep: React.FC<InstallingStepProps> = ({
  state,
  onFinishInstall
}) => {
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('Inicializando instalación...');
  const [currentCommand, setCurrentCommand] = useState<string>('parted -s /dev/nvme0n1 mklabel gpt');
  const [logs, setLogs] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'slides' | 'tty' | 'events'>('slides');
  const [isDone, setIsDone] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isRescueModeOpen, setIsRescueModeOpen] = useState(false);
  const [isKernelPanicOpen, setIsKernelPanicOpen] = useState(false);

  // Estado de Inyección de Fallos de Hardware para pruebas diagnósticas (heredado del paso 1 de Hardware o configurado aquí)
  const [hardwareFailures, setHardwareFailures] = useState<HardwareFailuresConfig>(() => {
    return state.hardware.failures || {
      badSectors: false,
      networkDisconnect: false,
      ramBitFlip: false,
      thermalThrottling: false,
    };
  });

  // Estado combinado con los fallos activos
  const stateWithFailures: InstallerState = useMemo(() => ({
    ...state,
    hardwareFailures
  }), [state, hardwareFailures]);

  // Si hay fallo de disco o de red, bloquea el avance del instalador de forma realista
  const isBlockedByHardware = hardwareFailures.badSectors || hardwareFailures.networkDisconnect;

  // Mapeo detallado de etapas del instalador y comandos de bajo nivel ejecutados
  const installPhases = [
    {
      pct: 8,
      phase: `Escribiendo tabla de particiones ${state.disk.tableType.toUpperCase()} en ${state.disk.devicePath}`,
      cmd: `parted -s ${state.disk.devicePath} mklabel ${state.disk.tableType}`,
      log: `[  0.312] parted: writing partition table ${state.disk.tableType} to ${state.disk.devicePath}`
    },
    {
      pct: 18,
      phase: 'Creando límites de particiones primarias en sectores LBA óptimos',
      cmd: `parted -s -a optimal ${state.disk.devicePath} mkpart "EFI" fat32 1MiB 513MiB`,
      log: `[  1.102] parted: aligned partition sectors to 4K boundary on ${state.disk.devicePath}`
    },
    {
      pct: 28,
      phase: state.useWholeDiskEncryption 
        ? 'Inicializando contenedor cifrado dm-crypt / LUKS2 con Argon2id' 
        : 'Configurando partición de sistema',
      cmd: state.useWholeDiskEncryption
        ? `cryptsetup luksFormat --type luks2 --cipher aes-xts-plain64 --key-size 512 ${state.disk.devicePath}p3`
        : `parted -s ${state.disk.devicePath} set 1 esp on`,
      log: state.useWholeDiskEncryption
        ? `[  2.410] cryptsetup: PBKDF argon2id benchmarked (1048576 KiB RAM), keyslot 0 created`
        : `[  2.100] parted: partition 1 flagged with ESP`
    },
    {
      pct: 38,
      phase: state.useWholeDiskEncryption
        ? 'Abriendo volumen cifrado /dev/mapper/cryptroot'
        : 'Preparando capas de almacenamiento',
      cmd: state.useWholeDiskEncryption
        ? `cryptsetup open ${state.disk.devicePath}p3 cryptroot`
        : `udevadm settle --timeout=30`,
      log: state.useWholeDiskEncryption
        ? `[  3.120] dm-crypt: mapped /dev/mapper/cryptroot`
        : `[  2.890] kernel: devicetable updated`
    },
    {
      pct: 48,
      phase: state.useLvm 
        ? `Configurando LVM: creando Physical Volume y Volume Group '${state.lvmGroupName}'` 
        : 'Creando sistemas de archivos',
      cmd: state.useLvm
        ? `pvcreate /dev/mapper/cryptroot && vgcreate ${state.lvmGroupName} /dev/mapper/cryptroot`
        : `mkfs.fat -F32 -n "EFI" ${state.disk.devicePath}p1`,
      log: state.useLvm
        ? `[  4.015] lvm2: Volume Group "${state.lvmGroupName}" created with 4MB extents`
        : `[  3.650] mkfs.fat: created FAT32 volume on ${state.disk.devicePath}p1`
    },
    {
      pct: 58,
      phase: state.useLvm
        ? 'Aprovisionando volúmenes lógicos (lv_root, lv_var, lv_home, lv_swap)'
        : 'Formateando particiones con sistemas de archivos',
      cmd: state.useLvm
        ? `lvcreate -L 35840M -n lv_root ${state.lvmGroupName} && lvcreate -L 8192M -n lv_swap ${state.lvmGroupName}`
        : `mkfs.xfs -f -L "root" ${state.disk.devicePath}p2`,
      log: state.useLvm
        ? `[  5.230] lvm2: logical volumes lv_root, lv_home, lv_swap mapped`
        : `[  4.890] mkfs.xfs: CRC32c metadatas enabled`
    },
    {
      pct: 68,
      phase: 'Formateando volúmenes con ext4, XFS y FAT32 (creación de diarios e inodos)',
      cmd: `mkfs.xfs -f -m crc=1 /dev/mapper/${state.lvmGroupName}-lv_root`,
      log: `[  6.340] mkfs.xfs: 4 allocation groups created, reflink=1, finobt=1`
    },
    {
      pct: 78,
      phase: 'Descomprimiendo paquetes del sistema operativo en el árbol /mnt',
      cmd: `dnf --installroot=/mnt groupinstall -y "Core" "Standard"`,
      log: `[  7.820] rpm/dpkg: unpacked 1,482 packages (glibc, systemd, kernel-core)`
    },
    {
      pct: 88,
      phase: 'Generando imagen initramfs con soporte criptográfico dm-crypt y LVM',
      cmd: `dracut --regenerate-all --force --add "crypt lvm" /mnt/boot/initramfs-linux.img`,
      log: `[  8.940] dracut: included kernel modules for aes-ni, dm-crypt, device-mapper`
    },
    {
      pct: 95,
      phase: 'Instalando gestor de arranque GRUB 2.06 en /boot/efi y registrando en NVRAM',
      cmd: `grub2-install --target=x86_64-efi --efi-directory=/mnt/boot/efi --bootloader-id=rocky`,
      log: `[  9.610] grub2-install: bootloader entry registered in UEFI firmware NVRAM`
    },
    {
      pct: 100,
      phase: 'Finalizando políticas SELinux, sincronizando cachés de disco y desmontando /mnt',
      cmd: `sync && umount -R /mnt`,
      log: `[ 10.000] installer: sync disk caches, installation completed successfully!`
    }
  ];

  useEffect(() => {
    // Si la instalación está en pausa, terminada o bloqueada por fallo físico de hardware
    if (isPaused || isDone || isBlockedByHardware) return;

    // Si hay sobrecalentamiento térmico, la velocidad se reduce notablemente (throttling)
    const tickInterval = hardwareFailures.thermalThrottling ? 600 : 180;

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + 1;
        const currentItem = installPhases.find(p => p.pct >= next) || installPhases[installPhases.length - 1];
        if (currentItem) {
          setCurrentPhase(currentItem.phase);
          setCurrentCommand(currentItem.cmd);
          if (next === currentItem.pct) {
            setLogs(l => [...l, currentItem.log]);
          }
        }

        if (next >= 100) {
          clearInterval(interval);
          setIsDone(true);
          return 100;
        }
        return next;
      });
    }, tickInterval);

    return () => clearInterval(interval);
  }, [isPaused, isDone, isBlockedByHardware, hardwareFailures.thermalThrottling, state]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Encabezado con acceso destacado a la Terminal Virtual */}
      <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Paso 7: Proceso de Instalación en Progreso</span>
            {!isDone && !isBlockedByHardware && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
            )}
            {isBlockedByHardware && (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block"></span>
            )}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            El instalador está ejecutando las operaciones de disco y desplegando el sistema operativo.
          </p>
        </div>

        {/* Botón Destacado: Abrir Terminal Virtual Overlay y Selector de Vistas */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsOverlayOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 text-xs font-bold font-mono flex items-center gap-2 transition-all shadow-sm group"
            title="Abrir Terminal Virtual interactiva con los comandos reales ejecutándose"
          >
            <Terminal className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Terminal Virtual</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </button>

          <button
            type="button"
            onClick={() => setIsRescueModeOpen(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-sm ${
              isBlockedByHardware
                ? 'bg-rose-600/30 border border-rose-500 text-rose-300 hover:bg-rose-600/40 animate-pulse'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
            title="Entrar en el entorno de rescate (Emergency Shell / Dracut)"
          >
            <Wrench className={`w-3.5 h-3.5 ${isBlockedByHardware ? 'text-rose-400' : 'text-amber-400'}`} />
            <span>Modo Rescate</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPaused(true);
              setIsKernelPanicOpen(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 hover:bg-rose-900/80 hover:border-rose-700 text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-sm group"
            title="Simular un Kernel Panic en vivo con backtrace del sistema de archivos"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
            <span>Simulador Kernel Panic</span>
          </button>

          {/* Conmutador de 3 Vistas: Diapositivas | Consola TTY | Eventos del Sistema */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setViewMode('slides')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'slides'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Diapositivas</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('tty')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'tty'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Consola TTY</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('events')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'events'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Eventos dmesg</span>
              {isBlockedByHardware && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Ticker de comando que se está ejecutando en tiempo real o alerta de fallo */}
      <div 
        onClick={() => setIsOverlayOpen(true)}
        className={`p-3 rounded-xl flex items-center justify-between gap-3 text-xs font-mono cursor-pointer transition-colors group ${
          isBlockedByHardware
            ? 'bg-rose-950/40 border border-rose-800 text-rose-200'
            : 'bg-slate-950 border border-slate-800 hover:border-emerald-500/50'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            isBlockedByHardware ? 'bg-rose-500 animate-ping' : 'bg-emerald-400 animate-pulse'
          }`}></span>
          <span className="opacity-70 text-[11px] shrink-0 hidden sm:inline">
            {isBlockedByHardware ? 'ERROR DETECTADO:' : 'Comando en ejecución:'}
          </span>
          <code className={`font-bold truncate ${isBlockedByHardware ? 'text-rose-300' : 'text-emerald-400'}`}>
            {hardwareFailures.badSectors
              ? 'blk_update_request: I/O error, dev nvme0n1, sector 4145674 (EIO 5)'
              : hardwareFailures.networkDisconnect
              ? 'curl: (7) Network unreachable: enp1s0 Link is DOWN'
              : currentCommand}
          </code>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-slate-400 group-hover:text-white transition-colors">
          <span className="text-[11px] hidden sm:inline">Inspeccionar en Terminal</span>
          <Maximize2 className={`w-3.5 h-3.5 ${isBlockedByHardware ? 'text-rose-400' : 'text-emerald-400'}`} />
        </div>
      </div>

      {/* Alerta Destacada si hay Bloqueo por Fallo de Hardware */}
      {isBlockedByHardware && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/80 text-rose-200 flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-2 text-xs flex-1">
            <div>
              <h4 className="font-bold text-rose-300 text-sm">
                Instalación Interrumpida por Anomalía Física de Hardware
              </h4>
              <p className="text-slate-300 leading-relaxed text-[11px] mt-1">
                {hardwareFailures.badSectors && 'Se ha detectado un fallo de lectura/escritura (I/O Bad Blocks) en el bus NVMe. El subsistema de almacenamiento del kernel ha denegado la escritura para prevenir corrupción en la tabla de asignación.'}
                {hardwareFailures.networkDisconnect && 'Se ha desconectado la interfaz de red física (enp1s0). El gestor de paquetes no puede descargar componentes esenciales del sistema operativo.'}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsRescueModeOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all animate-pulse"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Entrar en Modo Rescate (Emergency Shell)</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('events')}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs flex items-center gap-1.5 transition-colors"
              >
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>Ver Diagnóstico en dmesg</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Componente de Inyección de Fallos de Hardware */}
      <HardwareFailuresControl
        failures={hardwareFailures}
        onChangeFailures={setHardwareFailures}
        onClearFailures={() => setHardwareFailures({
          badSectors: false,
          networkDisconnect: false,
          ramBitFlip: false,
          thermalThrottling: false
        })}
        onTriggerKernelPanic={() => {
          setIsPaused(true);
          setIsKernelPanicOpen(true);
        }}
      />

      {/* Barra de progreso con porcentaje y botón de pausa */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white flex items-center gap-2">
            {!isDone && !isBlockedByHardware && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
            {isBlockedByHardware && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            )}
            <span>{isBlockedByHardware ? 'Instalación detenida por fallo de hardware' : currentPhase}</span>
          </span>

          <div className="flex items-center gap-3">
            {!isDone && !isBlockedByHardware && (
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] flex items-center gap-1 transition-colors"
              >
                {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
                <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
              </button>
            )}
            <span className={`font-mono font-bold text-sm ${isBlockedByHardware ? 'text-rose-400' : 'text-emerald-400'}`}>
              {progress}%
            </span>
          </div>
        </div>

        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
          <div
            style={{ width: `${progress}%` }}
            className={`h-full rounded-full transition-all duration-300 ease-out ${
              isBlockedByHardware
                ? 'bg-rose-600'
                : 'bg-linear-to-r from-emerald-500 via-sky-400 to-indigo-500'
            }`}
          ></div>
        </div>
      </div>

      {/* VISTA 1: Diapositivas Educativas */}
      {viewMode === 'slides' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-white text-sm">Sistemas de Archivos</h4>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Al formatear en ext4 o XFS, se crean las estructuras de inodos y bloques que permiten direccionar cada archivo con permisos POSIX y bitácoras seguras contra cortes eléctricos.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-white text-sm">Cifrado LUKS &amp; dm-crypt</h4>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              El núcleo Linux mapea la partición encriptada mediante la capa Device Mapper (<code className="text-emerald-400 font-mono">/dev/mapper/cryptroot</code>). Todo bloque escrito pasa transparentemente por aceleración criptográfica de la CPU.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-white text-sm">El rol del initramfs</h4>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              La imagen initramfs contiene los módulos mínimos del kernel (controladores NVMe, dm-crypt, LVM) para pedir la contraseña de cifrado y montar la raíz real antes de transferir el control a systemd (PID 1).
            </p>
          </div>
        </div>
      )}

      {/* VISTA 2: Consola TTY en vivo */}
      {viewMode === 'tty' && (
        <div className="p-4 rounded-xl bg-black border border-slate-800 space-y-2 font-mono">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-900 pb-2">
            <span>tty2: /dev/tty2 (Anaconda / Setup Engine Terminal)</span>
            <button
              type="button"
              onClick={() => setIsOverlayOpen(true)}
              className="text-emerald-400 hover:text-white flex items-center gap-1 text-[11px]"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Abrir en Pantalla Completa</span>
            </button>
          </div>

          <pre className="text-xs text-emerald-400 h-64 overflow-y-auto space-y-1 p-2 bg-black/60 rounded leading-relaxed">
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
            {isBlockedByHardware && (
              <div className="text-rose-400 font-bold">
                [FATAL] Operating system install halted: Hardware device failure detected.
              </div>
            )}
            {!isDone && !isBlockedByHardware && (
              <div className="text-slate-500 animate-pulse">root@installer:# {currentCommand}_</div>
            )}
          </pre>
        </div>
      )}

      {/* VISTA 3: Registro de Eventos del Sistema (dmesg / Kernel Event Log) */}
      {viewMode === 'events' && (
        <SystemEventLog
          state={stateWithFailures}
          currentProgressPct={progress}
        />
      )}

      {/* Pantalla de Fin de Instalación */}
      {isDone && (
        <div className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">¡Instalación completada con éxito!</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                El sistema operativo ha sido configurado y el cargador de arranque está registrado en la NVRAM de la placa base.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFinishInstall}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-2 shadow-md shrink-0"
          >
            <span>Reiniciar Equipo (Primer Arranque)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Terminal Virtual Overlay (Modal / Fullscreen Console con Temas Estéticos) */}
      <VirtualTerminalOverlay
        isOpen={isOverlayOpen}
        onClose={() => setIsOverlayOpen(false)}
        state={stateWithFailures}
        progressPct={progress}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused(!isPaused)}
      />

      {/* Shell de Emergencia en Modo Rescate (Emergency Shell / Dracut Rescue) */}
      <RescueModeShell
        isOpen={isRescueModeOpen}
        onClose={() => setIsRescueModeOpen(false)}
        state={stateWithFailures}
        hardwareFailures={hardwareFailures}
        onResolveFailures={() => setHardwareFailures({
          badSectors: false,
          networkDisconnect: false,
          ramBitFlip: false,
          thermalThrottling: false
        })}
        onResumeInstallation={() => {
          setIsRescueModeOpen(false);
          setIsPaused(false);
        }}
      />

      {/* Simulador de Kernel Panic con Backtrace del Sistema de Archivos */}
      <KernelPanicScreen
        isOpen={isKernelPanicOpen}
        onTryAgain={() => {
          setIsKernelPanicOpen(false);
          setIsPaused(false);
          setLogs(l => [
            ...l,
            '[RECOVERY] Kernel reboot/continue: Módulo del sistema de archivos recargado tras Kernel Panic. Reanudando instalación...'
          ]);
        }}
        onOpenRescueShell={() => {
          setIsKernelPanicOpen(false);
          setIsRescueModeOpen(true);
        }}
        state={stateWithFailures}
      />
    </div>
  );
};
