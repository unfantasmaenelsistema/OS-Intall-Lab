import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Terminal, 
  ShieldAlert, 
  ArrowRight, 
  ArrowLeft,
  Check,
  HardDrive,
  Copy,
  Cpu,
  Globe,
  Network
} from 'lucide-react';
import { InstallerState } from '../types/installer';
import { generateInstallScript } from '../utils/installScript';

interface SummaryStepProps {
  state: InstallerState;
  onProceedInstall: () => void;
  onBack: () => void;
}

export const SummaryStep: React.FC<SummaryStepProps> = ({
  state,
  onProceedInstall,
  onBack
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Comandos equivalentes a los que ejecutaría el instalador en Linux o Windows
  const commandScript = generateInstallScript(state);

  const handleCopy = () => {
    navigator.clipboard.writeText(commandScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Paso 7: Auditoría de Repercusiones y Confirmación Final
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Revisa el resumen completo de cambios antes de escribir la tabla de particiones y formatear los bloques en el disco.
        </p>
      </div>

      {/* Tarjeta de Advertencia Destructiva */}
      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/60 text-amber-200 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-amber-300 text-sm">Operación Destructiva en el Disco</h4>
          <p className="text-slate-300 leading-relaxed">
            Al confirmar, se destruirán todas las tablas de asignación anteriores de <strong className="text-white">{state.disk.devicePath}</strong>. Se creará una nueva tabla <strong className="text-white">{state.disk.tableType.toUpperCase()}</strong>, se formatearán los sistemas de archivos y se configurarán los cargadores de arranque.
          </p>
        </div>
      </div>

      {/* Resumen de configuración en cuatro columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hardware y Plataforma */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span>Hardware y Plataforma</span>
          </h3>

          <div className="space-y-1.5 divide-y divide-slate-800/80">
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Firmware:</span>
              <span className="font-mono text-white uppercase">{state.hardware.firmware} {state.hardware.secureBoot ? '(Secure Boot)' : ''}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Memoria RAM:</span>
              <span className="font-mono text-white">{state.hardware.ramMB / 1024} GB</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Disco Destino:</span>
              <span className="font-mono text-white">{state.disk.devicePath}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Medio:</span>
              <span className="font-mono text-white uppercase">{state.hardware.bootMedium}</span>
            </div>
          </div>
        </div>

        {/* Localización & Identidad */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Localización & Identidad</span>
          </h3>

          <div className="space-y-1.5 divide-y divide-slate-800/80">
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Idioma:</span>
              <span className="font-mono text-white">{state.regional.locale}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Teclado:</span>
              <span className="font-mono text-white">{state.regional.keyboardLayout}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Hostname:</span>
              <span className="font-mono text-white">{state.network?.hostname || state.userConfig.hostname}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Dominio:</span>
              <span className="font-mono text-white">{state.network?.domain || state.userConfig.domain || 'corp.internal'}</span>
            </div>
          </div>
        </div>

        {/* Red & Conectividad Remota */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Network className="w-4 h-4 text-emerald-400" />
            <span>Red & Remoto</span>
          </h3>

          <div className="space-y-1.5 divide-y divide-slate-800/80">
            <div className="flex justify-between py-1">
              <span className="text-slate-400">IPv4 Principal:</span>
              <span className="font-mono text-emerald-300">
                {state.network?.bridge.enabled
                  ? `${state.network.bridge.name} (${state.network.bridge.ipv4Address || 'DHCP'})`
                  : state.network?.interfaces[0]?.ipMode === 'static'
                  ? `${state.network.interfaces[0].ipv4Address}/${state.network.interfaces[0].prefixLength}`
                  : 'DHCP Automático'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Gateway:</span>
              <span className="font-mono text-white">
                {state.network?.bridge.enabled
                  ? state.network.bridge.gateway || 'N/A'
                  : state.network?.interfaces[0]?.gateway || '192.168.1.1'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Puente br0:</span>
              <span className={`font-mono ${state.network?.bridge.enabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                {state.network?.bridge.enabled ? `Activo (${state.network.bridge.name})` : 'Inactivo'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Acceso Remoto:</span>
              <span className="font-mono text-sky-300">
                {state.network?.remoteInstallCapabilities.allowRemoteSsh ? 'SSH / Cockpit' : 'Local TTY'}
              </span>
            </div>
          </div>
        </div>

        {/* Gestor de Arranque y Kernel Cmdline */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>Gestor de Arranque &amp; Cmdline</span>
          </h3>

          <div className="space-y-1.5 divide-y divide-slate-800/80">
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Cargador:</span>
              <span className="font-mono text-white">
                {state.bootloader?.type === 'systemd_boot'
                  ? 'systemd-boot'
                  : state.bootloader?.type === 'windows_bootmgr'
                  ? 'Windows BOOTMGR'
                  : 'GRUB 2.06'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">quiet splash:</span>
              <span className={`font-mono ${state.bootloader?.quietSplash ? 'text-emerald-400' : 'text-amber-300'}`}>
                {state.bootloader?.quietSplash ? 'Sí (Gráfico)' : 'No (dmesg)'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">nomodeset:</span>
              <span className={`font-mono ${state.bootloader?.noModeSet ? 'text-rose-400' : 'text-slate-300'}`}>
                {state.bootloader?.noModeSet ? 'Sí (VESA)' : 'No (KMS)'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Timeout:</span>
              <span className="font-mono text-white">{state.bootloader?.timeoutSec ?? 5}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desglose de Particiones a Escribir */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
        <h3 className="font-bold text-white flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-amber-400" />
          <span>Esquema de Particiones a Escribir</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">Dispositivo</th>
                <th className="py-2 px-3">Montaje</th>
                <th className="py-2 px-3">Sistema de Archivos</th>
                <th className="py-2 px-3">Tamaño</th>
                <th className="py-2 px-3">Seguridad / LVM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {state.disk.partitions.map(p => (
                <tr key={p.id}>
                  <td className="py-2 px-3 text-white">{p.name}</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold">{p.mountPoint || 'N/A'}</td>
                  <td className="py-2 px-3 uppercase text-sky-300">{p.fsType}</td>
                  <td className="py-2 px-3 text-slate-300">
                    {p.sizeMB >= 1024 ? `${(p.sizeMB / 1024).toFixed(1)} GB` : `${p.sizeMB} MB`}
                  </td>
                  <td className="py-2 px-3 text-[11px] text-slate-400">
                    {p.isEncrypted ? 'LUKS2 Encrypted · ' : ''}
                    {p.isLvmLV ? `LVM (${p.lvmVG}/${p.lvmLVName})` : 'Partición Estándar'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visor de Comandos de Bajo Nivel (Auditoría Técnica) */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Script Equivalente Ejecutado por el Instalador (Bajo Nivel):</span>
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 p-1 rounded hover:bg-slate-800 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar script'}</span>
          </button>
        </div>

        <pre className="p-3 bg-black/90 border border-slate-800 rounded-lg text-emerald-400 text-xs font-mono overflow-x-auto max-h-56 leading-relaxed">
          {commandScript}
        </pre>
      </div>

      {/* Navegación y Botón de Inicio */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-xs rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Gestor de Arranque</span>
        </button>

        <button
          type="button"
          onClick={() => setShowConfirmModal(true)}
          className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-2 shadow-lg"
        >
          <span>Escribir Cambios en Disco e Instalar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Modal de confirmación destructiva */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-rose-800/80 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-7 h-7" />
              <h3 className="text-base font-bold text-white">¿Confirmar escritura en disco?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Esta acción particionará de forma real la unidad simulada <strong className="text-white">{state.disk.devicePath}</strong>. Se crearán <strong className="text-white">{state.disk.partitions.length} particiones</strong> y se procederá al formateo con los sistemas de archivos seleccionados.
            </p>

            <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-lg text-[11px] text-rose-300">
              ADVERTENCIA: Esta operación simula el punto de no retorno de cualquier instalador real.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancelar y Revisar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  onProceedInstall();
                }}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
              >
                Sí, Escribir Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
