import type { ImportedPokemon } from './types';

/** Columnas de `pokemon_entry` que rellena una importación (ya con nombres resueltos). */
export interface EntryInsert {
  id: string;
  locke_id: string;
  form_id: string;
  nickname: string | null;
  level: number | null;
  gender: 'M' | 'F' | 'N' | null;
  nature: string | null;
  ability: string | null;
  moves: string[];
  held_item: string | null;
  is_shiny: boolean;
  stats: Record<string, number> | null;
  ivs: Record<string, number> | null;
  evs: Record<string, number> | null;
  tera_type: string | null;
  source: 'import';
  import_fingerprint: string | null;
}

/**
 * Convierte la previsualización confirmada en una fila lista para `saveRow('pokemon_entry', ...)`.
 * `formId` lo elige el catálogo (especie + forma) o el usuario si había aviso de forma.
 */
export function toEntryInsert(p: ImportedPokemon, lockeId: string, formId: string): EntryInsert {
  return {
    id: crypto.randomUUID(),
    locke_id: lockeId,
    form_id: formId,
    nickname: p.nickname,
    level: p.level,
    gender: p.gender,
    nature: p.natureName,
    ability: p.abilityName,
    moves: p.moveNames.slice(0, 4),
    held_item: p.heldItemName,
    is_shiny: p.isShiny,
    stats: p.stats ? { ...p.stats } : null,
    ivs: p.ivs ? { ...p.ivs } : null,
    evs: p.evs ? { ...p.evs } : null,
    tera_type: p.teraType,
    source: 'import',
    import_fingerprint: p.fingerprint,
  };
}
