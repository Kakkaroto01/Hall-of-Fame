import type { ImportedPokemon } from '../import/types';
import type { NameTables } from './names';

const norm = (s: string | null) => (s ? s.toLowerCase().replace(/[^a-z0-9]/g, '') : '');

type Index = Map<string, number>;
function index(list: string[]): Index {
  const m: Index = new Map();
  list.forEach((name, id) => {
    const k = norm(name);
    if (k && id > 0 && !m.has(k)) m.set(k, id);       // gana el primer ID
  });
  return m;
}

/**
 * Completa la previsualización:
 *  - binarios (IDs) → nombres en el idioma de `display`;
 *  - Showdown (nombres en inglés) → IDs y nombres en el idioma de `display`.
 * Lo que no se reconoce se conserva tal cual y se añade a `warnings`.
 */
export function resolveImported(p: ImportedPokemon, display: NameTables, en: NameTables): ImportedPokemon {
  const out: ImportedPokemon = { ...p, warnings: [...p.warnings] };
  const name = (list: string[], id: number | null) => (id !== null ? list[id] || null : null);

  // Especie
  if (out.speciesId === null && out.speciesName) {
    const sp = index(en.species);
    let id = sp.get(norm(out.speciesName));
    if (id === undefined && out.speciesName.includes('-')) {
      id = sp.get(norm(out.speciesName.split('-')[0]));
      if (id !== undefined) out.warnings.push(`Forma "${out.speciesName}": se usó la especie base; elige la forma a mano.`);
    }
    if (id === undefined) out.warnings.push(`Especie no reconocida: "${out.speciesName}".`);
    else out.speciesId = id;
  }
  out.speciesName = name(display.species, out.speciesId) ?? out.speciesName;

  // Habilidad
  if (out.abilityId === null && out.abilityName) {
    const id = index(en.abilities).get(norm(out.abilityName));
    if (id === undefined) out.warnings.push(`Habilidad no reconocida: "${out.abilityName}".`);
    else out.abilityId = id;
  }
  out.abilityName = name(display.abilities, out.abilityId) ?? out.abilityName;

  // Objeto
  if (out.heldItemId === null && out.heldItemName) {
    const id = index(en.items).get(norm(out.heldItemName));
    if (id === undefined) out.warnings.push(`Objeto no reconocido: "${out.heldItemName}".`);
    else out.heldItemId = id;
  }
  out.heldItemName = name(display.items, out.heldItemId) ?? out.heldItemName;

  // Movimientos
  if (out.moveIds.length === 0 && out.moveNames.length > 0) {
    const mv = index(en.moves);
    const ids: number[] = [];
    for (const n of out.moveNames) {
      const id = mv.get(norm(n));
      if (id === undefined) out.warnings.push(`Movimiento no reconocido: "${n}".`);
      else ids.push(id);
    }
    out.moveIds = ids;
  }
  out.moveNames = out.moveIds.map((id) => display.moves[id] || `#${id}`);

  // Naturaleza
  if (out.natureId === null && out.natureName) {
    const idx = en.natures.findIndex((n) => norm(n) === norm(out.natureName!));
    if (idx < 0) out.warnings.push(`Naturaleza no reconocida: "${out.natureName}".`);
    else out.natureId = idx;
  }
  out.natureName = name(display.natures, out.natureId) ?? out.natureName;

  return out;
}
