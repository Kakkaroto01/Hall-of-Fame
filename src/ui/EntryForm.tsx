import { useState, type FormEvent, type ReactNode } from 'react';
import type { NameTables } from '../catalog/names';
import { blockError, STAT_KEYS, STAT_LABEL, type BlockName, type EntryValues } from '../domain/entryValues';
import { VISIBILITY_LABEL, type Visibility } from '../domain/locke';

const BLOCKS: { name: BlockName; title: string; max: number }[] = [
  { name: 'stats', title: 'Estadísticas finales', max: 999 }, { name: 'ivs', title: 'IV', max: 31 }, { name: 'evs', title: 'EV', max: 252 },
];

/** Formulario común de alta y edición. Oculta lo que el juego no tiene (habilidad, naturaleza, teratipo). */
export function EntryForm({ initial, names, features, submitLabel, children, onSubmit }: {
  initial: EntryValues; names: NameTables | null; features: Record<string, unknown>; submitLabel: string;
  children?: ReactNode;                          // p. ej. el selector de especie en el alta
  onSubmit: (v: EntryValues) => void;
}) {
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof EntryValues>(k: K, val: EntryValues[K]) => setV((cur) => ({ ...cur, [k]: val }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = blockError(v.blocks);
    setError(err);
    if (!err) onSubmit(v);
  };

  return (
    <form onSubmit={submit} className="stack form">
      {children}
      <label>Apodo (opcional)<input value={v.nickname} onChange={(e) => set('nickname', e.target.value)} maxLength={12} /></label>
      <label>Nivel<input type="number" min={1} max={100} value={v.level} onChange={(e) => set('level', e.target.value)} /></label>
      <label>Sexo
        <select value={v.gender} onChange={(e) => set('gender', e.target.value)}>
          <option value="">Sin indicar</option><option value="M">Macho</option><option value="F">Hembra</option><option value="N">Sin sexo</option>
        </select>
      </label>
      {features.natures !== false && (
        <label>Naturaleza
          <select value={v.nature} onChange={(e) => set('nature', e.target.value)}>
            <option value="">Sin indicar</option>
            {names?.natures.filter(Boolean).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      )}
      {features.abilities !== false && <label>Habilidad<input value={v.ability} onChange={(e) => set('ability', e.target.value)} /></label>}
      {features.tera === true && <label>Teratipo<input value={v.tera} onChange={(e) => set('tera', e.target.value)} /></label>}
      <fieldset className="stack"><legend>Movimientos</legend>
        {v.moves.map((m, i) => (
          <input key={i} aria-label={`Movimiento ${i + 1}`} value={m} onChange={(e) => set('moves', v.moves.map((x, j) => (j === i ? e.target.value : x)))} />
        ))}
      </fieldset>
      <label>Objeto equipado<input value={v.item} onChange={(e) => set('item', e.target.value)} /></label>
      <label className="choice"><input type="checkbox" checked={v.shiny} onChange={(e) => set('shiny', e.target.checked)} /> Variocolor</label>
      <details className="stack">
        <summary>Estadísticas, IV y EV (opcional)</summary>
        {BLOCKS.map((b) => (features.ivs === false && b.name !== 'stats' ? null : (
          <fieldset key={b.name} className="stack statgrid"><legend>{b.title}</legend>
            {STAT_KEYS.map((k) => (
              <label key={k}>{STAT_LABEL[k]}
                <input type="number" min={0} max={b.max} value={v.blocks[b.name][k]}
                       onChange={(e) => set('blocks', { ...v.blocks, [b.name]: { ...v.blocks[b.name], [k]: e.target.value } })} />
              </label>
            ))}
          </fieldset>
        )))}
      </details>
      <label>Quién puede verla
        <select value={v.visibility} onChange={(e) => set('visibility', e.target.value as Visibility)}>
          {(Object.keys(VISIBILITY_LABEL) as Visibility[]).map((x) => <option key={x} value={x}>{VISIBILITY_LABEL[x]}</option>)}
        </select>
      </label>
      {error && <p role="alert" className="msg msg--error">{error}</p>}
      <button className="btn btn--primary">{submitLabel}</button>
    </form>
  );
}
