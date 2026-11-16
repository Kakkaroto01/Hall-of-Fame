import { describe, it, expect } from 'vitest';
import { parsePk6 } from '../src/import/pk6';
import { parseShowdown } from '../src/import/showdown';

describe('parsePk6', () => {
  it('rechaza archivos con tamaño incorrecto', () => {
    expect(() => parsePk6(new Uint8Array([1, 2, 3]))).toThrow();
  });

  it('rechaza archivos con checksum incorrecto', () => {
    // 232 bytes de ceros -> checksum 0, pero el campo en 0x06 es 0, así que pasa el checksum.
    // Para forzar error, ponemos un byte que rompa la suma sin ajustar el checksum.
    const bytes = new Uint8Array(232);
    bytes[0x08] = 1; // speciesId = 1 (válido)
    // checksum en 0x06 queda 0, pero la suma real no es 0 porque hay un byte en 0x08
    expect(() => parsePk6(bytes)).toThrow(/checksum/);
  });

  function buildValidPk6(overrides: { [offset: number]: number | Uint8Array } = {}): Uint8Array {
    const bytes = new Uint8Array(232);
    const view = new DataView(bytes.buffer);

    // Aplicar overrides simples (números de 1 byte en un offset)
    for (const [off, val] of Object.entries(overrides)) {
      const o = Number(off);
      const v = overrides[o];
      if (typeof v === 'number') {
        bytes[o] = v;
      }
    }

    // speciesId = 25 (Pikachu) en 0x08
    bytes[0x08] = 25;
    bytes[0x09] = 0;

    // Calcular checksum sobre 0x08..232
    let sum = 0;
    for (let o = 0x08; o < 232; o += 2) sum = (sum + view.getUint16(o, true)) & 0xffff;
    view.setUint16(0x06, sum, true);

    return bytes;
  }

  it('parsea un .pk6 válido de 232 bytes (caja)', () => {
    const bytes = buildValidPk6({
      0x0e: 1000, // SID = 1000 para que no sea shiny
      0x1c: 0,   // natureId = 0 (Hardy)
      0x14: 1,   // ability
      0x0a: 0,   // item = ninguno
      0x1d: 0,   // flags = macho, forma base, no apodado
    });

    const mon = parsePk6(bytes);
    expect(mon.speciesId).toBe(25);
    expect(mon.generation).toBe(6);
    expect(mon.isShiny).toBe(false);
    expect(mon.nickname).toBeNull();
    expect(mon.level).toBeNull();
  });

  it('detecta variocolor por shiny', () => {
    const bytes = buildValidPk6({
      0x0c: 0,   // TID = 0
      0x0e: 0,   // SID = 0 -> shiny (0 ^ 0 ^ 0 ^ 0) >>> 0 = 0 < 16
      0x1c: 0,
      0x14: 1,
      0x0a: 0,
      0x1d: 0,
    });

    const mon = parsePk6(bytes);
    expect(mon.isShiny).toBe(true);
  });
});

describe('parseShowdown', () => {
  it('parsea un bloque simple de Showdown', () => {
    const text = `Pikachu @ Light Ball
Ability: Static
Level: 50
Shiny: Yes
Tera Type: Electric
EVs: 252 Atk / 4 SpD / 252 Spe
Impish Nature
- Thunderbolt
- Iron Tail
- Quick Attack
- Electro Ball`;

    const mons = parseShowdown(text);
    expect(mons.length).toBe(1);
    const mon = mons[0];
    expect(mon.speciesName).toBe('Pikachu');
    expect(mon.heldItemName).toBe('Light Ball');
    expect(mon.abilityName).toBe('Static');
    expect(mon.level).toBe(50);
    expect(mon.isShiny).toBe(true);
    expect(mon.teraType).toBe('Electric');
    expect(mon.natureName).toBe('Impish');
    expect(mon.moveNames).toEqual(['Thunderbolt', 'Iron Tail', 'Quick Attack', 'Electro Ball']);
    expect(mon.evs).toEqual({ hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 });
  });

  it('rechaza texto vacío', () => {
    expect(() => parseShowdown('')).toThrow();
  });

  it('parsea múltiples bloques separados por línea en blanco', () => {
    const text = `Pikachu @ Light Ball
- Thunderbolt

Charizard @ Charizardite X
- Flamethrower`;

    const mons = parseShowdown(text);
    expect(mons.length).toBe(2);
    expect(mons[0].speciesName).toBe('Pikachu');
    expect(mons[1].speciesName).toBe('Charizard');
  });
});
