export type OSType = 'linux' | 'windows';

/** Distribución concreta cuando osType es 'linux' (catálogo en src/data/distros.ts). */
export type LinuxDistroId = 'debian' | 'ubuntu' | 'fedora' | 'rocky' | 'arch' | 'alpine';

export type FirmwareType = 'uefi' | 'bios';
export type BootMediumType = 'usb' | 'iso' | 'pxe';

export type FilesystemType = 
  | 'ext4' 
  | 'xfs' 
  | 'btrfs' 
  | 'vfat' 
  | 'swap' 
  | 'ntfs' 
  | 'refs' 
  | 'raw';

export type PartitionTableType = 'gpt' | 'mbr';

export interface PartitionItem {
  id: string;
  name: string; // e.g. /dev/nvme0n1p1 or Partition 1
  mountPoint?: string; // e.g. /, /boot, /boot/efi, /home, swap, C:
  fsType: FilesystemType;
  sizeMB: number;
  isLvmPV?: boolean;
  lvmVG?: string; // e.g. vg_system
  isLvmLV?: boolean;
  lvmLVName?: string; // e.g. lv_root
  isEncrypted?: boolean;
  encryptionType?: 'luks2' | 'bitlocker';
  passphrase?: string;
  flags?: string[]; // e.g. ['esp', 'boot'], ['bios_grub']
  description?: string;
}

export interface DiskDevice {
  id: string;
  devicePath: string; // e.g. /dev/nvme0n1 or Disk 0
  model: string;
  totalSizeMB: number;
  tableType: PartitionTableType;
  partitions: PartitionItem[];
}

export interface HardwareConfig {
  cpuCores: number;
  ramMB: number;
  firmware: FirmwareType;
  secureBoot: boolean;
  bootMedium: BootMediumType;
  targetDiskSizeMB: number;
  failures?: HardwareFailuresConfig;
}

export interface RegionalConfig {
  language: string;
  locale: string;
  keyboardLayout: string;
  timezone: string;
  utcHardwareClock: boolean;
}

export interface SoftwareProfile {
  id: string;
  name: string;
  description: string;
  recommendedRootMB: number;
  features: string[];
}

export interface UserAccountConfig {
  hostname: string;
  domain?: string;
  rootPassword: string;
  createAdminUser: boolean;
  adminUsername: string;
  adminPassword: string;
  adminHasSudo: boolean;
  enableSSH: boolean;
  ipMode: 'dhcp' | 'static';
  staticIP?: string;
  gateway?: string;
  dns?: string;
}

export type NetworkIPMode = 'dhcp' | 'static' | 'bridge_slave' | 'disabled';

export interface NetworkInterfaceConfig {
  id: string;
  name: string; // e.g. enp1s0, enp2s0, Ethernet0
  type: 'ethernet' | 'bridge' | 'vlan';
  enabled: boolean;
  macAddress: string;
  speedMbps: number;
  duplex: 'full' | 'half';
  ipMode: NetworkIPMode;
  ipv4Address: string; // e.g. 192.168.1.50
  prefixLength: number; // e.g. 24
  gateway: string; // e.g. 192.168.1.1
  primaryDns: string; // e.g. 1.1.1.1
  secondaryDns: string; // e.g. 8.8.8.8
  searchDomain: string; // e.g. corp.internal
  mtu: number; // 1500 or 9000
  vlanId?: number; // 802.1Q tag
}

export interface BridgeInterfaceConfig {
  enabled: boolean;
  name: string; // br0 or vSwitch0
  memberInterfaces: string[]; // ['enp1s0']
  stp: boolean; // Spanning Tree Protocol
  forwardDelaySec: number;
  ipMode: NetworkIPMode;
  ipv4Address: string;
  prefixLength: number;
  gateway: string;
  primaryDns: string;
  secondaryDns: string;
  mtu: number;
}

export interface NetworkConfig {
  hostname: string;
  domain: string;
  primaryInterfaceId: string;
  interfaces: NetworkInterfaceConfig[];
  bridge: BridgeInterfaceConfig;
  remoteInstallCapabilities: {
    allowRemoteSsh: boolean;
    sshPort: number;
    allowCockpitWebConsole: boolean;
    allowHttpPackageMirror: boolean;
    mirrorUrl: string;
    allowVncRemoteViewer: boolean;
    vncPort: number;
  };
}

export type BootloaderType = 'grub2' | 'systemd_boot' | 'windows_bootmgr';

export interface BootloaderConfig {
  type: BootloaderType;
  timeoutSec: number;
  quietSplash: boolean;
  noModeSet: boolean;
  selinuxEnforcing: boolean;
  auditLogging: boolean;
  customParameters: string;
  installTargetESP: string;
}

export type InstallerStepId = 
  | 'boot'
  | 'regional'
  | 'software'
  | 'network'
  | 'partitioning'
  | 'users'
  | 'bootloader'
  | 'summary'
  | 'installing'
  | 'first_boot';

export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  technicalImpact: string;
  remedy?: string;
}

export interface ChallengeScenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado';
  targetOS: OSType;
  requirementsSummary: string[];
  checkSuccess: (state: InstallerState) => { completed: boolean; feedback: string[] };
}

export interface HardwareFailuresConfig {
  badSectors: boolean;
  networkDisconnect: boolean;
  ramBitFlip: boolean;
  thermalThrottling: boolean;
}

export interface InstallerState {
  osType: OSType;
  distroId: LinuxDistroId;
  currentStep: InstallerStepId;
  hardware: HardwareConfig;
  regional: RegionalConfig;
  selectedProfileId: string;
  disk: DiskDevice;
  useLvm: boolean;
  lvmGroupName: string;
  useWholeDiskEncryption: boolean;
  diskEncryptionPassphrase: string;
  userConfig: UserAccountConfig;
  bootloader?: BootloaderConfig;
  network?: NetworkConfig;
  activeChallengeId?: string;
  installationProgress: number;
  installLogs: string[];
  isInstalled: boolean;
  bootDecrypted: boolean;
  loggedUser?: string;
  hardwareFailures?: HardwareFailuresConfig;
}
