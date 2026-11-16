import type { LocalRow } from '../db/local';
import type { StatBlock } from '../import/types';
import type { Visibility } from './locke';

export const STAT_KEYS: (keyof StatBlock)[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
export const STAT_LABEL: Record<keyof StatBlock, string> = { hp: 'PS', atk: 'Ataque', def: 'Defensa', spa: 'At. Esp.', spd: 'Def. Esp.', spe: 'Velocidad' };
export type BlockName = 'stats' | 'ivs' | 'evs';
export type StatInputs = Record<BlockName, Record<keyof StatBlock, string>>;

/** Lo que el formulario edita, todo como texto para poder dejar campos vacíos. */
export interface EntryValues {
  nickname: string; level: string; gender: string; nature: string; ability: string;
  moves: string[]; item: string; tera: string; shiny: boolean; visibility: Visibility;
  blocks: StatInputs;
}

const emptyBlock = (): Record<keyof StatBlock, string> => ({ hp: '', atk: '', def: '', spa: '', spd: '', spe: '' });
export const emptyValues = (): EntryValues => ({
  nickname: '', level: '', gender: '', nature: '', ability: '', moves: ['', '', '', ''], item: '', tera: '',
  shiny: false, visibility: 'private', blocks: { stats: emptyBlock(), ivs: emptyBlock(), evs: emptyBlock() },
});

export function entryToValues(e: LocalRow): EntryValues {
  const block = (b: unknown) => {
    const out = emptyBlock();
    if (b && typeof b === 'object') for (const k of STAT_KEYS) out[k] = String((b as Record<string, number>)[k] ?? '');
    return out;
  };
  const moves = ((e.moves as string[] | null) ?? []).slice(0, 4);
  while (moves.length < 4) moves.push('');
  return {
    nickname: (e.nickname as string | null) ?? '', level: e.level == null ? '' : String(e.level),
    gender: (e.gender as string | null) ?? '', nature: (e.nature as string | null) ?? '', ability: (e.ability as string | null) ?? '',
    moves, item: (e.held_item as string | null) ?? '', tera: (e.tera_type as string | null) ?? '',
    shiny: Boolean(e.is_shiny), visibility: (e.visibility as Visibility) ?? 'private',
    blocks: { stats: block(e.stats), ivs: block(e.ivs), evs: block(e.evs) },
  };
}

/** Un bloque se guarda entero o no se guarda: seis números, o los seis vacíos. */
export function blockError(inputs: StatInputs): string | null {
  const names: Record<BlockName, string> = { stats: 'Estadísticas finales', ivs: 'IV', evs: 'EV' };
  for (const b of Object.keys(names) as BlockName[]) {
    const filled = STAT_KEYS.filter((k) => inputs[b][k].trim() !== '').length;
    if (filled !== 0 && filled !== 6) return `${names[b]}: completa los seis valores o deja la fila vacía.`;
  }
  return null;
}

const toBlock = (r: Record<keyof StatBlock, string>): StatBlock | null =>
  STAT_KEYS.every((k) => r[k].trim() === '') ? null : (Object.fromEntries(STAT_KEYS.map((k) => [k, Number(r[k])])) as unknown as StatBlock);

export function valuesToPatch(v: EntryValues): Record<string, unknown> {
  return {
    nickname: v.nickname.trim() || null, level: v.level ? Number(v.level) : null, gender: v.gender || null,
    nature: v.nature || null, ability: v.ability.trim() || null, moves: v.moves.map((m) => m.trim()).filter(Boolean),
    held_item: v.item.trim() || null, tera_type: v.tera.trim() || null, is_shiny: v.shiny, visibility: v.visibility,
    stats: toBlock(v.blocks.stats), ivs: toBlock(v.blocks.ivs), evs: toBlock(v.blocks.evs),
  };
}

/** Solo los campos que cambiaron: así cada edición queda como una versión limpia en el historial. */
export function changedPatch(before: LocalRow, next: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(next)) {
    if (JSON.stringify(v ?? null) !== JSON.stringify(before[k] ?? null)) out[k] = v;
  }
  return out;
}
