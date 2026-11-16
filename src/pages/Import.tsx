import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db, saveRow } from '../db/local';
import { loadNames } from '../catalog/names';
import { DISPLAY_LANG } from '../config';
import { parsePk6 } from '../import/pk6';
import { parseShowdown } from '../import/showdown';
import { prepareImport, type ImportItem } from '../import/plan';
import { SyncChip } from '../layout/Shell';

export function Import() {
  const { id: lockeId } = useParams<{ id: string }>();
  const { session } = useAuth();
  const me = session?.uid ?? null;
  const navigate = useNavigate();
  const [names, setNames] = useState<any>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [forms, setForms] = useState<any[]>([]);

  useEffect(() => {
    loadNames(DISPLAY_LANG).then(setNames);
    loadNames('en').then(() => { /* en names loaded for resolve */ });
    db.form.toArray().then(setForms);
  }, []);

  const checkDuplicate = async (fingerprint: string | null): Promise<string | null> => {
    if (!fingerprint || !lockeId) return null;
    const rows = await db.pokemon_entry.where('import_fingerprint').equals(fingerprint).filter((e: any) => e.locke_id === lockeId).toArray();
    return rows.length > 0 ? rows[0].id : null;
  };

  const readPk6 = async (file: File) => {
    const ab = await file.arrayBuffer();
    const bytes = new Uint8Array(ab);
    try {
      return { mon: parsePk6(bytes), error: undefined };
    } catch (e: any) {
      return { mon: null, error: e.message ?? String(e) };
    }
  };

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);
    const inputs = await Promise.all(files.map(async (f) => {
      const r = await readPk6(f);
      return { label: f.name, mon: r.mon, error: r.error };
    }));
    await buildPlan(inputs);
  };

  const onText = async () => {
    if (!rawText.trim()) return;
    setError(null);
    let mons: any[];
    try {
      mons = parseShowdown(rawText);
    } catch (e: any) {
      setError(e.message ?? String(e));
      return;
    }
    const inputs = mons.map((m: any, i: number) => ({ label: `Showdown ${i + 1}`, mon: m, error: undefined }));
    await buildPlan(inputs);
  };

  const buildPlan = async (inputs: { label: string; mon: any; error: string | undefined }[]) => {
    if (!names) return;
    const filled = await Promise.all(inputs.map(async (inp) => {
      let duplicateOf: string | null = null;
      if (inp.mon?.fingerprint) duplicateOf = await checkDuplicate(inp.mon.fingerprint);
      return { ...inp, duplicateOf };
    }));
    const en = await loadNames('en');
    const plan = prepareImport(filled, {
      display: names,
      en,
      forms,
      findDuplicate: () => null,
    } as any);
    const merged = plan.map((p: any, i: number) => ({ ...p, duplicateOf: filled[i].duplicateOf ?? p.duplicateOf, error: p.error ?? undefined }));
    setItems(merged as any);
  };

  const confirmItem = async (item: ImportItem) => {
    if (!lockeId || !item.mon || !item.formId) return;
    setSaving(true);
    try {
      const row: any = {
        id: crypto.randomUUID(),
        locke_id: lockeId,
        form_id: item.formId,
        nickname: item.mon.nickname,
        level: item.level,
        gender: item.mon.gender,
        nature: item.mon.natureName,
        ability: item.mon.abilityName,
        moves: item.mon.moveNames.slice(0, 4),
        held_item: item.mon.heldItemName,
        is_shiny: item.mon.isShiny,
        stats: item.mon.stats ? { ...item.mon.stats } : null,
        ivs: item.mon.ivs ? { ...item.mon.ivs } : null,
        evs: item.mon.evs ? { ...item.mon.evs } : null,
        tera_type: item.mon.teraType,
        source: 'import',
        import_fingerprint: item.mon.fingerprint,
        version: 1,
      };
      await saveRow('pokemon_entry', row.id, row);
      setItems((cur) => cur.map((x) => (x.key === item.key ? { ...x, action: 'skip' as const } : x)));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page">
      <div className="page__head">
        <h1>Importar Pokémon</h1>
        <nav>
          <button onClick={onText} className="btn btn--ghost">Pegar texto de Showdown</button>
        </nav>
      </div>

      <div style={{ display: 'grid', gap: 14, maxWidth: '700px' }}>
        <fieldset className="stack form">
          <legend>Archivo .pk6 (descifrado, de PKHeX)</legend>
          <input type="file" accept=".pk6" multiple onChange={onFiles} />
          <p className="muted small">Sube uno o varios archivos .pk6. Los .ek6 (cifrados) no se pueden leer.</p>
        </fieldset>

        <fieldset className="stack form">
          <legend>Texto de Pokémon Showdown</legend>
          <textarea
            rows={6}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Pega aquí el texto de un equipo de Showdown…"
          />
          <p className="muted small">Un Pokémon por bloque, separados por línea en blanco.</p>
          <button className="btn btn--primary" type="button" onClick={onText} disabled={!rawText.trim()}>
            Leer texto
          </button>
        </fieldset>

        {error && <p role="alert" className="msg msg--error">{error}</p>}

        {items.length > 0 && (
          <>
            <h2>Previsualización (nada se guarda hasta confirmar)</h2>
            <ul className="list">
              {items.map((item: ImportItem) => (
                <li key={item.key} className="item item--col">
                  <div>
                    <h3>{item.label}</h3>
                    {item.error && <p role="alert" className="msg msg--error">{item.error}</p>}
                    {!item.error && item.mon && (
                      <div className="facts">
                        <dt>Especie</dt><dd>{item.mon.speciesName ?? '—'}</dd>
                        <dt>Nivel</dt><dd>{item.mon.level ?? '—'}</dd>
                        <dt>Apodo</dt><dd>{item.mon.nickname ?? '—'}</dd>
                        <dt>Variocolor</dt><dd>{item.mon.isShiny ? 'Sí' : 'No'}</dd>
                      </div>
                    )}
                    {item.warnings.length > 0 && (
                      <ul className="chips" style={{ marginTop: 6 }}>
                        {item.warnings.map((w: string, i: number) => (
                          <li key={i} className="chip">{w}</li>
                        ))}
                      </ul>
                    )}
                    {item.duplicateOf && (
                      <p className="muted small">Posible duplicado de una ficha ya guardada en este locke.</p>
                    )}
                  </div>
                  <div className="actions">
                    {item.action === 'create' && !item.error && !item.duplicateOf && (
                      <button
                        className="btn btn--primary"
                        onClick={() => void confirmItem(item)}
                        disabled={saving}
                      >
                        Importar
                      </button>
                    )}
                    {item.action === 'skip' && (
                      <span className="muted small">Omitido</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}