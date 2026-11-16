/**
 * Resolución de sprites. Los de especies y formas oficiales se derivan por regla desde el
 * repositorio PokeAPI/sprites (no hay una fila por sprite en la base de datos); la tabla
 * `sprite_asset` queda para sprites propios de fangames y para elecciones del usuario.
 * Prioridad: sprite_asset elegido por el usuario > candidatos de aquí, en orden, hasta que uno cargue.
 */
export type SpriteSet =
  | 'red-blue' | 'yellow' | 'gold' | 'silver' | 'crystal'
  | 'ruby-sapphire' | 'emerald' | 'firered-leafgreen'
  | 'diamond-pearl' | 'platinum' | 'heartgold-soulsilver'
  | 'black-white' | 'x-y' | 'home';

/** Raw de GitHub está verificado; en producción conviene un CDN o alojarlos tú (VITE_SPRITE_BASE). */
export const DEFAULT_SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

const SET_FOLDER: Record<Exclude<SpriteSet, 'home'>, [string, number, boolean]> = {
  // [carpeta de generación, nº máximo de especie con sprite, tiene versión shiny]
  'red-blue': ['generation-i', 151, false],
  yellow: ['generation-i', 151, false],
  gold: ['generation-ii', 251, true],
  silver: ['generation-ii', 251, true],
  crystal: ['generation-ii', 251, true],
  'ruby-sapphire': ['generation-iii', 386, true],
  emerald: ['generation-iii', 386, true],
  'firered-leafgreen': ['generation-iii', 386, true],
  'diamond-pearl': ['generation-iv', 493, true],
  platinum: ['generation-iv', 493, true],
  'heartgold-soulsilver': ['generation-iv', 493, true],
  'black-white': ['generation-v', 649, true],
  'x-y': ['generation-vi', 721, true],
};

export interface SpriteQuery {
  /** `form.pokeapi_id` (los ids > 10000 son formas alternativas) */
  pokeapiId: number;
  set: SpriteSet;
  shiny: boolean;
  base?: string;
}

/** URLs a probar en orden; la interfaz usa la primera que cargue (onError → siguiente). */
export function spriteCandidates(q: SpriteQuery): string[] {
  const base = q.base ?? DEFAULT_SPRITE_BASE;
  const id = q.pokeapiId;
  const shiny = q.shiny ? 'shiny/' : '';
  const urls: string[] = [];

  if (q.set !== 'home') {
    const [folder, max, hasShiny] = SET_FOLDER[q.set];
    if (id <= max && (!q.shiny || hasShiny)) urls.push(`${base}/versions/${folder}/${q.set}/${shiny}${id}.png`);
  }
  // Gen 6 en 3D como alternativa para juegos antiguos sin ese sprite (solo especies ≤ 721)
  if (q.set !== 'x-y' && q.set !== 'home' && id <= 721) urls.push(`${base}/versions/generation-vi/x-y/${shiny}${id}.png`);
  urls.push(`${base}/other/home/${shiny}${id}.png`);
  urls.push(`${base}/${shiny}${id}.png`);
  return [...new Set(urls)];
}

/** Sprite animado (Gen V): solo existe hasta la especie 649; si no hay, se usa el estático. */
export function animatedUrl(q: Pick<SpriteQuery, 'pokeapiId' | 'shiny' | 'base'>): string | null {
  if (q.pokeapiId > 649) return null;
  const base = q.base ?? DEFAULT_SPRITE_BASE;
  return `${base}/versions/generation-v/black-white/animated/${q.shiny ? 'shiny/' : ''}${q.pokeapiId}.gif`;
}

/** Carga la primera URL válida (solo navegador). Devuelve null si ninguna carga. */
export function firstLoadable(urls: string[], timeoutMs = 8000): Promise<string | null> {
  return urls.reduce<Promise<string | null>>(async (prev, url) => {
    const found = await prev;
    if (found) return found;
    return new Promise((resolve) => {
      const img = new Image();
      const t = setTimeout(() => resolve(null), timeoutMs);
      img.onload = () => { clearTimeout(t); resolve(url); };
      img.onerror = () => { clearTimeout(t); resolve(null); };
      img.src = url;
    });
  }, Promise.resolve(null));
}
