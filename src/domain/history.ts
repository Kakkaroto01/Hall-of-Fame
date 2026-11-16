export type EntryEvent = 'created' | 'edited' | 'evolved' | 'imported';
export const EVENT_LABEL: Record<EntryEvent, string> = { created: 'Creada', edited: 'Editada', evolved: 'Evolución', imported: 'Importada' };

export const FIELD_LABEL: Record<string, string> = {
  form_id: 'Forma', nickname: 'Apodo', level: 'Nivel', gender: 'Sexo', nature: 'Naturaleza', ability: 'Habilidad', moves: 'Movimientos',
  held_item: 'Objeto', is_shiny: 'Variocolor', stats: 'Estadísticas', ivs: 'IV', evs: 'EV', tera_type: 'Teratipo', status: 'Estado',
  death_note: 'Nota de caída', description: 'Descripción', sprite_asset_id: 'Sprite',
};
const IGNORED = new Set(['id', 'locke_id', 'owner_id', 'created_at', 'source', 'import_fingerprint']);

export interface FieldChange { field: string; label: string; from: unknown; to: unknown }

/** Diferencias entre dos versiones consecutivas de una ficha (campos que importan al usuario). */
export function diffSnapshots(prev: Record<string, unknown> | null, next: Record<string, unknown>): FieldChange[] {
  if (!prev) return [];
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const out: FieldChange[] = [];
  for (const k of keys) {
    if (IGNORED.has(k) || !(k in FIELD_LABEL)) continue;
    if (JSON.stringify(prev[k] ?? null) !== JSON.stringify(next[k] ?? null)) out.push({ field: k, label: FIELD_LABEL[k], from: prev[k] ?? null, to: next[k] ?? null });
  }
  return out;
}

export function showValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (Array.isArray(v)) return v.join(', ') || '—';
  if (typeof v === 'object') return Object.entries(v as Record<string, number>).map(([k, n]) => `${k} ${n}`).join(' · ');
  return String(v);
}
