import { describe, expect, it } from 'vitest';
import { computeDiskLayout, lvMapperPath, lvSizeSpec, partedEnd, partitionDevice } from './diskLayout';
import { stateFromPreset } from './testFixtures';

describe('partitionDevice', () => {
  it('añade "p" cuando el disco termina en dígito', () => {
    expect(partitionDevice('/dev/nvme0n1', 3)).toBe('/dev/nvme0n1p3');
    expect(partitionDevice('/dev/mmcblk0', 1)).toBe('/dev/mmcblk0p1');
  });

  it('no añade "p" en discos SCSI/SATA/virtio', () => {
    expect(partitionDevice('/dev/sda', 3)).toBe('/dev/sda3');
    expect(partitionDevice('/dev/vda', 1)).toBe('/dev/vda1');
  });
});

describe('lvMapperPath', () => {
  it('duplica los guiones dentro de los nombres, como device-mapper', () => {
    expect(lvMapperPath('vg_system', 'lv_root')).toBe('/dev/mapper/vg_system-lv_root');
    expect(lvMapperPath('vg-data', 'lv-home')).toBe('/dev/mapper/vg--data-lv--home');
  });
});

describe('computeDiskLayout', () => {
  it('usa offsets contiguos según el tamaño real de cada partición', () => {
    const { disk } = stateFromPreset('linux_simple');
    const layout = computeDiskLayout(disk, false, false, 'vg');
    expect(layout.physical[0].startMiB).toBe(1);
    layout.physical.forEach((pp, i) => {
      // La última se ajusta al final del disco si el esquema lo llena
      if (!pp.fillsDisk) expect(pp.endMiB - pp.startMiB).toBe(disk.partitions[i].sizeMB);
      if (i > 0) expect(pp.startMiB).toBe(layout.physical[i - 1].endMiB);
    });
  });

  it('no crea particiones físicas para volúmenes lógicos y añade un PV que los contiene', () => {
    const state = stateFromPreset('linux_enterprise_luks_lvm');
    const layout = computeDiskLayout(state.disk, true, true, state.lvmGroupName);
    const nonLv = state.disk.partitions.filter(p => !p.isLvmLV);

    expect(layout.physical).toHaveLength(nonLv.length + 1);
    const pv = layout.physical[layout.physical.length - 1];
    expect(pv.role).toBe('lvm-pv');
    expect(pv.startMiB).toBe(layout.physical[layout.physical.length - 2].endMiB);

    expect(layout.luksBacking).toBe(pv);
    expect(layout.pvDevice).toBe('/dev/mapper/cryptroot');
    const root = state.disk.partitions.find(p => p.mountPoint === '/')!;
    expect(layout.deviceFor[root.id]).toBe('/dev/mapper/vg_system-lv_root');
  });

  it('cifra la partición raíz cuando no hay LVM', () => {
    const { disk } = stateFromPreset('linux_simple');
    const layout = computeDiskLayout(disk, false, true, 'vg');
    const root = disk.partitions.find(p => p.mountPoint === '/')!;
    expect(layout.luksBacking?.source).toBe(root);
    expect(layout.deviceFor[root.id]).toBe('/dev/mapper/cryptroot');
  });

  it('nunca sobrepasa el final del disco aunque el esquema lo llene por completo', () => {
    for (const [preset, lvm, enc] of [['linux_simple', false, false], ['linux_enterprise_luks_lvm', true, true]] as const) {
      const state = stateFromPreset(preset);
      const layout = computeDiskLayout(state.disk, lvm, enc, state.lvmGroupName);
      const last = layout.physical[layout.physical.length - 1];
      expect(last.endMiB, preset).toBeLessThanOrEqual(state.disk.totalSizeMB);
      expect(partedEnd(last), preset).toBe('100%');
    }
  });

  it('el último LV usa 100%FREE cuando los LV llenan el PV', () => {
    const state = stateFromPreset('linux_enterprise_luks_lvm');
    const layout = computeDiskLayout(state.disk, true, true, state.lvmGroupName);
    const lvs = layout.logicalVolumes;
    expect(lvSizeSpec(layout, lvs[0])).toBe(`-L ${lvs[0].sizeMB}M`);
    expect(lvSizeSpec(layout, lvs[lvs.length - 1])).toBe('-l 100%FREE');
  });

  it('reserva margen de metadatos en el PV cuando hay espacio libre en el disco', () => {
    const state = stateFromPreset('linux_enterprise_luks_lvm');
    const disk = { ...state.disk, totalSizeMB: state.disk.totalSizeMB * 2 };
    const layout = computeDiskLayout(disk, true, true, state.lvmGroupName);
    const pv = layout.physical[layout.physical.length - 1];
    const lvTotal = layout.logicalVolumes.reduce((s, lv) => s + lv.sizeMB, 0);
    expect(pv.fillsDisk).toBeFalsy();
    expect(pv.sizeMB).toBeGreaterThan(lvTotal);
    expect(lvSizeSpec(layout, layout.logicalVolumes[layout.logicalVolumes.length - 1])).toMatch(/^-L /);
  });

  it('respeta la numeración de /dev/sdX', () => {
    const state = stateFromPreset('linux_simple');
    const disk = { ...state.disk, devicePath: '/dev/sda' };
    const layout = computeDiskLayout(disk, false, false, 'vg');
    expect(layout.physical.map(pp => pp.device)).toEqual(
      disk.partitions.map((_, i) => `/dev/sda${i + 1}`)
    );
  });
});
