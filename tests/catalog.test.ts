import { describe, it, expect } from 'vitest';
import { resolveImported } from '../src/catalog/resolve';
import { pickForm } from '../src/catalog/forms';

const display: any = {
  species: [null, 'Bulbasaur', 'Pikachu', 'Charizard'],
  moves: [null, 'Placaje', 'Ataque Rápido', 'Lanzallamas'],
  abilities: [null, 'Sobrepeso', 'Electricidad Estática', 'Mar Llamas'],
  items: [null, 'Baya', 'Poción'],
  natures: [null, 'Serio', 'Audaz'],
};
const en: any = {
  species: [null, 'Bulbasaur', 'Pikachu', 'Charizard'],
  moves: [null, 'Tackle', 'Quick Attack', 'Flamethrower'],
  abilities: [null, 'Overgrow', 'Static', 'Blaze'],
  items: [null, 'Berry', 'Potion'],
  natures: [null, 'Serious', 'Hardy'],
};

describe('resolveImported', () => {
  it('resuelve especie por nombre en inglés y muestra en español', () => {
    const p: any = {
      source: 'showdown', generation: null, speciesId: null, speciesName: 'Pikachu', formIndex: 0,
      nickname: null, level: 50, gender: null, natureId: null, natureName: 'Hardy', abilityId: null,
      abilityName: 'Static', moveIds: [], moveNames: [], heldItemId: null, heldItemName: null,
      isShiny: false, teraType: null, ivs: null, evs: null, stats: null, otName: null, tid: null, sid: null,
      fingerprint: null, warnings: [],
    };
    const r = resolveImported(p, display, en);
    expect(r.speciesId).toBe(2);
    expect(r.speciesName).toBe('Pikachu');
  });

  it('añade aviso si especie no reconocida', () => {
    const p: any = {
      source: 'showdown', generation: null, speciesId: null, speciesName: 'Pokimon', formIndex: 0,
      nickname: null, level: 50, gender: null, natureId: null, natureName: 'Hardy', abilityId: null,
      abilityName: 'Static', moveIds: [], moveNames: [], heldItemId: null, heldItemName: null,
      isShiny: false, teraType: null, ivs: null, evs: null, stats: null, otName: null, tid: null, sid: null,
      fingerprint: null, warnings: [],
    };
    const r = resolveImported(p, display, en);
    expect(r.speciesId).toBeNull();
    expect(r.warnings.some((w: string) => w.includes('Pokimon'))).toBe(true);
  });

  it('resuelve movimientos y habilidades', () => {
    const p: any = {
      source: 'showdown', generation: null, speciesId: 2, speciesName: 'Pikachu', formIndex: 0,
      nickname: null, level: 50, gender: null, natureId: null, natureName: 'Hardy', abilityId: null,
      abilityName: 'Static', moveIds: [], moveNames: ['Tackle', 'Quick Attack'], heldItemId: null,
      heldItemName: null, isShiny: false, teraType: null, ivs: null, evs: null, stats: null,
      otName: null, tid: null, sid: null, fingerprint: null, warnings: [],
    };
    const r = resolveImported(p, display, en);
    expect(r.abilityId).toBe(2);
    expect(r.abilityName).toBe('Electricidad Estática');
    expect(r.moveIds).toEqual([1, 2]);
    expect(r.moveNames).toEqual(['Placaje', 'Ataque Rápido']);
  });
});

describe('pickForm', () => {
  const forms: any[] = [
    { id: 'f1', species_id: 1, form_key: 'base', name: 'Base' },
    { id: 'f2', species_id: 1, form_key: 'alola', name: 'Alola' },
  ];

  it('devuelve forma base por defecto', () => {
    const r = pickForm(forms, 1, 0);
    expect(r.form?.form_key).toBe('base');
    expect(r.warning).toBeUndefined();
  });

  it('avisa si forma no es 0 y hay varias', () => {
    const r = pickForm(forms, 1, 1);
    expect(r.form?.form_key).toBe('base');
    expect(r.warning).toContain('forma 1');
  });

  it('devuelve null si especie no está en catálogo', () => {
    const r = pickForm(forms, 999, 0);
    expect(r.form).toBeNull();
    expect(r.warning).toContain('#999');
  });
});
