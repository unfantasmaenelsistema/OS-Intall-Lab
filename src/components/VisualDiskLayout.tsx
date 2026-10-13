import React, { useState } from 'react';
import { 
  Flame, 
  Zap, 
  Snowflake, 
  HardDrive, 
  Database, 
  Lock, 
  Info, 
  Sliders, 
  Activity, 
  Check, 
  Layers,
  Thermometer,
  Cpu
} from 'lucide-react';
import { DiskDevice, PartitionItem, OSType } from '../types/installer';

interface VisualDiskLayoutProps {
  disk: DiskDevice;
  osType: OSType;
  onEditPartition: (partition: PartitionItem) => void;
  onAddPartition: () => void;
}

export type DiskColorMode = 'filesystem' | 'heatmap';

export interface PartitionHeatData {
  tier: 'hot' | 'warm' | 'cold';
  label: string;
  temperatureC: number;
  estIOPS: string;
  bandwidthMBs: string;
  usedPct: number;
  usedGB: string;
  freeGB: string;
  inodeUsage: string;
  educationalHeatReason: string;
}

export const getPartitionHeatData = (part: PartitionItem, totalMB: number): PartitionHeatData => {
  const mp = part.mountPoint || '';
  const sizeGB = (part.sizeMB / 1024).toFixed(1);

  if (mp === '/' || mp === 'C:') {
    const usedPct = 42;
    const used = ((part.sizeMB * usedPct) / 100 / 1024).toFixed(1);
    const free = (parseFloat(sizeGB) - parseFloat(used)).toFixed(1);
    return {
      tier: 'hot',
      label: 'Nivel Caliente (Hot Tier)',
      temperatureC: 48,
      estIOPS: '48,500 IOPS (Lectura/Escritura aleatoria continua)',
      bandwidthMBs: '420 MB/s',
      usedPct,
      usedGB: `${used} GB`,
      freeGB: `${free} GB`,
      inodeUsage: '142,300 / 2,621,440 inodos (5.4%)',
      educationalHeatReason: 'Directorio raíz (/): Soporta la mayor carga de E/S del sistema debido a binarios del kernel, librerías compartidas (/usr/lib64), cachés de gestores de paquetes y sockets del sistema.'
    };
  }

  if (mp === '/var') {
    const usedPct = 35;
    const used = ((part.sizeMB * usedPct) / 100 / 1024).toFixed(1);
    const free = (parseFloat(sizeGB) - parseFloat(used)).toFixed(1);
    return {
      tier: 'hot',
      label: 'Nivel Crítico de Escritura (Hot Tier)',
      temperatureC: 51,
      estIOPS: '52,000 IOPS (Journald, MariaDB, Docker overlay2)',
      bandwidthMBs: '380 MB/s',
      usedPct,
      usedGB: `${used} GB`,
      freeGB: `${free} GB`,
      inodeUsage: '85,400 / 1,310,720 inodos (6.5%)',
      educationalHeatReason: 'Directorio de datos variables (/var): Genera ciclos continuos de escritura sincrónica en bases de datos y ficheros de registro (/var/log). Aislarlo en su propia partición protege al resto del disco.'
    };
  }

  if (mp === 'swap' || part.fsType === 'swap') {
    const usedPct = 12;
    const used = ((part.sizeMB * usedPct) / 100 / 1024).toFixed(1);
    const free = (parseFloat(sizeGB) - parseFloat(used)).toFixed(1);
    return {
      tier: 'warm',
      label: 'Nivel Dinámico (Warm Tier)',
      temperatureC: 41,
      estIOPS: '12,000 IOPS (Ráfagas durante picos de memoria)',
      bandwidthMBs: '650 MB/s (Acceso secuencial por páginas)',
      usedPct,
      usedGB: `${used} GB`,
      freeGB: `${free} GB`,
      inodeUsage: 'N/A (Bloques crudos sin inodos)',
      educationalHeatReason: 'Memoria de intercambio Swap: Inactiva durante uso nominal de RAM, pero experimenta ráfagas térmicas y de E/S intensas si el kernel necesita paginar memoria anónima o suspender a disco.'
    };
  }

  if (mp === '/home' || mp === 'D:') {
    const usedPct = 25;
    const used = ((part.sizeMB * usedPct) / 100 / 1024).toFixed(1);
    const free = (parseFloat(sizeGB) - parseFloat(used)).toFixed(1);
    return {
      tier: 'warm',
      label: 'Nivel Templado (Warm Tier)',
      temperatureC: 39,
      estIOPS: '18,500 IOPS (Archivos de usuario y descargas)',
      bandwidthMBs: '210 MB/s',
      usedPct,
      usedGB: `${used} GB`,
      freeGB: `${free} GB`,
      inodeUsage: '45,000 / 1,048,576 inodos (4.3%)',
      educationalHeatReason: 'Espacio de usuarios (/home): Carga moderada de lectura/escritura dependiendo de las aplicaciones del usuario. Se recomienda montar con nodev y nosuid para seguridad.'
    };
  }

  if (mp === '/boot/efi' || part.flags?.includes('esp')) {
    const usedPct = 8;
    const used = ((part.sizeMB * usedPct) / 100).toFixed(0);
    const free = (part.sizeMB - parseFloat(used)).toFixed(0);
    return {
      tier: 'cold',
      label: 'Nivel Frío (Cold Tier - Casi Sólo Lectura)',
      temperatureC: 32,
      estIOPS: '< 800 IOPS (Carga del firmware al encender)',
      bandwidthMBs: '45 MB/s',
      usedPct,
      usedGB: `${used} MB`,
      freeGB: `${free} MB`,
      inodeUsage: '64 / 65,536 ficheros FAT32 (0.1%)',
      educationalHeatReason: 'Partición del Sistema EFI (/boot/efi): Estática. El firmware UEFI únicamente lee el ejecutable grubx64.efi durante los primeros 2 segundos de encendido y no vuelve a tocar el disco.'
    };
  }

  if (mp === '/boot') {
    const usedPct = 28;
    const used = ((part.sizeMB * usedPct) / 100).toFixed(0);
    const free = (part.sizeMB - parseFloat(used)).toFixed(0);
    return {
      tier: 'cold',
      label: 'Nivel Frío (Cold Tier)',
      temperatureC: 34,
      estIOPS: '< 1,200 IOPS (Lectura de vmlinuz e initramfs)',
      bandwidthMBs: '80 MB/s',
      usedPct,
      usedGB: `${used} MB`,
      freeGB: `${free} MB`,
      inodeUsage: '128 / 131,072 inodos (0.1%)',
      educationalHeatReason: 'Partición de kernel (/boot): Se lee exclusivamente durante el arranque para cargar vmlinuz e initramfs. Solo experimenta escrituras al instalar una actualización de kernel (dracut).'
    };
  }

  // Partición genérica
  const usedPct = 20;
  const used = ((part.sizeMB * usedPct) / 100 / 1024).toFixed(1);
  const free = (parseFloat(sizeGB) - parseFloat(used)).toFixed(1);
  return {
    tier: 'warm',
    label: 'Nivel Equilibrado',
    temperatureC: 38,
    estIOPS: '10,000 IOPS',
    bandwidthMBs: '150 MB/s',
    usedPct,
    usedGB: `${used} GB`,
    freeGB: `${free} GB`,
    inodeUsage: '32,000 / 524,288 inodos (6.1%)',
    educationalHeatReason: 'Almacenamiento general asignado sin un perfil de carga extremo.'
  };
};

export const VisualDiskLayout: React.FC<VisualDiskLayoutProps> = ({
  disk,
  osType,
  onEditPartition,
  onAddPartition
}) => {
  const [colorMode, setColorMode] = useState<DiskColorMode>('filesystem');
  const [hoveredPartition, setHoveredPartition] = useState<PartitionItem | null>(null);

  const totalAssignedMB = disk.partitions.reduce((sum, p) => sum + p.sizeMB, 0);
  const freeMB = Math.max(0, disk.totalSizeMB - totalAssignedMB);

  // Paleta estándar por Filesystem
  const getFsColor = (fsType: string) => {
    switch (fsType) {
      case 'ext4': return 'bg-emerald-500 text-slate-950';
      case 'xfs': return 'bg-sky-500 text-slate-950';
      case 'btrfs': return 'bg-purple-500 text-slate-950';
      case 'vfat': return 'bg-amber-400 text-slate-950';
      case 'swap': return 'bg-rose-500 text-white';
      case 'ntfs': return 'bg-blue-500 text-white';
      case 'refs': return 'bg-teal-400 text-slate-950';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  // Paleta térmica para Disk Heat Map
  const getHeatMapColor = (tier: 'hot' | 'warm' | 'cold') => {
    switch (tier) {
      case 'hot':
        return 'bg-linear-to-r from-rose-600 to-amber-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.35)]';
      case 'warm':
        return 'bg-linear-to-r from-amber-500 to-yellow-400 text-slate-950';
      case 'cold':
        return 'bg-linear-to-r from-sky-600 to-cyan-400 text-slate-950';
    }
  };

  const activeHeatData = hoveredPartition ? getPartitionHeatData(hoveredPartition, disk.totalSizeMB) : null;

  return (
    <div className="space-y-3 select-none">
      {/* Barra de Controles de Modo: Sistema de Archivos vs Disk Heat Map */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium">Modo de visualización:</span>
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setColorMode('filesystem')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                colorMode === 'filesystem'
                  ? 'bg-slate-800 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 text-sky-400" />
              <span>Sistemas de Archivos</span>
            </button>

            <button
              type="button"
              onClick={() => setColorMode('heatmap')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                colorMode === 'heatmap'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80 font-bold shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Muestra el mapa térmico de I/O y estrés de escritura en el disco"
            >
              <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Mapa de Calor I/O (Disk Heat)</span>
            </button>
          </div>
        </div>

        {/* Leyenda condicional */}
        {colorMode === 'heatmap' ? (
          <div className="flex items-center gap-2.5 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-[0_0_6px_#f43f5e]"></span>
              <span>Caliente (&gt;40k IOPS)</span>
            </span>
            <span className="flex items-center gap-1 text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
              <span>Templado (10-30k IOPS)</span>
            </span>
            <span className="flex items-center gap-1 text-sky-300">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>
              <span>Frío (&lt;2k IOPS)</span>
            </span>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400">
            Pasa el cursor sobre cualquier bloque para ver métricas de calor y capacidad
          </div>
        )}
      </div>

      {/* Barra de bloques proporcionales interactiva con detección de hover */}
      <div className="relative">
        <div className="w-full h-12 bg-slate-950 rounded-xl border border-slate-800 p-1 flex items-stretch gap-1 overflow-hidden">
          {disk.partitions.map((part) => {
            const widthPct = Math.max(4, (part.sizeMB / disk.totalSizeMB) * 100);
            const heatData = getPartitionHeatData(part, disk.totalSizeMB);
            const isHovered = hoveredPartition?.id === part.id;

            const bgClass = colorMode === 'heatmap'
              ? getHeatMapColor(heatData.tier)
              : getFsColor(part.fsType);

            return (
              <div
                key={part.id}
                onMouseEnter={() => setHoveredPartition(part)}
                onMouseLeave={() => setHoveredPartition(null)}
                onClick={() => onEditPartition(part)}
                style={{ width: `${widthPct}%` }}
                className={`h-full rounded-lg cursor-pointer transition-all duration-150 flex flex-col justify-center px-2 overflow-hidden relative ${bgClass} ${
                  isHovered ? 'ring-2 ring-white scale-[1.02] z-10 shadow-lg' : 'hover:scale-[1.01]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 leading-none">
                  <span className="text-[10px] font-bold font-mono truncate">
                    {part.mountPoint || part.name}
                  </span>
                  {part.isEncrypted && (
                    <Lock className="w-2.5 h-2.5 shrink-0 opacity-80" />
                  )}
                </div>

                <div className="text-[9px] opacity-85 font-mono truncate leading-none mt-1">
                  {part.sizeMB >= 1024 ? `${(part.sizeMB / 1024).toFixed(0)}G` : `${part.sizeMB}M`} · {
                    colorMode === 'heatmap' ? `${heatData.temperatureC}°C` : part.fsType.toUpperCase()
                  }
                </div>
              </div>
            );
          })}

          {/* Espacio Libre no asignado */}
          {freeMB > 0 && (
            <div
              onClick={onAddPartition}
              onMouseEnter={() => setHoveredPartition(null)}
              style={{ width: `${Math.max(4, (freeMB / disk.totalSizeMB) * 100)}%` }}
              className="h-full rounded-lg border border-dashed border-slate-700 bg-slate-900/50 hover:bg-slate-800/80 cursor-pointer flex flex-col justify-center px-2 text-slate-400 transition-colors"
              title={`Espacio no asignado: ${freeMB} MB`}
            >
              <div className="text-[10px] font-mono truncate font-semibold">Libre</div>
              <div className="text-[9px] font-mono truncate">
                {(freeMB / 1024).toFixed(1)} GB
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tarjeta HUD en Tiempo Real con Datos de Disk Heat y Capacidad */}
      {hoveredPartition && activeHeatData ? (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3.5 shadow-2xl animate-in fade-in duration-150 text-xs">
          {/* Fila 1: Encabezado de la partición inspeccionada */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-white font-bold text-sm">
                {hoveredPartition.mountPoint ? `${hoveredPartition.mountPoint} (${hoveredPartition.name})` : hoveredPartition.name}
              </span>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] uppercase bg-slate-800 text-slate-200">
                {hoveredPartition.fsType}
              </span>
              {hoveredPartition.isEncrypted && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1 font-mono">
                  <Lock className="w-2.5 h-2.5" />
                  <span>LUKS2</span>
                </span>
              )}
            </div>

            {/* Badge de Nivel Térmico / Heat */}
            <div className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 ${
              activeHeatData.tier === 'hot' 
                ? 'bg-rose-950/80 border-rose-800 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                : activeHeatData.tier === 'warm'
                ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                : 'bg-sky-950/80 border-sky-800 text-sky-300'
            }`}>
              {activeHeatData.tier === 'hot' && <Flame className="w-3.5 h-3.5 text-rose-400" />}
              {activeHeatData.tier === 'warm' && <Zap className="w-3.5 h-3.5 text-amber-400" />}
              {activeHeatData.tier === 'cold' && <Snowflake className="w-3.5 h-3.5 text-sky-400" />}
              <span>{activeHeatData.label} · {activeHeatData.temperatureC}°C</span>
            </div>
          </div>

          {/* Fila 2: Grid de Métricas de Calor I/O & Capacidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Métrica 1: Capacidad Utilizada */}
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1.5">
              <span className="text-slate-400 text-[10px] block">Uso Estimado del SO:</span>
              <div className="flex items-baseline justify-between">
                <span className="text-white font-mono font-bold text-sm">{activeHeatData.usedGB}</span>
                <span className="text-slate-400 text-[11px] font-mono">de {(hoveredPartition.sizeMB / 1024).toFixed(1)} GB</span>
              </div>
              {/* Barra de progreso de uso */}
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${activeHeatData.usedPct}%` }}
                  className="h-full bg-emerald-400 rounded-full"
                ></div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono block text-right">
                {activeHeatData.usedPct}% ocupado · {activeHeatData.freeGB} libres
              </span>
            </div>

            {/* Métrica 2: Rendimiento IOPS */}
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1">
              <span className="text-slate-400 text-[10px] block">Actividad I/O (IOPS):</span>
              <div className="text-amber-300 font-mono font-bold text-xs truncate">
                {activeHeatData.estIOPS.split(' ')[0]} IOPS
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Ancho de banda: <strong className="text-slate-200">{activeHeatData.bandwidthMBs}</strong>
              </p>
            </div>

            {/* Métrica 3: Inodos de Archivos */}
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1">
              <span className="text-slate-400 text-[10px] block">Estructura de Inodos (df -i):</span>
              <div className="text-sky-300 font-mono font-bold text-xs truncate">
                {activeHeatData.inodeUsage.split(' ')[0]}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Alineación LBA: <strong className="text-slate-200">4096 bytes (4K)</strong>
              </p>
            </div>

            {/* Métrica 4: Temperatura & Desgaste */}
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1">
              <span className="text-slate-400 text-[10px] block">Temperatura del Controlador:</span>
              <div className="text-rose-400 font-mono font-bold text-xs flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5" />
                <span>{activeHeatData.temperatureC}°C</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Factor de Amplificación: <strong className="text-slate-200">1.12x WAF</strong>
              </p>
            </div>
          </div>

          {/* Fila 3: Foco Formativo / Razón del nivel de calor */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
            <span className="font-semibold text-amber-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>Foco Formativo: ¿Por qué esta partición tiene este nivel de actividad I/O?:</span>
            </span>
            <p className="text-slate-300 leading-relaxed font-sans">
              {activeHeatData.educationalHeatReason}
            </p>
          </div>
        </div>
      ) : (
        /* Tarjeta informativa en reposo */
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Pasa el cursor sobre cualquier bloque del disco para inspeccionar el <strong>Disk Heat</strong> y métricas de capacidad.</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
            NVMe Gen4 · LBA 512e · 4K Blocks
          </span>
        </div>
      )}
    </div>
  );
};
