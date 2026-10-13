import { describe, expect, it } from 'vitest';
import { validatePartitionScheme } from './partitionValidator';
import { HARDWARE, stateFromPreset } from './testFixtures';
import { InstallerState } from '../types/installer';

const validate = (s: InstallerState) =>
  validatePartitionScheme(s.disk, s.hardware, s.osType, s.useLvm, s.useWholeDiskEncryption);
const ids = (s: InstallerState) => validate(s).map(i => i.id);

describe('validatePartitionScheme', () => {
  it('los presets estándar no producen errores', () => {
    for (const preset of ['linux_simple', 'linux_enterprise_luks_lvm', 'linux_btrfs_snapshots', 'windows_server_standard']) {
      const errors = validate(stateFromPreset(preset)).filter(i => i.type === 'error');
      expect(errors, preset).toEqual([]);
    }
  });

  it('avisa de raíz pequeña con el mismo umbral que indica el mensaje (20 GB)', () => {
    const state = stateFromPreset('linux_simple');
    const root = state.disk.partitions.find(p => p.mountPoint === '/')!;
    root.sizeMB = 15 * 1024;
    const issue = validate(state).find(i => i.id === 'root-too-small');
    expect(issue).toBeDefined();
    expect(issue!.message).toContain('20 GB');
  });

  it('marca LUKS sin /boot separado como aviso (GRUB no soporta Argon2id)', () => {
    const state = stateFromPreset('linux_simple', { useWholeDiskEncryption: true });
    const issue = validate(state).find(i => i.id === 'luks-without-separate-boot');
    expect(issue?.type).toBe('warning');
    expect(issue?.technicalImpact).toContain('Argon2id');
  });

  it('el umbral de RAM crítica depende del sistema operativo', () => {
    const linux1G = stateFromPreset('linux_simple', { hardware: { ...HARDWARE, ramMB: 1024 } });
    expect(ids(linux1G)).not.toContain('hw-ram-critical');
    expect(ids(linux1G)).toContain('hw-ram-low');

    const linux512 = stateFromPreset('linux_simple', { hardware: { ...HARDWARE, ramMB: 512 } });
    expect(ids(linux512)).toContain('hw-ram-critical');

    const win1G = stateFromPreset('windows_server_standard', { hardware: { ...HARDWARE, ramMB: 1024 } });
    expect(ids(win1G)).toContain('hw-ram-critical');
  });

  it('detecta MBR en discos de más de 2 TiB', () => {
    const state = stateFromPreset('linux_simple');
    state.disk = { ...state.disk, tableType: 'mbr', totalSizeMB: 4 * 1024 * 1024 };
    expect(ids(state)).toContain('mbr-over-2tib');
  });

  it('Windows: C: bajo el mínimo es error, por debajo de lo recomendado es aviso', () => {
    const tiny = stateFromPreset('windows_server_standard');
    tiny.disk.partitions.find(p => p.mountPoint === 'C:')!.sizeMB = 20 * 1024;
    expect(ids(tiny)).toContain('c-drive-below-minimum');

    const small = stateFromPreset('windows_server_standard');
    small.disk.partitions.find(p => p.mountPoint === 'C:')!.sizeMB = 40 * 1024;
    expect(ids(small)).toContain('c-drive-small');
    expect(ids(small)).not.toContain('c-drive-below-minimum');
  });

  it('Windows: exige MSR en GPT y no acepta "/" como unidad C:', () => {
    const state = stateFromPreset('windows_server_standard');
    state.disk.partitions = state.disk.partitions.filter(p => !p.flags?.includes('msr'));
    state.disk.partitions.find(p => p.mountPoint === 'C:')!.mountPoint = '/';
    const found = ids(state);
    expect(found).toContain('windows-missing-msr');
    expect(found).toContain('missing-c-drive');
  });
});
