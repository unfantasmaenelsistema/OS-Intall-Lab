import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Network, 
  Globe, 
  Server, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  ArrowLeft, 
  Copy, 
  Check, 
  Terminal, 
  Sliders, 
  HelpCircle, 
  Activity, 
  Layers, 
  Play, 
  RotateCcw, 
  Share2, 
  Radio, 
  ExternalLink,
  Zap,
  Info
} from 'lucide-react';
import { 
  NetworkConfig, 
  NetworkInterfaceConfig, 
  BridgeInterfaceConfig, 
  NetworkIPMode, 
  OSType 
} from '../types/installer';

interface NetworkStepProps {
  osType: OSType;
  config: NetworkConfig;
  onChange: (updated: Partial<NetworkConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const NetworkStep: React.FC<NetworkStepProps> = ({
  osType,
  config,
  onChange,
  onNext,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'interfaces' | 'bridge' | 'remote' | 'configfiles'>('interfaces');
  const [selectedInterfaceId, setSelectedInterfaceId] = useState<string>(config.primaryInterfaceId || config.interfaces[0]?.id || 'iface-1');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [activeConfigFileTab, setActiveConfigFileTab] = useState<'netplan' | 'networkd' | 'nm' | 'powershell'>(
    osType === 'linux' ? 'netplan' : 'powershell'
  );

  // Estado para la prueba interactiva de conectividad y ruta
  const [isTestingLink, setIsTestingLink] = useState(false);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [testCompleted, setTestCompleted] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const testIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detiene la prueba en curso si el componente se desmonta (p. ej. al cambiar de paso)
  useEffect(() => () => {
    if (testIntervalRef.current) clearInterval(testIntervalRef.current);
  }, []);

  const currentIface = config.interfaces.find(i => i.id === selectedInterfaceId) || config.interfaces[0];

  // Actualizar una interfaz específica
  const handleUpdateInterface = (id: string, updates: Partial<NetworkInterfaceConfig>) => {
    const updatedList = config.interfaces.map(iface => {
      if (iface.id === id) {
        return { ...iface, ...updates };
      }
      return iface;
    });
    onChange({ interfaces: updatedList });
  };

  // Actualizar configuración del puente
  const handleUpdateBridge = (updates: Partial<BridgeInterfaceConfig>) => {
    onChange({ bridge: { ...config.bridge, ...updates } });
  };

  // Presets Rápidos
  const applyPreset = (preset: 'static_enterprise' | 'virtualization_bridge' | 'dhcp_lab' | 'storage_san') => {
    if (preset === 'static_enterprise') {
      onChange({
        primaryInterfaceId: config.interfaces[0]?.id || 'iface-1',
        interfaces: config.interfaces.map((iface, idx) => {
          if (idx === 0) {
            return {
              ...iface,
              enabled: true,
              ipMode: 'static',
              ipv4Address: '192.168.1.150',
              prefixLength: 24,
              gateway: '192.168.1.1',
              primaryDns: '1.1.1.1',
              secondaryDns: '8.8.8.8',
              searchDomain: 'corp.internal',
              mtu: 1500,
            };
          }
          return {
            ...iface,
            enabled: true,
            ipMode: 'disabled',
            ipv4Address: '',
            gateway: '',
            primaryDns: '',
            secondaryDns: '',
            searchDomain: '',
          };
        }),
        bridge: {
          ...config.bridge,
          enabled: false,
        },
        remoteInstallCapabilities: {
          ...config.remoteInstallCapabilities,
          allowRemoteSsh: true,
          allowCockpitWebConsole: true,
          allowHttpPackageMirror: true,
        }
      });
    } else if (preset === 'virtualization_bridge') {
      const primaryName = config.interfaces[0]?.name || (osType === 'linux' ? 'enp1s0' : 'Ethernet0');
      onChange({
        interfaces: config.interfaces.map((iface, idx) => {
          if (idx === 0) {
            return {
              ...iface,
              enabled: true,
              ipMode: 'bridge_slave',
              ipv4Address: '',
              gateway: '',
              primaryDns: '',
              secondaryDns: '',
              searchDomain: '',
              mtu: 1500,
            };
          }
          return iface;
        }),
        bridge: {
          ...config.bridge,
          enabled: true,
          name: osType === 'linux' ? 'br0' : 'vSwitch-External',
          memberInterfaces: [primaryName],
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
          ...config.remoteInstallCapabilities,
          allowRemoteSsh: true,
          allowCockpitWebConsole: true,
          allowHttpPackageMirror: true,
        }
      });
    } else if (preset === 'dhcp_lab') {
      onChange({
        interfaces: config.interfaces.map((iface, idx) => {
          if (idx === 0) {
            return {
              ...iface,
              enabled: true,
              ipMode: 'dhcp',
              ipv4Address: '192.168.1.184',
              prefixLength: 24,
              gateway: '192.168.1.1',
              primaryDns: '192.168.1.1',
              secondaryDns: '8.8.8.8',
              searchDomain: 'lab.local',
              mtu: 1500,
            };
          }
          return iface;
        }),
        bridge: {
          ...config.bridge,
          enabled: false,
        }
      });
    } else if (preset === 'storage_san') {
      onChange({
        interfaces: config.interfaces.map((iface, idx) => {
          if (idx === 0) {
            return {
              ...iface,
              enabled: true,
              ipMode: 'static',
              ipv4Address: '10.10.20.50',
              prefixLength: 24,
              gateway: '', // red de almacenamiento aislada sin router
              primaryDns: '',
              secondaryDns: '',
              searchDomain: 'san.storage',
              mtu: 9000, // Jumbo frames para alto throughput
            };
          }
          return iface;
        }),
        bridge: {
          ...config.bridge,
          enabled: false,
        }
      });
    }
  };

  // Análisis de Capacidades de Instalación Remota en Tiempo Real
  const activeEffectiveConfig = useMemo(() => {
    if (config.bridge.enabled) {
      return {
        hasIp: config.bridge.ipMode === 'dhcp' || (config.bridge.ipMode === 'static' && !!config.bridge.ipv4Address),
        ip: config.bridge.ipMode === 'dhcp' ? '192.168.1.184' : config.bridge.ipv4Address,
        prefix: config.bridge.prefixLength,
        gateway: config.bridge.gateway,
        hasGateway: !!config.bridge.gateway,
        hasDns: !!config.bridge.primaryDns,
        isBridge: true,
        mtu: config.bridge.mtu,
      };
    }
    const pri = config.interfaces.find(i => i.id === config.primaryInterfaceId) || config.interfaces[0];
    return {
      hasIp: pri.enabled && (pri.ipMode === 'dhcp' || (pri.ipMode === 'static' && !!pri.ipv4Address)),
      ip: pri.ipMode === 'dhcp' ? '192.168.1.184' : pri.ipv4Address,
      prefix: pri.prefixLength,
      gateway: pri.gateway,
      hasGateway: !!pri.gateway,
      hasDns: !!pri.primaryDns,
      isBridge: false,
      mtu: pri.mtu,
    };
  }, [config]);

  // Ejecución interactiva del simulador de conectividad de red
  const runNetworkDiagnosticTest = () => {
    if (testIntervalRef.current) clearInterval(testIntervalRef.current);
    setIsTestingLink(true);
    setTestCompleted(false);
    setTestLog([]);
    setTestSuccess(null);

    const devName = config.bridge.enabled ? config.bridge.name : currentIface.name;
    const ip = activeEffectiveConfig.ip || '0.0.0.0';
    const gw = activeEffectiveConfig.gateway || 'None';

    const steps = [
      `[PROBE 1/6] ethtool ${devName}: Comprobando señal física (Carrier: YES, Speed: 10000Mb/s Full Duplex)...`,
      `[PROBE 2/6] ip link set ${devName} up: Interfaz activada con MTU ${activeEffectiveConfig.mtu}.`,
      activeEffectiveConfig.hasGateway 
        ? `[PROBE 3/6] arp -a: Resuelta MAC de la Puerta de Enlace ${gw} -> 52:54:00:1a:2b:3c en ${devName}.`
        : `[PROBE 3/6] ALERTA: No hay Puerta de Enlace (Gateway) configurada. Solo tráfico de capa 2 local.`,
      activeEffectiveConfig.hasGateway
        ? `[PROBE 4/6] ping -c 3 ${gw}: 3 paquetes transmitidos, 0% packet loss, RTT medio = 0.31 ms [OK].`
        : `[PROBE 4/6] ping omitido: Destinos externos inalcanzables fuera de la subred local.`,
      activeEffectiveConfig.hasDns
        ? `[PROBE 5/6] getent ahostsv4 ${config.remoteInstallCapabilities.mirrorUrl.replace('https://', '').split('/')[0]}: Resuelto con éxito a través de ${config.bridge.enabled ? config.bridge.primaryDns : currentIface.primaryDns} [OK].`
        : `[PROBE 5/6] ERROR DNS: Sin resolución de nombres. Los espejos HTTP de instalación remota fallarán por timeout.`,
      config.remoteInstallCapabilities.allowRemoteSsh && activeEffectiveConfig.hasIp
        ? `[PROBE 6/6] sshd: Escuchando en ${ip}:${config.remoteInstallCapabilities.sshPort}. Sesión de administración remota de instalación DISPONIBLE.`
        : `[PROBE 6/6] sshd: Deshabilitado o sin IP asignable.`
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const line = steps[currentStep];
        setTestLog(prev => [...prev, line]);
        currentStep++;
      } else {
        clearInterval(interval);
        testIntervalRef.current = null;
        setIsTestingLink(false);
        setTestCompleted(true);
        const ok = activeEffectiveConfig.hasIp && activeEffectiveConfig.hasGateway && activeEffectiveConfig.hasDns;
        setTestSuccess(ok);
      }
    }, 400);
    testIntervalRef.current = interval;
  };

  // Generador de Ficheros de Configuración
  const configFiles = useMemo(() => {
    const pri = config.interfaces.find(i => i.id === config.primaryInterfaceId) || config.interfaces[0];
    
    // Netplan (Ubuntu / Debian moderno)
    let netplanYaml = `# /etc/netplan/01-netcfg.yaml
# Generado por el Instalador del Sistema Operativo
network:
  version: 2
  renderer: networkd
  ethernets:
`;

    if (config.bridge.enabled) {
      netplanYaml += `    ${pri.name}:
      dhcp4: false
      dhcp6: false
  bridges:
    ${config.bridge.name}:
      interfaces: [${config.bridge.memberInterfaces.join(', ')}]
      parameters:
        stp: ${config.bridge.stp ? 'true' : 'false'}
        forward-delay: ${config.bridge.forwardDelaySec}
`;
      if (config.bridge.ipMode === 'dhcp') {
        netplanYaml += `      dhcp4: true\n`;
      } else if (config.bridge.ipMode === 'static') {
        netplanYaml += `      dhcp4: false
      addresses:
        - ${config.bridge.ipv4Address}/${config.bridge.prefixLength}
      routes:
        - to: default
          via: ${config.bridge.gateway}
      nameservers:
        addresses: [${[config.bridge.primaryDns, config.bridge.secondaryDns].filter(Boolean).join(', ')}]
`;
      }
    } else {
      netplanYaml += `    ${pri.name}:
`;
      if (pri.ipMode === 'dhcp') {
        netplanYaml += `      dhcp4: true\n`;
      } else if (pri.ipMode === 'static') {
        netplanYaml += `      dhcp4: false
      addresses:
        - ${pri.ipv4Address}/${pri.prefixLength}
      routes:
        - to: default
          via: ${pri.gateway}
      nameservers:
        search: [${pri.searchDomain || 'corp.internal'}]
        addresses: [${[pri.primaryDns, pri.secondaryDns].filter(Boolean).join(', ')}]
      mtu: ${pri.mtu}
`;
      } else {
        netplanYaml += `      dhcp4: false\n`;
      }
    }

    // systemd-networkd
    const systemdNetwork = `# /etc/systemd/network/10-${pri.name}.network
[Match]
Name=${pri.name}

[Network]
${pri.ipMode === 'dhcp' ? 'DHCP=ipv4' : ''}
${pri.ipMode === 'static' ? `Address=${pri.ipv4Address}/${pri.prefixLength}\nGateway=${pri.gateway}\nDNS=${pri.primaryDns}\nDNS=${pri.secondaryDns || ''}\nDomains=${pri.searchDomain || ''}` : ''}
${config.bridge.enabled ? `Bridge=${config.bridge.name}` : ''}

[Link]
MTUBytes=${pri.mtu}
`;

    // NetworkManager Keyfile (RHEL / Rocky / Fedora)
    const nmKeyfile = `# /etc/NetworkManager/system-connections/${pri.name}.nmconnection
[connection]
id=${pri.name}
uuid=4a7a721c-81f1-4df2-a9b0-8f9f09e25d21
type=ethernet
interface-name=${pri.name}

[ipv4]
${pri.ipMode === 'dhcp' ? 'method=auto' : ''}
${pri.ipMode === 'static' ? `method=manual\naddress1=${pri.ipv4Address}/${pri.prefixLength},${pri.gateway}\ndns=${pri.primaryDns};${pri.secondaryDns || ''};` : ''}

[ipv6]
method=disabled
`;

    // Windows PowerShell
    const powershellScript = `# Windows PowerShell / WinPE Remote Setup
# Configure-NetworkAdapters.ps1

Write-Host "Configurando adaptador de red..." -ForegroundColor Cyan
${pri.ipMode === 'dhcp' 
  ? `Set-NetIPInterface -InterfaceAlias "${pri.name}" -Dhcp Enabled`
  : `New-NetIPAddress -InterfaceAlias "${pri.name}" -IPAddress "${pri.ipv4Address}" -PrefixLength ${pri.prefixLength} -DefaultGateway "${pri.gateway}"
Set-DnsClientServerAddress -InterfaceAlias "${pri.name}" -ServerAddresses ("${pri.primaryDns}", "${pri.secondaryDns || ''}")`
}

${config.bridge.enabled ? `
# Creación de Hyper-V Virtual Switch (Bridge)
New-VMSwitch -Name "${config.bridge.name}" -NetAdapterName "${pri.name}" -AllowManagementOS $true
` : ''}

# Habilitar WinRM y PowerShell Remoting para administración remota
Enable-PSRemoting -Force -SkipNetworkProfileCheck
`;

    return {
      netplan: netplanYaml,
      networkd: systemdNetwork,
      nm: nmKeyfile,
      powershell: powershellScript
    };
  }, [config]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(id);
    setTimeout(() => setCopiedFile(null), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Encabezado del Paso 4 */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Paso 4 de 10
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Configuración de Interfaces de Red y Acceso Remoto
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Configura interfaces Ethernet físicas, puente (Bridge/vSwitch), direccionamiento IP/Gateway/DNS y evalúa el impacto directo en la instalación desatendida y remota.
          </p>
        </div>

        {/* Presets Rápidos */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs self-start md:self-auto">
          <span className="text-slate-400 px-2 font-medium">Presets:</span>
          <button
            type="button"
            onClick={() => applyPreset('static_enterprise')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-all"
            title="IP Estática corporativa para servidores de producción"
          >
            IP Estática
          </button>
          <button
            type="button"
            onClick={() => applyPreset('virtualization_bridge')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-all"
            title="Puente br0 con interfaz física esclava para KVM/Hyper-V"
          >
            Puente Virtual (br0)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('dhcp_lab')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-all"
            title="DHCP automático para pruebas rápidas de laboratorio"
          >
            DHCP Lab
          </button>
          <button
            type="button"
            onClick={() => applyPreset('storage_san')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-all"
            title="Red aislada de almacenamiento con MTU 9000 (Jumbo Frames)"
          >
            SAN MTU 9000
          </button>
        </div>
      </div>

      {/* Navegación por pestañas de la sección de red */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('interfaces')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'interfaces'
              ? 'border-emerald-400 text-emerald-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Interfaces Físicas ({config.interfaces.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bridge')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'bridge'
              ? 'border-emerald-400 text-emerald-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Puente Virtual ({config.bridge.enabled ? 'Activo' : 'Inactivo'})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('remote')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'remote'
              ? 'border-emerald-400 text-emerald-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-4 h-4 text-amber-400" />
          <span>Repercusión en Instalación Remota & Diagnóstico</span>
          {activeEffectiveConfig.hasIp && activeEffectiveConfig.hasGateway && (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('configfiles')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'configfiles'
              ? 'border-emerald-400 text-emerald-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4 text-sky-400" />
          <span>Ficheros del Sistema (Netplan / NM / PS)</span>
        </button>
      </div>

      {/* PESTAÑA 1: Interfaces Físicas */}
      {activeTab === 'interfaces' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Selector de Interfaz Física */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Adaptadores Detectados
            </h3>
            
            <div className="space-y-2">
              {config.interfaces.map(iface => {
                const isSelected = iface.id === selectedInterfaceId;
                const isPrimary = iface.id === config.primaryInterfaceId;
                const isEnslaved = config.bridge.enabled && config.bridge.memberInterfaces.includes(iface.name);

                return (
                  <button
                    key={iface.id}
                    type="button"
                    onClick={() => setSelectedInterfaceId(iface.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-slate-900 border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${iface.enabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                        <span className="font-mono font-bold text-white text-xs">{iface.name}</span>
                        {isPrimary && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono">
                            Principal
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {iface.speedMbps >= 1000 ? `${iface.speedMbps / 1000} Gbps` : `${iface.speedMbps} Mbps`}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-0.5">
                      <div className="flex justify-between">
                        <span>Modo:</span>
                        <span className="font-mono text-slate-300 uppercase">
                          {isEnslaved ? 'Esclavo (br0)' : iface.ipMode}
                        </span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span>IP:</span>
                        <span className="text-emerald-300">
                          {iface.ipMode === 'static' ? `${iface.ipv4Address}/${iface.prefixLength}` : iface.ipMode === 'dhcp' ? 'DHCP Asignada' : isEnslaved ? 'Capa 2 L2' : 'Desactivada'}
                        </span>
                      </div>
                      <div className="flex justify-between font-mono text-[10px] text-slate-400">
                        <span>MAC:</span>
                        <span>{iface.macAddress}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Asignar como interfaz primaria */}
            {config.primaryInterfaceId !== currentIface.id && (
              <button
                type="button"
                onClick={() => onChange({ primaryInterfaceId: currentIface.id })}
                className="w-full py-2 px-3 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 flex items-center justify-center gap-1.5 transition-all"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Establecer {currentIface.name} como Primaria</span>
              </button>
            )}

            <div className="p-3.5 bg-slate-900/50 border border-slate-800 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-300">
                <Info className="w-3.5 h-3.5 text-sky-400" />
                <span>Enlace Físico (PHY / MAC)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Controlador PCIe Intel X550 10GBASE-T con soporte de hardware para descarga de suma de comprobación (TCP/UDP Checksum Offload), TSO y SR-IOV para virtualización.
              </p>
            </div>
          </div>

          {/* Formulario de Configuración de la Interfaz Seleccionada */}
          <div className="lg:col-span-2 space-y-5 bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base font-mono flex items-center gap-2">
                  <span>{currentIface.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-sans font-normal">
                    {currentIface.macAddress}
                  </span>
                </h3>
                <span className="text-xs text-slate-400">
                  Adaptador Ethernet Gigabit / 10 GbE SFP+
                </span>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={currentIface.enabled}
                    onChange={(e) => handleUpdateInterface(currentIface.id, { enabled: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                  <span>Habilitar Interfaz</span>
                </label>
              </div>
            </div>

            {/* Selector de Modo de Asignación IP */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Método de Asignación IPv4:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateInterface(currentIface.id, { ipMode: 'dhcp' })}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium text-left transition-all ${
                    currentIface.ipMode === 'dhcp'
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold">DHCP</div>
                  <div className="text-[10px] opacity-80">Automático por red</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateInterface(currentIface.id, { ipMode: 'static' })}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium text-left transition-all ${
                    currentIface.ipMode === 'static'
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold">IP Estática</div>
                  <div className="text-[10px] opacity-80">Manual corporativa</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateInterface(currentIface.id, { ipMode: 'bridge_slave' })}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium text-left transition-all ${
                    currentIface.ipMode === 'bridge_slave'
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold">Esclavo Puente</div>
                  <div className="text-[10px] opacity-80">Miembro de br0</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateInterface(currentIface.id, { ipMode: 'disabled' })}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium text-left transition-all ${
                    currentIface.ipMode === 'disabled'
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold">Sin IP</div>
                  <div className="text-[10px] opacity-80">Solo capa de enlace</div>
                </button>
              </div>
            </div>

            {/* Parámetros Estáticos */}
            {currentIface.ipMode === 'static' && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-400 block mb-1">Dirección IPv4:</label>
                    <input
                      type="text"
                      value={currentIface.ipv4Address}
                      onChange={(e) => handleUpdateInterface(currentIface.id, { ipv4Address: e.target.value })}
                      placeholder="192.168.1.150"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Máscara CIDR:</label>
                    <select
                      value={currentIface.prefixLength}
                      onChange={(e) => handleUpdateInterface(currentIface.id, { prefixLength: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value={24}>/24 (255.255.255.0)</option>
                      <option value={16}>/16 (255.255.0.0)</option>
                      <option value={8}>/8 (255.0.0.0)</option>
                      <option value={28}>/28 (255.255.255.240)</option>
                      <option value={29}>/29 (255.255.255.248)</option>
                      <option value={30}>/30 (255.255.255.252)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Puerta de Enlace (Default Gateway):
                    </label>
                    <input
                      type="text"
                      value={currentIface.gateway}
                      onChange={(e) => handleUpdateInterface(currentIface.id, { gateway: e.target.value })}
                      placeholder="192.168.1.1"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Crítico para acceder a repositorios externos en la instalación remota.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Dominio de Búsqueda:</label>
                    <input
                      type="text"
                      value={currentIface.searchDomain}
                      onChange={(e) => handleUpdateInterface(currentIface.id, { searchDomain: e.target.value })}
                      placeholder="corp.internal"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Servidor DNS Primario:</label>
                    <input
                      type="text"
                      value={currentIface.primaryDns}
                      onChange={(e) => handleUpdateInterface(currentIface.id, { primaryDns: e.target.value })}
                      placeholder="1.1.1.1"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Servidor DNS Secundario:</label>
                    <input
                      type="text"
                      value={currentIface.secondaryDns}
                      onChange={(e) => handleUpdateInterface(currentIface.id, { secondaryDns: e.target.value })}
                      placeholder="8.8.8.8"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Aviso cuando es DHCP */}
            {currentIface.ipMode === 'dhcp' && (
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs space-y-1">
                <span className="font-semibold text-emerald-300 block">Concesión DHCP Recibida (Simulada):</span>
                <p className="text-slate-300 font-mono text-[11px]">
                  IP Asignada: 192.168.1.184/24 · Gateway: 192.168.1.1 · DNS: 1.1.1.1 · Lease: 86400s
                </p>
                <p className="text-slate-400 text-[11px]">
                  El daemon dhclient / systemd-networkd renovará la IP dinámicamente.
                </p>
              </div>
            )}

            {/* Aviso cuando es Esclavo de Puente */}
            {currentIface.ipMode === 'bridge_slave' && (
              <div className="p-3.5 bg-amber-950/20 border border-amber-800/40 rounded-lg text-xs space-y-1 text-amber-200">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Interfaz asignada como puerto de puente (L2 Bridge Slave)
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Esta interfaz no procesará paquetes IP directamente; se comportará como un puerto de switch Ethernet virtual conectado al puente <strong>{config.bridge.name}</strong>. Toda la pila TCP/IP se gestionará en la pestaña <em>Puente Virtual</em>.
                </p>
              </div>
            )}

            {/* Parámetros L2 Avanzados (MTU, VLAN) */}
            <div className="pt-3 border-t border-slate-800">
              <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>Opciones Avanzadas de Capa 2 (MTU & VLAN)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">MTU (Maximum Transmission Unit):</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateInterface(currentIface.id, { mtu: 1500 })}
                      className={`flex-1 py-1.5 px-2 rounded border text-xs font-mono ${
                        currentIface.mtu === 1500
                          ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      1500 (Estándar)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateInterface(currentIface.id, { mtu: 9000 })}
                      className={`flex-1 py-1.5 px-2 rounded border text-xs font-mono ${
                        currentIface.mtu === 9000
                          ? 'bg-slate-800 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      9000 (Jumbo Frames)
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {currentIface.mtu === 9000 
                      ? 'Óptimo para redes de almacenamiento SAN iSCSI/NFS. Requiere soporte en switches físicos.'
                      : 'Recomendado para internet y tráfico corporativo general.'}
                  </span>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">VLAN 802.1Q Tag (Opcional):</label>
                  <input
                    type="number"
                    min="1"
                    max="4094"
                    value={currentIface.vlanId || ''}
                    onChange={(e) => handleUpdateInterface(currentIface.id, { vlanId: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="Sin etiquetar (Trunk/Nativo)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    ID de VLAN para tráfico segmentado en switches troncales (ej. 10 para Gestión).
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: Configuración de Puente Virtual (Bridge / vSwitch) */}
      {activeTab === 'bridge' && (
        <div className="space-y-5 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">
                  {osType === 'linux' ? 'Puente de Red de Software (Linux Bridge - br0)' : 'Conmutador Virtual (Hyper-V Virtual Switch)'}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Permite conectar interfaces físicas y máquinas virtuales / contenedores a la misma red de nivel de enlace (L2), evitando doble NAT.
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-950 border border-slate-800 rounded-lg">
              <input
                type="checkbox"
                checked={config.bridge.enabled}
                onChange={(e) => handleUpdateBridge({ enabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
              <span className="text-xs font-semibold text-white">
                {config.bridge.enabled ? 'Puente Activado' : 'Habilitar Puente'}
              </span>
            </label>
          </div>

          {config.bridge.enabled ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Nombre y Miembros */}
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Identificación & Miembros del Puente</span>
                  </h4>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Nombre de la interfaz puente:</label>
                    <input
                      type="text"
                      value={config.bridge.name}
                      onChange={(e) => handleUpdateBridge({ name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-2">Interfaces Físicas Esclavas Asociadas:</label>
                    <div className="space-y-1.5">
                      {config.interfaces.map(iface => {
                        const isMember = config.bridge.memberInterfaces.includes(iface.name);
                        return (
                          <label key={iface.id} className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800 text-xs cursor-pointer hover:border-slate-700">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isMember}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleUpdateBridge({ memberInterfaces: [...config.bridge.memberInterfaces, iface.name] });
                                    handleUpdateInterface(iface.id, { ipMode: 'bridge_slave' });
                                  } else {
                                    handleUpdateBridge({ memberInterfaces: config.bridge.memberInterfaces.filter(n => n !== iface.name) });
                                    handleUpdateInterface(iface.id, { ipMode: 'dhcp' });
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-emerald-500 rounded"
                              />
                              <span className="font-mono font-bold text-white">{iface.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{iface.macAddress}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* STP (Spanning Tree Protocol) */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-semibold text-slate-300">Spanning Tree Protocol (STP):</span>
                      <input
                        type="checkbox"
                        checked={config.bridge.stp}
                        onChange={(e) => handleUpdateBridge({ stp: e.target.checked })}
                        className="w-4 h-4 accent-emerald-500 rounded"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Previene bucles de conmutación en la red Ethernet. Desactivar en redes con un único cable físico para acelerar el inicio de conexión (evita los 15s de retraso de Forward Delay).
                    </p>
                  </div>
                </div>

                {/* Configuración IP del Propio Puente */}
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Network className="w-4 h-4 text-sky-400" />
                    <span>Direccionamiento IP del Host en el Puente ({config.bridge.name})</span>
                  </h4>

                  <p className="text-[11px] text-slate-400">
                    Al esclavizar las interfaces físicas, la IP de gestión de este servidor físico debe asignarse a la interfaz puente:
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateBridge({ ipMode: 'dhcp' })}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                        config.bridge.ipMode === 'dhcp'
                          ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      DHCP en br0
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateBridge({ ipMode: 'static' })}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                        config.bridge.ipMode === 'static'
                          ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      IP Estática en br0
                    </button>
                  </div>

                  {config.bridge.ipMode === 'static' && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="text-[11px] text-slate-400 block mb-0.5">IPv4 del Puente:</label>
                          <input
                            type="text"
                            value={config.bridge.ipv4Address}
                            onChange={(e) => handleUpdateBridge({ ipv4Address: e.target.value })}
                            placeholder="192.168.1.160"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-0.5">Prefijo CIDR:</label>
                          <input
                            type="number"
                            value={config.bridge.prefixLength}
                            onChange={(e) => handleUpdateBridge({ prefixLength: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-0.5">Gateway del Puente:</label>
                        <input
                          type="text"
                          value={config.bridge.gateway}
                          onChange={(e) => handleUpdateBridge({ gateway: e.target.value })}
                          placeholder="192.168.1.1"
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-0.5">DNS Primario:</label>
                          <input
                            type="text"
                            value={config.bridge.primaryDns}
                            onChange={(e) => handleUpdateBridge({ primaryDns: e.target.value })}
                            placeholder="1.1.1.1"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-0.5">DNS Secundario:</label>
                          <input
                            type="text"
                            value={config.bridge.secondaryDns}
                            onChange={(e) => handleUpdateBridge({ secondaryDns: e.target.value })}
                            placeholder="8.8.8.8"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-xl space-y-3">
              <Share2 className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-slate-300 font-semibold text-sm">El puente virtual está desactivado</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Las interfaces Ethernet operarán en modo punto a punto estándar. Si planeas desplegar hipervisores KVM, Proxmox, OpenStack o contenedores LXD, se recomienda activar el puente br0.
              </p>
              <button
                type="button"
                onClick={() => applyPreset('virtualization_bridge')}
                className="px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold hover:bg-emerald-500/30 transition-all inline-flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Configurar Puente Virtual Recomendado</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 3: Repercusión en Instalación Remota & Diagnóstico */}
      {activeTab === 'remote' && (
        <div className="space-y-6">
          {/* Matriz de Impacto en Capacidades de Instalación Remota */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Capacidad 1: Espejos Remotos & Kickstart / Preseed */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              activeEffectiveConfig.hasIp && activeEffectiveConfig.hasGateway && activeEffectiveConfig.hasDns
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                : !activeEffectiveConfig.hasGateway
                ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
            }`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold opacity-80">
                    Espejo de Paquetes
                  </span>
                  {activeEffectiveConfig.hasIp && activeEffectiveConfig.hasGateway && activeEffectiveConfig.hasDns ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <h4 className="font-bold text-white text-sm">Repositorios HTTP / Espejos</h4>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  {activeEffectiveConfig.hasIp && activeEffectiveConfig.hasGateway && activeEffectiveConfig.hasDns
                    ? 'Online: La instalación descargará paquetes oficiales y actualizaciones de seguridad sin interrupciones.'
                    : !activeEffectiveConfig.hasGateway
                    ? 'Bloqueado: Sin Gateway predeterminada, no se puede salir a internet para descargar paquetes del repositorio.'
                    : 'Degradado: Sin DNS, la resolución del dominio del espejo fallará a menos que se use una IP directa.'}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-800 text-[10px] font-mono opacity-80">
                Mirror: {config.remoteInstallCapabilities.mirrorUrl}
              </div>
            </div>

            {/* Capacidad 2: Terminal Remota SSH / WinPE Headless */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              activeEffectiveConfig.hasIp && config.remoteInstallCapabilities.allowRemoteSsh
                ? 'bg-sky-950/20 border-sky-500/40 text-sky-200'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold opacity-80">
                    Acceso de Terminal
                  </span>
                  <Terminal className="w-4 h-4 text-sky-400" />
                </div>
                <h4 className="font-bold text-white text-sm">SSH Headless Installer</h4>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  {activeEffectiveConfig.hasIp && config.remoteInstallCapabilities.allowRemoteSsh
                    ? `Activo: El administrador puede conectarse remotamente vía "ssh root@${activeEffectiveConfig.ip}" durante el proceso.`
                    : 'Inactivo: Requiere teclado y monitor conectados físicamente a la máquina (modo consola local).'}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-800 text-[10px] font-mono text-sky-300">
                Puerto SSH: {config.remoteInstallCapabilities.sshPort} · TTY Serial
              </div>
            </div>

            {/* Capacidad 3: Consola Web Cockpit / Windows Admin Center */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              activeEffectiveConfig.hasIp && config.remoteInstallCapabilities.allowCockpitWebConsole
                ? 'bg-purple-950/20 border-purple-500/40 text-purple-200'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold opacity-80">
                    Consola Web
                  </span>
                  <Globe className="w-4 h-4 text-purple-400" />
                </div>
                <h4 className="font-bold text-white text-sm">Cockpit / Admin Center</h4>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  {activeEffectiveConfig.hasIp && config.remoteInstallCapabilities.allowCockpitWebConsole
                    ? `Disponible en https://${activeEffectiveConfig.ip}:9090 para auditoría de recursos y logs de instalación en navegador.`
                    : 'Deshabilitada: Sin servicio web de administración activo.'}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-800 text-[10px] font-mono text-purple-300">
                HTTPS Port: 9090
              </div>
            </div>

            {/* Capacidad 4: Puente Virtual para Hypervisor / Containers */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              config.bridge.enabled
                ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold opacity-80">
                    Virtualización L2
                  </span>
                  <Share2 className="w-4 h-4 text-amber-400" />
                </div>
                <h4 className="font-bold text-white text-sm">Puente para Invitados</h4>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  {config.bridge.enabled
                    ? `Preparado: Las futuras VMs de KVM/Hyper-V podrán conectarse al switch "${config.bridge.name}" y obtener IP en la LAN.`
                    : 'Modo NAT: Sin puente br0, las futuras máquinas virtuales requerirán reenvío de puertos NAT.'}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-800 text-[10px] font-mono text-amber-300">
                Bridge: {config.bridge.enabled ? config.bridge.name : 'Desactivado'}
              </div>
            </div>
          </div>

          {/* Simulador Interactivo de Conectividad y Ruta Remota */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <span>Sonda de Diagnóstico de Red y Ruta Remota (Live Probe)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Verifica físicamente el enlace, la resolución ARP de la Gateway, la latencia ICMP y la consulta DNS a los espejos de instalación.
                </p>
              </div>

              <button
                type="button"
                onClick={runNetworkDiagnosticTest}
                disabled={isTestingLink}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 self-start sm:self-auto"
              >
                {isTestingLink ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Ejecutando Sonda...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Ejecutar Diagnóstico de Red</span>
                  </>
                )}
              </button>
            </div>

            {/* Terminal de Sonda en Vivo */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-emerald-400 space-y-1 min-h-[140px] max-h-[220px] overflow-y-auto">
              <div className="text-slate-400 text-[11px] pb-1 border-b border-slate-900 flex justify-between">
                <span>consola-red@instalador:~# net-diagnostics --probe-all</span>
                <span className="text-slate-400">Estado: {isTestingLink ? 'Sondeando...' : testCompleted ? (testSuccess ? 'PASS' : 'WARNING') : 'Listo'}</span>
              </div>

              {testLog.length === 0 && !isTestingLink && (
                <div className="text-slate-400 py-6 text-center text-xs">
                  Haz clic en "Ejecutar Diagnóstico de Red" para probar la resolución de nombres, ping a la Gateway y disponibilidad del espejo remoto.
                </div>
              )}

              {testLog.map((log, idx) => (
                <div 
                  key={idx} 
                  className={`leading-relaxed ${
                    log.includes('ERROR') || log.includes('ALERTA') 
                      ? 'text-rose-400 font-semibold' 
                      : log.includes('DISPONIBLE') || log.includes('[OK]') 
                      ? 'text-emerald-300' 
                      : 'text-slate-300'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>

            {testCompleted && (
              <div className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
                testSuccess
                  ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-200'
                  : 'bg-amber-950/30 border-amber-500/60 text-amber-200'
              }`}>
                {testSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <div>
                  <span className="font-bold block">
                    {testSuccess 
                      ? 'Parámetros de Red Validados: Instalación Remota y Descarga Listas' 
                      : 'Atención: Parámetros Incompletos para Instalación Remota'}
                  </span>
                  <span className="text-[11px] opacity-90">
                    {testSuccess
                      ? 'El servidor alcanzará los espejos de paquetes sin contratiempos y responderá a conexiones de terminal SSH.'
                      : 'Si la instalación no cuenta con Gateway o DNS, asegúrate de utilizar una imagen ISO completa "Offline" sin repositorios web.'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 4: Ficheros de Configuración Reales */}
      {activeTab === 'configfiles' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Terminal className="w-5 h-5 text-sky-400" />
                <span>Generador de Ficheros de Red del Instalador</span>
              </h3>
              <p className="text-xs text-slate-400">
                Ficheros exactos que el instalador escribirá en el sistema de destino tras completar la fase de particionado.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveConfigFileTab('netplan')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  activeConfigFileTab === 'netplan'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Netplan (Ubuntu/Debian)
              </button>
              <button
                type="button"
                onClick={() => setActiveConfigFileTab('nm')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  activeConfigFileTab === 'nm'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                NetworkManager (RHEL/Rocky)
              </button>
              <button
                type="button"
                onClick={() => setActiveConfigFileTab('networkd')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  activeConfigFileTab === 'networkd'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                systemd-networkd
              </button>
              <button
                type="button"
                onClick={() => setActiveConfigFileTab('powershell')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  activeConfigFileTab === 'powershell'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Windows PowerShell
              </button>
            </div>
          </div>

          {/* Visor de Código con Botón de Copiar */}
          <div className="relative">
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                onClick={() => handleCopy(configFiles[activeConfigFileTab], activeConfigFileTab)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-mono flex items-center gap-1.5 transition-all shadow border border-slate-700"
              >
                {copiedFile === activeConfigFileTab ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Fichero</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed max-h-[380px]">
              <code>{configFiles[activeConfigFileTab]}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Botones de Navegación Inferior */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-xs rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Atrás: Perfil del SO</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-all flex items-center gap-2 shadow-sm"
        >
          <span>Continuar a Particionado de Disco</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
