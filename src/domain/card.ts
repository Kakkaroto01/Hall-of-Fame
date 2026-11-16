import type { CardAward, CardData } from '../ui/PokemonCard';
import type { FormRow, LocalRow } from '../db/local';
import type { SpriteSet } from '../catalog/sprites';
import type { StatBlock } from '../import/types';

/** Convierte una fila de `pokemon_entry` (+ su forma y el juego del locke) en los datos de la tarjeta. */
export function entryToCard(entry: LocalRow, form: FormRow | undefined, speciesName: string, spriteSet: SpriteSet, awards: CardAward[] = []): CardData {
  return {
    nickname: (entry.nickname as string | null) ?? null,
    speciesName,
    formName: form && form.form_key !== 'base' ? form.name : null,
    level: (entry.level as number | null) ?? null,
    types: [form?.type1 ?? 'normal', form?.type2 ?? null],
    gender: (entry.gender as 'M' | 'F' | 'N' | null) ?? null,
    shiny: Boolean(entry.is_shiny),
    dead: entry.status === 'dead',
    deathNote: (entry.death_note as string | null) ?? null,
    pokeapiId: form?.pokeapi_id ?? 0,
    spriteSet,
    nature: (entry.nature as string | null) ?? null,
    ability: (entry.ability as string | null) ?? null,
    heldItem: (entry.held_item as string | null) ?? null,
    moves: ((entry.moves as string[] | null) ?? []).filter(Boolean),
    stats: (entry.stats as StatBlock | null) ?? null,
    ivs: (entry.ivs as StatBlock | null) ?? null,
    evs: (entry.evs as StatBlock | null) ?? null,
    awards,
  };
}

export function spriteSetOf(features: Record<string, unknown> | undefined): SpriteSet {
  return ((features?.sprite_set as SpriteSet | undefined) ?? 'home');
}
