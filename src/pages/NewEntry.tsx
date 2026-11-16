import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db, saveRow } from '../db/local';
import { loadNames } from '../catalog/names';
import { DISPLAY_LANG } from '../config';
import { EntryForm } from '../ui/EntryForm';
import { SpeciesPicker } from '../ui/SpeciesPicker';
import { SyncChip } from '../layout/Shell';

export function NewEntry() {
  const { id: lockeId } = useParams<{ id: string }>();
  const { session } = useAuth();
  const me = session?.uid ?? null;
  const navigate = useNavigate();
  const [names, setNames] = useState<any>(null);
  const [forms, setForms] = useState<any[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [features, setFeatures] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const [locke, setLocke] = useState<any>(null);
  const [gameVersion, setGameVersion] = useState<any>(null);

  useEffect(() => {
    loadNames(DISPLAY_LANG).then(setNames);
    db.form.toArray().then(setForms);
    if (lockeId) {
      db.locke.get(lockeId).then(setLocke);
    }
  }, [lockeId]);

  useEffect(() => {
    if (locke?.game_version_id) {
      db.game_version.get(locke.game_version_id).then((gv: any) => {
        setGameVersion(gv);
        setFeatures(gv?.features ?? {});
      });
    }
  }, [locke]);

  useEffect(() => {
    setFeatures(gameVersion?.features ?? {});
  }, [gameVersion]);

  const currentForm = forms.find((f: any) => f.id === selectedFormId);

  const save = async (v: any) => {
    if (!lockeId || !selectedFormId) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      await saveRow('pokemon_entry', id, {
        locke_id: lockeId,
        owner_id: me,
        form_id: selectedFormId,
        nickname: v.nickname || null,
        level: v.level ? Number(v.level) : null,
        gender: v.gender || null,
        nature: v.nature || null,
        ability: v.ability || null,
        moves: v.moves.filter(Boolean),
        held_item: v.item || null,
        is_shiny: v.shiny,
        stats: v.blocks.stats,
        ivs: v.blocks.ivs,
        evs: v.blocks.evs,
        tera_type: v.tera || null,
        visibility: v.visibility,
        source: 'manual',
        version: 1,
      });
      navigate(`/lockes/${lockeId}`);
    } catch {
      // El motor de sincronización muestra el banner de rechazo si el servidor lo deniega.
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page">
      <div className="page__head">
        <h1>Nuevo Pokémon</h1>
        <button onClick={() => navigate(`/lockes/${lockeId}`)} className="btn btn--ghost">Cancelar</button>
      </div>
      {!locke && <p className="muted">Cargando locke…</p>}
      {locke && (
        <form className="form" style={{ maxWidth: '620px' }} onSubmit={(e) => e.preventDefault()}>
          <label>
            Especie y forma
            <SpeciesPicker names={names} forms={forms} label="Especie" onChange={setSelectedFormId} />
          </label>
          {currentForm && (
            <p className="muted small">
              {currentForm.name} · {currentForm.type1}{currentForm.type2 ? ` / ${currentForm.type2}` : ''}
            </p>
          )}
          <EntryForm
            initial={{ nickname: '', level: '', gender: '', nature: '', ability: '', moves: ['', '', '', ''], item: '', tera: '', shiny: false, visibility: 'private', blocks: { stats: { hp: '', atk: '', def: '', spa: '', spd: '', spe: '' }, ivs: { hp: '', atk: '', def: '', spa: '', spd: '', spe: '' }, evs: { hp: '', atk: '', def: '', spa: '', spd: '', spe: '' } } }}
            names={names}
            features={features}
            submitLabel="Guardar ficha"
            onSubmit={save}
          />
        </form>
      )}
    </section>
  );
}
