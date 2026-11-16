import { describe, it, expect } from 'vitest';
import { prepareImport, itemToInsert, itemToPatch } from '../src/import/plan';
import type { ImportedPokemon } from '../src/import/types';

const mon: ImportedPokemon = {
  source: 'pk6', generation: 6, speciesId: 25, speciesName: 'Pikachu', formIndex: 0,
  nickname: 'Pika', level: 50, gender: 'M', natureId: 0, natureName: 'Serio',
  abilityId: 1, abilityName: 'Estático', moveIds: [1, 2], moveNames: ['Placaje', 'Ataque Rápido'],
  heldItemId: null, heldItemName: null, isShiny: false, teraType: null,
  ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 },
  stats: { hp: 100, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 },
  otName: 'Entrenador', tid: 12345, sid: 67890,
  fingerprint: 'pk6:abc:def:1:2',
  warnings: [],
};

const display: any = {
  species: [null, 'Bulbasaur', 'Pikachu'],
  moves: [null, 'Placaje', 'Ataque Rápido'],
  abilities: [null, 'Sobrepeso', 'Electricidad Estática'],
  items: [null, 'Baya'],
  natures: [null, 'Serio'],
};
const en: any = {
  species: [null, 'Bulbasaur', 'Pikachu'],
  moves: [null, 'Tackle', 'Quick Attack'],
  abilities: [null, 'Overgrow', 'Static'],
  items: [null, 'Berry'],
  natures: [null, 'Serious'],
};

const forms: any[] = [
  { id: 'f1', species_id: 25, form_key: 'base', name: 'Base' },
];

describe('prepareImport', () => {
  it('prepara un ítem para crear', () => {
    const items = prepareImport([{ label: 'archivo.pk6', mon, error: undefined }], {
      display, en, forms,
      findDuplicate: () => null as string | null,
    });
    expect(items.length).toBe(1);
    expect(items[0].action).toBe('create');
    expect(items[0].formId).toBe('f1');
    expect(items[0].duplicateOf).toBeNull();
  });

  it('marca como skip si hay duplicado', () => {
    const items = prepareImport([{ label: 'archivo.pk6', mon, error: undefined }], {
      display, en, forms,
      findDuplicate: () => 'existing-id',
    });
    expect(items[0].action).toBe('skip');
    expect(items[0].duplicateOf).toBe('existing-id');
  });

  it('marca como skip si hay error de lectura', () => {
    const items = prepareImport([{ label: 'archivo.pk6', mon: undefined, error: 'Checksum inválido' }], {
      display, en, forms,
      findDuplicate: () => null as string | null,
    });
    expect(items[0].action).toBe('skip');
    expect(items[0].error).toBe('Checksum inválido');
  });

  it('itemToInsert genera fila de entrada', () => {
    const item: any = { ...prepareImport([{ label: 'x', mon, error: undefined }], {
      display, en, forms,
      findDuplicate: () => null as string | null,
    })[0] };
    const insert = itemToInsert(item, 'locke-1');
    expect(insert.locke_id).toBe('locke-1');
    expect(insert.form_id).toBe('f1');
    expect(insert.nickname).toBe('Pika');
    expect(insert.level).toBe(50);
    expect(insert.source).toBe('import');
  });

  it('itemToPatch genera patch sin campos internos', () => {
    const item: any = { ...prepareImport([{ label: 'x', mon, error: undefined }], {
      display, en, forms,
      findDuplicate: () => null as string | null,
    })[0] };
    const patch = itemToPatch(item);
    expect(patch.id).toBeUndefined();
    expect(patch.locke_id).toBeUndefined();
    expect(patch.source).toBeUndefined();
    expect(patch.nickname).toBe('Pika');
  });
});
