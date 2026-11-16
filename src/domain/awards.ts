import type { LocalRow, TeamMemberRow } from '../db/local';
import type { CardAward } from '../ui/PokemonCard';

export const TEAM_MAX = 6;

export type Selection = 'manual' | 'league_team' | 'league_mvp' | 'game_mvp' | 'battle_mvp' | 'series_mvp';

export interface CategoryLite { id: string; kind: 'official' | 'custom'; key: string | null; name: string; selection: Selection; owner_id?: string | null }

export const toCategory = (r: LocalRow): CategoryLite => ({
  id: r.id, kind: r.kind as CategoryLite['kind'], key: (r.key as string | null) ?? null, name: String(r.name), selection: (r.selection as Selection) ?? 'manual', owner_id: r.owner_id as string | null,
});

/** Reglas que la interfaz comprueba antes de enviar (el servidor las vuelve a aplicar). */
export function canAddToTeam(members: TeamMemberRow[], lockeId: string, entryId: string): { ok: boolean; reason?: string } {
  const mine = members.filter((m) => m.locke_id === lockeId);
  if (mine.some((m) => m.entry_id === entryId)) return { ok: true };
  if (mine.length >= TEAM_MAX) return { ok: false, reason: `El equipo de la Liga ya tiene ${TEAM_MAX} Pokémon.` };
  return { ok: true };
}

export const activeAwards = (awards: LocalRow[]) => awards.filter((a) => !a.deleted_at);

/** Medallas de una ficha: los reconocimientos concedidos más la pertenencia al equipo de la Liga (aunque aún no haya sincronizado). */
export function medalsFor(entryId: string, lockeId: string, awards: LocalRow[], categories: CategoryLite[], members: TeamMemberRow[]): CardAward[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const out: CardAward[] = [];
  const seen = new Set<string>();
  for (const a of activeAwards(awards)) {
    if (a.entry_id !== entryId) continue;
    const c = byId.get(a.category_id as string);
    if (!c) continue;
    const key = c.kind === 'official' && c.key ? c.key : 'custom';
    const id = `${c.id}`;
    if (seen.has(id) && !a.pvp_match_id) continue;
    seen.add(id);
    out.push({ key, label: c.name, note: (a.note as string | null) ?? null });
  }
  const inTeam = members.some((m) => m.locke_id === lockeId && m.entry_id === entryId);
  if (inTeam && !out.some((m) => m.key === 'league_team')) out.unshift({ key: 'league_team', label: 'Equipo de la Liga' });
  return out;
}

export const REJECTION_TEXT: Record<string, string> = {
  league_team_full: 'El equipo de la Liga ya tiene 6 Pokémon: se ha deshecho el último cambio.',
  remove_mvp_first: 'No se puede quitar del equipo a quien es MVP de la Liga: quítale antes ese reconocimiento.',
  award_unique_per_locke: 'Ese reconocimiento ya está concedido a otro Pokémon de este locke.',
  award_unique_per_match: 'Ya hay un MVP para ese combate.',
  award_requires_league_team: 'El MVP de la Liga debe estar en el equipo de la Liga.',
  award_requires_pvp: 'Ese reconocimiento solo existe en lockes PvP.',
  award_requires_match: 'Ese reconocimiento necesita elegir un combate.',
  award_category_not_available: 'Esa categoría no está disponible en tu biblioteca.',
  league_entry_mismatch: 'Ese Pokémon no pertenece a este locke.',
};

export function rejectionMessage(raw: string): string | null {
  for (const [code, text] of Object.entries(REJECTION_TEXT)) if (raw.includes(code)) return text;
  return null;
}
