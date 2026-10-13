import React from 'react';
import { 
  Server, 
  Terminal, 
  Monitor, 
  Layers, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft,
  Check
} from 'lucide-react';
import { OSType, SoftwareProfile } from '../types/installer';

interface SoftwareStepProps {
  osType: OSType;
  selectedProfileId: string;
  onSelectProfile: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const LINUX_PROFILES: SoftwareProfile[] = [
  {
    id: 'server_minimal',
    name: 'Servidor Minimal (CLI Headless)',
    description: 'Instalación pura sin servidor gráfico. Ideal para servidores en nube, microservicios y máxima seguridad.',
    recommendedRootMB: 15360, // 15 GB
    features: [
      'Sin entorno gráfico (mínimo consumo de RAM < 300 MB)',
      'Superficie de ataque drásticamente reducida',
      'Servicios systemd esenciales y cliente SSH',
      'Gestión remota por consola o Cockpit'
    ]
  },
  {
    id: 'server_gui',
    name: 'Servidor con Entorno Gráfico (GUI)',
    description: 'Servidor empresarial con entorno gráfico GNOME y consola web de administración Cockpit preconfigurada.',
    recommendedRootMB: 25600, // 25 GB
    features: [
      'Escritorio gráfico para administración visual',
      'Herramientas de configuración de red y discos GParted/Disks',
      'Mayor consumo de recursos de memoria RAM (~1.5 GB)',
      'Ideal para administradores en transición'
    ]
  },
  {
    id: 'workstation_dev',
    name: 'Estación de Trabajo / Desarrollo',
    description: 'Sistema completo para programadores, ingenieros de sistemas e investigación con suite de herramientas.',
    recommendedRootMB: 35840, // 35 GB
    features: [
      'Compiladores GCC, Clang, Python, Git',
      'Soporte nativo para contenedores Podman / Docker',
      'Escritorio gráfico moderno acelerado por hardware',
      'Controladores de audio y aceleración de gráficos'
    ]
  },
  {
    id: 'virtualization_host',
    name: 'Host de Virtualización (KVM / QEMU)',
    description: 'Diseñado para ejecutar múltiples máquinas virtuales con aceleración por hardware y redes bridge.',
    recommendedRootMB: 30720, // 30 GB
    features: [
      'Hipervisor KVM y librerías libvirt/virsh integradas',
      'Módulos de kernel optimizados para I/O masivo',
      'Soporte avanzado de LVM Thin Provisioning',
      'Preparado para almacenamiento ReFS/NFS/iSCSI'
    ]
  }
];

const WINDOWS_PROFILES: SoftwareProfile[] = [
  {
    id: 'win_datacenter_desktop',
    name: 'Windows Server Datacenter (Desktop Experience)',
    description: 'Instalación completa con interfaz gráfica clásica de Windows, soporte para licencias ilimitadas de VMs y Storage Spaces Direct.',
    recommendedRootMB: 61440, // 60 GB
    features: [
      'Interfaz gráfica completa con Administrador del Servidor',
      'Compatibilidad total con herramientas Win32 y .NET',
      'Soporte para virtualización blindada (Shielded VMs)',
      'Mayor consumo de espacio en disco (~35 GB iniciales)'
    ]
  },
  {
    id: 'win_standard_core',
    name: 'Windows Server Standard (Server Core)',
    description: 'Instalación sin interfaz gráfica de usuario. Administrado mediante PowerShell remoto o Windows Admin Center.',
    recommendedRootMB: 40960, // 40 GB
    features: [
      'Sin Explorer ni shell gráfico (mayor rendimiento)',
      'Reduce notablemente la necesidad de parches y reinicios',
      'Menor huella de memoria RAM',
      'Administración vía PowerShell / SSH / WAC'
    ]
  }
];

export const SoftwareStep: React.FC<SoftwareStepProps> = ({
  osType,
  selectedProfileId,
  onSelectProfile,
  onNext,
  onBack
}) => {
  const profiles = osType === 'linux' ? LINUX_PROFILES : WINDOWS_PROFILES;
  const activeProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Paso 3: Selección de Software y Perfil de Instalación
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Elige los paquetes base que se desplegarán en el disco. Esto determina el espacio mínimo necesario en la partición raíz.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profiles.map(profile => {
          const isSelected = profile.id === selectedProfileId;

          return (
            <div
              key={profile.id}
              onClick={() => onSelectProfile(profile.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {profile.id.includes('gui') || profile.id.includes('desktop') ? (
                        <Monitor className="w-4 h-4" />
                      ) : (
                        <Terminal className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{profile.name}</h3>
                      <span className="text-[11px] font-mono text-emerald-400">
                        Raíz mín: {(profile.recommendedRootMB / 1024).toFixed(0)} GB
                      </span>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-700'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {profile.description}
                </p>

                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                    Características incluidas:
                  </span>
                  <ul className="space-y-1">
                    {profile.features.map((feat, i) => (
                      <li key={i} className="text-[11px] text-slate-300 flex items-center gap-1.5">
                        <span className="text-emerald-400 text-xs">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Repercusión técnica formativa */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
        <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Repercusión en la fase de Particionado siguiente:</span>
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed">
          Has seleccionado <strong className="text-white">{activeProfile.name}</strong>. En el siguiente paso de particionado, la partición raíz <code className="bg-slate-950 px-1 py-0.5 rounded text-emerald-400">/</code> (o <code className="bg-slate-950 px-1 py-0.5 rounded text-sky-400">C:</code>) deberá tener al menos <strong className="text-emerald-300">{(activeProfile.recommendedRootMB / 1024).toFixed(0)} GB</strong> de espacio libre para que el gestor de paquetes pueda descomprimir el kernel, bibliotecas glibc y servicios sin provocar un fallo de disco lleno (No space left on device).
        </p>
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
          <span>Continuar a Configuración de Red</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
