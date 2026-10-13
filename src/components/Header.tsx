import React from 'react';
import { 
  Terminal, 
  HardDrive, 
  RotateCcw, 
  BookOpen, 
  Layers, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  Sun,
  Moon
} from 'lucide-react';
import { OSType, InstallerStepId } from '../types/installer';
import { GhostLogo } from './GhostLogo';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  osType: OSType;
  onSelectOS: (os: OSType) => void;
  currentStep: InstallerStepId;
  onNavigateStep: (step: InstallerStepId) => void;
  onReset: () => void;
  isEducationalDrawerOpen: boolean;
  onToggleEducationalDrawer: () => void;
  issueCount: { errors: number; warnings: number };
}

const STEPS: { id: InstallerStepId; label: string }[] = [
  { id: 'boot', label: '1. Boot & Hardware' },
  { id: 'regional', label: '2. Regional' },
  { id: 'software', label: '3. Perfil SO' },
  { id: 'network', label: '4. Red & Interfaces' },
  { id: 'partitioning', label: '5. Particionado' },
  { id: 'users', label: '6. Cuentas & Acceso' },
  { id: 'bootloader', label: '7. Bootloader' },
  { id: 'summary', label: '8. Confirmación' },
  { id: 'installing', label: '9. Instalación' },
  { id: 'first_boot', label: '10. Primer Arranque' },
];

export const Header: React.FC<HeaderProps> = ({
  osType,
  onSelectOS,
  currentStep,
  onNavigateStep,
  onReset,
  isEducationalDrawerOpen,
  onToggleEducationalDrawer,
  issueCount
}) => {
  const { theme, setTheme } = useTheme();
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <header className="border-b border-slate-800 bg-slate-950 text-slate-100 sticky top-0 z-40 select-none">
      {/* Zona principal del Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Zona 1: Brand Wordmark y Logo Oficial del Autor */}
        <a 
          href="https://www.unfantasmaenelsistema.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-3 group focus:outline-none"
          title="Visitar www.unfantasmaenelsistema.com"
        >
          <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700/80 group-hover:border-emerald-500/70 flex items-center justify-center transition-all shadow-md group-hover:shadow-emerald-500/15 group-hover:scale-105 shrink-0 overflow-hidden">
            <GhostLogo size={24} className="w-6 h-6 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                OS InstallLab
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono hidden md:inline-flex items-center gap-1">
                unfantasmaenelsistema.com
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>{osType === 'linux' ? 'Enterprise Linux Simulator' : 'Windows Server 2025 Simulator'}</span>
            </div>
          </div>
        </a>

        {/* Zona 2: Selector de Sistema Operativo */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => onSelectOS('linux')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              osType === 'linux'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Linux Enterprise</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectOS('windows')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              osType === 'windows'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Windows Server</span>
          </button>
        </div>

        {/* Zona 3: Acciones primarias, Enlace a Web y Foco Formativo */}
        <div className="flex items-center gap-2">
          {/* Enlace directo a la web del usuario */}
          <a
            href="https://www.unfantasmaenelsistema.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-850 hover:border-emerald-500/40 text-slate-200 hover:text-white transition-all flex items-center gap-1.5 group shadow-sm"
            title="Abrir blog y web www.unfantasmaenelsistema.com"
          >
            <GhostLogo size={16} className="w-4 h-4 group-hover:scale-110 transition-transform object-contain" />
            <span className="hidden xl:inline font-mono text-[11px] text-emerald-400">unfantasmaenelsistema.com</span>
            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-400 transition-colors" />
          </a>

          {/* Selector de Tema Claro / Oscuro con persistencia en localStorage */}
          <div 
            className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 shadow-sm"
            role="group"
            aria-label="Selector de tema"
          >
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                theme === 'light'
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 shadow-xs font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              title="Activar Tema Claro (Persistente en localStorage)"
              aria-label="Activar Tema Claro"
            >
              <Sun className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-amber-500' : 'text-slate-400'}`} />
              <span className="hidden sm:inline text-[11px]">Claro</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                theme === 'dark'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              title="Activar Tema Oscuro (Persistente en localStorage)"
              aria-label="Activar Tema Oscuro"
            >
              <Moon className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-sky-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline text-[11px]">Oscuro</span>
            </button>
          </div>

          {/* Botón Foco Formativo */}
          <button
            type="button"
            onClick={onToggleEducationalDrawer}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-2 ${
              isEducationalDrawerOpen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
            }`}
            title="Abrir panel de conceptos y repercusiones técnicas"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Foco Formativo</span>
            {issueCount.errors > 0 ? (
              <span className="px-1.5 py-0.2 text-[10px] bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded font-mono">
                {issueCount.errors} err
              </span>
            ) : issueCount.warnings > 0 ? (
              <span className="px-1.5 py-0.2 text-[10px] bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded font-mono">
                {issueCount.warnings} avisos
              </span>
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 hidden sm:inline" />
            )}
          </button>

          {/* Botón Reiniciar */}
          <button
            type="button"
            onClick={onReset}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
            title="Reiniciar simulador"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Barra de progreso de etapas del instalador */}
      <div className="border-t border-slate-800/80 bg-slate-900/60 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-1 sm:gap-2 min-w-max">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isClickable = true;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onNavigateStep(step.id)}
                className={`px-2.5 py-1 text-xs rounded transition-all flex items-center gap-1.5 ${
                  isCurrent
                    ? 'bg-slate-800 text-white font-medium border border-slate-600 shadow-sm'
                    : isCompleted
                    ? 'text-emerald-400 hover:bg-slate-800/50'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <span className={`w-3.5 h-3.5 rounded-full text-[10px] flex items-center justify-center font-mono ${
                    isCurrent ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                )}
                <span className="whitespace-nowrap">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
