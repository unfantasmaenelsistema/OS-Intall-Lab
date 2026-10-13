import React, { useState, useEffect } from 'react';
import { 
  X, 
  HardDrive, 
  ShieldCheck, 
  AlertTriangle, 
  Check, 
  HelpCircle,
  Database
} from 'lucide-react';
import { PartitionItem, FilesystemType, OSType } from '../types/installer';
import { FILESYSTEMS_INFO, MOUNT_POINTS_GUIDANCE } from '../data/learningContent';

interface PartitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (partition: PartitionItem) => void;
  editingPartition?: PartitionItem | null;
  availableFreeMB: number;
  osType: OSType;
  useLvm: boolean;
  lvmGroupName: string;
}

export const PartitionModal: React.FC<PartitionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPartition,
  availableFreeMB,
  osType,
  useLvm,
  lvmGroupName
}) => {
  const [mountPoint, setMountPoint] = useState<string>('/');
  const [fsType, setFsType] = useState<FilesystemType>(osType === 'linux' ? 'ext4' : 'ntfs');
  const [sizeMB, setSizeMB] = useState<number>(20480);
  const [isEncrypted, setIsEncrypted] = useState<boolean>(false);
  const [isEsp, setIsEsp] = useState<boolean>(false);
  const [isLvmLV, setIsLvmLV] = useState<boolean>(false);
  const [lvName, setLvName] = useState<string>('lv_root');

  useEffect(() => {
    if (editingPartition) {
      setMountPoint(editingPartition.mountPoint || '');
      setFsType(editingPartition.fsType);
      setSizeMB(editingPartition.sizeMB);
      setIsEncrypted(!!editingPartition.isEncrypted);
      setIsEsp(!!(editingPartition.flags && editingPartition.flags.includes('esp')));
      setIsLvmLV(!!editingPartition.isLvmLV);
      setLvName(editingPartition.lvmLVName || 'lv_root');
    } else {
      // Valores por defecto al crear nueva
      const defaultSize = Math.min(Math.max(1024, Math.floor(availableFreeMB * 0.5)), 40960);
      setSizeMB(defaultSize || 10240);
      if (osType === 'linux') {
        setMountPoint('/');
        setFsType('ext4');
        setIsLvmLV(useLvm);
        setLvName('lv_root');
      } else {
        setMountPoint('C:');
        setFsType('ntfs');
        setIsLvmLV(false);
      }
      setIsEncrypted(false);
      setIsEsp(false);
    }
  }, [editingPartition, isOpen, availableFreeMB, osType, useLvm]);

  if (!isOpen) return null;

  // Actualizar configuración al cambiar punto de montaje
  const handleSelectMountPreset = (mp: string) => {
    setMountPoint(mp);
    if (mp === '/boot/efi') {
      setFsType('vfat');
      setIsEsp(true);
      setSizeMB(512);
      setIsLvmLV(false);
      setIsEncrypted(false);
    } else if (mp === '/boot') {
      setFsType('xfs');
      setIsEsp(false);
      setSizeMB(1024);
      setIsLvmLV(false);
      setIsEncrypted(false);
    } else if (mp === 'swap') {
      setFsType('swap');
      setIsEsp(false);
      setSizeMB(8192);
      if (useLvm) {
        setIsLvmLV(true);
        setLvName('lv_swap');
      }
    } else if (mp === '/') {
      if (osType === 'linux') {
        setFsType('ext4');
        setSizeMB(Math.min(availableFreeMB, 30720) || 20480);
        if (useLvm) {
          setIsLvmLV(true);
          setLvName('lv_root');
        }
      } else {
        setFsType('ntfs');
        setMountPoint('C:');
      }
    } else if (mp === '/home') {
      setFsType('ext4');
      if (useLvm) {
        setIsLvmLV(true);
        setLvName('lv_home');
      }
    } else if (mp === '/var') {
      setFsType('xfs');
      if (useLvm) {
        setIsLvmLV(true);
        setLvName('lv_var');
      }
    } else if (mp === 'C:') {
      setFsType('ntfs');
      setIsLvmLV(false);
    } else if (mp === 'D:') {
      setFsType('refs');
      setIsLvmLV(false);
    }
  };

  const handleSave = () => {
    const flags: string[] = [];
    if (isEsp || mountPoint === '/boot/efi') {
      flags.push('esp', 'boot');
    }

    const partition: PartitionItem = {
      id: editingPartition ? editingPartition.id : `part-${Date.now()}`,
      name: isLvmLV
        ? `/dev/mapper/${lvmGroupName}-${lvName}`
        : editingPartition
        ? editingPartition.name
        : osType === 'linux'
        ? `/dev/nvme0n1p${Math.floor(Math.random() * 8) + 1}`
        : `Disco 0 Partición`,
      mountPoint: mountPoint.trim() ? mountPoint.trim() : undefined,
      fsType,
      sizeMB: Number(sizeMB),
      isLvmLV: useLvm && isLvmLV,
      lvmLVName: useLvm && isLvmLV ? lvName : undefined,
      lvmVG: useLvm && isLvmLV ? lvmGroupName : undefined,
      isEncrypted,
      encryptionType: isEncrypted ? (osType === 'linux' ? 'luks2' : 'bitlocker') : undefined,
      flags,
      description: `${mountPoint || 'Sin punto de montaje'} (${fsType.toUpperCase()})`
    };

    onSave(partition);
    onClose();
  };

  const currentFsInfo = FILESYSTEMS_INFO[fsType];
  const mountGuidance = MOUNT_POINTS_GUIDANCE[mountPoint];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-200">
        {/* Encabezado */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">
              {editingPartition ? 'Editar Partición / Volumen Lógico' : 'Crear Nueva Partición'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Selector de Puntos de Montaje habituales */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 block">
              Punto de montaje (Mount Point):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(osType === 'linux'
                ? ['/', '/boot/efi', '/boot', '/home', '/var', '/tmp', 'swap']
                : ['C:', 'D:', '/boot/efi', 'E:']
              ).map(mp => (
                <button
                  key={mp}
                  type="button"
                  onClick={() => handleSelectMountPreset(mp)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    mountPoint === mp
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {mp}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={mountPoint}
              onChange={(e) => setMountPoint(e.target.value)}
              placeholder="p. ej. /srv o /data"
              className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Información didáctica del punto de montaje */}
          {mountGuidance && (
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] space-y-1">
              <span className="font-semibold text-sky-300 block">Foco formativo para {mountGuidance.mountPoint}:</span>
              <p className="text-slate-300">{mountGuidance.description}</p>
              <div className="text-slate-400 pt-0.5">
                <span className="text-amber-400">¿Por qué separarlo?:</span> {mountGuidance.whySeparate}
              </div>
            </div>
          )}

          {/* Selector de Sistema de Archivos */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 block">
              Sistema de Archivos (Filesystem):
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(osType === 'linux'
                ? (['ext4', 'xfs', 'btrfs', 'vfat', 'swap', 'raw'] as FilesystemType[])
                : (['ntfs', 'refs', 'vfat', 'raw'] as FilesystemType[])
              ).map(fs => (
                <button
                  key={fs}
                  type="button"
                  onClick={() => setFsType(fs)}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    fsType === fs
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-mono text-xs">{fs.toUpperCase()}</div>
                  <div className="text-[9px] text-slate-400">{FILESYSTEMS_INFO[fs]?.badge || fs}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Alerta de repercusión del sistema de archivos elegido */}
          {currentFsInfo && (
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Repercusión técnica de {currentFsInfo.name.toUpperCase()}:</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {currentFsInfo.educationalRepercussion}
              </p>
              <div className="pt-1 flex gap-4 text-slate-400 text-[10px]">
                <span>¿Reducible?: <strong className={currentFsInfo.technicalSpecs.shrinkable ? 'text-emerald-400' : 'text-rose-400'}>{currentFsInfo.technicalSpecs.shrinkable ? 'Sí' : 'No'}</strong></span>
                <span>¿Snapshots?: <strong className={currentFsInfo.technicalSpecs.snapshotSupport ? 'text-emerald-400' : 'text-slate-400'}>{currentFsInfo.technicalSpecs.snapshotSupport ? 'Sí' : 'No'}</strong></span>
                <span>Journaling: <strong className="text-white">{currentFsInfo.technicalSpecs.journaling}</strong></span>
              </div>
            </div>
          )}

          {/* Tamaño de la partición */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300">Tamaño de partición:</label>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {sizeMB >= 1024 ? `${(sizeMB / 1024).toFixed(1)} GB` : `${sizeMB} MB`} ({sizeMB} MiB)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min={16}
                max={524288}
                step={512}
                value={sizeMB}
                onChange={(e) => setSizeMB(Number(e.target.value))}
                className="w-32 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-400"
              />
              <span className="text-slate-400 text-xs">MiB</span>

              {/* Atajos de tamaño */}
              <div className="flex items-center gap-1">
                {[512, 1024, 8192, 20480, 51200].map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSizeMB(sz)}
                    className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300 hover:text-white"
                  >
                    {sz >= 1024 ? `${sz / 1024}G` : `${sz}M`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Opciones LVM (si está activo en Linux) */}
          {useLvm && osType === 'linux' && mountPoint !== '/boot/efi' && mountPoint !== '/boot' && (
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-400" />
                  <span className="font-semibold text-white">Asignar como Volumen Lógico (LV) LVM</span>
                </div>
                <input
                  type="checkbox"
                  checked={isLvmLV}
                  onChange={(e) => setIsLvmLV(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                />
              </div>

              {isLvmLV && (
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] text-slate-400 block">Nombre del volumen lógico (LV Name):</label>
                  <input
                    type="text"
                    value={lvName}
                    onChange={(e) => setLvName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-sky-400"
                  />
                  <div className="text-[10px] text-slate-400 font-mono">
                    Ruta final en Linux: /dev/mapper/{lvmGroupName}-{lvName}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Opciones de Cifrado */}
          {mountPoint !== '/boot/efi' && (
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="font-semibold text-white">Cifrado de partición</span>
                  <span className="block text-[10px] text-slate-400">
                    {osType === 'linux' ? 'dm-crypt / LUKS2' : 'BitLocker Drive Encryption'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isEncrypted}
                onChange={(e) => setIsEncrypted(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
              />
            </div>
          )}
        </div>

        {/* Pie con acciones */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-xs rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-sm"
          >
            {editingPartition ? 'Guardar Cambios' : 'Crear Partición'}
          </button>
        </div>
      </div>
    </div>
  );
};
