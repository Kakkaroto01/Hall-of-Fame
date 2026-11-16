import { describe, it, expect } from 'vitest';
import { blockError, emptyValues } from '../src/domain/entryValues';

describe('blockError', () => {
  const empty = { hp: '', atk: '', def: '', spa: '', spd: '', spe: '' };

  it('aprueba todos los bloques vacíos', () => {
    expect(blockError({ stats: empty, ivs: empty, evs: empty })).toBeNull();
  });

  it('aprueba stats completos y otros vacíos', () => {
    const full = { hp: '100', atk: '50', def: '50', spa: '50', spd: '50', spe: '50' };
    expect(blockError({ stats: full, ivs: empty, evs: empty })).toBeNull();
  });

  it('aprueba stats, ivs y evs completos', () => {
    const full = { hp: '100', atk: '50', def: '50', spa: '50', spd: '50', spe: '50' };
    expect(blockError({ stats: full, ivs: full, evs: full })).toBeNull();
  });

  it('rechaza stats parciales (3 de 6)', () => {
    const partial = { hp: '100', atk: '50', def: '', spa: '', spd: '', spe: '' };
    const err = blockError({ stats: partial, ivs: empty, evs: empty });
    expect(err).toContain('seis valores');
  });

  it('rechaza ivs parciales (4 de 6)', () => {
    const partial = { hp: '31', atk: '31', def: '31', spa: '31', spd: '', spe: '' };
    const err = blockError({ stats: empty, ivs: partial, evs: empty });
    expect(err).toContain('seis valores');
  });

  it('rechaza evs parciales (2 de 6)', () => {
    const partial = { hp: '252', atk: '252', def: '', spa: '', spd: '', spe: '' };
    const err = blockError({ stats: empty, ivs: empty, evs: partial });
    expect(err).toContain('seis valores');
  });

  it('usa nombre correcto del bloque en el error', () => {
    const partial = { hp: '31', atk: '', def: '', spa: '', spd: '', spe: '' };
    const err = blockError({ stats: empty, ivs: partial, evs: empty });
    expect(err).toContain('IV');
  });

  it('usa nombre correcto para EV', () => {
    const partial = { hp: '252', atk: '', def: '', spa: '', spd: '', spe: '' };
    const err = blockError({ stats: empty, ivs: empty, evs: partial });
    expect(err).toContain('EV');
  });
});

describe('emptyValues', () => {
  it('tiene 4 movimientos vacíos', () => {
    const v = emptyValues();
    expect(v.moves).toEqual(['', '', '', '']);
  });

  it('tiene 3 bloques de estadísticas vacíos', () => {
    const v = emptyValues();
    expect(Object.keys(v.blocks)).toEqual(['stats', 'ivs', 'evs']);
    for (const b of Object.values(v.blocks)) {
      expect(Object.values(b).every((x) => x === '')).toBe(true);
    }
  });

  it('tiene visibilidad privada por defecto', () => {
    const v = emptyValues();
    expect(v.visibility).toBe('private');
  });

  it('no es shiny por defecto', () => {
    const v = emptyValues();
    expect(v.shiny).toBe(false);
  });
});
