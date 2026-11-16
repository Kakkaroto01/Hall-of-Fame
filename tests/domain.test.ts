import { describe, it, expect } from 'vitest';
import { blockError, valuesToPatch, changedPatch, entryToValues, emptyValues } from '../src/domain/entryValues';
import { medalsFor, canAddToTeam } from '../src/domain/awards';
import { diffSnapshots, showValue } from '../src/domain/history';

describe('entryValues', () => {
  it('emptyValues tiene bloques vacíos', () => {
    const v = emptyValues();
    expect(v.nickname).toBe('');
    expect(v.moves).toEqual(['', '', '', '']);
    expect(v.blocks.stats.hp).toBe('');
    expect(v.visibility).toBe('private');
  });

  it('blockError acepta bloque vacío o completo', () => {
    const empty = { hp: '', atk: '', def: '', spa: '', spd: '', spe: '' };
    const full = { hp: '100', atk: '50', def: '50', spa: '50', spd: '50', spe: '50' };
    const partial = { hp: '100', atk: '', def: '', spa: '', spd: '', spe: '' };

    expect(blockError({ stats: empty, ivs: empty, evs: empty })).toBeNull();
    expect(blockError({ stats: full, ivs: empty, evs: empty })).toBeNull();
    expect(blockError({ stats: partial, ivs: empty, evs: empty })).toContain('seis valores');
  });

  it('valuesToPatch convierte strings a números', () => {
    const v = emptyValues();
    v.level = '50';
    v.blocks.stats = { hp: '100', atk: '50', def: '50', spa: '50', spd: '50', spe: '50' };
    const patch = valuesToPatch(v);
    expect(patch.level).toBe(50);
    expect((patch.stats as any)?.hp).toBe(100);
    expect(patch.moves).toEqual([]);
  });

  it('changedPatch solo devuelve campos modificados', () => {
    const before: any = { nickname: 'Pika', level: 50, gender: 'M', nature: 'Serio' };
    const next = { nickname: 'Pika', level: 50, gender: 'M', nature: 'Audaz' };
    const patch = changedPatch(before, next);
    expect(Object.keys(patch)).toEqual(['nature']);
    expect(patch.nature).toBe('Audaz');
  });

  it('entryToValues convierte fila a valores de formulario', () => {
    const e: any = {
      nickname: 'Pika', level: 50, gender: 'M', nature: 'Serio', ability: 'Estático',
      moves: ['Placaje', 'Ataque Rápido'], held_item: null, is_shiny: false, visibility: 'private',
      stats: { hp: 100, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 },
      ivs: null, evs: null,
    };
    const v = entryToValues(e);
    expect(v.nickname).toBe('Pika');
    expect(v.level).toBe('50');
    expect(v.moves).toEqual(['Placaje', 'Ataque Rápido', '', '']);
    expect(v.blocks.stats.hp).toBe('100');
  });
});

describe('awards', () => {
  const categories: any[] = [
    { id: 'c1', kind: 'official', key: 'league_team', name: 'Equipo de la Liga', selection: 'league_team', owner_id: null },
    { id: 'c2', kind: 'official', key: 'game_mvp', name: 'MVP del juego', selection: 'game_mvp', owner_id: null },
  ];
  const members: any[] = [
    { locke_id: 'l1', entry_id: 'e1', owner_id: 'u1' },
    { locke_id: 'l1', entry_id: 'e2', owner_id: 'u1' },
  ];

  it('canAddToTeam permite hasta 6', () => {
    expect(canAddToTeam(members, 'l1', 'e3').ok).toBe(true);
    const six = [...members, ...Array(4).fill(null).map((_, i) => ({ locke_id: 'l1', entry_id: `e${i + 3}`, owner_id: 'u1' }))];
    expect(canAddToTeam(six, 'l1', 'e9').ok).toBe(false);
  });

  it('canAddToTeam rechaza más de 6', () => {
    const full = Array(6).fill(null).map((_, i) => ({ locke_id: 'l1', entry_id: `e${i + 1}`, owner_id: 'u1' }));
    expect(canAddToTeam(full, 'l1', 'e7').ok).toBe(false);
  });

  it('medalsFor incluye equipo de la Liga', () => {
    const awards: any[] = [];
    const medals = medalsFor('e1', 'l1', awards, categories, members);
    expect(medals.find((m: any) => m.key === 'league_team')).toBeDefined();
  });

  it('medalsFor lista premios activos', () => {
    const awards: any[] = [
      { id: 'a1', entry_id: 'e1', category_id: 'c2', deleted_at: null, note: 'Mejor del juego' },
      { id: 'a2', entry_id: 'e1', category_id: 'c1', deleted_at: new Date().toISOString() }, // eliminado
    ];
    const medals = medalsFor('e1', 'l1', awards, categories, members);
    const mvp = medals.find((m: any) => m.key === 'game_mvp') as any;
    expect(mvp).toBeDefined();
    expect(mvp.note).toBe('Mejor del juego');
    expect(medals.find((m: any) => m.key === 'league_team')).toBeDefined();
  });
});

describe('history', () => {
  it('diffSnapshots detecta cambios', () => {
    const prev: any = { nickname: 'Pika', level: 50, nature: 'Serio' };
    const next: any = { nickname: 'Pika', level: 50, nature: 'Audaz', id: 'x', owner_id: 'u' };
    const diff = diffSnapshots(prev, next);
    expect(diff.length).toBe(1);
    expect(diff[0].field).toBe('nature');
    expect(diff[0].from).toBe('Serio');
    expect(diff[0].to).toBe('Audaz');
  });

  it('showValue formatea valores', () => {
    expect(showValue(null)).toBe('—');
    expect(showValue('')).toBe('—');
    expect(showValue(true)).toBe('Sí');
    expect(showValue(false)).toBe('No');
    expect(showValue(['a', 'b'])).toBe('a, b');
    expect(showValue({ hp: 100, atk: 50 })).toBe('hp 100 · atk 50');
    expect(showValue(42)).toBe('42');
  });
});
