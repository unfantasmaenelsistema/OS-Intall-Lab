import React, { useState } from 'react';
import { 
  Cpu, 
  HardDrive, 
  Layers, 
  Terminal, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  AlertTriangle, 
  HelpCircle, 
  ShieldCheck, 
  Clock, 
  Monitor, 
  Code, 
  Sparkles, 
  Copy, 
  Sliders,
  Settings
} from 'lucide-react';
import { BootloaderConfig, BootloaderType, HardwareConfig, DiskDevice, OSType } from '../types/installer';

interface BootloaderStepProps {
  osType: OSType;
  config: BootloaderConfig;
  hardware: HardwareConfig;
  disk: DiskDevice;
  onChange: (updated: Partial<BootloaderConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const BootloaderStep: React.FC<BootloaderStepProps> = ({
  osType,
  config,
  hardware,
  disk,
  onChange,
  onNext,
  onBack
}) => {
  const [copied, setCopied] = useState(false);

  // Parámetros rápidos para añadir con un clic
  const quickParamChips = [
    { label: 'pci=nomsi', desc: 'Desactiva MSI en buses PCIe (resuelve cuelgues de bus)' },
    { label: 'elevator=deadline', desc: 'Planificador de E/S optimizado para latencia' },
    { label: 'systemd.unit=multi-user.target', desc: 'Fuerza arranque en consola pura sin GUI' },
    { label: 'console=ttyS0,115200', desc: 'Redirige consola al puerto serie virtual / IPMI' },
    { label: 'transparent_hugepage=never', desc: 'Recomendado para servidores de bases de datos' },
  ];

  const handleAddParam = (param: string) => {
    const current = config.customParameters.trim();
    if (!current.includes(param)) {
      const next = current ? `${current} ${param}` : param;
      onChange({ customParameters: next });
    }
  };

  const handleRemoveParam = (param: string) => {
    const parts = config.customParameters.split(' ').filter(p => p !== param);
    onChange({ customParameters: parts.join(' ') });
  };

  // Construir la línea de comandos completa del kernel
  const buildCommandLine = (): string => {
    const parts: string[] = [];
    parts.push('BOOT_IMAGE=/vmlinuz-6.6.14-enterprise');
    parts.push('root=/dev/mapper/vg_system-lv_root');
    parts.push('ro');

    if (config.quietSplash) {
      parts.push('quiet splash');
    }
    if (config.noModeSet) {
      parts.push('nomodeset');
    }
    if (config.selinuxEnforcing) {
      parts.push('selinux=1 enforcing=1');
    } else {
      parts.push('selinux=0');
    }
    if (config.auditLogging) {
      parts.push('audit=1');
    }
    if (config.customParameters.trim()) {
      parts.push(config.customParameters.trim());
    }

    return parts.join(' ');
  };

  // Generar contenido del fichero de configuración según el gestor seleccionado
  const generateConfigFile = (): { title: string; path: string; content: string } => {
    if (config.type === 'grub2') {
      return {
        title: 'Archivo de Configuración de GRUB2',
        path: '/etc/default/grub',
        content: `# Configuración generada por el instalador para GRUB 2.06
GRUB_TIMEOUT=${config.timeoutSec}
GRUB_DISTRIBUTOR="$(sed 's, release .*$,,g' /etc/system-release)"
GRUB_DEFAULT=saved
GRUB_DISABLE_SUBMENU=true
GRUB_TERMINAL_OUTPUT="console"
GRUB_CMDLINE_LINUX="${buildCommandLine().replace('BOOT_IMAGE=/vmlinuz-6.6.14-enterprise ', '')}"
GRUB_DISABLE_RECOVERY="true"
GRUB_ENABLE_BLSCFG=true`
      };
    } else if (config.type === 'systemd_boot') {
      return {
        title: 'Entrada Boot Loader Specification (BLS)',
        path: '/boot/efi/loader/entries/enterprise-linux.conf',
        content: `# Configuración de systemd-boot (v255)
title   Enterprise Linux (6.6.14-enterprise.x86_64)
version 6.6.14
linux   /vmlinuz-6.6.14-enterprise
initrd  /initramfs-6.6.14-enterprise.img
options ${buildCommandLine().replace('BOOT_IMAGE=/vmlinuz-6.6.14-enterprise ', '')}`
      };
    } else {
      return {
        title: 'Configuración BCD (Boot Configuration Data)',
        path: 'BCDStore / Windows Boot Manager',
        content: `Windows Boot Manager
--------------------
identifier              {bootmgr}
device                  partition=\\Device\\HarddiskVolume1
description             Windows Boot Manager
locale                  es-ES
inherit                 {globalsettings}
default                 {current}
resumeobject            {d9a17441-2b02-11ef-8b1e-bc241103c812}
displayorder            {current}
timeout                 ${config.timeoutSec}

Windows Boot Loader
-------------------
identifier              {current}
device                  partition=C:
path                    \\Windows\\system32\\winload.efi
description             Windows Server 2025 Datacenter
locale                  es-ES
inherit                 {bootloadersettings}
recoverysequence        {d9a17443-2b02-11ef-8b1e-bc241103c812}
recoveryenabled         Yes
osdevice                partition=C:
systemroot              \\Windows
resumeobject            {d9a17441-2b02-11ef-8b1e-bc241103c812}
nx                      OptIn`
      };
    }
  };

  const preview = generateConfigFile();

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(preview.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isBiosWithSystemdBoot = hardware.firmware === 'bios' && config.type === 'systemd_boot';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Encabezado del paso */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>Paso 6: Personalización del Gestor de Arranque (Bootloader)</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Configura qué gestor de arranque se instalará en el firmware y define los parámetros del kernel que gobernarán el proceso de inicio.
        </p>
      </div>

      {/* Advertencia si systemd-boot se usa en modo BIOS */}
      {isBiosWithSystemdBoot && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-200 text-xs flex items-start gap-3 shadow-md">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-rose-300">
              Incompatibilidad Crítica: systemd-boot requiere UEFI
            </h4>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Has configurado la placa base en modo <strong>BIOS Clásico (Legacy MBR)</strong> en el Paso 1. <code>systemd-boot</code> es un cargador estrictamente UEFI y no contiene código de sector de arranque para MBR. Debes cambiar a <strong>GRUB2</strong> o modificar el firmware a UEFI.
            </p>
          </div>
        </div>
      )}

      {/* 1. Selector de Gestor de Arranque */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-300 block">
          Selecciona el Cargador de Arranque:
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* GRUB 2 */}
          <button
            type="button"
            onClick={() => onChange({ type: 'grub2' })}
            className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
              config.type === 'grub2'
                ? 'bg-sky-950/40 border-sky-500/80 text-white shadow-md ring-1 ring-sky-500/30'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-sky-400" />
                  <span>GRUB 2.06</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950 text-sky-300 border border-sky-800">
                  Estándar GNU
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                Gestor universal completo. Soporta BIOS/MBR y UEFI/GPT, menús gráficos interactivos, descifrado LUKS previo al arranque y LVM.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
              Destino: /boot/grub2/grub.cfg
            </div>
          </button>

          {/* systemd-boot */}
          <button
            type="button"
            onClick={() => onChange({ type: 'systemd_boot' })}
            className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
              config.type === 'systemd_boot'
                ? 'bg-emerald-950/40 border-emerald-500/80 text-white shadow-md ring-1 ring-emerald-500/30'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>systemd-boot</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                  UEFI Nativo
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                Minimalista y ultrarrápido. Utiliza la especificación BLS (Boot Loader Specification) con entradas de texto plano directamente en la partición ESP FAT32.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
              Destino: /boot/efi/loader/loader.conf
            </div>
          </button>

          {/* Windows Boot Manager */}
          <button
            type="button"
            onClick={() => onChange({ type: 'windows_bootmgr' })}
            className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
              config.type === 'windows_bootmgr'
                ? 'bg-indigo-950/40 border-indigo-500/80 text-white shadow-md ring-1 ring-indigo-500/30'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Windows BOOTMGR</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Almacén BCD
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                Cargador nativo de Windows Server (winload.efi). Gestionado a través del almacén BCD y comando bcdedit para arranques de producción de Microsoft.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
              Destino: EFI\\Microsoft\\Boot\\bootmgfw.efi
            </div>
          </button>
        </div>
      </div>

      {/* 2. Parámetros del Kernel & Opciones de Arranque */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-sm">Parámetros del Kernel (Kernel Cmdline Arguments)</h3>
          </div>
          <span className="text-[11px] text-slate-400">Pasan directamente al arranque</span>
        </div>

        {/* Conmutadores clave: quiet splash y nomodeset */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Conmutador 1: quiet splash */}
          <div className={`p-4 rounded-xl border transition-all ${
            config.quietSplash 
              ? 'bg-slate-950/80 border-slate-700 text-slate-200' 
              : 'bg-amber-950/20 border-amber-600/60 text-amber-200 ring-1 ring-amber-500/20'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-white flex items-center gap-2">
                <span>quiet splash</span>
                {!config.quietSplash && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-700">
                    MODO VERBOSO ACTIVO
                  </span>
                )}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.quietSplash}
                  onChange={(e) => onChange({ quietSplash: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {config.quietSplash 
                ? 'Arranque silencioso: Suprime mensajes técnicos del kernel y muestra un splash gráfico limpio con logo.' 
                : 'Arranque verboso detallado: Muestra en pantalla el desplazamiento de logs dmesg y estado de cada servicio de systemd [ OK ]. Esencial para administradores.'}
            </p>
          </div>

          {/* Conmutador 2: nomodeset */}
          <div className={`p-4 rounded-xl border transition-all ${
            config.noModeSet 
              ? 'bg-rose-950/30 border-rose-600/70 text-rose-200 ring-1 ring-rose-500/30 shadow-md' 
              : 'bg-slate-950/80 border-slate-700 text-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-white flex items-center gap-2">
                <span>nomodeset</span>
                {config.noModeSet && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-700 animate-pulse">
                    VESA VGA FALLBACK
                  </span>
                )}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.noModeSet}
                  onChange={(e) => onChange({ noModeSet: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {config.noModeSet 
                ? 'Fuerza modo VESA básico (800x600/1024x768). Deshabilita Kernel Mode Setting (KMS). Resuelve pantallas congeladas por drivers de vídeo.' 
                : 'KMS habilitado: Los controladores gráficos asumen la resolución nativa del monitor antes de lanzar el servidor gráfico.'}
            </p>
          </div>
        </div>

        {/* Conmutadores adicionales: SELinux y Auditoría */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <label className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
            <div>
              <span className="font-semibold text-xs text-white block">SELinux en Modo Enforcing</span>
              <span className="text-[10px] text-slate-400">selinux=1 enforcing=1 (Control de acceso mandatorio)</span>
            </div>
            <input
              type="checkbox"
              checked={config.selinuxEnforcing}
              onChange={(e) => onChange({ selinuxEnforcing: e.target.checked })}
              className="w-4 h-4 accent-emerald-500 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
            <div>
              <span className="font-semibold text-xs text-white block">Subrutina de Auditoría del Kernel</span>
              <span className="text-[10px] text-slate-400">audit=1 (Registra llamadas a syscalls para auditd)</span>
            </div>
            <input
              type="checkbox"
              checked={config.auditLogging}
              onChange={(e) => onChange({ auditLogging: e.target.checked })}
              className="w-4 h-4 accent-emerald-500 rounded"
            />
          </label>
        </div>

        {/* Entrada de Parámetros Personalizados */}
        <div className="space-y-2 pt-2">
          <label className="text-xs text-slate-300 font-medium block">
            Parámetros Adicionales de la Línea de Comandos:
          </label>
          <input
            type="text"
            value={config.customParameters}
            onChange={(e) => onChange({ customParameters: e.target.value })}
            placeholder="Ej: pci=nomsi elevator=deadline console=ttyS0..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
          />

          {/* Chips de parámetros sugeridos */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-500">Sugerencias rápidas:</span>
            {quickParamChips.map(chip => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleAddParam(chip.label)}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title={chip.desc}
              >
                + {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeout del menú de arranque */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Tiempo de espera del menú (Timeout):</span>
          </div>

          <div className="flex items-center gap-1.5">
            {[0, 3, 5, 10, 30].map(sec => (
              <button
                key={sec}
                type="button"
                onClick={() => onChange({ timeoutSec: sec })}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  config.timeoutSec === sec
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {sec === 0 ? '0s (Inmediato)' : `${sec}s`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Previsualización del Fichero de Configuración Generado */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-emerald-400" />
            <h4 className="font-bold text-white text-xs">{preview.title}</h4>
            <span className="text-[11px] font-mono text-slate-400">({preview.path})</span>
          </div>

          <button
            type="button"
            onClick={handleCopyConfig}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>

        <pre className="p-3 bg-black/80 rounded-lg text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800/80">
          {preview.content}
        </pre>
      </div>

      {/* Repercusión Didáctica */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs">
        <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span>Repercusión en el Primer Arranque (First Boot)</span>
        </h4>
        <p className="text-slate-300 text-[11px] leading-relaxed">
          Los parámetros configurados aquí se transferirán directamente al paso de <strong>Primer Arranque</strong>:
          {config.type === 'systemd_boot' && ' Verás la pantalla de selección simplificada de systemd-boot.'}
          {config.type === 'grub2' && ' Verás el menú interactivo de GNU GRUB 2.06.'}
          {config.type === 'windows_bootmgr' && ' Verás el administrador de arranque BCD de Windows Server.'}
          {!config.quietSplash && ' Al desactivar quiet splash, observarás el desplazamiento continuo de mensajes del kernel y comprobaciones de systemd antes de llegar a la pantalla de login.'}
          {config.noModeSet && ' Al activar nomodeset, el entorno gráfico arrancará en resolución básica VESA de compatibilidad.'}
        </p>
      </div>

      {/* Botones de Navegación */}
      <div className="flex justify-between pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-lg transition-all flex items-center gap-2 border border-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Cuentas &amp; Red</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-2 shadow-md"
        >
          <span>Continuar a Confirmación</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
