import { ImportError, type ImportedPokemon, type StatBlock } from './types';

const SIZE_STORED = 232;
const SIZE_PARTY = 260;

export const NATURES = [
  'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax',
  'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive', 'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash',
  'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky',
];

/**
 * Lee un .pk6 DESCIFRADO (el que exporta PKHeX): 232 bytes (caja) o 260 (equipo).
 * No valida legalidad: un Pokémon de un juego con randomizer se importa igual.
 * Los .ek6 (cifrados) se rechazan con un mensaje claro.
 */
export function parsePk6(bytes: Uint8Array): ImportedPokemon {
  if (bytes.length !== SIZE_STORED && bytes.length !== SIZE_PARTY) {
    throw new ImportError('bad_size', `Tamaño inesperado (${bytes.length} bytes): un .pk6 mide 232 o 260.`);
  }
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u8 = (o: number) => v.getUint8(o);
  const u16 = (o: number) => v.getUint16(o, true);
  const u32 = (o: number) => v.getUint32(o, true);

  let sum = 0;
  for (let o = 0x08; o < SIZE_STORED; o += 2) sum = (sum + u16(o)) & 0xffff;
  if (sum !== u16(0x06)) {
    throw new ImportError(
      'bad_checksum',
      'El checksum no coincide: el archivo está dañado o cifrado (.ek6). Exporta el .pk6 descifrado desde PKHeX.',
    );
  }

  const speciesId = u16(0x08);
  if (speciesId < 1 || speciesId > 721) {
    throw new ImportError('bad_species', `Especie fuera del rango de Gen 6 (${speciesId}).`);
  }

  const ec = u32(0x00);
  const pid = u32(0x18);
  const tid = u16(0x0c);
  const sid = u16(0x0e);
  const flags = u8(0x1d);
  const genderBits = (flags >> 1) & 3;
  const iv32 = u32(0x74);
  const nicknamed = ((iv32 >>> 31) & 1) === 1;
  const party = bytes.length === SIZE_PARTY;

  const text = (off: number, chars: number) =>
    new TextDecoder('utf-16le').decode(bytes.subarray(off, off + chars * 2)).split('\0')[0];

  const ivs: StatBlock = {
    hp: iv32 & 31, atk: (iv32 >>> 5) & 31, def: (iv32 >>> 10) & 31,
    spe: (iv32 >>> 15) & 31, spa: (iv32 >>> 20) & 31, spd: (iv32 >>> 25) & 31,
  };
  const evs: StatBlock = {
    hp: u8(0x1e), atk: u8(0x1f), def: u8(0x20), spe: u8(0x21), spa: u8(0x22), spd: u8(0x23),
  };
  const stats: StatBlock | null = party
    ? { hp: u16(0xf2), atk: u16(0xf4), def: u16(0xf6), spe: u16(0xf8), spa: u16(0xfa), spd: u16(0xfc) }
    : null;

  const natureId = u8(0x1c);
  const moves = [u16(0x5a), u16(0x5c), u16(0x5e), u16(0x60)].filter((m) => m !== 0);
  const item = u16(0x0a);

  return {
    source: 'pk6',
    generation: 6,
    speciesId,
    speciesName: null,
    formIndex: flags >> 3,
    nickname: nicknamed ? text(0x40, 12) : null,
    level: party ? u8(0xec) : null,
    gender: genderBits === 0 ? 'M' : genderBits === 1 ? 'F' : 'N',
    natureId,
    natureName: NATURES[natureId] ?? null,
    abilityId: u8(0x14),
    abilityName: null,
    moveIds: moves,
    moveNames: [],
    heldItemId: item === 0 ? null : item,
    heldItemName: null,
    isShiny: ((tid ^ sid ^ (pid >>> 16) ^ (pid & 0xffff)) >>> 0) < 16,
    teraType: null,
    ivs,
    evs,
    stats,
    otName: text(0xb0, 12),
    tid,
    sid,
    fingerprint: `pk6:${ec.toString(16)}:${pid.toString(16)}:${tid}:${sid}`,
    warnings: [],
  };
}
