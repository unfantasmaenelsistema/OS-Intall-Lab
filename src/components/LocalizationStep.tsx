import React, { useState } from 'react';
import { 
  Globe, 
  Keyboard, 
  Clock, 
  ArrowRight, 
  ArrowLeft,
  Check,
  AlertCircle
} from 'lucide-react';
import { RegionalConfig, OSType } from '../types/installer';

interface LocalizationStepProps {
  osType: OSType;
  config: RegionalConfig;
  onChange: (updated: Partial<RegionalConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const LocalizationStep: React.FC<LocalizationStepProps> = ({
  osType,
  config,
  onChange,
  onNext,
  onBack
}) => {
  const [testInput, setTestInput] = useState('');

  const LANGUAGES = [
    { code: 'es_ES', name: 'Español (España)', locale: 'es_ES.UTF-8', layout: 'es' },
    { code: 'es_MX', name: 'Español (México / Latinoamérica)', locale: 'es_MX.UTF-8', layout: 'la-latin1' },
    { code: 'en_US', name: 'English (United States)', locale: 'en_US.UTF-8', layout: 'us' },
    { code: 'fr_FR', name: 'Français (France)', locale: 'fr_FR.UTF-8', layout: 'fr' },
    { code: 'de_DE', name: 'Deutsch (Deutschland)', locale: 'de_DE.UTF-8', layout: 'de' },
  ];

  const TIMEZONES = [
    { id: 'Europe/Madrid', name: 'Europe/Madrid (CET / UTC+1)' },
    { id: 'America/Mexico_City', name: 'America/Mexico_City (CST / UTC-6)' },
    { id: 'America/Bogota', name: 'America/Bogota (COT / UTC-5)' },
    { id: 'America/Buenos_Aires', name: 'America/Buenos_Aires (ART / UTC-3)' },
    { id: 'America/Santiago', name: 'America/Santiago (CLT / UTC-3)' },
    { id: 'UTC', name: 'UTC (Coordinated Universal Time / Servidor)' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Paso 2: Localización y Configuración Regional
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Establece el idioma del instalador, el mapa de caracteres del teclado y la política horaria del hardware.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Idioma y Locale */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Idioma y Entorno Local (Locale)</h3>
              <span className="text-xs text-slate-400">Codificación UTF-8 y formatos</span>
            </div>
          </div>

          <div className="space-y-2">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                type="button"
                onClick={() => onChange({ 
                  language: lang.code, 
                  locale: lang.locale,
                  keyboardLayout: lang.layout 
                })}
                className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                  config.language === lang.code
                    ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="font-semibold text-xs text-white">{lang.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">LANG={lang.locale}</div>
                </div>
                {config.language === lang.code && (
                  <Check className="w-4 h-4 text-emerald-400" />
                )}
              </button>
            ))}
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs space-y-1">
            <span className="font-semibold text-emerald-300 block">Repercusión en el sistema:</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Define la generación de locale (`locale-gen`) en `/etc/locale.conf`, la intercalación de ordenación alfabética, formato numérico (coma vs punto decimal) y mensajes del sistema.
            </p>
          </div>
        </div>

        {/* Distribución del Teclado y Campo de Prueba */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Mapa del Teclado (Keymap)</h3>
              <span className="text-xs text-slate-400">Distribución física de teclas</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 block">Distribución activa:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'es', label: 'Español (ES)' },
                { id: 'la-latin1', label: 'Latam' },
                { id: 'us', label: 'Inglés (US)' },
              ].map(k => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => onChange({ keyboardLayout: k.id })}
                  className={`py-2 px-2 text-center rounded-lg border text-xs transition-all ${
                    config.keyboardLayout === k.id
                      ? 'bg-sky-500/15 border-sky-400 text-sky-200 font-bold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          {/* Campo interactivo de prueba */}
          <div className="space-y-1.5 pt-1">
            <label htmlFor="test-keymap-input" className="text-xs text-slate-300 flex items-center justify-between">
              <span>Probar caracteres especiales ({config.keyboardLayout.toUpperCase()}):</span>
              <span className="text-[10px] text-slate-400 font-mono">Prueba: @ # ~ | \ ñ ç</span>
            </label>
            <input
              id="test-keymap-input"
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Escribe aquí para verificar tu teclado..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs space-y-1">
            <span className="font-semibold text-sky-300 block">Repercusión en la contraseña:</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              ¡CRÍTICO!: Al escribir la contraseña de root o de cifrado LUKS, si tu teclado se desconfigura en consola TTY o GRUB a la distribución US por defecto, símbolos como <code className="bg-slate-800 px-1 rounded text-amber-300">/ ? - @</code> cambiarán de tecla y no podrás iniciar sesión.
            </p>
          </div>
        </div>

        {/* Zona Horaria */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Zona Horaria (Timezone)</h3>
              <span className="text-xs text-slate-400">Sincronización NTP y husos</span>
            </div>
          </div>

          <div className="space-y-2">
            <select
              value={config.timezone}
              onChange={(e) => onChange({ timezone: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              {TIMEZONES.map(tz => (
                <option key={tz.id} value={tz.id}>
                  {tz.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs space-y-1">
            <span className="font-semibold text-amber-300 block">Repercusión en servidores:</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              En servidores de producción se recomienda encarecidamente utilizar <strong className="text-white">UTC</strong> como zona horaria para correlacionar registros (logs) sin ambigüedad en cambios de hora de verano/invierno (DST).
            </p>
          </div>
        </div>

        {/* Reloj del Hardware (RTC UTC vs Local) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white text-sm">Reloj de Hardware (RTC)</h3>
              <span className="text-xs text-slate-400">Comportamiento del chip CMOS</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.utcHardwareClock}
                onChange={(e) => onChange({ utcHardwareClock: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
            </label>
          </div>

          <div className="text-xs text-slate-300">
            {config.utcHardwareClock ? (
              <span className="text-emerald-400 font-semibold">RTC configurado en UTC (Estándar Linux / Servidor)</span>
            ) : (
              <span className="text-amber-400 font-semibold">RTC configurado en Hora Local (Estándar Windows)</span>
            )}
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs space-y-1">
            <span className="font-semibold text-indigo-300 block">Repercusión didáctica en Dual-Boot:</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Si configuras arranque dual Linux con Windows y dejas RTC en UTC, Windows mostrará la hora retrasada por la diferencia horaria hasta que modifiques la clave del registro <code className="bg-slate-800 px-1 rounded text-sky-300">RealTimeIsUniversal=1</code> en Windows.
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
          <span>Continuar a Perfil de Software</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
