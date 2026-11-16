import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/local';
import { medalsFor, toCategory, type CategoryLite } from './awards';
import type { CardAward } from '../ui/PokemonCard';

/** Reconocimientos de un locke, ya combinados con el equipo de la Liga, listos para las tarjetas. */
export function useAwards(lockeId: string) {
  const data = useLiveQuery(async () => {
    const [awards, cats, members] = await Promise.all([
      db.award.where('locke_id').equals(lockeId).toArray(), db.category.toArray(), db.league_team_member.where('locke_id').equals(lockeId).toArray(),
    ]);
    return { awards, categories: cats.filter((c) => !c.deleted_at).map(toCategory), members };
  }, [lockeId]);
  const categories: CategoryLite[] = data?.categories ?? [];
  return {
    ready: data !== undefined,
    categories,
    awards: data?.awards ?? [],
    members: data?.members ?? [],
    medalsOf: (entryId: string): CardAward[] => (data ? medalsFor(entryId, lockeId, data.awards, data.categories, data.members) : []),
  };
}
