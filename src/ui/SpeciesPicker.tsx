import { useEffect, useId, useMemo, useState } from 'react';
import type { NameTables } from '../catalog/names';
import type { FormRow } from '../db/local';

/** Busca una especie por nombre y, si tiene varias formas, deja elegirla. Emite el id de forma (o null). */
export function SpeciesPicker({ names, forms, label = 'Especie', onChange }: {
  names: NameTables | null; forms: FormRow[]; label?: string; onChange: (formId: string | null) => void;
}) {
  const listId = useId();
  const [text, setText] = useState('');
  const [formId, setFormId] = useState('');

  const speciesId = useMemo(() => {
    const k = text.trim().toLowerCase();
    if (!k || !names) return 0;
    const i = names.species.findIndex((n, idx) => idx > 0 && n.toLowerCase() === k);
    return i > 0 ? i : 0;
  }, [text, names]);
  const options = useMemo(() => forms.filter((f) => f.species_id === speciesId), [forms, speciesId]);
  const chosen = options.some((f) => f.id === formId) ? formId : options.find((f) => f.form_key === 'base')?.id ?? '';

  useEffect(() => { onChange(chosen || null); }, [chosen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <datalist id={listId}>{names?.species.map((n, i) => (i > 0 && n ? <option key={i} value={n} /> : null))}</datalist>
      <label>{label}
        <input list={listId} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
      </label>
      {text && !speciesId && <p className="msg small">Elige una especie de la lista.</p>}
      {options.length > 1 && (
        <label>Forma
          <select value={chosen} onChange={(e) => setFormId(e.target.value)}>{options.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        </label>
      )}
    </>
  );
}
