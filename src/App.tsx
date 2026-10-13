import React, { useState, useMemo, lazy, Suspense } from 'react';
import { 
  OSType, 
  LinuxDistroId,
  InstallerStepId, 
  InstallerState, 
  DiskDevice, 
  HardwareConfig, 
  RegionalConfig, 
  UserAccountConfig,
  BootloaderConfig,
  NetworkConfig
} from './types/installer';
import { Header } from './components/Header';
import { EducationalDrawer } from './components/EducationalDrawer';
import { HardwareBootStep } from './components/HardwareBootStep';
import { LocalizationStep } from './components/LocalizationStep';
import { SoftwareStep } from './components/SoftwareStep';
import { Footer } from './components/Footer';
import { validatePartitionScheme } from './utils/partitionValidator';
import { PARTITION_PRESETS } from './data/presets';
import { DEFAULT_DISTRO, distroLabel, getDistro } from './data/distros';
import { validateDistroChoices } from './utils/distroValidator';

// Los pasos posteriores (y Recharts, usado en el particionado) se cargan bajo demanda
// para no servir todo el simulador en un único chunk de ~1 MB.
const NetworkStep = lazy(() => import('./components/NetworkStep').then(m => ({ default: m.NetworkStep })));
const PartitioningStep = lazy(() => import('./components/PartitioningStep').then(m => ({ default: m.PartitioningStep })));
const UserConfigStep = lazy(() => import('./components/UserConfigStep').then(m => ({ default: m.UserConfigStep })));
const BootloaderStep = lazy(() => import('./components/BootloaderStep').then(m => ({ default: m.BootloaderStep })));
const SummaryStep = lazy(() => import('./components/SummaryStep').then(m => ({ default: m.SummaryStep })));
const InstallingStep = lazy(() => import('./components/InstallingStep').then(m => ({ default: m.InstallingStep })));
const FirstBootStep = lazy(() => import('./components/FirstBootStep').then(m => ({ default: m.FirstBootStep })));

const INITIAL_HARDWARE: HardwareConfig = {
  cpuCores: 4,
  ramMB: 8192,
  firmware: 'uefi',
  secureBoot: true,
  bootMedium: 'usb',
  targetDiskSizeMB: 524288, // 512 GB
};

const INITIAL_REGIONAL: RegionalConfig = {
  language: 'es_ES',
  locale: 'es_ES.UTF-8',
  keyboardLayout: 'es',
  timezone: 'Europe/Madrid',
  utcHardwareClock: true,
};

const INITIAL_USER_CONFIG: UserAccountConfig = {
  hostname: 'srv-enterprise01',
  domain: 'corp.internal',
  rootPassword: 'RootPassword2026!',
  createAdminUser: true,
  adminUsername: 'sysadmin',
  adminPassword: 'SysAdminPassword2026!',
  adminHasSudo: true,
  enableSSH: true,
  ipMode: 'dhcp',
};

const INITIAL_BOOTLOADER: BootloaderConfig = {
  type: 'grub2',
  timeoutSec: 5,
  quietSplash: true,
  noModeSet: false,
  selinuxEnforcing: true,
  auditLogging: true,
  customParameters: '',
  installTargetESP: '/boot/efi',
};

const INITIAL_NETWORK_LINUX: NetworkConfig = {
  hostname: 'srv-enterprise01',
  domain: 'corp.internal',
  primaryInterfaceId: 'iface-1',
  interfaces: [
    {
      id: 'iface-1',
      name: 'enp1s0',
      type: 'ethernet',
      enabled: true,
      macAddress: '52:54:00:a1:b2:c3',
      speedMbps: 10000,
      duplex: 'full',
      ipMode: 'static',
      ipv4Address: '192.168.1.150',
      prefixLength: 24,
      gateway: '192.168.1.1',
      primaryDns: '1.1.1.1',
      secondaryDns: '8.8.8.8',
      searchDomain: 'corp.internal',
      mtu: 1500,
    },
    {
      id: 'iface-2',
      name: 'enp2s0',
      type: 'ethernet',
      enabled: true,
      macAddress: '52:54:00:d4:e5:f6',
      speedMbps: 10000,
      duplex: 'full',
      ipMode: 'disabled',
      ipv4Address: '',
      prefixLength: 24,
      gateway: '',
      primaryDns: '',
      secondaryDns: '',
      searchDomain: 'corp.internal',
      mtu: 1500,
    }
  ],
  bridge: {
    enabled: false,
    name: 'br0',
    memberInterfaces: ['enp1s0'],
    stp: true,
    forwardDelaySec: 15,
    ipMode: 'static',
    ipv4Address: '192.168.1.160',
    prefixLength: 24,
    gateway: '192.168.1.1',
    primaryDns: '1.1.1.1',
    secondaryDns: '8.8.8.8',
    mtu: 1500,
  },
  remoteInstallCapabilities: {
    allowRemoteSsh: true,
    sshPort: 22,
    allowCockpitWebConsole: true,
    allowHttpPackageMirror: true,
    mirrorUrl: getDistro(DEFAULT_DISTRO).mirrorUrl,
    allowVncRemoteViewer: false,
    vncPort: 5901,
  }
};

const INITIAL_NETWORK_WINDOWS: NetworkConfig = {
  hostname: 'WIN-SRV-2025',
  domain: 'corp.internal',
  primaryInterfaceId: 'iface-win-1',
  interfaces: [
    {
      id: 'iface-win-1',
      name: 'Ethernet0',
      type: 'ethernet',
      enabled: true,
      macAddress: '00:15:5d:01:aa:01',
      speedMbps: 10000,
      duplex: 'full',
      ipMode: 'static',
      ipv4Address: '192.168.1.200',
      prefixLength: 24,
      gateway: '192.168.1.1',
      primaryDns: '1.1.1.1',
      secondaryDns: '8.8.8.8',
      searchDomain: 'corp.internal',
      mtu: 1500,
    },
    {
      id: 'iface-win-2',
      name: 'Ethernet1',
      type: 'ethernet',
      enabled: true,
      macAddress: '00:15:5d:01:aa:02',
      speedMbps: 10000,
      duplex: 'full',
      ipMode: 'disabled',
      ipv4Address: '',
      prefixLength: 24,
      gateway: '',
      primaryDns: '',
      secondaryDns: '',
      searchDomain: 'corp.internal',
      mtu: 1500,
    }
  ],
  bridge: {
    enabled: false,
    name: 'vSwitch-External',
    memberInterfaces: ['Ethernet0'],
    stp: false,
    forwardDelaySec: 0,
    ipMode: 'static',
    ipv4Address: '192.168.1.210',
    prefixLength: 24,
    gateway: '192.168.1.1',
    primaryDns: '1.1.1.1',
    secondaryDns: '8.8.8.8',
    mtu: 1500,
  },
  remoteInstallCapabilities: {
    allowRemoteSsh: true,
    sshPort: 5985,
    allowCockpitWebConsole: true,
    allowHttpPackageMirror: true,
    mirrorUrl: 'https://packages.microsoft.com',
    allowVncRemoteViewer: true,
    vncPort: 3389,
  }
};

export default function App() {
  const [osType, setOsType] = useState<OSType>('linux');
  const [distroId, setDistroId] = useState<LinuxDistroId>(DEFAULT_DISTRO);
  const [currentStep, setCurrentStep] = useState<InstallerStepId>('boot');
  const [hardware, setHardware] = useState<HardwareConfig>(INITIAL_HARDWARE);
  const [regional, setRegional] = useState<RegionalConfig>(INITIAL_REGIONAL);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('server_gui');
  const [network, setNetwork] = useState<NetworkConfig>(INITIAL_NETWORK_LINUX);
  const [useLvm, setUseLvm] = useState<boolean>(true);
  const [lvmGroupName, setLvmGroupName] = useState<string>('vg_system');
  const [useWholeDiskEncryption, setUseWholeDiskEncryption] = useState<boolean>(true);
  const [diskEncryptionPassphrase, setDiskEncryptionPassphrase] = useState<string>('AdminSecurityPass2026!');
  const [userConfig, setUserConfig] = useState<UserAccountConfig>(INITIAL_USER_CONFIG);
  const [bootloader, setBootloader] = useState<BootloaderConfig>(INITIAL_BOOTLOADER);
  const [activeChallengeId, setActiveChallengeId] = useState<string | undefined>('enterprise_luks_lvm');
  const [isEducationalDrawerOpen, setIsEducationalDrawerOpen] = useState<boolean>(false);

  // Inicializar disco con el preset correspondiente
  const [disk, setDisk] = useState<DiskDevice>(() => {
    const defaultPreset = PARTITION_PRESETS.find(p => p.id === 'linux_enterprise_luks_lvm') || PARTITION_PRESETS[0];
    return defaultPreset.generateDisk(INITIAL_HARDWARE.targetDiskSizeMB);
  });

  // Cuando cambia el tipo de SO (Linux vs Windows)
  const handleSelectOS = (newOs: OSType) => {
    if (newOs === osType) return;
    setOsType(newOs);

    if (newOs === 'windows') {
      const winPreset = PARTITION_PRESETS.find(p => p.osType === 'windows');
      if (winPreset) {
        setDisk(winPreset.generateDisk(hardware.targetDiskSizeMB));
        setUseLvm(false);
        setUseWholeDiskEncryption(false);
        setSelectedProfileId('win_datacenter_desktop');
        setNetwork(INITIAL_NETWORK_WINDOWS);
        setUserConfig(prev => ({ ...prev, hostname: 'WIN-SRV-2025' }));
        setBootloader(prev => ({ ...prev, type: 'windows_bootmgr' }));
      }
    } else {
      const linuxPreset = PARTITION_PRESETS.find(p => p.id === 'linux_enterprise_luks_lvm');
      if (linuxPreset) {
        setDisk(linuxPreset.generateDisk(hardware.targetDiskSizeMB));
        setUseLvm(linuxPreset.useLvm);
        setUseWholeDiskEncryption(linuxPreset.useWholeDiskEncryption);
        setSelectedProfileId('server_gui');
        setNetwork(INITIAL_NETWORK_LINUX);
        setUserConfig(prev => ({ ...prev, hostname: 'srv-enterprise01' }));
        setBootloader(prev => ({ ...prev, type: 'grub2' }));
      }
    }
    setCurrentStep('boot');
  };

  // Cambio de distribución: el espejo de paquetes del paso de red pasa a ser el de la nueva distro
  const handleSelectDistro = (id: LinuxDistroId) => {
    setDistroId(id);
    setNetwork(prev => ({
      ...prev,
      remoteInstallCapabilities: { ...prev.remoteInstallCapabilities, mirrorUrl: getDistro(id).mirrorUrl }
    }));
  };

  // Construir el estado completo para el motor de retos
  const fullState: InstallerState = useMemo(() => ({
    osType,
    distroId,
    currentStep,
    hardware,
    regional,
    selectedProfileId,
    disk,
    useLvm,
    lvmGroupName,
    useWholeDiskEncryption,
    diskEncryptionPassphrase,
    userConfig,
    bootloader,
    network,
    activeChallengeId,
    installationProgress: 0,
    installLogs: [],
    isInstalled: currentStep === 'first_boot',
    bootDecrypted: !useWholeDiskEncryption,
  }), [
    osType,
    distroId,
    currentStep,
    hardware,
    regional,
    selectedProfileId,
    disk,
    useLvm,
    lvmGroupName,
    useWholeDiskEncryption,
    diskEncryptionPassphrase,
    userConfig,
    bootloader,
    network,
    activeChallengeId,
  ]);

  // Validación didáctica y técnica en tiempo real (esquema de disco + reglas propias de la distribución)
  const validationIssues = useMemo(() => [
    ...validatePartitionScheme(disk, hardware, osType, useLvm, useWholeDiskEncryption),
    ...validateDistroChoices(fullState)
  ], [disk, hardware, osType, useLvm, useWholeDiskEncryption, fullState]);

  const issueCount = useMemo(() => {
    return {
      errors: validationIssues.filter(i => i.type === 'error').length,
      warnings: validationIssues.filter(i => i.type === 'warning').length,
    };
  }, [validationIssues]);

  const handleResetSimulation = () => {
    const defaultPreset = PARTITION_PRESETS.find(p => p.osType === osType) || PARTITION_PRESETS[0];
    setDisk(defaultPreset.generateDisk(hardware.targetDiskSizeMB));
    setUseLvm(defaultPreset.useLvm);
    setUseWholeDiskEncryption(defaultPreset.useWholeDiskEncryption);
    setBootloader(INITIAL_BOOTLOADER);
    setNetwork(osType === 'windows' ? INITIAL_NETWORK_WINDOWS : INITIAL_NETWORK_LINUX);
    setCurrentStep('boot');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Barra de Navegación y Cabecera Superior */}
      <Header
        osType={osType}
        distroName={distroLabel(getDistro(distroId))}
        onSelectOS={handleSelectOS}
        currentStep={currentStep}
        onNavigateStep={setCurrentStep}
        onReset={handleResetSimulation}
        isEducationalDrawerOpen={isEducationalDrawerOpen}
        onToggleEducationalDrawer={() => setIsEducationalDrawerOpen(prev => !prev)}
        issueCount={issueCount}
      />

      {/* Área de Trabajo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Suspense fallback={<div className="py-16 text-center text-sm text-slate-400 font-mono">Cargando paso…</div>}>
        {currentStep === 'boot' && (
          <HardwareBootStep
            osType={osType}
            config={hardware}
            onChange={(updated) => setHardware(prev => ({ ...prev, ...updated }))}
            onNext={() => setCurrentStep('regional')}
          />
        )}

        {currentStep === 'regional' && (
          <LocalizationStep
            osType={osType}
            config={regional}
            onChange={(updated) => setRegional(prev => ({ ...prev, ...updated }))}
            onNext={() => setCurrentStep('software')}
            onBack={() => setCurrentStep('boot')}
          />
        )}

        {currentStep === 'software' && (
          <SoftwareStep
            osType={osType}
            distroId={distroId}
            onSelectDistro={handleSelectDistro}
            selectedProfileId={selectedProfileId}
            onSelectProfile={setSelectedProfileId}
            onNext={() => setCurrentStep('network')}
            onBack={() => setCurrentStep('regional')}
          />
        )}

        {currentStep === 'network' && (
          <NetworkStep
            osType={osType}
            distroId={distroId}
            config={network}
            onChange={(updated) => setNetwork(prev => ({ ...prev, ...updated }))}
            onNext={() => setCurrentStep('partitioning')}
            onBack={() => setCurrentStep('software')}
          />
        )}

        {currentStep === 'partitioning' && (
          <PartitioningStep
            osType={osType}
            disk={disk}
            hardware={hardware}
            useLvm={useLvm}
            lvmGroupName={lvmGroupName}
            useWholeDiskEncryption={useWholeDiskEncryption}
            diskEncryptionPassphrase={diskEncryptionPassphrase}
            validationIssues={validationIssues}
            onChangeDisk={setDisk}
            onChangeLvm={(lvm, name) => {
              setUseLvm(lvm);
              setLvmGroupName(name);
            }}
            onChangeEncryption={(enc, pass) => {
              setUseWholeDiskEncryption(enc);
              setDiskEncryptionPassphrase(pass);
            }}
            onNext={() => setCurrentStep('users')}
            onBack={() => setCurrentStep('network')}
            onOpenEducationalDrawer={() => setIsEducationalDrawerOpen(true)}
          />
        )}

        {currentStep === 'users' && (
          <UserConfigStep
            osType={osType}
            config={userConfig}
            onChange={(updated) => setUserConfig(prev => ({ ...prev, ...updated }))}
            onNext={() => setCurrentStep('bootloader')}
            onBack={() => setCurrentStep('partitioning')}
          />
        )}

        {currentStep === 'bootloader' && (
          <BootloaderStep
            osType={osType}
            state={fullState}
            config={bootloader}
            hardware={hardware}
            disk={disk}
            onChange={(updated) => setBootloader(prev => ({ ...prev, ...updated }))}
            onNext={() => setCurrentStep('summary')}
            onBack={() => setCurrentStep('users')}
          />
        )}

        {currentStep === 'summary' && (
          <SummaryStep
            state={fullState}
            onProceedInstall={() => setCurrentStep('installing')}
            onBack={() => setCurrentStep('bootloader')}
          />
        )}

        {currentStep === 'installing' && (
          <InstallingStep
            state={fullState}
            onFinishInstall={() => setCurrentStep('first_boot')}
          />
        )}

        {currentStep === 'first_boot' && (
          <FirstBootStep
            state={fullState}
            onRestartSimulation={handleResetSimulation}
          />
        )}
        </Suspense>
      </main>

      {/* Pie de Página Oficial con Logo y Enlace a www.unfantasmaenelsistema.com */}
      <Footer />

      {/* Drawer Lateral del Foco Formativo (Mentor Técnico) */}
      <EducationalDrawer
        isOpen={isEducationalDrawerOpen}
        onClose={() => setIsEducationalDrawerOpen(false)}
        validationIssues={validationIssues}
        osType={osType}
        state={fullState}
        activeChallengeId={activeChallengeId}
        onSelectChallenge={setActiveChallengeId}
      />
    </div>
  );
}
