import { PARTITION_PRESETS } from '../data/presets';
import { HardwareConfig, InstallerState } from '../types/installer';
import { DEFAULT_DISTRO } from '../data/distros';

export const HARDWARE: HardwareConfig = {
  cpuCores: 4,
  ramMB: 8192,
  firmware: 'uefi',
  secureBoot: true,
  bootMedium: 'usb',
  targetDiskSizeMB: 524288
};

/** Estado mínimo del instalador construido a partir de un preset de particionado. */
export function stateFromPreset(presetId: string, overrides: Partial<InstallerState> = {}): InstallerState {
  const preset = PARTITION_PRESETS.find(p => p.id === presetId);
  if (!preset) throw new Error(`Preset desconocido: ${presetId}`);
  return {
    osType: preset.osType,
    distroId: DEFAULT_DISTRO,
    currentStep: 'summary',
    hardware: HARDWARE,
    regional: { language: 'es_ES', locale: 'es_ES.UTF-8', keyboardLayout: 'es', timezone: 'Europe/Madrid', utcHardwareClock: true },
    selectedProfileId: 'server',
    disk: preset.generateDisk(HARDWARE.targetDiskSizeMB),
    useLvm: preset.useLvm,
    lvmGroupName: preset.lvmGroupName || 'vg_system',
    useWholeDiskEncryption: preset.useWholeDiskEncryption,
    diskEncryptionPassphrase: '',
    userConfig: {
      hostname: 'srv01', rootPassword: '', createAdminUser: false, adminUsername: '', adminPassword: '',
      adminHasSudo: false, enableSSH: false, ipMode: 'dhcp'
    },
    installationProgress: 0,
    installLogs: [],
    isInstalled: false,
    bootDecrypted: false,
    ...overrides
  };
}
