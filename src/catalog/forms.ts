export interface FormRow { id: string; species_id: number; form_key: string; name: string }

/**
 * Elige la forma de una especie importada. Los índices de forma de los archivos .pk* no
 * son universales (cada especie los numera distinto), así que solo el índice 0 se resuelve
 * solo; para el resto se devuelve la forma base con un aviso y el usuario la corrige.
 */
export function pickForm(
  forms: FormRow[], speciesId: number, formIndex: number,
): { form: FormRow | null; warning?: string } {
  const base = forms.find((f) => f.species_id === speciesId && f.form_key === 'base') ?? null;
  if (!base) return { form: null, warning: `La especie #${speciesId} no está en el catálogo.` };
  const options = forms.filter((f) => f.species_id === speciesId).length;
  if (formIndex !== 0 && options > 1) {
    return { form: base, warning: `El archivo indica la forma ${formIndex}: revísala (esta especie tiene ${options} formas).` };
  }
  return { form: base };
}
