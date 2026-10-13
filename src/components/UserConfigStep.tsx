import React from 'react';
import { 
  User, 
  ShieldCheck, 
  Network, 
  Key, 
  ArrowRight, 
  ArrowLeft,
  Server,
  Lock,
  Wifi
} from 'lucide-react';
import { UserAccountConfig, OSType } from '../types/installer';

interface UserConfigStepProps {
  osType: OSType;
  config: UserAccountConfig;
  onChange: (updated: Partial<UserAccountConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const UserConfigStep: React.FC<UserConfigStepProps> = ({
  osType,
  config,
  onChange,
  onNext,
  onBack
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Paso 6: Cuentas de Usuario y Credenciales
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Configura las cuentas privilegiadas del sistema, directivas de seguridad para sudo y credenciales de acceso.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Identidad del Sistema (Hostname) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Nombre del Equipo (Hostname)</h3>
              <span className="text-xs text-slate-400">Identificador en la red corporativa</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Nombre de host (FQDN):</label>
              <input
                type="text"
                value={config.hostname}
                onChange={(e) => onChange({ hostname: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Dominio / Grupo de trabajo:</label>
              <input
                type="text"
                value={config.domain || 'corp.internal'}
                onChange={(e) => onChange({ domain: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs space-y-1">
            <span className="font-semibold text-sky-300 block">Repercusión en /etc/hostname:</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              El instalador escribirá esta entrada en <code className="text-white font-mono">/etc/hostname</code> y en <code className="text-white font-mono">/etc/hosts</code>. Esencial para que servicios de clustering, certificados SSL y resolución DNS identifiquen el nodo.
            </p>
          </div>
        </div>

        {/* Cuenta de Superusuario (root / Administrador) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">
                {osType === 'linux' ? 'Cuenta Root (Superusuario)' : 'Cuenta Administrator'}
              </h3>
              <span className="text-xs text-slate-400">UID 0 - Privilegios totales del kernel</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Contraseña de root:</label>
              <input
                type="password"
                value={config.rootPassword}
                onChange={(e) => onChange({ rootPassword: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-rose-400"
              />
            </div>

            {/* Servicio SSH y Root login */}
            {osType === 'linux' && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-white block font-medium">Habilitar servidor OpenSSH</span>
                  <span className="text-[10px] text-slate-400">Permite gestión remota puerto 22</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableSSH}
                  onChange={(e) => onChange({ enableSSH: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-rose-500 focus:ring-0"
                />
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs space-y-1">
            <span className="font-semibold text-rose-300 block">Repercusión en seguridad (CIS Benchmark):</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              En entornos de producción nunca se debe permitir el acceso SSH directo al usuario root (<code className="text-amber-300">PermitRootLogin no</code>). El instalador configurará una cuenta administrativa con sudo.
            </p>
          </div>
        </div>

        {/* Cuenta de Usuario Administrador (sudoers) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Usuario Administrador Estándar</h3>
              <span className="text-xs text-slate-400">Acceso diario y elevación con sudo</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Nombre de usuario:</label>
              <input
                type="text"
                value={config.adminUsername}
                onChange={(e) => onChange({ adminUsername: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Contraseña:</label>
              <input
                type="password"
                value={config.adminPassword}
                onChange={(e) => onChange({ adminPassword: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-white block font-medium">Conceder permisos sudo (wheel/sudoers)</span>
                <span className="text-[10px] text-slate-400">Añade al usuario al grupo wheel</span>
              </div>
              <input
                type="checkbox"
                checked={config.adminHasSudo}
                onChange={(e) => onChange({ adminHasSudo: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs space-y-1">
            <span className="font-semibold text-emerald-300 block">Repercusión en /etc/sudoers:</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Permite auditar cada comando privilegiado ejecutado en los logs del sistema, cumpliendo el principio de menor privilegio.
            </p>
          </div>
        </div>

        {/* Configuración de Red (IPv4) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Configuración de Red (eth0 / enp1s0)</h3>
              <span className="text-xs text-slate-400">Asignación de dirección IP</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange({ ipMode: 'dhcp' })}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  config.ipMode === 'dhcp'
                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                DHCP Automático
              </button>
              <button
                type="button"
                onClick={() => onChange({ ipMode: 'static' })}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  config.ipMode === 'static'
                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                IP Estática Manual
              </button>
            </div>

            {config.ipMode === 'static' && (
              <div className="space-y-2 pt-1 text-xs">
                <div>
                  <label className="text-slate-400 block text-[11px] mb-0.5">Dirección IP y CIDR:</label>
                  <input
                    type="text"
                    value={config.staticIP || '192.168.1.50/24'}
                    onChange={(e) => onChange({ staticIP: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[11px] mb-0.5">Puerta de enlace (Gateway):</label>
                  <input
                    type="text"
                    value={config.gateway || '192.168.1.1'}
                    onChange={(e) => onChange({ gateway: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[11px] mb-0.5">Servidor DNS:</label>
                  <input
                    type="text"
                    value={config.dns || '1.1.1.1, 8.8.8.8'}
                    onChange={(e) => onChange({ dns: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs space-y-1">
            <span className="font-semibold text-indigo-300 block">Repercusión en NetworkManager / Netplan:</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              En un servidor de base de datos o controlador de dominio es obligatorio fijar una IP estática para prevenir que el servidor cambie de dirección al renovar el arrendamiento DHCP.
            </p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-xs rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Atrás</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-all flex items-center gap-2 shadow-sm"
        >
          <span>Continuar a Gestor de Arranque</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
