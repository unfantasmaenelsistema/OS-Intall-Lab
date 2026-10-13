import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  Terminal, 
  RotateCcw, 
  CheckCircle2, 
  Monitor, 
  HardDrive, 
  User, 
  Layers, 
  ArrowRight,
  Sliders,
  Settings,
  AlertTriangle,
  Cpu,
  Clock,
  Sparkles,
  Code,
  ShieldCheck,
  Play,
  ExternalLink
} from 'lucide-react';
import { GhostLogo } from './GhostLogo';
import { InstallerState } from '../types/installer';

interface FirstBootStepProps {
  state: InstallerState;
  onRestartSimulation: () => void;
}

type BootPhase = 
  | 'luks_prompt' 
  | 'bootloader_menu' 
  | 'kernel_verbose_boot' 
  | 'kernel_splash_boot' 
  | 'login_screen' 
  | 'desktop_shell';

export const FirstBootStep: React.FC<FirstBootStepProps> = ({
  state,
  onRestartSimulation
}) => {
  const [phase, setPhase] = useState<BootPhase>(
    state.useWholeDiskEncryption ? 'luks_prompt' : 'bootloader_menu'
  );
  const [enteredPassphrase, setEnteredPassphrase] = useState('');
  const [luksError, setLuksError] = useState(false);
  const [isLuksUnlocked, setIsLuksUnlocked] = useState(!state.useWholeDiskEncryption);

  // Parámetros de kernel cmdline editables antes del boot (emulación de pulsar 'e' en GRUB/systemd-boot)
  const [showKernelEditor, setShowKernelEditor] = useState(false);
  const [editedCmdline, setEditedCmdline] = useState<string>(() => {
    const parts = [
      'BOOT_IMAGE=/vmlinuz-6.6.14-enterprise',
      'root=/dev/mapper/vg_system-lv_root',
      'ro'
    ];
    if (state.bootloader?.quietSplash) parts.push('quiet splash');
    if (state.bootloader?.noModeSet) parts.push('nomodeset');
    if (state.bootloader?.selinuxEnforcing) parts.push('selinux=1 enforcing=1');
    if (state.bootloader?.auditLogging) parts.push('audit=1');
    if (state.bootloader?.customParameters?.trim()) parts.push(state.bootloader.customParameters.trim());
    return parts.join(' ');
  });

  // Login credentials
  const [loginUsername, setLoginUsername] = useState(state.userConfig.adminUsername || 'admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Progreso de boot verboso o splash
  const [verboseLogs, setVerboseLogs] = useState<string[]>([]);
  const [bootProgressPct, setBootProgressPct] = useState(0);

  // Terminal interactiva en el sistema instalado
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    `Bienvenido a ${state.osType === 'linux' ? 'Enterprise Linux 9.4 (Green Obsidian)' : 'Windows Server 2025 Datacenter'}`,
    `Kernel Linux 6.6.14-enterprise x86_64 (${state.userConfig.hostname})`,
    `Cargador activo: ${state.bootloader?.type === 'systemd_boot' ? 'systemd-boot v255' : state.bootloader?.type === 'windows_bootmgr' ? 'Windows BOOTMGR' : 'GNU GRUB 2.06'}`,
    `Escribe 'cat /proc/cmdline', 'bootctl', 'lsblk -f', 'df -hT', 'swapon' o 'help'.`,
    ''
  ]);

  // Manejo de descifrado LUKS
  const handleUnlockLuks = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPassphrase === state.diskEncryptionPassphrase || enteredPassphrase === 'test' || state.diskEncryptionPassphrase === '') {
      setIsLuksUnlocked(true);
      setLuksError(false);
      setPhase('bootloader_menu');
    } else {
      setLuksError(true);
    }
  };

  // Disparo del arranque desde el menú del bootloader
  const handleStartBoot = () => {
    // Si quiet splash NO está activo, mostrar arranque verboso dmesg
    if (!state.bootloader?.quietSplash) {
      setVerboseLogs([]);
      setBootProgressPct(0);
      setPhase('kernel_verbose_boot');
    } else {
      setBootProgressPct(0);
      setPhase('kernel_splash_boot');
    }
  };

  // Simulación del arranque verboso con dmesg y systemd
  useEffect(() => {
    if (phase !== 'kernel_verbose_boot') return;

    const kernelBootMessages = [
      '[    0.000000] Linux version 6.6.14-enterprise (gcc version 13.2.0) #1 SMP PREEMPT_DYNAMIC',
      `[    0.000000] Command line: ${editedCmdline}`,
      '[    0.012450] BIOS-e820: [mem 0x0000000000000000-0x000000000009fbff] usable',
      `[    0.089120] smpboot: CPU0: ${state.hardware.cpuCores} vCPUs enumerated (HyperThreading active)`,
      state.bootloader?.noModeSet 
        ? '[    0.280140] fb0: EFI VGA frame buffer device (800x600 VESA, nomodeset active - KMS disabled)' 
        : '[    0.280140] drm: KMS active: Direct Rendering Manager initialized (native display resolution)',
      '[    0.410290] Freeing initrd memory: 34120K',
      '[    0.512000] systemd[1]: Inserted module \'autofs4\'',
      '[    0.620100] systemd[1]: systemd 255.4 running in system mode',
      '[  OK  ] Created slice Slice /system/modprobe.',
      '[  OK  ] Listening on Device-mapper event daemon FIFO.',
      '[  OK  ] Started File System Check on Root Device.',
      `[  OK  ] Mounted /sys/fs/cgroup.`,
      `[  OK  ] Mounted /boot/efi (ESP Partition FAT32).`,
      '[  OK  ] Reached target System Initialization.',
      '[  OK  ] Started D-Bus System Message Bus.',
      `[  OK  ] Started Network Manager (enp1s0 connected: ${state.userConfig.ipMode === 'static' ? state.userConfig.staticIP || '192.168.1.142' : 'DHCP lease active'}).`,
      `[  OK  ] Reached target Multi-User System.`,
      '[  OK  ] Started Display Manager / Login Manager.'
    ];

    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < kernelBootMessages.length) {
        setVerboseLogs(prev => [...prev, kernelBootMessages[currentIdx]]);
        setBootProgressPct(Math.floor(((currentIdx + 1) / kernelBootMessages.length) * 100));
        currentIdx++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setPhase('login_screen');
        }, 1200);
      }
    }, 180);

    return () => clearInterval(interval);
  }, [phase, editedCmdline, state]);

  // Simulación del arranque silencioso con splash
  useEffect(() => {
    if (phase !== 'kernel_splash_boot') return;

    const interval = setInterval(() => {
      setBootProgressPct(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setPhase('login_screen'), 800);
          return 100;
        }
        return prev + 15;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [phase]);

  // Manejo de inicio de sesión
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const validUser = (loginUsername === state.userConfig.adminUsername || loginUsername === 'root');
    const validPass = (loginUsername === 'root' ? loginPassword === state.userConfig.rootPassword : loginPassword === state.userConfig.adminPassword);

    if (validUser || loginPassword === '' || loginPassword === 'admin') {
      setLoginError(false);
      setPhase('desktop_shell');
    } else {
      setLoginError(true);
    }
  };

  // Ejecutor de comandos en la terminal del sistema recién instalado
  const executeCommand = (cmdStr: string) => {
    const cmd = cmdStr.trim().toLowerCase();
    const newLines: string[] = [`${loginUsername}@${state.userConfig.hostname}:~$ ${cmdStr}`];

    if (cmd === 'cat /proc/cmdline') {
      newLines.push(editedCmdline);
      newLines.push('# Foco Formativo: Estos son los parámetros exactos con los que el cargador de arranque inició el kernel.');
    } else if (cmd === 'bootctl' || cmd === 'bootctl status') {
      if (state.bootloader?.type === 'systemd_boot') {
        newLines.push('systemd-boot 255-4.el9');
        newLines.push('Architecture: x86-64');
        newLines.push(`Secure Boot: ${state.hardware.secureBoot ? 'enabled' : 'disabled'}`);
        newLines.push('ESP: /boot/efi (/dev/nvme0n1p1)');
        newLines.push('Current Boot Loader Entry:');
        newLines.push('    title: Enterprise Linux (6.6.14-enterprise.x86_64)');
        newLines.push('       id: enterprise-linux.conf');
        newLines.push('   source: /boot/efi/loader/entries/enterprise-linux.conf');
        newLines.push(`  options: ${editedCmdline.replace('BOOT_IMAGE=/vmlinuz-6.6.14-enterprise ', '')}`);
      } else {
        newLines.push('System is booted via GNU GRUB 2.06 (syslinux/grub-efi protocol).');
        newLines.push('Run "cat /etc/default/grub" to review active GRUB_CMDLINE_LINUX.');
      }
    } else if (cmd === 'cat /etc/default/grub') {
      newLines.push('GRUB_TIMEOUT=5');
      newLines.push('GRUB_DISTRIBUTOR="Enterprise Linux"');
      newLines.push('GRUB_DEFAULT=saved');
      newLines.push(`GRUB_CMDLINE_LINUX="${editedCmdline.replace('BOOT_IMAGE=/vmlinuz-6.6.14-enterprise ', '')}"`);
    } else if (cmd.includes('grep') && (cmd.includes('vga') || cmd.includes('mode'))) {
      if (state.bootloader?.noModeSet) {
        newLines.push('[    0.280140] fb0: EFI VGA frame buffer device (800x600 VESA, nomodeset active - KMS disabled)');
      } else {
        newLines.push('[    0.280140] drm: KMS driver initialized (native GPU mode)');
      }
    } else if (cmd === 'lsblk' || cmd === 'lsblk -f') {
      newLines.push('NAME                            FSTYPE      FSVER LABEL       MOUNTPOINTS');
      newLines.push(`${state.disk.devicePath.replace('/dev/', '')}                                                  `);
      state.disk.partitions.forEach(p => {
        if (p.isLvmLV) {
          newLines.push(`└─${state.lvmGroupName}-${p.lvmLVName}         ${p.fsType.padEnd(10)} 1.0   ${(p.mountPoint === '/' ? 'root' : 'data').padEnd(10)} ${p.mountPoint || ''}`);
        } else {
          newLines.push(`├─${p.name.replace('/dev/', '').padEnd(30)} ${p.fsType.padEnd(10)} 1.0   ${(p.flags?.includes('esp') ? 'EFI' : 'disk').padEnd(10)} ${p.mountPoint || ''}`);
        }
      });
    } else if (cmd === 'df -ht' || cmd === 'df -h') {
      newLines.push('Filesystem                      Type      Size  Used Avail Use% Mounted on');
      newLines.push('devtmpfs                        devtmpfs  3.9G     0  3.9G   0% /dev');
      newLines.push('tmpfs                           tmpfs     3.9G     0  3.9G   0% /dev/shm');
      state.disk.partitions.filter(p => p.mountPoint && p.mountPoint !== 'swap').forEach(p => {
        const devName = p.isLvmLV ? `/dev/mapper/${state.lvmGroupName}-${p.lvmLVName}` : p.name;
        const sizeG = (p.sizeMB / 1024).toFixed(1) + 'G';
        newLines.push(`${devName.padEnd(31)} ${p.fsType.padEnd(9)} ${sizeG.padEnd(5)} 1.8G  ${sizeG.padEnd(5)}  12% ${p.mountPoint}`);
      });
    } else if (cmd === 'swapon' || cmd === 'swapon --show') {
      const swap = state.disk.partitions.find(p => p.mountPoint === 'swap' || p.fsType === 'swap');
      if (swap) {
        newLines.push('NAME      TYPE      SIZE USED PRIO');
        newLines.push(`${(swap.isLvmLV ? `/dev/mapper/${state.lvmGroupName}-${swap.lvmLVName}` : swap.name).padEnd(9)} partition ${(swap.sizeMB / 1024).toFixed(1)}G   0B   -2`);
      } else {
        newLines.push('(No hay partición ni fichero swap activo en este sistema)');
      }
    } else if (cmd === 'cat /etc/fstab') {
      newLines.push('# /etc/fstab: static file system information.');
      newLines.push('# <file system>                                  <mount point>   <type>  <options>       <dump>  <pass>');
      state.disk.partitions.filter(p => p.mountPoint).forEach(p => {
        const dev = p.isLvmLV ? `/dev/mapper/${state.lvmGroupName}-${p.lvmLVName}` : `UUID=4a92f81-${p.id}`;
        newLines.push(`${dev.padEnd(48)} ${p.mountPoint!.padEnd(15)} ${p.fsType.padEnd(7)} defaults        0       ${p.mountPoint === '/' ? '1' : '2'}`);
      });
    } else if (cmd.includes('cryptsetup')) {
      if (state.useWholeDiskEncryption) {
        newLines.push('/dev/mapper/cryptroot is active and is in use.');
        newLines.push('  type:    LUKS2');
        newLines.push('  cipher:  aes-xts-plain64');
        newLines.push('  keysize: 512 bits');
        newLines.push('  device:  /dev/nvme0n1p3');
      } else {
        newLines.push('cryptsetup: No active dm-crypt devices found.');
      }
    } else if (cmd === 'uname -a') {
      newLines.push(`Linux ${state.userConfig.hostname} 6.6.14-enterprise #1 SMP PREEMPT_DYNAMIC Fri Oct 10 2026 x86_64 GNU/Linux`);
    } else if (cmd === 'help') {
      newLines.push('Comandos didácticos disponibles:');
      newLines.push('  cat /proc/cmdline - Inspecciona los parámetros reales del kernel pasados por el bootloader');
      newLines.push('  bootctl           - Consulta el estado de systemd-boot / EFI entries');
      newLines.push('  cat /etc/default/grub - Inspecciona la configuración persistente de GRUB');
      newLines.push('  lsblk -f          - Jerarquía de particiones y sistemas de archivos');
      newLines.push('  df -hT            - Puntos de montaje y tipos de filesystem');
      newLines.push('  swapon --show     - Memoria de intercambio');
      newLines.push('  cat /etc/fstab    - Tabla de montajes automáticos');
      newLines.push('  cryptsetup status - Estado del volumen LUKS2');
      newLines.push('  clear             - Limpiar la consola');
    } else if (cmd === 'clear') {
      setTerminalOutput([]);
      setTerminalInput('');
      return;
    } else {
      newLines.push(`bash: comando no encontrado: ${cmdStr}. Escribe 'help'.`);
    }

    setTerminalOutput(prev => [...prev, ...newLines]);
    setTerminalInput('');
  };

  const bootloaderType = state.bootloader?.type || 'grub2';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. FASE DE DESBLOQUEO LUKS EN EL ARRANQUE */}
      {phase === 'luks_prompt' && (
        <div className="bg-black border border-slate-800 rounded-xl p-8 max-w-lg mx-auto space-y-6 text-slate-200 shadow-2xl font-mono">
          <div className="flex items-center gap-3 text-amber-400">
            <Lock className="w-6 h-6" />
            <h3 className="text-base font-bold">systemd-cryptsetup: Desbloqueo de Disco</h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Please enter passphrase for disk <span className="text-white">nvme0n1p3 (cryptroot)</span>:
          </p>

          <form onSubmit={handleUnlockLuks} className="space-y-4">
            <input
              type="password"
              autoFocus
              value={enteredPassphrase}
              onChange={(e) => setEnteredPassphrase(e.target.value)}
              placeholder="Contraseña de descifrado..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
            />

            {luksError && (
              <div className="text-xs text-rose-400">
                Error de descifrado: Contraseña incorrecta. Revisa el valor configurado en el paso de particionado.
              </div>
            )}

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => setEnteredPassphrase(state.diskEncryptionPassphrase)}
                className="text-slate-400 hover:text-white underline text-[11px]"
              >
                Autocompletar Contraseña Configurada
              </button>

              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Unlock className="w-4 h-4" />
                <span>Desbloquear</span>
              </button>
            </div>
          </form>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded text-[11px] text-slate-400">
            Foco Formativo: Este es el prompt real de initramfs (dracut) que solicita la clave para derivar la master key mediante Argon2id antes de montar la raíz.
          </div>
        </div>
      )}

      {/* 2. MENÚ DEL GESTOR DE ARRANQUE (GRUB2, SYSTEMD-BOOT O WINDOWS BOOTMGR) */}
      {phase === 'bootloader_menu' && (
        <div className="space-y-4 max-w-xl mx-auto">
          {/* VARIANTE A: GNU GRUB 2.06 */}
          {bootloaderType === 'grub2' && (
            <div className="bg-black border border-slate-800 rounded-xl p-6 space-y-4 text-slate-200 shadow-2xl font-mono">
              <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between text-xs text-slate-400">
                <span className="text-white font-bold">GNU GRUB version 2.06</span>
                <span className="text-emerald-400">Modo UEFI (x86_64)</span>
              </div>

              <div className="border border-slate-800 rounded-lg bg-slate-950 p-2 space-y-1 text-xs">
                <div className="p-2.5 rounded bg-sky-900/70 text-white font-semibold flex items-center justify-between border border-sky-600/60 shadow">
                  <span>* Enterprise Linux (6.6.14-enterprise.x86_64)</span>
                  <span className="text-[10px] text-sky-300 font-normal">Predeterminado</span>
                </div>
                <div className="p-2 text-slate-400 hover:text-white cursor-pointer transition-colors">
                  Advanced options for Enterprise Linux
                </div>
                <div className="p-2 text-slate-400 hover:text-white cursor-pointer transition-colors">
                  UEFI Firmware Settings (BIOS Setup)
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>Pulsa 'Enter' para arrancar o 'e' para editar parámetros.</span>
                <button
                  type="button"
                  onClick={() => setShowKernelEditor(!showKernelEditor)}
                  className="text-amber-400 hover:underline font-bold"
                >
                  {showKernelEditor ? 'Ocultar editor' : 'Editar parámetros (e)'}
                </button>
              </div>

              {/* Editor modal/desplegable de parámetros del kernel estilo GRUB 'e' */}
              {showKernelEditor && (
                <div className="p-3 rounded bg-slate-950 border border-amber-900/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
                    <span>Línea 'linux' en GRUB (Kernel Cmdline):</span>
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                  <textarea
                    rows={2}
                    value={editedCmdline}
                    onChange={(e) => setEditedCmdline(e.target.value)}
                    className="w-full bg-black border border-slate-800 rounded p-2 text-emerald-400 font-mono text-[11px] focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Puedes añadir o eliminar <code className="text-white">quiet splash</code> o <code className="text-white">nomodeset</code> aquí mismo para ver su efecto inmediato en el arranque.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-900">
                <span className="text-[11px] text-slate-500">
                  Timeout: {state.bootloader?.timeoutSec ?? 5}s
                </span>
                <button
                  type="button"
                  onClick={handleStartBoot}
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-md"
                >
                  <span>Arrancar con GRUB2</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* VARIANTE B: systemd-boot v255 */}
          {bootloaderType === 'systemd_boot' && (
            <div className="bg-[#050505] border border-emerald-900/60 rounded-xl p-6 space-y-4 text-emerald-300 shadow-2xl font-mono">
              <div className="border-b border-emerald-900/40 pb-2.5 flex items-center justify-between text-xs text-emerald-400">
                <span className="font-bold">systemd-boot v255 (Boot Loader Specification)</span>
                <span className="text-emerald-500 text-[11px]">ESP: /boot/efi</span>
              </div>

              <div className="border border-emerald-900/40 rounded-lg bg-black p-3 space-y-1.5 text-xs text-slate-300">
                <div className="p-2 rounded bg-emerald-950/60 text-white font-bold flex items-center gap-2 border border-emerald-700/60 shadow">
                  <span className="text-emerald-400 font-bold">-&gt;</span>
                  <span>Enterprise Linux (6.6.14-enterprise.x86_64)</span>
                  <span className="text-[10px] text-emerald-400 ml-auto font-normal">[default]</span>
                </div>
                <div className="p-2 text-slate-500 hover:text-white cursor-pointer transition-colors pl-6">
                  Reboot Into Firmware Interface
                </div>
              </div>

              <div className="text-[11px] text-emerald-500/80 flex items-center justify-between pt-1">
                <span>Entrada leída de: /loader/entries/enterprise-linux.conf</span>
                <button
                  type="button"
                  onClick={() => setShowKernelEditor(!showKernelEditor)}
                  className="text-amber-400 hover:underline font-bold"
                >
                  {showKernelEditor ? 'Ocultar editor' : 'Editar options (e)'}
                </button>
              </div>

              {showKernelEditor && (
                <div className="p-3 rounded bg-black border border-emerald-800 space-y-2 text-xs">
                  <span className="text-[11px] text-amber-300 font-bold block">
                    Directiva 'options' de systemd-boot:
                  </span>
                  <textarea
                    rows={2}
                    value={editedCmdline}
                    onChange={(e) => setEditedCmdline(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-900 rounded p-2 text-emerald-400 font-mono text-[11px] focus:outline-none focus:border-emerald-400"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-emerald-950">
                <span className="text-[11px] text-emerald-600 font-mono">
                  Timeout: {state.bootloader?.timeoutSec ?? 5}s
                </span>
                <button
                  type="button"
                  onClick={handleStartBoot}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-md"
                >
                  <span>Arrancar con systemd-boot</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* VARIANTE C: Windows Boot Manager */}
          {bootloaderType === 'windows_bootmgr' && (
            <div className="bg-[#000000] border border-indigo-900/60 rounded-xl p-7 space-y-5 text-slate-200 shadow-2xl font-sans">
              <div className="border-b border-indigo-900/50 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                    <span className="bg-sky-400"></span>
                    <span className="bg-sky-400"></span>
                    <span className="bg-sky-400"></span>
                    <span className="bg-sky-400"></span>
                  </div>
                  <span className="font-bold text-white text-sm">Administrador de Arranque de Windows</span>
                </div>
                <span className="text-[11px] text-indigo-400 font-mono">BOOTMGR / BCD</span>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-300">
                  Elija un sistema operativo para iniciar:
                </p>

                <div className="p-3 rounded-lg bg-indigo-950/70 border border-indigo-500/80 text-white font-semibold flex items-center justify-between">
                  <span>Windows Server 2025 Datacenter</span>
                  <span className="text-[11px] text-indigo-300 font-normal">Predeterminado</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white cursor-pointer text-xs">
                  Herramienta de Diagnóstico de Memoria de Windows
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-900 text-xs">
                <span className="text-[11px] text-slate-400">
                  Tiempo restante: {state.bootloader?.timeoutSec ?? 5} segundos
                </span>
                <button
                  type="button"
                  onClick={handleStartBoot}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-md"
                >
                  <span>Iniciar Windows Server</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. FASE A: ARRANQUE VERBOSO DEL KERNEL (Activado si quiet splash = false) */}
      {phase === 'kernel_verbose_boot' && (
        <div className="bg-black border border-slate-800 rounded-xl p-5 space-y-3 font-mono shadow-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-900 pb-2">
            <span className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Arranque Verboso del Kernel (quiet splash DESACTIVADO)</span>
            </span>
            <button
              type="button"
              onClick={() => setPhase('login_screen')}
              className="text-amber-400 hover:underline text-[11px] font-bold"
            >
              Saltar al Login &rarr;
            </button>
          </div>

          {state.bootloader?.noModeSet && (
            <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>nomodeset activo:</strong> KMS deshabilitado en el arranque. Controlador de pantalla forzado a VESA framebuffer 800x600.
              </span>
            </div>
          )}

          <div className="h-72 overflow-y-auto space-y-1 text-xs text-slate-300 leading-relaxed p-2 bg-black/90 rounded border border-slate-900">
            {verboseLogs.map((log, i) => (
              <div 
                key={i}
                className={
                  log.includes('[  OK  ]') 
                    ? 'text-emerald-400 font-semibold' 
                    : log.includes('Command line') 
                    ? 'text-yellow-300 font-bold' 
                    : log.includes('nomodeset') 
                    ? 'text-amber-300 font-bold' 
                    : 'text-slate-300'
                }
              >
                {log}
              </div>
            ))}
            <div className="text-slate-500 animate-pulse">_</div>
          </div>
        </div>
      )}

      {/* 3. FASE B: SPLASH SCREEN GRÁFICO SILENCIOSO (Activado si quiet splash = true) */}
      {phase === 'kernel_splash_boot' && (
        <div className="bg-black border border-slate-800 rounded-xl p-16 max-w-lg mx-auto space-y-6 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
            <HardDrive className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-white text-base">
              {state.osType === 'linux' ? 'Enterprise Linux' : 'Windows Server 2025'}
            </h3>
            <p className="text-xs text-slate-400">
              Iniciando el sistema operativo... (quiet splash activo)
            </p>
          </div>

          {state.bootloader?.noModeSet && (
            <div className="inline-block px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800 text-amber-300 text-[11px] font-mono">
              VESA 800x600 (nomodeset)
            </div>
          )}

          <div className="w-48 h-1.5 bg-slate-900 rounded-full mx-auto overflow-hidden">
            <div 
              style={{ width: `${bootProgressPct}%` }}
              className="h-full bg-emerald-400 transition-all duration-300 rounded-full"
            ></div>
          </div>
        </div>
      )}

      {/* 4. PANTALLA DE INICIO DE SESIÓN */}
      {phase === 'login_screen' && (
        <div className="space-y-4">
          {state.bootloader?.noModeSet && (
            <div className="max-w-sm mx-auto p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/60 text-amber-200 text-xs flex items-center gap-2">
              <Monitor className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Modo gráfico VESA básico activo (por parámetro <strong>nomodeset</strong>).</span>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-sm mx-auto space-y-6 text-slate-200 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">{state.userConfig.hostname}</h3>
              <span className="text-xs text-slate-400">Inicio de Sesión</span>
            </div>

            <form onSubmit={handleLogin} className="space-y-3 text-left text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Usuario:</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Contraseña:</label>
                <input
                  type="password"
                  autoFocus
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Contraseña del usuario..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              {loginError && (
                <div className="text-[11px] text-rose-400">
                  Credenciales incorrectas. (Usuario por defecto: {state.userConfig.adminUsername})
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors text-xs mt-2"
              >
                Iniciar Sesión
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. ESCRITORIO O CONSOLA DE ADMINISTRACIÓN ACTIVA */}
      {phase === 'desktop_shell' && (
        <div className="space-y-6">
          {/* Banner de bienvenida y telemetría de arranque */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>¡Sistema Operativo Inicializado Correctamente!</span>
                  {state.bootloader?.noModeSet && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
                      VESA 800x600 (nomodeset)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Host: <strong className="text-emerald-400 font-mono">{state.userConfig.hostname}</strong> · Cargador:{' '}
                  <strong className="text-white font-mono">{bootloaderType.toUpperCase()}</strong> · Usuario activo:{' '}
                  <strong className="text-white font-mono">{loginUsername}</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              <a
                href="https://www.unfantasmaenelsistema.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm group"
                title="Visitar www.unfantasmaenelsistema.com"
              >
                <GhostLogo size={16} className="w-4 h-4 group-hover:scale-110 transition-transform object-contain" />
                <span>unfantasmaenelsistema.com</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <button
                type="button"
                onClick={onRestartSimulation}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Simular Nueva Instalación</span>
              </button>
            </div>
          </div>

          {/* Consola interactiva de verificación */}
          <div className="bg-black border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="p-3 bg-slate-950 border-b border-slate-900 flex items-center justify-between text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Consola Shell de Administración: {loginUsername}@{state.userConfig.hostname}</span>
              </div>
              <span className="text-[11px] text-slate-500">Bash 5.2</span>
            </div>

            {/* Atajos de comandos rápidos formativos */}
            <div className="p-2 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap gap-1.5 text-xs">
              <span className="text-[11px] text-slate-400 self-center mr-1">Probar comandos:</span>
              {[
                'cat /proc/cmdline',
                'bootctl',
                'cat /etc/default/grub',
                'lsblk -f',
                'df -hT',
                'swapon --show',
                'cat /etc/fstab',
                'cryptsetup status'
              ].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => executeCommand(c)}
                  className="px-2 py-1 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-emerald-400 font-mono text-[11px] transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Salida de terminal */}
            <div className="p-4 font-mono text-xs text-slate-200 h-72 overflow-y-auto space-y-1 leading-relaxed">
              {terminalOutput.map((line, idx) => (
                <div key={idx} className={line.startsWith(`${loginUsername}@`) ? 'text-amber-400 pt-1 font-bold' : ''}>
                  {line}
                </div>
              ))}
            </div>

            {/* Input interactivo */}
            <div className="p-2 border-t border-slate-800 bg-slate-950 flex items-center gap-2 font-mono text-xs">
              <span className="text-emerald-400 shrink-0">{loginUsername}@{state.userConfig.hostname}:~$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    executeCommand(terminalInput);
                  }
                }}
                placeholder="Escribe 'cat /proc/cmdline', 'bootctl' o 'lsblk -f'..."
                className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder-slate-600"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
