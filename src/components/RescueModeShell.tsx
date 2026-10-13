import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  RotateCcw, 
  ArrowRight, 
  HardDrive, 
  Layers, 
  ShieldCheck, 
  Copy, 
  Check, 
  HelpCircle,
  X,
  Play
} from 'lucide-react';
import { InstallerState, HardwareFailuresConfig } from '../types/installer';

interface RescueModeShellProps {
  isOpen: boolean;
  onClose: () => void;
  state: InstallerState;
  hardwareFailures: HardwareFailuresConfig;
  onResolveFailures: () => void;
  onResumeInstallation: () => void;
}

export const RescueModeShell: React.FC<RescueModeShellProps> = ({
  isOpen,
  onClose,
  state,
  hardwareFailures,
  onResolveFailures,
  onResumeInstallation
}) => {
  const [terminalInput, setTerminalInput] = useState('');
  const [repairedFilesystem, setRepairedFilesystem] = useState(false);
  const [remountedRW, setRemountedRW] = useState(false);
  const [repairedGpt, setRepairedGpt] = useState(false);
  const [networkRestored, setNetworkRestored] = useState(false);
  const [copied, setCopied] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  const [shellHistory, setShellHistory] = useState<string[]>([
    '*** MODO DE RESCATE DEL INSTALADOR (Emergency Shell / Dracut Rescue) ***',
    'Generating "/run/initramfs/rdsosreport.txt"',
    'Entering emergency mode. Exit the shell to continue.',
    'Type "help", "journalctl -xb", "fsck", "mount", "gdisk" o "exit".',
    '----------------------------------------------------------------------',
    `Root target device: ${state.disk.devicePath} (Estado: REVISIÓN DE EMERGENCIA REQUERIDA)`,
    ''
  ]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [shellHistory]);

  if (!isOpen) return null;

  const handleExecute = (cmdStr: string) => {
    const raw = cmdStr.trim();
    if (!raw) return;

    const cmd = raw.toLowerCase();
    const newOutput: string[] = [`(initramfs) # ${raw}`];

    if (cmd === 'help') {
      newOutput.push('Comandos del entorno de rescate:');
      newOutput.push('  fsck -y /dev/nvme0n1p2       - Verifica y repara superbloques e inodos corruptos');
      newOutput.push('  mount -o remount,rw /mnt     - Remonta la partición raíz en modo lectura/escritura');
      newOutput.push('  gdisk -r /dev/nvme0n1        - Reconstruye la tabla GPT desde el encabezado secundario');
      newOutput.push('  vgchange -ay                 - Activa los grupos de volúmenes LVM del sistema');
      newOutput.push('  ip link set enp1s0 up        - Levanta la interfaz de red física');
      newOutput.push('  journalctl -xb               - Muestra los registros del kernel previos al fallo');
      newOutput.push('  repair-all                   - Ejecuta la secuencia completa de recuperación');
      newOutput.push('  exit / continue              - Reanuda el instalador si el sistema fue reparado');
    } else if (cmd.includes('fsck')) {
      newOutput.push('fsck from util-linux 2.39.3');
      newOutput.push('[/sbin/fsck.ext4 (1) -- /dev/nvme0n1p2] fsck.ext4 -y /dev/nvme0n1p2');
      newOutput.push('Pass 1: Checking inodes, blocks, and sizes');
      newOutput.push('Pass 2: Checking directory structure');
      newOutput.push('Pass 3: Checking directory connectivity');
      newOutput.push('Pass 4: Checking reference counts');
      newOutput.push('Pass 5: Checking group summary information');
      newOutput.push('Fixing bad free blocks count (was 8192000, should be 8201216)');
      newOutput.push('/dev/nvme0n1p2: ***** FILE SYSTEM WAS MODIFIED *****');
      newOutput.push('/dev/nvme0n1p2: 1420/2621440 files (0.1% non-contiguous), 210400/10485760 blocks');
      newOutput.push('[OK] Superbloque e inodos reparados con éxito.');
      setRepairedFilesystem(true);
      onResolveFailures();
    } else if (cmd.includes('mount') && (cmd.includes('remount') || cmd.includes('rw'))) {
      newOutput.push('Remounting /mnt with options: rw,relatime,data=ordered');
      newOutput.push('[OK] Dispositivo /mnt montado en modo lectura/escritura (RW).');
      setRemountedRW(true);
    } else if (cmd.includes('gdisk') || cmd.includes('parted')) {
      newOutput.push(`GPT fdisk (gdisk) version 1.0.9`);
      newOutput.push(`Scanning ${state.disk.devicePath} for GPT signatures...`);
      newOutput.push(`Found invalid main GPT header, valid backup GPT header found at end of disk.`);
      newOutput.push(`Restoring main GPT header from backup table... Done.`);
      newOutput.push(`Writing synthesized protective MBR to sector 0.`);
      newOutput.push(`[OK] Tabla de particiones GPT sincronizada y coherente.`);
      setRepairedGpt(true);
    } else if (cmd.includes('vgchange')) {
      newOutput.push(`  2 logical volume(s) in volume group "${state.lvmGroupName}" now active`);
      newOutput.push(`  Mapped: /dev/mapper/${state.lvmGroupName}-lv_root [ACTIVE]`);
      newOutput.push(`  Mapped: /dev/mapper/${state.lvmGroupName}-lv_swap [ACTIVE]`);
      newOutput.push(`[OK] Subsistema LVM sincronizado.`);
    } else if (cmd.includes('ip link') || cmd.includes('dhclient') || cmd.includes('network')) {
      newOutput.push(`enp1s0: carrier detected, speed 10000 Mb/s full duplex`);
      newOutput.push(`DHCP lease acquired: ${state.userConfig.staticIP || '192.168.1.142/24'}`);
      newOutput.push(`[OK] Conectividad de red reestablecida.`);
      setNetworkRestored(true);
      onResolveFailures();
    } else if (cmd === 'journalctl' || cmd === 'journalctl -xb') {
      newOutput.push('-- Logs begin at Mon 2026-10-12 03:00:00 UTC, end at Mon 2026-10-12 03:15:20 UTC. --');
      newOutput.push('kernel: [Firmware Bug]: ACPI query fallback active');
      if (hardwareFailures.badSectors) {
        newOutput.push('kernel: blk_update_request: I/O error, dev nvme0n1, sector 4145674 (EIO 5)');
      }
      if (hardwareFailures.networkDisconnect) {
        newOutput.push('kernel: virtio_net: enp1s0 link is DOWN (carrier lost)');
      }
      newOutput.push('installer[512]: FATAL: Target device I/O stalled, dropping into emergency shell');
    } else if (cmd === 'repair-all') {
      newOutput.push('[Auto-Rescue] Ejecutando secuencia de reparación integral...');
      newOutput.push('1. Verificando integridad de sectores y superbloques con fsck... [REPARADO]');
      newOutput.push('2. Sincronizando tabla GPT desde encabezado de respaldo... [CORREGIDO]');
      newOutput.push('3. Remontando sistema raíz en modo lectura/escritura (RW)... [OK]');
      newOutput.push('4. Activando volúmenes lógicos LVM y enlace de red... [CONECTADO]');
      newOutput.push('[ÉXITO] Todo el subsistema de almacenamiento ha sido restaurado.');
      setRepairedFilesystem(true);
      setRemountedRW(true);
      setRepairedGpt(true);
      setNetworkRestored(true);
      onResolveFailures();
    } else if (cmd === 'exit' || cmd === 'continue') {
      newOutput.push('Exiting emergency mode, syncing filesystem buffers and resuming installer...');
      onResolveFailures();
      onResumeInstallation();
      onClose();
      return;
    } else if (cmd === 'clear') {
      setShellHistory([]);
      setTerminalInput('');
      return;
    } else {
      newOutput.push(`sh: comando no encontrado: ${raw}. Escribe 'help' para ver comandos de rescate.`);
    }

    setShellHistory(prev => [...prev, ...newOutput]);
    setTerminalInput('');
  };

  const isSystemReady = repairedFilesystem || remountedRW || repairedGpt || networkRestored;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md">
      <div className="bg-[#0b0c10] border border-rose-800/80 rounded-xl w-full max-w-4xl h-[85vh] max-h-[800px] flex flex-col shadow-2xl overflow-hidden font-mono text-xs text-slate-200">
        {/* Encabezado del Modo de Rescate */}
        <div className="p-3.5 bg-black border-b border-rose-900/60 flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40 animate-pulse">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-xs tracking-wide">
                  MODO DE RESCATE (Emergency Shell / Dracut Rescue Console)
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-800">
                  FALLO DE MONTAJE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Consola interactiva para diagnosticar anomalías de particionado, fsck y remontaje
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-900"
              title="Cerrar ventana"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de Acciones Asistidas de Rescate */}
        <div className="px-3.5 py-2.5 bg-slate-950 border-b border-slate-900 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-[11px] text-slate-400 font-sans font-semibold flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Reparaciones recomendadas:</span>
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleExecute('fsck.ext4 -y /dev/nvme0n1p2')}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 text-[11px] transition-colors"
            >
              1. Reparar con fsck
            </button>

            <button
              type="button"
              onClick={() => handleExecute('mount -o remount,rw /mnt')}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 text-[11px] transition-colors"
            >
              2. Remontar en RW
            </button>

            <button
              type="button"
              onClick={() => handleExecute('gdisk -r /dev/nvme0n1')}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 text-[11px] transition-colors"
            >
              3. Restaurar tabla GPT
            </button>

            <button
              type="button"
              onClick={() => handleExecute('repair-all')}
              className="px-2.5 py-1 rounded bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 text-[11px] font-bold transition-colors"
            >
              Reparar Todo Automático
            </button>
          </div>
        </div>

        {/* Salida de la Shell de Emergencia */}
        <div className="flex-1 p-4 bg-black/95 overflow-y-auto space-y-1 text-slate-200 select-text">
          {shellHistory.map((line, idx) => (
            <div 
              key={idx}
              className={`leading-relaxed ${
                line.startsWith('(initramfs) #') 
                  ? 'text-amber-400 font-bold pt-1' 
                  : line.includes('OK') || line.includes('MODIFIED') || line.includes('ÉXITO')
                  ? 'text-emerald-400'
                  : line.includes('error') || line.includes('FATAL')
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}
            >
              {line}
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        {/* Entrada de comandos con prompt */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleExecute(terminalInput);
          }}
          className="p-2.5 bg-black border-t border-slate-900 flex items-center gap-2"
        >
          <span className="text-rose-400 font-bold shrink-0">(initramfs) #</span>
          <input
            type="text"
            autoFocus
            value={terminalInput}
            onChange={(e) => setTerminalInput(e.target.value)}
            placeholder="Escribe 'help', 'repair-all' o 'exit'..."
            className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder-slate-600 font-mono text-xs"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition-colors"
          >
            Ejecutar
          </button>
        </form>

        {/* Barra Inferior con botón de reanudación del instalador */}
        <div className="p-3 bg-slate-950 border-t border-slate-900 flex flex-wrap items-center justify-between gap-3 font-sans">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Estado de recuperación:</span>
            {isSystemReady ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>SISTEMA REPARADO Y LISTO</span>
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1 font-mono">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Pendiente de reparación</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onResolveFailures();
                onResumeInstallation();
                onClose();
              }}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-md"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Salir de Rescate y Reanudar Instalador</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
