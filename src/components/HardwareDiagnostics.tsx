import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Activity, 
  Flame, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Thermometer, 
  Play, 
  Square, 
  RotateCcw, 
  HelpCircle, 
  X, 
  TrendingUp, 
  HardDrive, 
  Terminal, 
  Check, 
  Sparkles,
  Info,
  Server
} from 'lucide-react';
import { HardwareConfig, OSType } from '../types/installer';

interface HardwareDiagnosticsProps {
  isOpen: boolean;
  onClose: () => void;
  hardware: HardwareConfig;
  osType: OSType;
  onUpdateHardware?: (updated: Partial<HardwareConfig>) => void;
}

export interface StabilityAssessment {
  score: number; // 0 - 100%
  rating: 'Excelente' | 'Buena' | 'Riesgo Moderado' | 'Inestable';
  color: string;
  badgeBg: string;
  luksImpact: string;
  packageUnpackImpact: string;
  initramfsImpact: string;
  oomRisk: string;
  recommendedAction: string;
}

export const HardwareDiagnostics: React.FC<HardwareDiagnosticsProps> = ({
  isOpen,
  onClose,
  hardware,
  osType,
  onUpdateHardware
}) => {
  const [testState, setTestState] = useState<'idle' | 'running_cpu' | 'running_ram' | 'completed' | 'aborted'>('idle');
  const [testMode, setTestMode] = useState<'both' | 'cpu_only' | 'ram_only'>('both');
  const [simulateDefect, setSimulateDefect] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'impact'>('dashboard');

  // Métricas en tiempo real
  const [progress, setProgress] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [cpuTempC, setCpuTempC] = useState(38);
  const [cpuFreqGHz, setCpuFreqGHz] = useState(3.60);
  const [cpuLoadPct, setCpuLoadPct] = useState(4);
  const [ramTestedMB, setRamTestedMB] = useState(0);
  const [ramThroughputGBs, setRamThroughputGBs] = useState(0);
  const [ramErrorsCount, setRamErrorsCount] = useState(0);
  const [isThrottling, setIsThrottling] = useState(false);
  const [testLogs, setTestLogs] = useState<string[]>([
    '# Linux/Windows Hardware Diagnostics Subsystem v4.19',
    '# stress-ng + memtester 4.6.0 hardware validation suite',
    `# Target: ${hardware.cpuCores} vCPUs, ${hardware.ramMB / 1024} GB RAM, ${hardware.firmware.toUpperCase()} mode.`,
    'Sistema en reposo (idle). Pulsa "Iniciar Test de Estrés" para evaluar la estabilidad térmica y de memoria.'
  ]);

  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll del log terminal
  useEffect(() => {
    if (activeTab === 'logs' && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [testLogs, activeTab]);

  // Cálculo de evaluación de estabilidad según especificaciones del hardware
  const assessStability = (): StabilityAssessment => {
    let score = 100;

    // Penalización si la RAM es baja para el instalador moderno
    if (hardware.ramMB <= 4096) {
      score -= 15;
    } else if (hardware.ramMB <= 8192) {
      score -= 5;
    }

    // Penalización por pocos cores en tareas intensivas de cifrado
    if (hardware.cpuCores <= 2) {
      score -= 10;
    }

    // Si hubo errores simulados o sobrecalentamiento
    if (simulateDefect) {
      score -= 35;
    }
    if (isThrottling) {
      score -= 20;
    }

    score = Math.max(25, Math.min(100, score));

    if (score >= 90) {
      return {
        score,
        rating: 'Excelente',
        color: 'text-emerald-400',
        badgeBg: 'bg-emerald-950 border-emerald-800 text-emerald-300',
        luksImpact: 'Cálculo de clave Argon2id a máxima velocidad (menos de 1.8 segundos). Cero anomalías en rondas criptográficas.',
        packageUnpackImpact: 'Descompresión multihilo simultánea (XZ / Zstandard). Verificación de sumas sha256 100% íntegra.',
        initramfsImpact: 'Generación dracut/mkinitcpio sin retardos; módulos del kernel ensamblados sin riesgo de corrupción.',
        oomRisk: 'Riesgo nulo de OOM Killer. Capacidad sobrante para cachés de disco (page cache) y buffer de paquetes.',
        recommendedAction: 'Hardware plenamente cualificado para despliegues de producción y particionado avanzado (LVM + LUKS2).'
      };
    } else if (score >= 75) {
      return {
        score,
        rating: 'Buena',
        color: 'text-sky-400',
        badgeBg: 'bg-sky-950 border-sky-800 text-sky-300',
        luksImpact: 'Derivación de claves LUKS nominal. Rendimiento adecuado en instrucciones AES-NI aceleradas por hardware.',
        packageUnpackImpact: 'Extracción fluida de paquetes del SO. Se recomienda no ejecutar tareas pesadas en segundo plano.',
        initramfsImpact: 'Ensamblado de initramfs correcto dentro de los parámetros esperados de tiempo.',
        oomRisk: 'Bajo riesgo. Si usas perfiles de servidor con interfaz gráfica (GNOME/Cockpit), es vital crear partición Swap.',
        recommendedAction: 'Adecuado para instalación estándar. Se recomienda configurar entre 4 y 8 GB de swap.'
      };
    } else if (score >= 50) {
      return {
        score,
        rating: 'Riesgo Moderado',
        color: 'text-amber-400',
        badgeBg: 'bg-amber-950 border-amber-800 text-amber-300',
        luksImpact: 'Throttling térmico puede ralentizar el benchmark de PBKDF Argon2id hasta 8x, retrasando la creación del keyslot.',
        packageUnpackImpact: 'Riesgo de micro-pausas durante la escritura a disco y consumo de memoria elevado.',
        initramfsImpact: 'La CPU redujo su reloj por temperatura. La compresión de la imagen del kernel tardará significativamente más.',
        oomRisk: 'Advertencia: Con 4 GB de RAM, perfiles de instalación con GUI pueden acercarse al límite de memoria física.',
        recommendedAction: 'Se sugiere aumentar la RAM a 8 GB o 16 GB, o elegir el perfil de instalación "Mínimo (CLI)".'
      };
    } else {
      return {
        score,
        rating: 'Inestable',
        color: 'text-rose-400',
        badgeBg: 'bg-rose-950 border-rose-800 text-rose-300',
        luksImpact: 'CRÍTICO: Bit-flips en RAM durante el cálculo de clave AES-XTS pueden generar claves maestras corruptas irrecuperables.',
        packageUnpackImpact: 'Fallo inminente de checksum en paquetes (RPM / dpkg abortarán con "Archive corrupted / Hash mismatch").',
        initramfsImpact: 'La imagen de arranque se escribirá con bloques defectuosos, provocando Kernel Panic en el primer arranque.',
        oomRisk: 'Peligro inminente de invocación del OOM Killer contra el proceso del instalador.',
        recommendedAction: 'Revisa módulos de memoria física, disipación térmica o aumenta los recursos asignados en el hipervisor.'
      };
    }
  };

  const assessment = assessStability();

  // Bucle de simulación del test de estrés
  const isRunning = testState === 'running_cpu' || testState === 'running_ram';

  // Reloj del test: el updater solo avanza el porcentaje (debe ser puro)
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 4, 100));
    }, 280);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Efectos de cada avance del test (telemetría, logs y transiciones de fase)
  useEffect(() => {
    if (!isRunning || progress === 0) return;
    const next = progress;

    setElapsedSec(sec => sec + 0.3);

    if (testState === 'running_cpu') {
      // Dinámica de CPU
      setCpuLoadPct(99.4);
      setCpuTempC(temp => {
        const maxTemp = simulateDefect ? 97 : hardware.cpuCores >= 8 ? 84 : 72;
        return Math.min(maxTemp, +(temp + (simulateDefect ? 3.5 : 1.8)).toFixed(1));
      });

      if (next % 20 === 0) {
        setTestLogs(l => [
          ...l,
          `[stress-ng: cpu] ${hardware.cpuCores} workers running matrix mult & fft... (temp: ${cpuTempC.toFixed(0)}°C, freq: ${cpuFreqGHz} GHz)`
        ]);
      }

      // Transición al test de RAM si aplica
      if (next >= 50 && testMode === 'both') {
        setTestState('running_ram');
        setTestLogs(l => [
          ...l,
          '------------------------------------------------------------',
          '[OK] Test de CPU completado sin fallos fatales de cómputo.',
          `[memtester] Asignando ${Math.floor(hardware.ramMB * 0.8)} MB de RAM para pruebas de bus de direcciones y patrones...`,
          '------------------------------------------------------------'
        ]);
      } else if (next >= 100 && testMode === 'cpu_only') {
        setTestState('completed');
        setCpuLoadPct(5);
        setTestLogs(l => [
          ...l,
          '[ÉXITO] Benchmark de CPU finalizado. Índice de estabilidad calculado.'
        ]);
      }
    } else if (testState === 'running_ram') {
      // Dinámica de RAM
      const maxRam = Math.floor(hardware.ramMB * 0.85);
      setRamTestedMB(m => Math.min(maxRam, m + Math.floor(maxRam / 12)));
      setRamThroughputGBs(+(38.4 + Math.random() * 4).toFixed(1));

      if (simulateDefect && next >= 70 && ramErrorsCount === 0) {
        setRamErrorsCount(3);
        setTestLogs(l => [
          ...l,
          '[ERROR CRÍTICO] memtester: Sticking bit detected at address 0x7ffd19b480 (Bit 14 stuck high!)',
          '[ALERTA] MCE: Machine Check Exception: Bus parity/ECC uncorrectable error logged by CPU memory controller!'
        ]);
      } else if (next % 16 === 0) {
        setTestLogs(l => [
          ...l,
          `[memtester] Random Value & Walking 1s: tested ${ramTestedMB} MB... OK`
        ]);
      }

      if (next >= 100) {
        setTestState('completed');
        setCpuLoadPct(4);
        setTestLogs(l => [
          ...l,
          '============================================================',
          `[FINALIZADO] Diagnóstico de hardware completado: Puntuación de estabilidad ${assessment.score}%.`,
          '============================================================'
        ]);
      }
    }
    // Solo debe reaccionar a cada tick del reloj, no a los valores que lee
  }, [progress]);

  // Estrangulamiento térmico derivado de la temperatura
  useEffect(() => {
    if (cpuTempC >= 90) {
      setIsThrottling(true);
      setCpuFreqGHz(+(3.6 - (cpuTempC - 88) * 0.15).toFixed(2));
    }
  }, [cpuTempC]);

  const handleStartTest = () => {
    setProgress(0);
    setElapsedSec(0);
    setCpuTempC(40);
    setCpuFreqGHz(3.60);
    setIsThrottling(false);
    setRamTestedMB(0);
    setRamErrorsCount(0);
    setTestLogs([
      `*** INICIANDO DIAGNÓSTICO DE HARDWARE (${testMode.toUpperCase()}) ***`,
      `Plataforma: ${hardware.firmware.toUpperCase()} · CPU: ${hardware.cpuCores} núcleos · RAM: ${hardware.ramMB / 1024} GB`,
      simulateDefect ? 'MODO ANOMALÍA ACTIVADO: Simulación de disipador flojo y módulos RAM defectuosos' : 'Condición física de hardware: Nominal',
      'Ejecutando pruebas de estrés sintético de coma flotante y ancho de banda de memoria...'
    ]);

    if (testMode === 'ram_only') {
      setTestState('running_ram');
    } else {
      setTestState('running_cpu');
    }
  };

  const handleStopTest = () => {
    setTestState('aborted');
    setCpuLoadPct(4);
    setTestLogs(l => [...l, '[INTERRUMPIDO] Test de estrés cancelado por el usuario.']);
  };

  const handleResetTest = () => {
    setTestState('idle');
    setProgress(0);
    setElapsedSec(0);
    setCpuTempC(38);
    setCpuFreqGHz(3.60);
    setCpuLoadPct(4);
    setRamTestedMB(0);
    setRamThroughputGBs(0);
    setRamErrorsCount(0);
    setIsThrottling(false);
    setTestLogs([
      '# Subprograma de diagnóstico reiniciado.',
      'Listo para nueva prueba.'
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl h-[90vh] max-h-[850px] flex flex-col shadow-2xl overflow-hidden font-sans text-xs text-slate-200">
        
        {/* 1. Encabezado */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">
                  Utilidad de Diagnóstico de Hardware &amp; Estrés (CPU / RAM)
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                  testState === 'completed'
                    ? assessment.badgeBg
                    : testState === 'running_cpu' || testState === 'running_ram'
                    ? 'bg-amber-950/80 border-amber-700 text-amber-300 animate-pulse'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {testState === 'completed' 
                    ? `ESTABILIDAD: ${assessment.score}% (${assessment.rating})` 
                    : testState === 'running_cpu' 
                    ? 'ESTRÉS CPU (AVX-512)' 
                    : testState === 'running_ram' 
                    ? 'TEST MEMORIA (MEMTEST)' 
                    : 'LISTO PARA TEST'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Evalúa la estabilidad térmica, mitigación de fallos de memoria y su impacto real en la instalación del SO
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Cerrar ventana de diagnóstico"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Barra de Control de Pruebas */}
        <div className="p-3.5 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Selector de modo y conmutador de simulación de fallo */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button
                type="button"
                disabled={testState === 'running_cpu' || testState === 'running_ram'}
                onClick={() => setTestMode('both')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  testMode === 'both' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                CPU + RAM
              </button>
              <button
                type="button"
                disabled={testState === 'running_cpu' || testState === 'running_ram'}
                onClick={() => setTestMode('cpu_only')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  testMode === 'cpu_only' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Solo CPU
              </button>
              <button
                type="button"
                disabled={testState === 'running_cpu' || testState === 'running_ram'}
                onClick={() => setTestMode('ram_only')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  testMode === 'ram_only' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Solo RAM
              </button>
            </div>

            {/* Toggle de anomalía de hardware */}
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={simulateDefect}
                disabled={testState === 'running_cpu' || testState === 'running_ram'}
                onChange={(e) => setSimulateDefect(e.target.checked)}
                className="w-3.5 h-3.5 accent-rose-500 rounded"
              />
              <span className={`text-[11px] ${simulateDefect ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                Simular Sobrecalentamiento / Defecto RAM
              </span>
            </label>
          </div>

          {/* Botones de acción (Iniciar / Detener / Reiniciar) */}
          <div className="flex items-center gap-2">
            {testState !== 'running_cpu' && testState !== 'running_ram' ? (
              <button
                type="button"
                onClick={handleStartTest}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-2 shadow-md"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{testState === 'completed' ? 'Repetir Test' : 'Iniciar Test de Estrés'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopTest}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-2 shadow-md"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Detener Prueba</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetTest}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              title="Restablecer valores"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3. Selector de Pestañas Interiores */}
        <div className="px-4 pt-2 border-b border-slate-800 flex items-center gap-3 bg-slate-950 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`pb-2.5 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Métricas &amp; Sensores en Vivo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('impact')}
            className={`pb-2.5 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'impact'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Impacto en la Estabilidad del Instalador</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${assessment.badgeBg}`}>
              {assessment.score}%
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`pb-2.5 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Consola de Salida del Kernel / stress-ng</span>
          </button>
        </div>

        {/* 4. Contenido Principal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

          {/* Barra de Progreso del Test si está corriendo */}
          {(testState === 'running_cpu' || testState === 'running_ram' || progress > 0) && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${testState === 'completed' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
                  <span>
                    {testState === 'running_cpu' && `Fase 1/2: Estrés de cálculo en ${hardware.cpuCores} núcleos`}
                    {testState === 'running_ram' && `Fase 2/2: Comprobación de integridad de memoria RAM`}
                    {testState === 'completed' && 'Prueba finalizada con éxito'}
                    {testState === 'aborted' && 'Prueba interrumpida'}
                  </span>
                </span>
                <span className="font-mono text-amber-400 font-bold">{progress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  style={{ width: `${progress}%` }}
                  className={`h-full rounded-full transition-all duration-300 ${
                    simulateDefect || isThrottling ? 'bg-linear-to-r from-amber-500 to-rose-500' : 'bg-linear-to-r from-amber-500 to-emerald-400'
                  }`}
                ></div>
              </div>
            </div>
          )}

          {/* PESTAÑA 1: Dashboard de Sensores y Métricas */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              {/* Tarjetas de Telemetría: CPU y RAM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Temperatura de CPU */}
                <div className={`p-4 rounded-xl border space-y-2 transition-all ${
                  cpuTempC >= 90
                    ? 'bg-rose-950/30 border-rose-600/70 text-rose-200'
                    : cpuTempC >= 75
                    ? 'bg-amber-950/30 border-amber-600/60 text-amber-200'
                    : 'bg-slate-900/80 border-slate-800 text-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Temperatura CPU</span>
                    <Thermometer className={`w-4 h-4 ${cpuTempC >= 85 ? 'text-rose-400 animate-bounce' : 'text-amber-400'}`} />
                  </div>
                  <div className="text-2xl font-mono font-bold">
                    {cpuTempC.toFixed(1)} <span className="text-sm font-sans font-normal text-slate-400">°C</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Límite TjMax: 100°C</span>
                    {isThrottling && <span className="text-rose-400 font-bold animate-pulse">THROTTLING</span>}
                  </div>
                </div>

                {/* 2. Frecuencia y Carga de Procesador */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Frecuencia / Carga</span>
                    <Zap className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-2xl font-mono font-bold">
                    {cpuFreqGHz.toFixed(2)} <span className="text-sm font-sans font-normal text-slate-400">GHz</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Carga: {cpuLoadPct.toFixed(0)}%</span>
                    <span className="text-slate-300 font-mono">{hardware.cpuCores} núcleos</span>
                  </div>
                </div>

                {/* 3. Memoria Testeada */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">RAM Analizada</span>
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-mono font-bold">
                    {(ramTestedMB / 1024).toFixed(1)} <span className="text-sm font-sans font-normal text-slate-400">/ {hardware.ramMB / 1024} GB</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Troughput: {ramThroughputGBs} GB/s</span>
                    <span className="text-emerald-400 font-mono">DDR4/5</span>
                  </div>
                </div>

                {/* 4. Errores de Memoria (Bit-flips / MCE) */}
                <div className={`p-4 rounded-xl border space-y-2 transition-all ${
                  ramErrorsCount > 0
                    ? 'bg-rose-950/40 border-rose-600 text-rose-200 shadow-lg'
                    : 'bg-slate-900/80 border-slate-800 text-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Errores de Paridad / MCE</span>
                    <AlertTriangle className={`w-4 h-4 ${ramErrorsCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
                  </div>
                  <div className={`text-2xl font-mono font-bold ${ramErrorsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {ramErrorsCount} <span className="text-sm font-sans font-normal text-slate-400">anomalías</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>RowHammer / Bits: {ramErrorsCount === 0 ? 'Limpio' : 'CORRUPCIÓN'}</span>
                    {ramErrorsCount > 0 && <span className="text-rose-400 font-bold">FALLO</span>}
                  </div>
                </div>
              </div>

              {/* Ajuste Rápido de Hardware desde el propio Diagnóstico */}
              {onUpdateHardware && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-xs flex items-center gap-2">
                      <Server className="w-4 h-4 text-amber-400" />
                      <span>Dimensionamiento Dinámico del Hardware (Reconfiguración en Caliente)</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">Modifica y vuelve a diagnosticar</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Capacidad de RAM:</label>
                      <div className="flex items-center gap-1.5">
                        {[4096, 8192, 16384, 32768].map(ram => (
                          <button
                            key={ram}
                            type="button"
                            onClick={() => onUpdateHardware({ ramMB: ram })}
                            className={`flex-1 py-1 px-2 rounded-md border text-center text-xs font-mono transition-all ${
                              hardware.ramMB === ram
                                ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {ram / 1024} GB
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Núcleos de CPU (vCPUs):</label>
                      <div className="flex items-center gap-1.5">
                        {[2, 4, 8, 16].map(cores => (
                          <button
                            key={cores}
                            type="button"
                            onClick={() => onUpdateHardware({ cpuCores: cores })}
                            className={`flex-1 py-1 px-2 rounded-md border text-center text-xs font-mono transition-all ${
                              hardware.cpuCores === cores
                                ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {cores} Cores
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumen gráfico de estabilidad */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-lg border ${assessment.badgeBg}`}>
                    {assessment.score}%
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs flex items-center gap-2">
                      <span>Calificación de Estabilidad:</span>
                      <span className={assessment.color}>{assessment.rating}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {assessment.recommendedAction}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('impact')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0"
                >
                  <span>Ver Desglose de Impacto</span>
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: Impacto Detallado en la Estabilidad de la Instalación */}
          {activeTab === 'impact' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>¿Cómo Afecta la Estabilidad de CPU y RAM a la Instalación del Sistema Operativo?</span>
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Muchos fallos misteriosos durante la instalación (cierres inesperados de Anaconda, corrupción en archivos de GRUB o errores de suma SHA256) no se deben al software, sino a anomalías térmicas o fallos sutiles en los módulos de RAM.
                </p>
              </div>

              {/* 4 Dimensiones Técnicas Críticas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. Cifrado LUKS2 & Derivación Argon2id */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <div className="w-6 h-6 rounded bg-sky-500/10 text-sky-400 flex items-center justify-center">
                      1
                    </div>
                    <span>Cifrado de Disco LUKS2 &amp; dm-crypt</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {assessment.luksImpact}
                  </p>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 text-[10px] text-slate-400 font-mono">
                    cryptsetup luksFormat utiliza 1 GB de RAM intensivo para benchmark de resistencia contra ataques por GPU.
                  </div>
                </div>

                {/* 2. Descompresión de Paquetes y Checksums */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <div className="w-6 h-6 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      2
                    </div>
                    <span>Descompresión de Paquetes (RPM / dpkg)</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {assessment.packageUnpackImpact}
                  </p>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 text-[10px] text-slate-400 font-mono">
                    Un solo bit volteado en RAM (bit-flip) causará: "rpmdb: BDB0111 corrupted hash page".
                  </div>
                </div>

                {/* 3. Compilación de Initramfs / Dracut */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <div className="w-6 h-6 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      3
                    </div>
                    <span>Generación de initramfs &amp; GRUB</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {assessment.initramfsImpact}
                  </p>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 text-[10px] text-slate-400 font-mono">
                    dracut ejecuta compresión multihilo zstd sobre módulos criptográficos.
                  </div>
                </div>

                {/* 4. Riesgo de Colapso OOM (Out Of Memory) */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <div className="w-6 h-6 rounded bg-rose-500/10 text-rose-400 flex items-center justify-center">
                      4
                    </div>
                    <span>Riesgo de OOM Killer en Instaladores Gráficos</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {assessment.oomRisk}
                  </p>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 text-[10px] text-slate-400 font-mono">
                    En Linux, si la memoria física se agota, el kernel invoca /bin/kill contra el proceso instalador.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: Registro de Consola de la Prueba de Estrés */}
          {activeTab === 'logs' && (
            <div className="p-4 rounded-xl bg-black border border-slate-800 font-mono text-xs space-y-2 select-text">
              <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-900 text-[11px]">
                <span>/dev/kmsg · stress-ng stdout</span>
                <span className="text-amber-400">
                  {testState === 'running_cpu' || testState === 'running_ram' ? 'STRESS ACTIVO' : 'IDLE'}
                </span>
              </div>
              <pre className="h-72 overflow-y-auto space-y-1 text-slate-300 leading-relaxed p-1">
                {testLogs.map((log, i) => (
                  <div 
                    key={i} 
                    className={`${
                      log.includes('ERROR') || log.includes('CORRUPCIÓN') 
                        ? 'text-rose-400 font-bold' 
                        : log.includes('OK') || log.includes('ÉXITO') 
                        ? 'text-emerald-400' 
                        : log.includes('stress-ng') 
                        ? 'text-amber-300' 
                        : 'text-slate-400'
                    }`}
                  >
                    {log}
                  </div>
                ))}
                <div ref={logEndRef} />
              </pre>
            </div>
          )}
        </div>

        {/* 5. Barra Inferior con Recomendación Didáctica */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              Configuración actual: <strong className="text-white">{hardware.cpuCores} vCPUs</strong>, <strong className="text-white">{hardware.ramMB / 1024} GB RAM</strong>, Firmware <strong className="text-white">{hardware.firmware.toUpperCase()}</strong>.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-xs transition-colors"
            >
              Cerrar Diagnóstico
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
