import React from 'react';
import { ExternalLink, Terminal, Shield, HardDrive, Cpu, Heart } from 'lucide-react';
import { GhostLogo } from './GhostLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300 py-8 px-4 sm:px-6 lg:px-8 mt-12 select-none">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Identidad con Logo y Enlace a la Web */}
        <div className="flex items-center gap-4 text-center md:text-left">
          <a
            href="https://www.unfantasmaenelsistema.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group block relative"
            title="Visitar www.unfantasmaenelsistema.com"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-emerald-500/60 flex items-center justify-center transition-all shadow-lg group-hover:shadow-emerald-500/10 group-hover:scale-105 shrink-0 overflow-hidden">
              <GhostLogo size={28} className="w-7 h-7 object-contain" />
            </div>
          </a>

          <div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <a
                href="https://www.unfantasmaenelsistema.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-white text-base hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 group"
              >
                <span>Un Fantasma en el Sistema</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
              </a>
              <span className="text-slate-600 hidden sm:inline">·</span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                unfantasmaenelsistema.com
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Simulador formativo para administradores de sistemas, diseño de almacenamiento empresarial (LVM / LUKS / ZFS / Btrfs) y ciberseguridad.
            </p>
          </div>
        </div>

        {/* Enlaces de Interés a la Web del Usuario */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
          <a
            href="https://www.unfantasmaenelsistema.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-all flex items-center gap-2 group"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Blog & Laboratorios</span>
            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-400 transition-colors" />
          </a>

          <a
            href="https://www.unfantasmaenelsistema.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-all flex items-center gap-2 group"
          >
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span>Ciberseguridad & Sysadmin</span>
            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-sky-400 transition-colors" />
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-6 pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span>OS InstallLab Simulator</span>
          <span>·</span>
          <span>Desarrollado para el aprendizaje técnico en entornos Linux & Windows Server</span>
        </div>
        <div>
          <span>© {new Date().getFullYear()} </span>
          <a
            href="https://www.unfantasmaenelsistema.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline"
          >
            www.unfantasmaenelsistema.com
          </a>
        </div>
      </div>
    </footer>
  );
};
