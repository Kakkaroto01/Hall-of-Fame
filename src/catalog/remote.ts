import {
  getFirebaseDb,
  collection,
  query,
  getDocs,
} from '../lib/firebase';
import { db, type FormRow, type SpeciesRow } from '../db/local';
import type { CarouselGame } from '../ui/GameCarousel';

const DAY = 24 * 3600 * 1000;

async function fetchAll<T>(collectionName: string): Promise<T[]> {
  const fb = getFirebaseDb();
  const snap = await getDocs(collection(fb, collectionName));
  const out: T[] = [];
  snap.forEach((d) => out.push({ id: d.id, ...d.data() } as T));
  return out;
}

/** Copia el catálogo de juegos a la base local (se refresca como mucho una vez al día). */
export async function pullCatalogIfStale(force = false): Promise<void> {
  const last = (await db.meta.get('catalog:games'))?.value as number | undefined;
  if (!force && last && Date.now() - last < DAY) return;
  const [groups, games, versions] = await Promise.all([
    fetchAll<any>('game_group'),
    fetchAll<any>('game'),
    fetchAll<any>('game_version'),
  ]);
  await db.transaction('rw', db.game_group, db.game, db.game_version, db.meta, async () => {
    await db.game_group.bulkPut(groups as never[]);
    await db.game.bulkPut(games as never[]);
    await db.game_version.bulkPut(versions as never[]);
    await db.meta.put({ key: 'catalog:games', value: Date.now() });
  });
}

/** Juegos listos para el carrusel, en el orden del catálogo. */
export async function loadCarouselGames(): Promise<CarouselGame[]> {
  const [groups, games, versions] = await Promise.all([
    db.game_group.toArray(),
    db.game.toArray(),
    db.game_version.toArray(),
  ]);
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const rank = (g: { group_id: string | null }) => groupById.get(g.group_id ?? '')?.sort_order ?? 9999;
  return games
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'es'))
    .map((g) => ({
      id: g.id, name: g.name, kind: g.kind, coverUrl: g.cover_url,
      groupName: groupById.get(g.group_id ?? '')?.name ?? 'Hackroms y fangames',
      accent: groupById.get(g.group_id ?? '')?.theme?.accent ?? '#546e7a',
      versions: versions.filter((v: any) => v.game_id === g.id).sort((a: any, b: any) => a.sort_order - b.sort_order).map((v: any) => v.label),
    }));
}

/** Copia especies y formas (≈1 000 y 1 200 filas) para importar y mostrar fichas sin conexión. */
export async function pullFormsIfStale(force = false): Promise<void> {
  const last = (await db.meta.get('catalog:forms'))?.value as number | undefined;
  if (!force && last && Date.now() - last < 7 * DAY) return;
  const [species, forms] = await Promise.all([
    fetchAll<SpeciesRow>('species'),
    fetchAll<FormRow>('form'),
  ]);
  await db.transaction('rw', db.species, db.form, db.meta, async () => {
    await db.species.bulkPut(species);
    await db.form.bulkPut(forms);
    await db.meta.put({ key: 'catalog:forms', value: Date.now() });
  });
}
