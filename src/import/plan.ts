import { pickForm } from '../catalog/forms';
import { resolveImported } from '../catalog/resolve';
import type { NameTables } from '../catalog/names';
import type { FormRow } from '../db/local';
import type { ImportedPokemon } from './types';
import { toEntryInsert, type EntryInsert } from './toEntry';

export type ImportAction = 'create' | 'update' | 'skip';

/** Una fila de la previsualización: nada se guarda hasta que el usuario la confirma. */
export interface ImportItem {
  key: string;
  label: string;                  // archivo o "Showdown n"
  error?: string;
  mon?: ImportedPokemon;
  formId: string | null;
  formOptions: FormRow[];
  warnings: string[];
  duplicateOf: string | null;     // id de la ficha existente con la misma huella
  action: ImportAction;
  level: number | null;
}

export interface PlanDeps {
  display: NameTables;
  en: NameTables;
  forms: FormRow[];
  findDuplicate: (fingerprint: string) => string | null;
}

/**
 * Prepara la previsualización. Si hay un posible duplicado, la acción por defecto es
 * «omitir»: nunca se fusiona ni se sobrescribe sin que el usuario lo elija.
 */
export function prepareImport(inputs: { label: string; mon?: ImportedPokemon; error?: string }[], deps: PlanDeps): ImportItem[] {
  return inputs.map((inp, i) => {
    const key = `${i}:${inp.label}`;
    if (!inp.mon) return { key, label: inp.label, error: inp.error ?? 'No se pudo leer.', formId: null, formOptions: [], warnings: [], duplicateOf: null, action: 'skip', level: null };
    const mon = resolveImported(inp.mon, deps.display, deps.en);
    const warnings = [...mon.warnings];
    let formId: string | null = null;
    let formOptions: FormRow[] = [];
    if (mon.speciesId !== null) {
      formOptions = deps.forms.filter((f) => f.species_id === mon.speciesId);
      const picked = pickForm(formOptions, mon.speciesId, mon.formIndex);
      formId = picked.form?.id ?? null;
      if (picked.warning) warnings.push(picked.warning);
    }
    const duplicateOf = mon.fingerprint ? deps.findDuplicate(mon.fingerprint) : null;
    if (duplicateOf) warnings.push('Parece que ya tienes esta ficha. Elige si actualizarla, crear otra o saltarla.');
    return { key, label: inp.label, mon, formId, formOptions, warnings, duplicateOf, action: duplicateOf || !formId ? 'skip' : 'create', level: mon.level };
  });
}

/** Columnas que se escriben al guardar (la importación no toca visibilidad ni estado). */
export function itemToInsert(item: ImportItem, lockeId: string): EntryInsert {
  if (!item.mon || !item.formId) throw new Error('Ficha sin forma elegida');
  return { ...toEntryInsert(item.mon, lockeId, item.formId), level: item.level };
}

export function itemToPatch(item: ImportItem): Record<string, unknown> {
  const { id: _id, locke_id: _l, source: _s, ...rest } = itemToInsert(item, '');
  return rest;
}
