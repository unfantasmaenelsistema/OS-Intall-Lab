import React from 'react';
import { 
  AlertTriangle, 
  Dices, 
  HardDrive, 
  Cpu, 
  Flame, 
  WifiOff, 
  RotateCcw, 
  ShieldAlert, 
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Zap,
  Layers
} from 'lucide-react';
import { HardwareConfig, HardwareFailuresConfig, OSType } from '../types/installer';
import { RAM_CRITICAL_MB, RAM_LOW_MB } from '../utils/partitionValidator';
import { useTheme } from '../context/ThemeContext';

interface HardwareChaosInjectorProps {
  osType: OSType;
  hardware: HardwareConfig;
  onChangeHardware: (updated: Partial<HardwareConfig>) => void;
}

const FAILURE_CATALOG = [
  {
    key: 'badSectors' as const,
    name: 'Sectores Defectuosos en Disco',
    code: 'EIO_SECTOR_LBA4145674',
    icon: HardDrive,
    color: 'rose',
    badge: 'I/O Disk Error',
    description: 'Genera bloques corruptos en los primeros sectores de datos del disco NVMe/SATA.',
    technicalDetail: 'El validador detecta sectores no reasignables mediante SMART y bloquea la creación de tablas o sistemas de archivos con EIO (Input/Output Error).'
  },
  {
    key: 'ramBitFlip' as const,
    name: 'Bit-Flip en RAM (MCE)',
    code: 'MCE_ECC_UNCORRECTABLE',
    icon: Cpu,
    color: 'purple',
    badge: 'Hardware MCE',
    description: 'Simula celdas de DRAM inestables que alteran bits en memoria durante la ejecución.',
    technicalDetail: 'Provoca Machine Check Exceptions (MCE) y corrupción en el cálculo de sumas de verificación sha256/md5 de los paquetes del kernel.'
  },
  {
    key: 'thermalThrottling' as const,
    name: 'Sobrecalentamiento CPU (104°C)',
    code: 'PROCHOT_THERMAL_THROTTLE',
    icon: Flame,
    color: 'amber',
    badge: '104°C Throttling',
    description: 'Dispara los sensores térmicos del encapsulado del procesador por encima de TjMax.',
    technicalDetail: 'El validador notifica caída masiva de frecuencias a 800 MHz con riesgo de apagado espontáneo por protección de placa base.'
  },
  {
    key: 'networkDisconnect' as const,
    name: 'Caída de Tarjeta de Red (NIC)',
    code: 'LINK_DOWN_NO_CARRIER',
    icon: WifiOff,
    color: 'sky',
    badge: 'NIC Link Down',
    description: 'Desconecta el transceptor Ethernet o enlace virtual del host de instalación.',
    technicalDetail: 'Avisa al usuario de la imposibilidad de descargar paquetes, configurar espejos HTTP o verificar firmas PGP de repositorios.'
  }
];

export const HardwareChaosInjector: React.FC<HardwareChaosInjectorProps> = ({
  hardware,
  onChangeHardware,
  osType
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const currentFailures: HardwareFailuresConfig = hardware.failures || {
    badSectors: false,
    networkDisconnect: false,
    ramBitFlip: false,
    thermalThrottling: false
  };

  const ramCriticalMB = RAM_CRITICAL_MB[osType];
  const isLowRam = hardware.ramMB < ramCriticalMB;
  const isMarginalRam = hardware.ramMB >= ramCriticalMB && hardware.ramMB < RAM_LOW_MB;

  const countActiveFailures = 
    (currentFailures.badSectors ? 1 : 0) +
    (currentFailures.ramBitFlip ? 1 : 0) +
    (currentFailures.thermalThrottling ? 1 : 0) +
    (currentFailures.networkDisconnect ? 1 : 0) +
    (isLowRam ? 1 : 0);

  const hasAnyActive = countActiveFailures > 0;

  // Conmutar un fallo individual
  const toggleFailure = (key: keyof HardwareFailuresConfig) => {
    const nextFailures = {
      ...currentFailures,
      [key]: !currentFailures[key]
    };
    onChangeHardware({ failures: nextFailures });
  };

  // Restablecer todo a hardware 100% sano y óptimo
  const handleClearAll = () => {
    onChangeHardware({
      ramMB: hardware.ramMB < 4096 ? 8192 : hardware.ramMB,
      failures: {
        badSectors: false,
        networkDisconnect: false,
        ramBitFlip: false,
        thermalThrottling: false
      }
    });
  };

  // Generador de Fallo Aleatorio (Random Chaos)
  const handleInjectRandomFailure = () => {
    // Escenarios posibles:
    // 0: Sectores defectuosos
    // 1: Falta de RAM severa (1024 MB)
    // 2: Bit-Flip en memoria RAM
    // 3: Sobrecalentamiento térmico
    // 4: Caída de interfaz de red
    const scenarios = [
      () => {
        onChangeHardware({
          failures: { ...currentFailures, badSectors: true }
        });
      },
      () => {
        onChangeHardware({
          ramMB: 512, // RAM insuficiente extrema (crítica en Linux y Windows)
          failures: { ...currentFailures }
        });
      },
      () => {
        onChangeHardware({
          failures: { ...currentFailures, ramBitFlip: true }
        });
      },
      () => {
        onChangeHardware({
          failures: { ...currentFailures, thermalThrottling: true }
        });
      },
      () => {
        onChangeHardware({
          failures: { ...currentFailures, networkDisconnect: true }
        });
      },
      () => {
        // Doble fallo simultáneo (caos avanzado: disco + ram)
        onChangeHardware({
          ramMB: 512,
          failures: { ...currentFailures, badSectors: true }
        });
      }
    ];

    const randomIndex = Math.floor(Math.random() * scenarios.length);
    scenarios[randomIndex]();
  };

  return (
    <div className={`p-4 sm:p-5 rounded-xl border transition-all ${
      hasAnyActive
        ? 'bg-rose-950/15 border-rose-500/40 shadow-lg shadow-rose-950/10 ring-1 ring-rose-500/30'
        : isLight 
        ? 'bg-slate-50 border-slate-300' 
        : 'bg-slate-900 border-slate-800'
    }`}>
      {/* Cabecera del Inyector de Caos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            hasAnyActive 
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse' 
              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
          }`}>
            <Dices className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">
                Simulador de Fallos Aleatorios e Inestabilidad de Hardware
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                hasAnyActive 
                  ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                {hasAnyActive ? `${countActiveFailures} ANOMALÍA${countActiveFailures > 1 ? 'S' : ''} ACTIVA` : 'HARDWARE SANO'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Introduce averías de hardware simuladas (falta de RAM, sectores corruptos, térmicos) para poner a prueba el motor de validación en tiempo real.
            </p>
          </div>
        </div>

        {/* Botones de acción rápida: Aleatorio y Limpiar */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleInjectRandomFailure}
            className="px-3 py-1.5 rounded-lg bg-linear-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            title="Inyecta uno o varios fallos de hardware elegidos al azar para poner a prueba el validador"
          >
            <Dices className="w-3.5 h-3.5" />
            <span>Generar Fallo Aleatorio</span>
          </button>

          {hasAnyActive && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Restaurar hardware a configuración normal sin fallos"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Restaurar</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid de Fallos Conmutables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
        {/* FALLO ESPECIAL 1: Falta severa de RAM (512 MB, crítico para cualquier SO) */}
        <div 
          onClick={() => onChangeHardware({ ramMB: isLowRam ? 8192 : 512 })}
          className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between select-none ${
            isLowRam
              ? 'bg-rose-950/40 border-rose-500 text-rose-200 ring-1 ring-rose-500/50 shadow-md'
              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                <Cpu className={`w-3.5 h-3.5 ${isLowRam ? 'text-rose-400' : 'text-slate-400'}`} />
                <span>Memoria RAM Insuficiente (512 MB)</span>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${isLowRam ? 'bg-rose-500 animate-pulse' : 'bg-slate-700'}`} />
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Reduce la memoria RAM física a solo <strong>512 MB</strong>. Provoca bloqueo OOM durante initramfs o carga del kernel.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-800/80 text-[10px] font-mono">
            <span className="text-slate-500">Estado: {hardware.ramMB >= 1024 ? `${hardware.ramMB / 1024} GB` : `${hardware.ramMB} MB`} asignados</span>
            <span className={isLowRam ? 'text-rose-400 font-bold' : 'text-slate-400'}>
              {isLowRam ? `CRÍTICO (< ${ramCriticalMB / 1024} GB)` : 'Normal'}
            </span>
          </div>
        </div>

        {/* RESTO DE FALLOS DEL CATÁLOGO */}
        {FAILURE_CATALOG.map((f) => {
          const isActive = currentFailures[f.key];
          const IconComp = f.icon;

          return (
            <div
              key={f.key}
              onClick={() => toggleFailure(f.key)}
              className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between select-none ${
                isActive
                  ? 'bg-rose-950/40 border-rose-500 text-rose-200 ring-1 ring-rose-500/50 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
                    <span>{f.name}</span>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-rose-500 animate-pulse' : 'bg-slate-700'}`} />
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {f.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-800/80 text-[10px] font-mono">
                <span className="text-slate-500">{f.code}</span>
                <span className={isActive ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                  {isActive ? 'Inyectado' : 'Inactivo'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Banner de Impacto Formativo cuando hay anomalías activas */}
      {hasAnyActive && (
        <div className="mt-3.5 p-3 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs space-y-1 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Alerta del Validador: Anomalías de Hardware en Tránsito</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed pl-6">
            El motor de validación del simulador y la barra superior ahora muestran avisos/errores correspondientes. Si avanzas al paso de <strong>Particionado</strong> o al proceso de <strong>Instalación</strong>, el instalador registrará los bloqueos de E/S o excepciones de memoria pertinentes.
          </p>
        </div>
      )}
    </div>
  );
};
