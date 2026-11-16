export type Lang = 'en' | 'es';

/** Tablas indexadas por el ID de juego que usan los archivos .pk* (índice 0 = vacío). */
export interface NameTables {
  species: string[];
  moves: string[];
  abilities: string[];
  items: string[];
  natures: string[];
}

const cache = new Map<Lang, Promise<NameTables>>();

/** Carga perezosa: cada idioma es un chunk aparte (~65 KB). */
export function loadNames(lang: Lang): Promise<NameTables> {
  let p = cache.get(lang);
  if (!p) {
    p = (lang === 'es' ? import('./data/names.es.json') : import('./data/names.en.json'))
      .then((m) => m.default as NameTables);
    cache.set(lang, p);
  }
  return p;
}
