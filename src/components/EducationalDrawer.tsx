import React, { useState } from 'react';
import { 
  BookOpen, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ShieldCheck, 
  Database, 
  HardDrive, 
  HelpCircle,
  Cpu,
  Terminal,
  Trophy,
  ExternalLink
} from 'lucide-react';
import { GhostLogo } from './GhostLogo';
import { ValidationIssue, OSType, ChallengeScenario, InstallerState } from '../types/installer';
import { FILESYSTEMS_INFO, TECHNICAL_CONCEPTS, MOUNT_POINTS_GUIDANCE } from '../data/learningContent';
import { CHALLENGE_SCENARIOS } from '../data/scenarios';

interface EducationalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  validationIssues: ValidationIssue[];
  osType: OSType;
  state: InstallerState;
  activeChallengeId?: string;
  onSelectChallenge: (id?: string) => void;
}

type TabType = 'diagnostics' | 'filesystems' | 'lvm_luks' | 'mounts' | 'challenges';

export const EducationalDrawer: React.FC<EducationalDrawerProps> = ({
  isOpen,
  onClose,
  validationIssues,
  osType,
  state,
  activeChallengeId,
  onSelectChallenge
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('diagnostics');
  const [selectedFsKey, setSelectedFsKey] = useState<string>(osType === 'linux' ? 'ext4' : 'ntfs');

  if (!isOpen) return null;

  const currentChallenge = CHALLENGE_SCENARIOS.find(c => c.id === activeChallengeId);
  const challengeEvaluation = currentChallenge ? currentChallenge.checkSuccess(state) : null;

  const errorCount = validationIssues.filter(i => i.type === 'error').length;
  const warningCount = validationIssues.filter(i => i.type === 'warning').length;

  return (
    <aside 
      aria-label="Panel formativo y repercusiones técnicas"
      className="fixed inset-y-0 right-0 w-full sm:w-[500px] lg:w-[560px] bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col text-slate-200 transition-transform duration-200 ease-out"
    >
      {/* Encabezado del Drawer */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Foco Formativo & Repercusiones</h2>
            <p className="text-xs text-slate-400">Mentor técnico de instalación de sistemas</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          title="Cerrar panel formativo"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Barra de pestañas */}
      <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/90 flex items-center gap-1 overflow-x-auto scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('diagnostics')}
          className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'diagnostics'
              ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${errorCount > 0 ? 'text-rose-400' : 'text-amber-400'}`} />
          <span>Diagnóstico ({validationIssues.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('filesystems')}
          className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'filesystems'
              ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5 text-sky-400" />
          <span>Sistemas de Archivos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lvm_luks')}
          className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'lvm_luks'
              ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>LVM & LUKS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mounts')}
          className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'mounts'
              ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span>Puntos de Montaje</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('challenges')}
          className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'challenges'
              ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Retos</span>
        </button>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: DIAGNÓSTICO EN TIEMPO REAL */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400 leading-relaxed">
              El motor de validación analiza tu esquema de almacenamiento, firmware y opciones para advertirte de errores fatales o consecuencias arquitectónicas antes de escribir en disco.
            </div>

            {validationIssues.length === 0 ? (
              <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-emerald-300 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-emerald-200">Esquema completamente consistente</h4>
                  <p className="text-xs text-emerald-400/80 mt-1">
                    No se detectan conflictos de particionado, incompatibilidades de arranque UEFI ni desbordamientos de capacidad.
                  </p>
                </div>
              </div>
            ) : (
              validationIssues.map(issue => (
                <div
                  key={issue.id}
                  className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                    issue.type === 'error'
                      ? 'bg-rose-950/20 border-rose-800/60 text-rose-200'
                      : issue.type === 'warning'
                      ? 'bg-amber-950/20 border-amber-800/60 text-amber-200'
                      : 'bg-sky-950/20 border-sky-800/60 text-sky-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {issue.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                    {issue.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                    {issue.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
                    <span>{issue.title}</span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">{issue.message}</p>

                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 text-[11px] space-y-1">
                    <span className="font-semibold text-amber-300 block">Repercusión técnica en el sistema real:</span>
                    <span className="text-slate-300">{issue.technicalImpact}</span>
                  </div>

                  {issue.remedy && (
                    <div className="text-[11px] text-emerald-300/90 flex items-start gap-1.5 pt-1">
                      <span className="font-semibold shrink-0">Solución recomendada:</span>
                      <span>{issue.remedy}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: SISTEMAS DE ARCHIVOS (COMPARATIVA PROFUNDA) */}
        {activeTab === 'filesystems' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400 leading-relaxed">
              Selecciona un sistema de archivos para conocer sus características internas, límites y repercusiones operativas en producción.
            </div>

            {/* Selector de FS */}
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(FILESYSTEMS_INFO) as Array<keyof typeof FILESYSTEMS_INFO>).map(fsKey => {
                const fs = FILESYSTEMS_INFO[fsKey];
                return (
                  <button
                    key={fsKey}
                    type="button"
                    onClick={() => setSelectedFsKey(fsKey)}
                    className={`p-2 rounded-md border text-center transition-all ${
                      selectedFsKey === fsKey
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="text-xs font-mono">{fs.name.toUpperCase()}</div>
                    <div className="text-[9px] text-slate-400 truncate">{fs.os}</div>
                  </button>
                );
              })}
            </div>

            {/* Detalle del FS seleccionado */}
            {FILESYSTEMS_INFO[selectedFsKey as keyof typeof FILESYSTEMS_INFO] && (() => {
              const fs = FILESYSTEMS_INFO[selectedFsKey as keyof typeof FILESYSTEMS_INFO];
              return (
                <div className="space-y-3.5 bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">{fs.label}</h3>
                      <span className="text-[11px] text-sky-400">{fs.badge}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {fs.os}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{fs.description}</p>

                  {/* Alerta de repercusión */}
                  <div className="p-2.5 rounded bg-amber-950/30 border border-amber-800/50 text-amber-200 text-xs">
                    <span className="font-semibold block mb-1">Repercusión en la instalación:</span>
                    <span className="text-slate-300 leading-relaxed">{fs.educationalRepercussion}</span>
                  </div>

                  {/* Tabla técnica */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded border border-slate-800">
                    <div>
                      <span className="text-slate-400 block">Tamaño máx. archivo:</span>
                      <span className="font-mono text-slate-200">{fs.technicalSpecs.maxFileSize}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Journaling / CoW:</span>
                      <span className="font-mono text-slate-200">{fs.technicalSpecs.journaling}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">¿Permite Reducir (Shrink)?:</span>
                      <span className={`font-semibold ${fs.technicalSpecs.shrinkable ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {fs.technicalSpecs.shrinkable ? 'Sí (offline)' : 'NO (Solo expandir)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Instantáneas nativas:</span>
                      <span className={`font-semibold ${fs.technicalSpecs.snapshotSupport ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {fs.technicalSpecs.snapshotSupport ? 'Sí (Snapshots)' : 'No (vía LVM)'}
                      </span>
                    </div>
                  </div>

                  {/* Fortalezas y debilidades */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-semibold text-emerald-400 block mb-1">Fortalezas:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                        {fs.strengths.map((str, i) => (
                          <li key={i}>{str}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-semibold text-rose-400 block mb-1">Limitaciones / Precauciones:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                        {fs.weaknesses.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 3: LVM & LUKS */}
        {activeTab === 'lvm_luks' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400 leading-relaxed">
              Comprende cómo interactúan las capas de cifrado por hardware con el gestor de volúmenes lógicos antes de formatear.
            </div>

            {TECHNICAL_CONCEPTS.filter(c => c.category === 'LVM' || c.category === 'Cifrado' || c.category === 'Firmware').map(concept => (
              <div key={concept.id} className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    {concept.category === 'Cifrado' ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <LayersIcon className="w-4 h-4 text-sky-400" />}
                    <span>{concept.title}</span>
                  </h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {concept.category}
                  </span>
                </div>

                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                  {concept.fullExplanation}
                </p>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                  <span className="font-semibold text-amber-300 block mb-0.5">Escenario en el mundo real:</span>
                  <span className="text-slate-300 leading-relaxed">{concept.realWorldScenario}</span>
                </div>

                {concept.commandSnippet && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono">Comandos reales ejecutados:</span>
                    <pre className="p-2 rounded bg-black/80 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                      {concept.commandSnippet}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: PUNTOS DE MONTAJE */}
        {activeTab === 'mounts' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400 leading-relaxed">
              Guía de montaje jerárquico Unix/Linux: por qué y cuándo separar cada subdirectorio en particiones independientes.
            </div>

            {Object.values(MOUNT_POINTS_GUIDANCE).map(m => (
              <div key={m.mountPoint} className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-emerald-400 font-bold text-sm">{m.mountPoint}</span>
                  <span className="text-[11px] text-slate-400">Recomendado: {m.recommendedSize}</span>
                </div>

                <p className="text-slate-300 leading-relaxed">{m.description}</p>

                <div className="grid grid-cols-1 gap-1.5 text-[11px] bg-slate-900/60 p-2 rounded">
                  <div>
                    <span className="font-semibold text-sky-300">¿Por qué separarlo?: </span>
                    <span className="text-slate-300">{m.whySeparate}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-rose-300">Impacto en Seguridad y Estabilidad: </span>
                    <span className="text-slate-300">{m.securityImpact}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 5: RETOS FORMATIVOS */}
        {activeTab === 'challenges' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400 leading-relaxed">
              Pon a prueba tus conocimientos de administrador de sistemas completando los siguientes escenarios con especificaciones técnicas reales.
            </div>

            {CHALLENGE_SCENARIOS.map(challenge => {
              const isActive = activeChallengeId === challenge.id;
              const evalResult = isActive ? challengeEvaluation : null;

              return (
                <div 
                  key={challenge.id}
                  className={`p-3.5 rounded-lg border transition-all text-xs space-y-2.5 ${
                    isActive 
                      ? 'bg-slate-950 border-amber-500/60 shadow-lg' 
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-xs">{challenge.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span>SO: {challenge.targetOS === 'linux' ? 'Linux Enterprise' : 'Windows Server'}</span>
                        <span>·</span>
                        <span className={`font-semibold ${
                          challenge.difficulty === 'Básico' ? 'text-emerald-400' :
                          challenge.difficulty === 'Intermedio' ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {challenge.difficulty}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectChallenge(isActive ? undefined : challenge.id)}
                      className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {isActive ? 'Reto Activo' : 'Activar Reto'}
                    </button>
                  </div>

                  <p className="text-slate-300 leading-relaxed">{challenge.description}</p>

                  <div className="space-y-1 bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
                    <span className="text-[11px] font-semibold text-slate-300 block mb-1">Criterios a cumplir:</span>
                    <ul className="space-y-1">
                      {challenge.requirementsSummary.map((req, i) => (
                        <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                          <span className="text-slate-500 mt-0.5">▫</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {isActive && evalResult && (
                    <div className={`p-2.5 rounded border text-[11px] space-y-1.5 ${
                      evalResult.completed
                        ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold">
                        {evalResult.completed ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-300">¡Reto Superado con Éxito!</span>
                          </>
                        ) : (
                          <>
                            <HelpCircle className="w-4 h-4 text-amber-400" />
                            <span className="text-amber-300">Progreso del reto actual:</span>
                          </>
                        )}
                      </div>
                      <ul className="space-y-1 pt-1">
                        {evalResult.feedback.map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className={f.startsWith('Cumple') ? 'text-emerald-400' : 'text-rose-400'}>
                              {f.startsWith('Cumple') ? '✔' : '✖'}
                            </span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pie del drawer con firma de Un Fantasma en el Sistema */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 text-xs text-slate-400">
        <span>Mentor formativo de administración de sistemas</span>
        <a
          href="https://www.unfantasmaenelsistema.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-mono text-[11px] transition-colors"
          title="Visitar www.unfantasmaenelsistema.com"
        >
          <GhostLogo size={16} className="w-4 h-4 object-contain" />
          <span>unfantasmaenelsistema.com</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </aside>
  );
};

function LayersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
