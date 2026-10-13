import React, { useState } from 'react';
import { 
  Cpu, 
  HardDrive, 
  Disc, 
  ShieldCheck, 
  Network, 
  Radio, 
  ArrowRight, 
  HelpCircle,
  Server,
  Activity,
  Play
} from 'lucide-react';
import { HardwareConfig, FirmwareType, BootMediumType, OSType } from '../types/installer';
import { HardwareDiagnostics } from './HardwareDiagnostics';
import { HardwareChaosInjector } from './HardwareChaosInjector';

interface HardwareBootStepProps {
  osType: OSType;
  config: HardwareConfig;
  onChange: (updated: Partial<HardwareConfig>) => void;
  onNext: () => void;
}

export const HardwareBootStep: React.FC<HardwareBootStepProps> = ({
  osType,
  config,
  onChange,
  onNext
}) => {
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Encabezado del paso */}
      <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Paso 1: Entorno de Hardware y Medio de Arranque (Boot)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Configura los parámetros del firmware de la placa base, medios de instalación y hardware asignado a la máquina.
          </p>
        </div>

        {/* Botón de Lanzamiento de Diagnóstico de Hardware */}
        <button
          type="button"
          onClick={() => setIsDiagnosticsOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 text-xs font-bold flex items-center gap-2 transition-all shadow-sm group self-start sm:self-auto"
          title="Abrir utilidad de diagnóstico de hardware y test de estrés de CPU/RAM"
        >
          <Activity className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          <span>Diagnóstico de Hardware (Estrés CPU/RAM)</span>
        </button>
      </div>

      {/* Banner Informativo y Acceso Rápido al Diagnóstico de Hardware */}
      <div className="p-3.5 rounded-xl bg-linear-to-r from-amber-950/20 via-slate-900 to-slate-900 border border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-xs flex items-center gap-2">
              <span>Utilidad de Diagnóstico de Hardware Integrada</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
                DISPONIBLE
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Ejecuta tests de estrés sintético (AVX-512, memtester) sobre la CPU ({config.cpuCores} núcleos) y RAM ({config.ramMB / 1024} GB) para evaluar el impacto en la estabilidad de la instalación.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDiagnosticsOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow shrink-0 self-start sm:self-auto"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Ejecutar Test de Estrés</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Firmware: UEFI vs BIOS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-white text-sm">Firmware de la Placa Base</h3>
            </div>
            <span className="text-xs text-slate-400">Arranque del sistema</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChange({ firmware: 'uefi' })}
              className={`p-3 rounded-lg border text-left transition-all ${
                config.firmware === 'uefi'
                  ? 'bg-sky-500/15 border-sky-400 text-white shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className="font-semibold text-xs text-white">UEFI (Recomendado)</div>
              <div className="text-[11px] text-slate-400 mt-1 leading-tight">
                Tabla GPT, arranque modular de 64 bits, compatible con Secure Boot.
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChange({ firmware: 'bios', secureBoot: false })}
              className={`p-3 rounded-lg border text-left transition-all ${
                config.firmware === 'bios'
                  ? 'bg-sky-500/15 border-sky-400 text-white shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className="font-semibold text-xs text-white">BIOS Clásica (Legacy)</div>
              <div className="text-[11px] text-slate-400 mt-1 leading-tight">
                MBR tradicional, limitado a discos de 2.2 TB y 4 particiones primarias.
              </div>
            </button>
          </div>

          {/* Secure Boot (solo UEFI) */}
          {config.firmware === 'uefi' && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Activar UEFI Secure Boot</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.secureBoot}
                  onChange={(e) => onChange({ secureBoot: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          )}

          {/* Repercusión didáctica */}
          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs space-y-1">
            <span className="font-semibold text-amber-300 block">Repercusión en el particionado:</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {config.firmware === 'uefi'
                ? 'UEFI EXIGE que crees una partición FAT32 montada en /boot/efi con la bandera ESP. Sin ella, la máquina no encontrará el cargador GRUB o Windows Boot Manager.'
                : 'BIOS tradicional requiere instalar GRUB en el Master Boot Record (MBR). Si usas tabla GPT, requerirá una partición bios_grub (1 MB) sin formato.'}
            </p>
          </div>
        </div>

        {/* Medio de instalación */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Disc className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-white text-sm">Medio de Instalación</h3>
            </div>
            <span className="text-xs text-slate-400">Origen de los paquetes</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'usb' as BootMediumType, label: 'USB Booteable', desc: 'Ventoy / Rufus USB 3.2' },
              { id: 'iso' as BootMediumType, label: 'Imagen ISO', desc: 'DVD virtual montado' },
              { id: 'pxe' as BootMediumType, label: 'Red PXE', desc: 'TFTP / iPXE NetBoot' },
            ].map(medium => (
              <button
                key={medium.id}
                type="button"
                onClick={() => onChange({ bootMedium: medium.id })}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  config.bootMedium === medium.id
                    ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="font-semibold text-xs text-white">{medium.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{medium.desc}</div>
              </button>
            ))}
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs space-y-1">
            <span className="font-semibold text-emerald-300 block">Simulación de medio:</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {config.bootMedium === 'usb' && 'Instalación desde memoria flash extraíble. En hardware real, debes asegurar que el orden de arranque de la BIOS priorice USB-HDD.'}
              {config.bootMedium === 'iso' && 'Imagen ISO cargada a través del hipervisor o IPMI / iLO / iDRAC virtual media.'}
              {config.bootMedium === 'pxe' && 'Instalación desatendida a través de la tarjeta de red (Kickstart/Autounattend). Ideal para centros de datos masivos.'}
            </p>
          </div>
        </div>

        {/* Memoria RAM y CPU */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-white text-sm">Memoria RAM y CPU</h3>
            </div>
            <span className="text-xs text-slate-400">{config.ramMB / 1024} GB RAM · {config.cpuCores} Cores</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Memoria RAM asignada:</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[1024, 2048, 4096, 8192, 16384, 32768].map(ram => (
                  <button
                    key={ram}
                    type="button"
                    onClick={() => onChange({ ramMB: ram })}
                    className={`py-1.5 px-1.5 rounded-md border text-center text-xs font-mono transition-all ${
                      config.ramMB === ram
                        ? ram < 2048
                          ? 'bg-rose-500/25 border-rose-400 text-rose-200 font-bold'
                          : 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                        : ram < 2048
                        ? 'bg-slate-950 border-rose-900/60 text-rose-400/80 hover:text-rose-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                    title={ram < 2048 ? 'RAM Insuficiente (< 2 GB): Provoca alerta crítica del validador' : `${ram / 1024} GB RAM`}
                  >
                    {ram >= 1024 ? `${ram / 1024} GB` : `${ram} MB`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Núcleos de procesador (vCPUs):</label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 4, 8, 16].map(cores => (
                  <button
                    key={cores}
                    type="button"
                    onClick={() => onChange({ cpuCores: cores })}
                    className={`py-1.5 px-2 rounded-md border text-center text-xs font-mono transition-all ${
                      config.cpuCores === cores
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cores} vCPUs
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs">
            <span className="font-semibold text-amber-300 block mb-1">Repercusión en la partición SWAP:</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Con <strong className="text-white">{config.ramMB / 1024} GB de RAM</strong>, el tamaño de Swap recomendado para evitar colapsos por OOM o soportar hibernación es de{' '}
              <strong className="text-emerald-300">
                {config.ramMB <= 4096 ? '6 a 8 GB' : config.ramMB <= 8192 ? '8 GB' : '8 a 16 GB'}
              </strong>.
            </p>
          </div>

          {/* Botón de acceso directo a test de estrés */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Verificar integridad física:</span>
            <button
              type="button"
              onClick={() => setIsDiagnosticsOpen(true)}
              className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 font-medium text-[11px] flex items-center gap-1.5 transition-colors"
            >
              <Activity className="w-3 h-3 text-amber-400" />
              <span>Diagnosticar CPU &amp; RAM</span>
            </button>
          </div>
        </div>

        {/* Disco Duro de Destino */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <HardDrive className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-white text-sm">Unidad de Almacenamiento Destino</h3>
            </div>
            <span className="text-xs text-slate-400">{config.targetDiskSizeMB / 1024} GB</span>
          </div>

          <div className="space-y-2">
            {[
              { size: 262144, label: 'SATA SSD 256 GB', desc: 'Almacenamiento estándar para servidores web ligeros' },
              { size: 524288, label: 'NVMe M.2 SSD 512 GB', desc: 'Alto rendimiento PCIe Gen 4 para estaciones y servidores' },
              { size: 1048576, label: 'Enterprise NVMe 1.0 TB', desc: 'Capacidad para bases de datos, virtualización y LVM' },
            ].map(disk => (
              <button
                key={disk.size}
                type="button"
                onClick={() => onChange({ targetDiskSizeMB: disk.size })}
                className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                  config.targetDiskSizeMB === disk.size
                    ? 'bg-indigo-500/15 border-indigo-400 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="font-semibold text-xs text-white">{disk.label}</div>
                  <div className="text-[10px] text-slate-400">{disk.desc}</div>
                </div>
                <span className="text-xs font-mono text-indigo-300">
                  {(disk.size / 1024).toFixed(0)} GB
                </span>
              </button>
            ))}
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs">
            <span className="font-semibold text-indigo-300 block mb-1">Ruta del dispositivo en el kernel:</span>
            <span className="text-slate-300 font-mono text-[11px]">
              {osType === 'linux' ? '/dev/nvme0n1 (512e, LBA sector size: 512 bytes)' : 'Disco 0 (Bus Type: NVMe, GPT)'}
            </span>
          </div>
        </div>
      </div>

      {/* Componente de Inyección de Fallos Aleatorios e Inestabilidad de Hardware */}
      <HardwareChaosInjector
        hardware={config}
        onChangeHardware={onChange}
      />

      {/* Botón de Siguiente */}
      <div className="flex justify-end pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onNext}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-all flex items-center gap-2 shadow-sm"
        >
          <span>Continuar a Configuración Regional</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Utilidad Modal de Diagnóstico de Hardware */}
      <HardwareDiagnostics
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        hardware={config}
        osType={osType}
        onUpdateHardware={onChange}
      />
    </div>
  );
};
