import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  RotateCcw, 
  Wrench, 
  Terminal, 
  HelpCircle, 
  Layers, 
  CheckCircle2, 
  Info,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles
} from 'lucide-react';
import { InstallerState, FilesystemType } from '../types/installer';

interface KernelPanicScreenProps {
  isOpen: boolean;
  onTryAgain: () => void;
  onOpenRescueShell?: () => void;
  state: InstallerState;
}

export type PanicScenarioType = 'btrfs_tree_corrupt' | 'xfs_crc_error' | 'ext4_deleted_inode' | 'luks_crypto_failure';

interface PanicDetails {
  id: PanicScenarioType;
  title: string;
  fsType: FilesystemType | 'crypto';
  panicMessage: string;
  cFunction: string;
  module: string;
  stackLines: string[];
  explanation: string;
  educationalRootCause: string;
  recommendedFix: string;
}

export const KernelPanicScreen: React.FC<KernelPanicScreenProps> = ({
  isOpen,
  onTryAgain,
  onOpenRescueShell,
  state
}) => {
  const [selectedScenario, setSelectedScenario] = useState<PanicScenarioType>('btrfs_tree_corrupt');
  const [showExplanation, setShowExplanation] = useState<boolean>(true);
  const [blinkCaps, setBlinkCaps] = useState<boolean>(true);

  // Determinar la variante predeterminada basada en el sistema de archivos del usuario
  useEffect(() => {
    if (!isOpen) return;

    const hasBtrfs = state.disk.partitions.some(p => p.fsType === 'btrfs');
    const hasXfs = state.disk.partitions.some(p => p.fsType === 'xfs');
    const hasExt4 = state.disk.partitions.some(p => p.fsType === 'ext4');

    if (hasBtrfs) {
      setSelectedScenario('btrfs_tree_corrupt');
    } else if (hasXfs) {
      setSelectedScenario('xfs_crc_error');
    } else if (hasExt4) {
      setSelectedScenario('ext4_deleted_inode');
    } else if (state.useWholeDiskEncryption) {
      setSelectedScenario('luks_crypto_failure');
    } else {
      setSelectedScenario('btrfs_tree_corrupt');
    }
  }, [isOpen, state]);

  // Parpadeo del indicador de bloqueo de mayúsculas (clásico de Kernel Panic)
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setBlinkCaps(prev => !prev);
    }, 600);
    return () => clearInterval(interval);
  }, [isOpen]);

  const scenarios: Record<PanicScenarioType, PanicDetails> = {
    btrfs_tree_corrupt: {
      id: 'btrfs_tree_corrupt',
      title: 'Btrfs: Corrupción de Árbol B-Tree (btrfs_search_slot)',
      fsType: 'btrfs',
      panicMessage: 'Kernel panic - not syncing: BTRFS: Transaction aborted (error -5: EIO in btrfs_search_slot)',
      cFunction: 'btrfs_search_slot+0x7e2/0xa40 [btrfs]',
      module: 'btrfs.ko',
      stackLines: [
        '[  14.210450] BTRFS critical (device nvme0n1p2): corrupt leaf: root=2 block=30408704 slot=18 ino=125892 bad key order 125892 1 0 > 125891 1 0',
        '[  14.210512] BTRFS error (device nvme0n1p2): btrfs_clean_tree_block failed on leaf 30408704: -5',
        '[  14.210590] ------------[ cut here ]------------',
        '[  14.210620] Kernel panic - not syncing: BTRFS: Transaction aborted (error -5)',
        `[  14.210680] CPU: 1 PID: 1248 Comm: os-installer Tainted: G        W   OE      6.8.0-45-generic #45`,
        `[  14.210740] Hardware name: Generic Standard PC (${state.hardware.cpuCores} vCPUs, ${state.hardware.ramMB / 1024} GB RAM), BIOS 1.16.3-rel`,
        '[  14.210810] Call Trace:',
        '[  14.210850]  <TASK>',
        '[  14.210890]  dump_stack_lvl+0x48/0x70',
        '[  14.210940]  panic+0x310/0x350',
        '[  14.210990]  __btrfs_abort_transaction+0xdb/0x140 [btrfs]',
        '[  14.211050]  btrfs_search_slot+0x7e2/0xa40 [btrfs]',
        '[  14.211120]  btrfs_lookup_inode+0x3a/0xc0 [btrfs]',
        '[  14.211180]  btrfs_iget+0x9e/0x160 [btrfs]',
        '[  14.211250]  btrfs_lookup_dentry+0x42f/0x590 [btrfs]',
        '[  14.211320]  __lookup_slow+0x8f/0x140',
        '[  14.211380]  walk_component+0x142/0x1e0',
        '[  14.211440]  path_lookupat+0x6b/0x1a0',
        '[  14.211500]  filename_lookup+0xad/0x1c0',
        '[  14.211560]  vfs_mkdir+0x11e/0x240',
        '[  14.211620]  do_mkdirat+0x8c/0x130',
        '[  14.211680]  do_syscall_64+0x7f/0x180',
        '[  14.211740]  entry_SYSCALL_64_after_hwframe+0x78/0x80',
        '[  14.211800] RIP: 0033:0x7f8a11bc3297',
        '[  14.211850] Code: 48 89 e5 48 83 ec 20 e8 3a fe ff ff 48 85 c0 74 12 ...',
        '[  14.211910] RSP: 002b:00007ffd1a2b9180 EFLAGS: 00000246 ORIG_RAX: 0000000000000053',
        '[  14.211980] RAX: ffffffffffffffda RBX: 000055c0a1b21020 RCX: 00007f8a11bc3297',
        '[  14.212040]  </TASK>',
        '[  14.212090] Kernel Offset: 0x22000000 from 0xffffffff81000000',
        '[  14.212150] ---[ end Kernel panic - not syncing: BTRFS: Transaction aborted (error -5) ]---'
      ],
      explanation: 'Una clave en una hoja (leaf) del B-Tree de Btrfs se encontró en un orden descendente inválido, violando las propiedades de indexación del árbol.',
      educationalRootCause: 'Btrfs organiza todos los archivos, inodos y extents en árboles Copy-on-Write B-Trees. Si durante la escritura se produce un corte abrupto o fallo en el bus LBA, la verificación de integridad de la hoja arroja -EIO (-5) y el driver aborta la transacción para evitar propagar la corrupción a otros subvolúmenes.',
      recommendedFix: 'Ejecutar "btrfs check --repair /dev/nvme0n1p2" en el modo de rescate o recrear el sistema de archivos con mkfs.btrfs -f.'
    },
    xfs_crc_error: {
      id: 'xfs_crc_error',
      title: 'XFS: Error de Metadatos CRC en AG Header (xfs_buf_verify)',
      fsType: 'xfs',
      panicMessage: 'Kernel panic - not syncing: XFS: Metadata CRC error detected at xfs_inode_buf_verify',
      cFunction: 'xfs_buf_read_map+0x16b/0x3c0 [xfs]',
      module: 'xfs.ko',
      stackLines: [
        '[  18.042100] XFS (nvme0n1p2): Metadata CRC error detected at xfs_inobt_verify+0x54/0x120 [xfs], xfs_inobt block 0x48',
        '[  18.042180] XFS (nvme0n1p2): Corruption of in-memory or on-disk structure detected in Allocation Group 0.',
        '[  18.042250] XFS (nvme0n1p2): Internal error xfs_trans_cancel at line 984 of file fs/xfs/xfs_trans.c.  Caller xfs_create+0x421/0x680 [xfs]',
        '[  18.042330] Kernel panic - not syncing: XFS: Metadata corruption in AG 0 header, aborting transaction to prevent disk damage',
        '[  18.042400] CPU: 0 PID: 924 Comm: dnf Tainted: G        W          6.8.0-45-generic',
        '[  18.042470] Call Trace:',
        '[  18.042510]  <TASK>',
        '[  18.042550]  dump_stack_lvl+0x48/0x70',
        '[  18.042600]  panic+0x310/0x350',
        '[  18.042660]  xfs_trans_cancel+0x180/0x1e0 [xfs]',
        '[  18.042730]  xfs_create+0x421/0x680 [xfs]',
        '[  18.042800]  xfs_generic_create+0xc5/0x240 [xfs]',
        '[  18.042870]  path_openat+0x8a2/0x1120',
        '[  18.042930]  do_filp_open+0xaa/0x150',
        '[  18.042990]  do_sys_openat2+0x9b/0x160',
        '[  18.043050]  do_syscall_64+0x7f/0x180',
        '[  18.043110]  entry_SYSCALL_64_after_hwframe+0x78/0x80',
        '[  18.043170]  </TASK>',
        '[  18.043220] ---[ end Kernel panic - not syncing: XFS: Metadata CRC error detected at xfs_inode_buf_verify ]---'
      ],
      explanation: 'La suma de verificación de metadatos CRC32c de una cabecera de Allocation Group (AG) no coincide con los bytes almacenados en disco.',
      educationalRootCause: 'XFS v5 introduce sumas de comprobación autónomas en cada bloque de metadatos. Si la suma CRC32c calculada difiere de la esperada, XFS asume que el hardware o el búfer de memoria han sido alterados y detiene el diario de transacciones para no invalidar el árbol de inodos.',
      recommendedFix: 'Entrar en el Modo de Rescate y ejecutar "xfs_repair -L /dev/nvme0n1p2" para vaciar el log transaccional sucio.'
    },
    ext4_deleted_inode: {
      id: 'ext4_deleted_inode',
      title: 'ext4: Referencia a Inodo Marcado como Eliminado (ext4_lookup)',
      fsType: 'ext4',
      panicMessage: 'Kernel panic - not syncing: EXT4-fs error (device nvme0n1p2): ext4_lookup: deleted inode referenced: 142012',
      cFunction: 'ext4_find_entry+0x31a/0x520 [ext4]',
      module: 'ext4.ko',
      stackLines: [
        '[  11.512030] EXT4-fs (nvme0n1p2): error count since last fsck: 1',
        '[  11.512090] EXT4-fs (nvme0n1p2): initial error at time 1728704200: ext4_lookup:1782: inode 142012 referenced in directory 2',
        '[  11.512170] Aborting journal on device nvme0n1p2-8.',
        '[  11.512240] EXT4-fs (nvme0n1p2): Remounting filesystem read-only',
        '[  11.512310] Kernel panic - not syncing: EXT4-fs: panic_on_error mount flag is set; halt kernel immediately',
        '[  11.512380] CPU: 3 PID: 802 Comm: tar Tainted: G        W          6.8.0-45-generic',
        '[  11.512450] Call Trace:',
        '[  11.512490]  <TASK>',
        '[  11.512530]  dump_stack_lvl+0x48/0x70',
        '[  11.512580]  panic+0x310/0x350',
        '[  11.512640]  ext4_handle_error+0x92/0xd0 [ext4]',
        '[  11.512710]  ext4_lookup+0x1b4/0x220 [ext4]',
        '[  11.512780]  __lookup_slow+0x8f/0x140',
        '[  11.512840]  walk_component+0x142/0x1e0',
        '[  11.512900]  path_lookupat+0x6b/0x1a0',
        '[  11.512960]  do_syscall_64+0x7f/0x180',
        '[  11.513020]  entry_SYSCALL_64_after_hwframe+0x78/0x80',
        '[  11.513080]  </TASK>',
        '[  11.513140] ---[ end Kernel panic - not syncing: EXT4-fs error (device nvme0n1p2): ext4_lookup: deleted inode referenced: 142012 ]---'
      ],
      explanation: 'Una entrada de directorio apunta a un inodo cuyo contador de enlaces en disco ya era cero (inodo huérfano).',
      educationalRootCause: 'En ext4, la tabla de inodos mantiene los metadatos de los archivos. Si un directorio conserva el nombre de un archivo que fue purgado de la tabla de asignación, el driver detecta incoherencia entre el árbol de directorios y el mapa de bits.',
      recommendedFix: 'Arrancar desde el Emergency Shell y ejecutar "fsck.ext4 -fy /dev/nvme0n1p2" para reconciliar los inodos huérfanos y moverlos a /lost+found.'
    },
    luks_crypto_failure: {
      id: 'luks_crypto_failure',
      title: 'dm-crypt / LUKS: Fallo Crítico en Vector de Inicialización (aes-xts)',
      fsType: 'crypto',
      panicMessage: 'Kernel panic - not syncing: dm-crypt: Cryptographic cipher IV generator desync: crypt_alloc_req failed',
      cFunction: 'crypt_convert+0x280/0x610 [dm_crypt]',
      module: 'dm_crypt.ko',
      stackLines: [
        '[  09.840120] device-mapper: crypt: /dev/mapper/cryptroot: Sector 819200 cipher error (aes-xts-plain64)',
        '[  09.840190] crypto_engine: Hardware accelerator AES-NI responded with invalid state token 0xdeadbeef',
        '[  09.840270] Kernel panic - not syncing: dm-crypt: Critical memory corruption in crypto context key material',
        '[  09.840340] CPU: 0 PID: 610 Comm: kcryptd Tainted: G        W          6.8.0-45-generic',
        '[  09.840410] Call Trace:',
        '[  09.840450]  <TASK>',
        '[  09.840490]  dump_stack_lvl+0x48/0x70',
        '[  09.840540]  panic+0x310/0x350',
        '[  09.840600]  kcryptd_crypt+0x4b8/0x5e0 [dm_crypt]',
        '[  09.840670]  kworker_thread+0x1fc/0x390',
        '[  09.840730]  kthread+0xe5/0x120',
        '[  09.840790]  ret_from_fork+0x31/0x50',
        '[  09.840850]  </TASK>',
        '[  09.840910] ---[ end Kernel panic - not syncing: dm-crypt: Critical memory corruption in crypto context key material ]---'
      ],
      explanation: 'El subsistema criptográfico dm-crypt sufrió una desincronización en el vector de inicialización (IV) o el espacio de memoria de la clave maestra.',
      educationalRootCause: 'dm-crypt maneja sectores cifrados transparentemente en tiempo real. Si la memoria física sufre un error de paridad mientras el hilo kcryptd procesa bloques XTS, el kernel detecta que la clave o el IV están comprometidos y fuerza el pánico para no escribir datos cifrados con llaves corruptas.',
      recommendedFix: 'Verificar estabilidad de memoria RAM en el Paso 1 (Hardware Diagnostics) y volver a ejecutar cryptsetup open.'
    }
  };

  const currentPanic = scenarios[selectedScenario];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-slate-100 font-mono select-text overflow-hidden">
      {/* 1. Barra de Control Superior para el Estudiante */}
      <div className="p-3 bg-[#0d0d0d] border-b border-rose-950/80 flex flex-wrap items-center justify-between gap-3 select-none text-xs z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-600/40 flex items-center justify-center text-rose-400 animate-pulse">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xs tracking-wider">
                SIMULADOR DE KERNEL PANIC EN VIVO
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-800">
                PÁNICO DETECTADO
              </span>
              {/* Indicador intermitente de Caps Lock */}
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono border transition-opacity duration-300 ${
                blinkCaps 
                  ? 'bg-amber-950 text-amber-300 border-amber-700 opacity-100' 
                  : 'bg-black text-slate-600 border-slate-900 opacity-40'
              }`}>
                CAPS LOCK LED: {blinkCaps ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Backtrace real generado por subsistema de archivos ({currentPanic.fsType.toUpperCase()})
            </p>
          </div>
        </div>

        {/* Acciones principales: Try Again y Modo Rescate */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de tipo de pánico */}
          <div className="flex items-center gap-1 p-1 bg-black rounded-lg border border-slate-800 text-[11px]">
            <span className="text-slate-500 px-1.5 hidden md:inline">Variante:</span>
            {(['btrfs_tree_corrupt', 'xfs_crc_error', 'ext4_deleted_inode', 'luks_crypto_failure'] as PanicScenarioType[]).map(id => (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedScenario(id)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  selectedScenario === id
                    ? 'bg-rose-950 text-rose-200 border border-rose-800 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {id === 'btrfs_tree_corrupt' && 'Btrfs'}
                {id === 'xfs_crc_error' && 'XFS'}
                {id === 'ext4_deleted_inode' && 'ext4'}
                {id === 'luks_crypto_failure' && 'LUKS'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs flex items-center gap-1.5 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Explicación</span>
            {showExplanation ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {onOpenRescueShell && (
            <button
              type="button"
              onClick={() => {
                onOpenRescueShell();
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-300 border border-sky-800/60 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Abrir consola de emergencia Dracut para ejecutar fsck o gdisk"
            >
              <Wrench className="w-3.5 h-3.5 text-sky-400" />
              <span>Shell de Rescate</span>
            </button>
          )}

          {/* Botón Principal: Reintentar / Reanudar Instalador */}
          <button
            type="button"
            onClick={onTryAgain}
            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all animate-bounce"
            title="Recuperar el sistema y reanudar la instalación"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again (Reintentar)</span>
          </button>
        </div>
      </div>

      {/* 2. Panel Plegable con Explicación Didáctica del Backtrace */}
      {showExplanation && (
        <div className="bg-[#12131a] border-b border-slate-800 p-4 space-y-2 select-text font-sans text-xs text-slate-200">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-xs flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-400" />
              <span>Diagnóstico Didáctico: {currentPanic.title}</span>
            </h4>
            <span className="text-[11px] font-mono text-amber-300">
              Módulo: {currentPanic.module} · Función: {currentPanic.cFunction}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800 space-y-1">
              <span className="font-semibold text-rose-300 block text-[11px]">¿Qué ha ocurrido?</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {currentPanic.explanation}
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800 space-y-1">
              <span className="font-semibold text-amber-300 block text-[11px]">Mecanismo Interno del Kernel</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {currentPanic.educationalRootCause}
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800 space-y-1">
              <span className="font-semibold text-emerald-300 block text-[11px]">Solución Recomendada</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {currentPanic.recommendedFix}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Pantalla de Consola Monocroma de Kernel Panic Real */}
      <div className="flex-1 p-4 sm:p-6 bg-black overflow-y-auto leading-relaxed text-xs text-slate-300 select-text font-mono space-y-0.5">
        <div className="text-slate-400 pb-2">
          [ 0.000000] Linux version 6.8.0-45-generic (buildd@lcy02-amd64-001) (gcc-13) #45-Ubuntu SMP PREEMPT_DYNAMIC
        </div>

        {currentPanic.stackLines.map((line, idx) => (
          <div 
            key={idx}
            className={`${
              line.includes('Kernel panic') || line.includes('cut here')
                ? 'text-rose-400 font-bold bg-rose-950/20 py-0.5'
                : line.includes('BTRFS critical') || line.includes('XFS: Metadata') || line.includes('EXT4-fs error') || line.includes('cipher error')
                ? 'text-amber-300 font-bold'
                : line.includes('Call Trace') || line.includes('<TASK>')
                ? 'text-sky-300 font-semibold'
                : line.includes('RIP:') || line.includes('RAX:')
                ? 'text-yellow-200'
                : 'text-slate-300'
            }`}
          >
            {line}
          </div>
        ))}

        <div className="pt-4 text-slate-500 animate-pulse">
          _ (Kernel halted: Presiona "Try Again" para reanudar el instalador)
        </div>
      </div>

      {/* 4. Barra Inferior con Acceso Directo de Reanudación */}
      <div className="p-3 bg-[#0a0a0a] border-t border-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
        <span className="text-slate-500 text-[11px]">
          Simulación de fallo catastrófico del kernel en tiempo de ejecución.
        </span>

        <button
          type="button"
          onClick={onTryAgain}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-2 shadow-lg"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Try Again / Reanudar Instalador</span>
        </button>
      </div>
    </div>
  );
};
