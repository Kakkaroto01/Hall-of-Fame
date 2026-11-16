import { ImportError, type ImportedPokemon, type StatBlock } from './types';

const STAT_KEYS: Record<string, keyof StatBlock> = {
  hp: 'hp', atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe',
  spatk: 'spa', spdef: 'spd', speed: 'spe',
};

function statLine(value: string, base: number): StatBlock {
  const out: StatBlock = { hp: base, atk: base, def: base, spa: base, spd: base, spe: base };
  for (const part of value.split('/')) {
    const m = part.trim().match(/^(\d+)\s+([A-Za-z]+)$/);
    const key = m && STAT_KEYS[m[2].toLowerCase()];
    if (m && key) out[key] = Number(m[1]);
  }
  return out;
}

/** Interpreta el texto de equipo de Pokémon Showdown (uno o varios Pokémon separados por línea en blanco). */
export function parseShowdown(text: string): ImportedPokemon[] {
  const blocks = text.replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) throw new ImportError('bad_text', 'No hay texto que importar.');
  return blocks.map(parseBlock);
}

function parseBlock(block: string): ImportedPokemon {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  let head = lines[0];

  let item: string | null = null;
  const at = head.lastIndexOf(' @ ');
  if (at >= 0) { item = head.slice(at + 3).trim(); head = head.slice(0, at).trim(); }

  let gender: ImportedPokemon['gender'] = null;
  const g = head.match(/\s\((M|F)\)$/);
  if (g) { gender = g[1] as 'M' | 'F'; head = head.slice(0, g.index).trim(); }

  let nickname: string | null = null;
  let species = head;
  const paren = head.match(/^(.*)\s\(([^()]+)\)$/);
  if (paren) { nickname = paren[1].trim(); species = paren[2].trim(); }
  if (!species) throw new ImportError('bad_text', `No se reconoce la especie en: "${lines[0]}"`);

  const mon: ImportedPokemon = {
    source: 'showdown', generation: null, speciesId: null, speciesName: species, formIndex: 0,
    nickname, level: 100, gender, natureId: null, natureName: null, abilityId: null, abilityName: null,
    moveIds: [], moveNames: [], heldItemId: null, heldItemName: item, isShiny: false, teraType: null,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    stats: null, otName: null, tid: null, sid: null, fingerprint: null, warnings: [],
  };

  for (const line of lines.slice(1)) {
    if (line.startsWith('- ')) { mon.moveNames.push(line.slice(2).trim()); continue; }
    const nat = line.match(/^([A-Za-z]+) Nature$/i);
    if (nat) { mon.natureName = nat[1]; continue; }
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === 'ability') mon.abilityName = value;
    else if (key === 'level') mon.level = Number(value) || 100;
    else if (key === 'shiny') mon.isShiny = /^yes$/i.test(value);
    else if (key === 'tera type') mon.teraType = value;
    else if (key === 'evs') mon.evs = statLine(value, 0);
    else if (key === 'ivs') mon.ivs = statLine(value, 31);
  }
  return mon;
}
