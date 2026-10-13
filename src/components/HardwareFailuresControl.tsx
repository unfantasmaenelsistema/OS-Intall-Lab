import React from 'react';
import { 
  AlertTriangle, 
  WifiOff, 
  HardDrive, 
  Flame, 
  Cpu, 
  RotateCcw, 
  ShieldAlert, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { HardwareFailuresConfig } from '../types/installer';

interface HardwareFailuresControlProps {
  failures: HardwareFailuresConfig;
  onChangeFailures: (failures: HardwareFailuresConfig) => void;
  onClearFailures: () => void;
  onTriggerKernelPanic?: () => void;
}

export const HardwareFailuresControl: React.FC<HardwareFailuresControlProps> = ({
  failures,
  onChangeFailures,
  onClearFailures,
  onTriggerKernelPanic
}) => {
  const anyActive = failures.badSectors || failures.networkDisconnect || failures.ramBitFlip || failures.thermalThrottling;

  const handleToggle = (key: keyof HardwareFailuresConfig) => {
    onChangeFailures({
      ...failures,
      [key]: !failures[key]
    });
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3.5 text-xs text-slate-200 shadow-md">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-white text-xs flex items-center gap-2">
              <span>Taller de Inyección de Fallos de Hardware</span>
              {anyActive && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-950/80 text-rose-300 border border-rose-800 animate-pulse">
                  FALLO ACTIVO
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-400">
              Simula anomalías físicas reales para verificar cómo el kernel y el instalador las detectan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onTriggerKernelPanic && (
            <button
              type="button"
              onClick={onTriggerKernelPanic}
              className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-[11px] font-mono border border-rose-800 flex items-center gap-1.5 transition-colors shadow-sm"
              title="Provocar un Kernel Panic inmediato con backtrace del sistema de archivos"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Simular Kernel Panic</span>
            </button>
          )}

          {anyActive && (
            <button
              type="button"
              onClick={onClearFailures}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-mono border border-slate-800 flex items-center gap-1.5 transition-colors"
              title="Restaurar hardware a estado normal"
            >
              <RotateCcw className="w-3 h-3 text-emerald-400" />
              <span>Restaurar Hardware</span>
            </button>
          )}
        </div>
      </div>

      {/* Lista de conmutadores de fallo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Fallo 1: Sectores Defectuosos en Disco */}
        <button
          type="button"
          onClick={() => handleToggle('badSectors')}
          className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
            failures.badSectors
              ? 'bg-rose-950/30 border-rose-500/70 text-rose-200 ring-1 ring-rose-500/30 shadow-md'
              : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 font-bold text-xs text-white">
              <HardDrive className={`w-3.5 h-3.5 ${failures.badSectors ? 'text-rose-400' : 'text-slate-400'}`} />
              <span>Sectores Dañados</span>
            </div>
            <span className={`w-2 h-2 rounded-full ${failures.badSectors ? 'bg-rose-400 animate-pulse' : 'bg-slate-700'}`}></span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            I/O error en LBA 4145674 durante escrituras en NVMe.
          </p>
        </button>

        {/* Fallo 2: Desconexión de Red Ethernet */}
        <button
          type="button"
          onClick={() => handleToggle('networkDisconnect')}
          className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
            failures.networkDisconnect
              ? 'bg-amber-950/30 border-amber-500/70 text-amber-200 ring-1 ring-amber-500/30 shadow-md'
              : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 font-bold text-xs text-white">
              <WifiOff className={`w-3.5 h-3.5 ${failures.networkDisconnect ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>Corte de Red (NIC)</span>
            </div>
            <span className={`w-2 h-2 rounded-full ${failures.networkDisconnect ? 'bg-amber-400 animate-pulse' : 'bg-slate-700'}`}></span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            enp1s0 Link is DOWN. Falla descarga de paquetes de red.
          </p>
        </button>

        {/* Fallo 3: Bit-Flip en Memoria RAM (MCE) */}
        <button
          type="button"
          onClick={() => handleToggle('ramBitFlip')}
          className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
            failures.ramBitFlip
              ? 'bg-purple-950/30 border-purple-500/70 text-purple-200 ring-1 ring-purple-500/30 shadow-md'
              : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 font-bold text-xs text-white">
              <Cpu className={`w-3.5 h-3.5 ${failures.ramBitFlip ? 'text-purple-400' : 'text-slate-400'}`} />
              <span>Bit-Flip RAM (MCE)</span>
            </div>
            <span className={`w-2 h-2 rounded-full ${failures.ramBitFlip ? 'bg-purple-400 animate-pulse' : 'bg-slate-700'}`}></span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Machine Check Exception (MCE) en controlador de memoria.
          </p>
        </button>

        {/* Fallo 4: Sobrecalentamiento Térmico CPU */}
        <button
          type="button"
          onClick={() => handleToggle('thermalThrottling')}
          className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
            failures.thermalThrottling
              ? 'bg-orange-950/30 border-orange-500/70 text-orange-200 ring-1 ring-orange-500/30 shadow-md'
              : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 font-bold text-xs text-white">
              <Flame className={`w-3.5 h-3.5 ${failures.thermalThrottling ? 'text-orange-400' : 'text-slate-400'}`} />
              <span>Thermal Throttling</span>
            </div>
            <span className={`w-2 h-2 rounded-full ${failures.thermalThrottling ? 'bg-orange-400 animate-pulse' : 'bg-slate-700'}`}></span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            CPU a 104°C: reloj estrangulado y degradación de I/O.
          </p>
        </button>
      </div>

      {/* Alerta explicativa activa cuando se inyecta algún fallo */}
      {anyActive && (
        <div className="p-3 rounded-lg bg-rose-950/25 border border-rose-800/60 text-[11px] space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Diagnóstico en Progreso: El kernel está registrando anomalías</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Revisa la pestaña <strong>"Eventos dmesg"</strong> o abre la <strong>Terminal Virtual</strong> para ver las trazas de error capturadas. En hardware real, estos incidentes requieren ejecutar herramientas forenses como <code className="bg-black px-1 py-0.5 rounded text-amber-300 font-mono">smartctl -a /dev/nvme0n1</code>, <code className="bg-black px-1 py-0.5 rounded text-amber-300 font-mono">ethtool enp1s0</code> o comprobar los códigos MCE con <code className="bg-black px-1 py-0.5 rounded text-amber-300 font-mono">rasdaemon</code>.
          </p>
        </div>
      )}
    </div>
  );
};
