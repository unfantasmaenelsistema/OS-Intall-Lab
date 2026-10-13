import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  Cell 
} from 'recharts';
import { 
  BarChart3, 
  HardDrive, 
  Layers, 
  Lock, 
  Database, 
  Maximize2, 
  Info,
  CheckCircle2,
  PieChart as PieChartIcon
} from 'lucide-react';
import { DiskDevice, PartitionItem, OSType } from '../types/installer';
import { useTheme } from '../context/ThemeContext';
import { getPartitionHeatData } from './VisualDiskLayout';

interface PartitionStackedBarChartProps {
  disk: DiskDevice;
  osType: OSType;
  onEditPartition?: (partition: PartitionItem) => void;
  onAddPartition?: () => void;
}

// Colores bien definidos para sistemas de archivos
const FS_COLORS: Record<string, { fill: string; border: string; text: string }> = {
  ext4: { fill: '#10b981', border: '#059669', text: 'EXT4 (Linux Estándar)' },
  xfs: { fill: '#0ea5e9', border: '#0284c7', text: 'XFS (Alto Rendimiento)' },
  btrfs: { fill: '#a855f7', border: '#9333ea', text: 'Btrfs (Copy-on-Write)' },
  vfat: { fill: '#f59e0b', border: '#d97706', text: 'FAT32 / ESP (UEFI Boot)' },
  swap: { fill: '#f43f5e', border: '#e11d48', text: 'SWAP (Memoria Virtual)' },
  ntfs: { fill: '#3b82f6', border: '#2563eb', text: 'NTFS (Windows Sistema)' },
  refs: { fill: '#14b8a6', border: '#0d9488', text: 'ReFS (Resilient FS)' },
  raw: { fill: '#64748b', border: '#475569', text: 'RAW / Sin Formato' }
};

export const PartitionStackedBarChart: React.FC<PartitionStackedBarChartProps> = ({
  disk,
  osType,
  onEditPartition,
  onAddPartition
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [activeMetric, setActiveMetric] = useState<'diskOverview' | 'partitionUsage'>('diskOverview');
  const [selectedPartitionId, setSelectedPartitionId] = useState<string | null>(null);

  const totalAssignedMB = disk.partitions.reduce((sum, p) => sum + p.sizeMB, 0);
  const freeMB = Math.max(0, disk.totalSizeMB - totalAssignedMB);
  const totalDiskGB = disk.totalSizeMB / 1024;

  // 1. Datos para la barra apilada del disco completo (todas las particiones apiladas una tras otra)
  // Recharts apila barras agrupadas con el mismo stackId en una única fila
  const diskBarDatum: Record<string, any> = {
    name: disk.devicePath || 'Disco',
  };

  disk.partitions.forEach((part) => {
    // tamaño en GB (o MB si es muy pequeño) para legibilidad
    const sizeGB = parseFloat((part.sizeMB / 1024).toFixed(2));
    diskBarDatum[part.id] = sizeGB;
  });

  if (freeMB > 0) {
    diskBarDatum['__free__'] = parseFloat((freeMB / 1024).toFixed(2));
  }

  // 2. Datos para el desglose por partición: cada partición con su barra apilada de (Espacio Usado vs Espacio Libre)
  const partitionUsageData = disk.partitions.map((part) => {
    const heatData = getPartitionHeatData(part, disk.totalSizeMB);
    const sizeGB = part.sizeMB / 1024;
    const usedPct = heatData.usedPct;
    const usedGB = parseFloat(((sizeGB * usedPct) / 100).toFixed(2));
    const freeInPartGB = parseFloat(Math.max(0, sizeGB - usedGB).toFixed(2));

    return {
      id: part.id,
      name: part.mountPoint ? `${part.mountPoint} (${part.name.replace('/dev/', '')})` : part.name.replace('/dev/', ''),
      fullName: part.name,
      mountPoint: part.mountPoint || 'Sin montaje',
      fsType: part.fsType,
      sizeGB: parseFloat(sizeGB.toFixed(2)),
      usedGB,
      freeInPartGB,
      usedPct,
      isEncrypted: part.isEncrypted,
      isLvmLV: part.isLvmLV,
      heatLabel: heatData.label,
      rawPartition: part
    };
  });

  // Tooltip personalizado para el gráfico de disco completo apilado
  const CustomDiskOverviewTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    // Cuando el cursor está sobre el gráfico, identificar qué segmento tiene el foco si es posible
    return (
      <div className={`p-3 rounded-xl border text-xs shadow-xl backdrop-blur-md max-w-xs ${
        isLight ? 'bg-white/95 border-slate-300 text-slate-800' : 'bg-slate-900/95 border-slate-700 text-slate-100'
      }`}>
        <div className="font-bold border-b border-slate-700/40 pb-1.5 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono">
            <HardDrive className="w-3.5 h-3.5 text-sky-400" />
            {disk.devicePath} ({(disk.totalSizeMB / 1024).toFixed(0)} GB)
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
            {disk.tableType}
          </span>
        </div>

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {payload.map((entry: any) => {
            if (entry.dataKey === '__free__') {
              return (
                <div key="__free__" className="flex items-center justify-between gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-xs border border-dashed border-slate-500 bg-slate-800/60 inline-block" />
                    <span>Sin Asignar (Libre)</span>
                  </span>
                  <span className="font-mono font-bold text-slate-400">
                    {entry.value} GB ({((freeMB / disk.totalSizeMB) * 100).toFixed(1)}%)
                  </span>
                </div>
              );
            }

            const part = disk.partitions.find(p => p.id === entry.dataKey);
            if (!part) return null;
            const pct = ((part.sizeMB / disk.totalSizeMB) * 100).toFixed(1);

            return (
              <div key={part.id} className="flex items-center justify-between gap-4 text-[11px]">
                <span className="flex items-center gap-1.5 font-mono truncate">
                  <span 
                    className="w-2.5 h-2.5 rounded-xs inline-block shrink-0" 
                    style={{ backgroundColor: entry.color }} 
                  />
                  <span className="font-bold text-white">{part.mountPoint || part.name}</span>
                  <span className="text-[10px] text-slate-400">({part.fsType.toUpperCase()})</span>
                </span>
                <span className="font-mono font-bold shrink-0">
                  {entry.value} GB ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Tooltip personalizado para el desglose de uso de partición (Usado vs Libre)
  const CustomPartitionUsageTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;

    return (
      <div className={`p-3 rounded-xl border text-xs shadow-xl backdrop-blur-md max-w-xs ${
        isLight ? 'bg-white/95 border-slate-300 text-slate-800' : 'bg-slate-900/95 border-slate-700 text-slate-100'
      }`}>
        <div className="font-bold border-b border-slate-700/40 pb-1 mb-2 flex items-center justify-between">
          <span className="font-mono text-emerald-400 text-sm font-bold">
            {item.mountPoint !== 'Sin montaje' ? item.mountPoint : item.fullName}
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
            {item.fsType}
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Capacidad asignada:</span>
            <span className="font-bold">{item.sizeGB} GB</span>
          </div>
          <div className="flex items-center justify-between text-emerald-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-xs bg-emerald-500 inline-block" />
              Espacio en uso (SO/Archivos):
            </span>
            <span className="font-bold">{item.usedGB} GB ({item.usedPct}%)</span>
          </div>
          <div className="flex items-center justify-between text-sky-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-xs bg-sky-500/50 inline-block" />
              Espacio remanente libre:
            </span>
            <span className="font-bold">{item.freeInPartGB} GB ({100 - item.usedPct}%)</span>
          </div>
        </div>

        {item.isEncrypted && (
          <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-amber-300 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Volumen cifrado con LUKS2 / dm-crypt</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
      {/* Cabecera del Gráfico Recharts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <span>Gráfico Recharts: Distribución y Uso de Almacenamiento</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-normal bg-sky-950/80 text-sky-300 border border-sky-800/80">
                Barras Apiladas
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Visualización analítica precisa del espacio por sistema de archivos y ocupación en disco
            </p>
          </div>
        </div>

        {/* Selector de sub-vista del gráfico de barras */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveMetric('diskOverview')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
              activeMetric === 'diskOverview'
                ? 'bg-slate-800 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3 h-3 text-sky-400" />
            <span>Esquema Global del Disco</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('partitionUsage')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
              activeMetric === 'partitionUsage'
                ? 'bg-slate-800 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieChartIcon className="w-3 h-3 text-emerald-400" />
            <span>Uso Interno (Usado / Libre)</span>
          </button>
        </div>
      </div>

      {/* Renderizado de Recharts */}
      {disk.partitions.length === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl text-center p-4 text-xs text-slate-400">
          <HardDrive className="w-8 h-8 text-slate-600 mb-2" />
          <p className="font-semibold text-slate-300">No hay particiones configuradas para graficar</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Añade particiones manualmente o aplica un esquema recomendado arriba para ver el gráfico de barras apiladas.
          </p>
        </div>
      ) : activeMetric === 'diskOverview' ? (
        /* VISTA 1: Barra apilada horizontal del disco completo con todas las particiones + espacio libre */
        <div className="space-y-3">
          <div className="w-full h-24 sm:h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={[diskBarDatum]}
                margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
              >
                <XAxis 
                  type="number" 
                  domain={[0, totalDiskGB]} 
                  unit=" GB"
                  tick={{ fill: isLight ? '#475569' : '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  stroke={isLight ? '#cbd5e1' : '#334155'}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  hide={true}
                />
                <Tooltip content={<CustomDiskOverviewTooltip />} />

                {/* Generar una barra por cada partición apiladas con stackId="disk" */}
                {disk.partitions.map((part) => {
                  const colorConfig = FS_COLORS[part.fsType] || FS_COLORS.raw;
                  return (
                    <Bar
                      key={part.id}
                      dataKey={part.id}
                      name={part.mountPoint ? `${part.mountPoint} (${part.fsType.toUpperCase()})` : part.name}
                      stackId="disk"
                      fill={colorConfig.fill}
                      stroke={colorConfig.border}
                      strokeWidth={1}
                      cursor="pointer"
                      onClick={() => onEditPartition && onEditPartition(part)}
                    />
                  );
                })}

                {/* Segmento de espacio libre si existe */}
                {freeMB > 0 && (
                  <Bar
                    dataKey="__free__"
                    name="Espacio Libre"
                    stackId="disk"
                    fill={isLight ? '#e2e8f0' : '#1e293b'}
                    stroke={isLight ? '#94a3b8' : '#475569'}
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    cursor="pointer"
                    onClick={() => onAddPartition && onAddPartition()}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Leyenda interactiva con badges detallados de cada partición */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
            {disk.partitions.map((part) => {
              const colorConfig = FS_COLORS[part.fsType] || FS_COLORS.raw;
              const pct = ((part.sizeMB / disk.totalSizeMB) * 100).toFixed(1);
              return (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => onEditPartition && onEditPartition(part)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] transition-all flex items-center gap-2 hover:scale-[1.02] ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' 
                      : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 text-slate-200'
                  }`}
                  title={`Editar partición ${part.name}`}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-xs shrink-0" 
                    style={{ backgroundColor: colorConfig.fill }} 
                  />
                  <span className="font-bold text-white">
                    {part.mountPoint || part.name}
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    {(part.sizeMB / 1024).toFixed(1)}G ({pct}%)
                  </span>
                  {part.isEncrypted && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                </button>
              );
            })}

            {freeMB > 0 && (
              <button
                type="button"
                onClick={() => onAddPartition && onAddPartition()}
                className="px-2.5 py-1 rounded-lg border border-dashed border-slate-700 bg-slate-900/50 hover:bg-slate-850 text-slate-400 text-[11px] transition-all flex items-center gap-2"
                title="Añadir nueva partición en el espacio libre"
              >
                <span className="w-2.5 h-2.5 rounded-xs border border-dashed border-slate-500 inline-block" />
                <span className="font-semibold">Espacio Libre:</span>
                <span>{(freeMB / 1024).toFixed(1)} GB ({((freeMB / disk.totalSizeMB) * 100).toFixed(1)}%)</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* VISTA 2: Barras apiladas verticales/horizontales por cada partición mostrando (Espacio Usado vs Libre) */
        <div className="space-y-3">
          <div className="w-full" style={{ height: Math.max(160, partitionUsageData.length * 40 + 30) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={partitionUsageData}
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <XAxis 
                  type="number" 
                  unit=" GB"
                  tick={{ fill: isLight ? '#475569' : '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  stroke={isLight ? '#cbd5e1' : '#334155'}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={110}
                  tick={{ fill: isLight ? '#1e293b' : '#f1f5f9', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}
                  stroke={isLight ? '#cbd5e1' : '#334155'}
                />
                <Tooltip content={<CustomPartitionUsageTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={32}
                  wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingBottom: '8px' }}
                  formatter={(value) => {
                    return value === 'usedGB' ? 'Espacio Ocupado Estimado' : 'Espacio Libre Disponible';
                  }}
                />
                <Bar 
                  dataKey="usedGB" 
                  name="usedGB"
                  stackId="usage" 
                  fill="#10b981" 
                  stroke="#059669"
                  radius={[0, 0, 0, 0]}
                  cursor="pointer"
                  onClick={(data: any) => data && onEditPartition && onEditPartition(data.rawPartition)}
                />
                <Bar 
                  dataKey="freeInPartGB" 
                  name="freeInPartGB"
                  stackId="usage" 
                  fill={isLight ? '#93c5fd' : '#0369a1'} 
                  stroke={isLight ? '#60a5fa' : '#0284c7'}
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={(data: any) => data && onEditPartition && onEditPartition(data.rawPartition)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>Haz clic en cualquier barra o etiqueta para editar el tamaño, sistema de archivos o cifrado.</span>
            </span>
            <span className="text-emerald-400 font-semibold">
              Total Particionado: {(totalAssignedMB / 1024).toFixed(1)} GB / {(disk.totalSizeMB / 1024).toFixed(0)} GB
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
