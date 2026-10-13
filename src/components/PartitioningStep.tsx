import React, { useState } from 'react';
import { 
  HardDrive, 
  Plus, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Lock,
  Unlock,
  Layers,
  HelpCircle,
  BarChart3
} from 'lucide-react';
import { 
  DiskDevice, 
  PartitionItem, 
  HardwareConfig, 
  OSType, 
  ValidationIssue 
} from '../types/installer';
import { PartitionModal } from './PartitionModal';
import { VisualDiskLayout } from './VisualDiskLayout';
import { PartitionStackedBarChart } from './PartitionStackedBarChart';
import { PARTITION_PRESETS } from '../data/presets';
import { FILESYSTEMS_INFO } from '../data/learningContent';

interface PartitioningStepProps {
  osType: OSType;
  disk: DiskDevice;
  hardware: HardwareConfig;
  useLvm: boolean;
  lvmGroupName: string;
  useWholeDiskEncryption: boolean;
  diskEncryptionPassphrase: string;
  validationIssues: ValidationIssue[];
  onChangeDisk: (disk: DiskDevice) => void;
  onChangeLvm: (useLvm: boolean, lvmGroupName: string) => void;
  onChangeEncryption: (useEncryption: boolean, passphrase: string) => void;
  onNext: () => void;
  onBack: () => void;
  onOpenEducationalDrawer: () => void;
}

export const PartitioningStep: React.FC<PartitioningStepProps> = ({
  osType,
  disk,
  hardware,
  useLvm,
  lvmGroupName,
  useWholeDiskEncryption,
  diskEncryptionPassphrase,
  validationIssues,
  onChangeDisk,
  onChangeLvm,
  onChangeEncryption,
  onNext,
  onBack,
  onOpenEducationalDrawer
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartition, setEditingPartition] = useState<PartitionItem | null>(null);

  const totalAssignedMB = disk.partitions.reduce((sum, p) => sum + p.sizeMB, 0);
  const freeMB = Math.max(0, disk.totalSizeMB - totalAssignedMB);


  const handleAddPartition = () => {
    setEditingPartition(null);
    setIsModalOpen(true);
  };

  const handleEditPartition = (part: PartitionItem) => {
    setEditingPartition(part);
    setIsModalOpen(true);
  };

  const handleDeletePartition = (id: string) => {
    const updated = disk.partitions.filter(p => p.id !== id);
    onChangeDisk({ ...disk, partitions: updated });
  };

  const handleSavePartition = (savedPart: PartitionItem) => {
    let updatedPartitions: PartitionItem[];
    const exists = disk.partitions.some(p => p.id === savedPart.id);

    if (exists) {
      updatedPartitions = disk.partitions.map(p => p.id === savedPart.id ? savedPart : p);
    } else {
      updatedPartitions = [...disk.partitions, savedPart];
    }

    onChangeDisk({ ...disk, partitions: updatedPartitions });
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = PARTITION_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    onChangeLvm(preset.useLvm, preset.lvmGroupName || 'vg_system');
    onChangeEncryption(preset.useWholeDiskEncryption, preset.diskEncryptionPassphrase || 'SecretKey2026!');
    const newDisk = preset.generateDisk(hardware.targetDiskSizeMB);
    onChangeDisk(newDisk);
  };

  const handleClearDisk = () => {
    onChangeDisk({ ...disk, partitions: [] });
  };

  const criticalErrors = validationIssues.filter(i => i.type === 'error');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Paso 5: Particionado de Disco & Sistemas de Archivos</span>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Foco Formativo
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Diseña la estructura de almacenamiento físico y lógico, volúmenes LVM y cifrado LUKS del disco.
          </p>
        </div>

        {/* Acceso directo a Foco Formativo */}
        <button
          type="button"
          onClick={onOpenEducationalDrawer}
          className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors self-start"
        >
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span>Ver repercusiones de opciones</span>
        </button>
      </div>

      {/* Barra de Presets Rápidos */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Esquemas Arquitectónicos Recomendados:</span>
          </span>
          <button
            type="button"
            onClick={handleClearDisk}
            className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline"
          >
            Limpiar todo el disco
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {PARTITION_PRESETS.filter(p => p.osType === osType).map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset.id)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-2"
              title={preset.description}
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Panel de Visualización del Disco */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-white font-bold text-sm">{disk.devicePath}</span>
              <span className="text-xs text-slate-400 font-mono">({disk.model})</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono uppercase">
                Tabla {disk.tableType.toUpperCase()}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Capacidad: {(disk.totalSizeMB / 1024).toFixed(0)} GB · Asignado: {(totalAssignedMB / 1024).toFixed(1)} GB · Libre: {(freeMB / 1024).toFixed(1)} GB
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddPartition}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Partición</span>
          </button>
        </div>

        {/* Componente Visual de Disco con métricas de Disk Heat y Capacidad */}
        <VisualDiskLayout
          disk={disk}
          osType={osType}
          onEditPartition={handleEditPartition}
          onAddPartition={handleAddPartition}
        />

        {/* Gráfico Recharts de Barras Apiladas: Esquema y Uso de Almacenamiento */}
        <PartitionStackedBarChart
          disk={disk}
          osType={osType}
          onEditPartition={handleEditPartition}
          onAddPartition={handleAddPartition}
        />

        {/* Controles de LVM y Cifrado LUKS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
          {/* LVM (Logical Volume Management) */}
          {osType === 'linux' && (
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-400" />
                  <span className="font-semibold text-white text-xs">Gestor de Volúmenes LVM</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useLvm}
                    onChange={(e) => onChangeLvm(e.target.checked, lvmGroupName)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>

              {useLvm && (
                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Grupo de Volúmenes (VG):</span>
                    <input
                      type="text"
                      value={lvmGroupName}
                      onChange={(e) => onChangeLvm(true, e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Crea Physical Volumes (PV) y permite crear Logical Volumes (LV) redimensionables sin reiniciar.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Cifrado de Disco (LUKS2 / BitLocker) */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white text-xs">
                  {osType === 'linux' ? 'Cifrado dm-crypt / LUKS2' : 'Cifrado BitLocker'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useWholeDiskEncryption}
                  onChange={(e) => onChangeEncryption(e.target.checked, diskEncryptionPassphrase)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {useWholeDiskEncryption && (
              <div className="space-y-1.5 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">Contraseña de cifrado:</span>
                  <input
                    type="password"
                    value={diskEncryptionPassphrase}
                    onChange={(e) => onChangeEncryption(true, e.target.value)}
                    placeholder="Contraseña robusta de disco"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Algoritmo: AES-XTS-PLAIN64 256/512 bit con derivación Argon2id (PBKDF2 si /boot queda dentro del cifrado, porque GRUB no soporta Argon2id). Se solicitará en cada arranque del sistema.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tabla detallada de particiones */}
        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Dispositivo / Volumen</th>
                <th className="py-2.5 px-3 font-semibold">Punto de Montaje</th>
                <th className="py-2.5 px-3 font-semibold">Sistema de Archivos</th>
                <th className="py-2.5 px-3 font-semibold">Tamaño</th>
                <th className="py-2.5 px-3 font-semibold">Seguridad / Banderas</th>
                <th className="py-2.5 px-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {disk.partitions.map(part => (
                <tr key={part.id} className="hover:bg-slate-950/50 transition-colors">
                  <td className="py-2.5 px-3 text-white font-medium">
                    <div className="flex items-center gap-1.5">
                      {part.isEncrypted && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                      {part.isLvmLV && <Database className="w-3.5 h-3.5 text-sky-400" />}
                      <span>{part.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    {part.mountPoint ? (
                      <span className="font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/50">
                        {part.mountPoint}
                      </span>
                    ) : (
                      <span className="text-slate-500">Sin montaje</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="uppercase text-slate-200">
                      {part.fsType}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {part.sizeMB >= 1024 ? `${(part.sizeMB / 1024).toFixed(1)} GB` : `${part.sizeMB} MB`}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1 flex-wrap text-[10px]">
                      {part.flags?.map(f => (
                        <span key={f} className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 uppercase">
                          {f}
                        </span>
                      ))}
                      {part.isEncrypted && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50">
                          LUKS
                        </span>
                      )}
                      {part.isLvmLV && (
                        <span className="px-1.5 py-0.2 rounded bg-sky-950/60 text-sky-300 border border-sky-800/50">
                          LV
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditPartition(part)}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                        title="Editar partición"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePartition(part.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded"
                        title="Eliminar partición"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {disk.partitions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                    El disco no contiene particiones. Haz clic en "Añadir Partición" o selecciona uno de los esquemas recomendados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alertas didácticas y repercusiones activas */}
      {validationIssues.length > 0 && (
        <div className="space-y-2">
          {validationIssues.map(issue => (
            <div
              key={issue.id}
              className={`p-3 rounded-lg border text-xs flex items-start gap-3 ${
                issue.type === 'error'
                  ? 'bg-rose-950/30 border-rose-800 text-rose-200'
                  : issue.type === 'warning'
                  ? 'bg-amber-950/30 border-amber-800 text-amber-200'
                  : 'bg-sky-950/30 border-sky-800 text-sky-200'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                issue.type === 'error' ? 'text-rose-400' : issue.type === 'warning' ? 'text-amber-400' : 'text-sky-400'
              }`} />
              <div className="space-y-1">
                <span className="font-bold block">{issue.title}: {issue.message}</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <span className="text-amber-300 font-semibold">Repercusión:</span> {issue.technicalImpact}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

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
          disabled={criticalErrors.length > 0}
          onClick={onNext}
          className={`px-5 py-2.5 font-bold text-xs rounded-lg transition-all flex items-center gap-2 shadow-sm ${
            criticalErrors.length > 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
          }`}
        >
          <span>Continuar a Cuentas &amp; Red</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Modal de edición / creación */}
      <PartitionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePartition}
        editingPartition={editingPartition}
        availableFreeMB={freeMB}
        osType={osType}
        useLvm={useLvm}
        lvmGroupName={lvmGroupName}
      />
    </div>
  );
};
