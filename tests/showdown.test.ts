import { describe, it, expect } from 'vitest';
import { parseShowdown } from '../src/import/showdown';
import type { ImportedPokemon } from '../src/import/types';

describe('parseShowdown', () => {
  it('parsea bloque con apodo entre paréntesis', () => {
    const text = `Pika (Pikachu) @ Light Ball
Ability: Static
Level: 50
- Thunderbolt`;

    const mons = parseShowdown(text);
    expect(mons.length).toBe(1);
    expect(mons[0].nickname).toBe('Pika');
    expect(mons[0].speciesName).toBe('Pikachu');
    expect(mons[0].heldItemName).toBe('Light Ball');
    expect(mons[0].moveNames).toEqual(['Thunderbolt']);
  });

  it('parsea género al final de la especie', () => {
    const text = `Pikachu (M) @ Leftovers
Ability: Static
- Thunderbolt`;

    const mons = parseShowdown(text);
    expect(mons[0].gender).toBe('M');
  });

  it('parsea naturaleza en línea separada', () => {
    const text = `Pikachu
Timid Nature
EVs: 252 Spe / 4 SpD
- Thunderbolt`;

    const mons = parseShowdown(text);
    expect(mons.length).toBeGreaterThan(0);
    const mon = mons[0] as ImportedPokemon;
    expect(mon.natureName).toBe('Timid');
    expect(mon.evs!.spe).toBe(252);
    expect(mon.evs!.spd).toBe(4);
  });

  it('detecta shiny yes', () => {
    const text = `Pikachu
Shiny: Yes
- Thunderbolt`;

    const mons = parseShowdown(text);
    expect(mons[0].isShiny).toBe(true);
  });

  it('detecta shiny no', () => {
    const text = `Pikachu
Shiny: No
- Thunderbolt`;

    const mons = parseShowdown(text);
    expect(mons[0].isShiny).toBe(false);
  });

  it('parsea tera type', () => {
    const text = `Pikachu
Tera Type: Electric
- Thunderbolt`;

    const mons = parseShowdown(text);
    expect(mons[0].teraType).toBe('Electric');
  });

  it('rechaza bloque sin especie válida', () => {
    expect(() => parseShowdown('  \n  ')).toThrow();
  });

  it('ignora líneas vacías entre bloques', () => {
    const text = `Pikachu
- Thunderbolt

Charizard
- Flamethrower

Blastoise
- Hidrobomba`;

    const mons = parseShowdown(text);
    expect(mons.length).toBe(3);
  });
});
