import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db, saveRow } from '../db/local';
import { loadNames } from '../catalog/names';
import { DISPLAY_LANG } from '../config';
import { EntryForm } from '../ui/EntryForm';
import { SpeciesPicker } from '../ui/SpeciesPicker';
import { entryToValues, changedPatch, type EntryValues } from '../domain/entryValues';
import { SyncChip } from '../layout/Shell';

export function EditEntry() {
  const { id: lockeId, entryId } = useParams<{ id: string; entryId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [names, setNames] = useState<any>(null);
  const [forms, setForms] = useState<any[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [features, setFeatures] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const [entry, setEntry] = useState<any>(null);
  const [locke, setLocke] = useState<any>(null);
  const [gameVersion, setGameVersion] = useState<any>(null);

  useEffect(() => {
    loadNames(DISPLAY_LANG).then(setNames);
    db.form.toArray().then(setForms);
    if (entryId) {
      db.pokemon_entry.get(entryId).then(setEntry);
    }
    if (lockeId) {
      db.locke.get(lockeId).then(setLocke);
    }
  }, [entryId, lockeId]);

  useEffect(() => {
    if (entry) setSelectedFormId(entry.form_id as string);
  }, [entry]);

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

  const values: EntryValues = entry ? entryToValues(entry) : { nickname: '', level: '', gender: '', nature: '', ability: '', moves: ['', '', '', ''], item: '', tera: '', shiny: false, visibility: 'private', blocks: { stats: { hp: '', atk: '', def: '', spa: '', spd: '', spe: '' }, ivs: { hp: '', atk: '', def: '', spa: '', spd: '', spe: '' }, evs: { hp: '', atk: '', def: '', spa: '', spd: '', spe: '' } } };

  const save = async (v: EntryValues) => {
    if (!entryId || !selectedFormId || !entry) return;
    setSaving(true);
    try {
      const next = {
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
      };
      const patch = changedPatch(entry, next);
      if (Object.keys(patch).length > 0) {
        await saveRow('pokemon_entry', entryId, patch);
      }
      navigate(`/lockes/${lockeId}/pokemon/${entryId}`);
    } catch {
      // El motor de sincronización muestra el banner de rechazo si el servidor lo deniega.
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page">
      <div className="page__head">
        <h1>Editar ficha</h1>
        <button onClick={() => navigate(`/lockes/${lockeId}/pokemon/${entryId}`)} className="btn btn--ghost">Cancelar</button>
      </div>
      {!entry && <p className="muted">Cargando ficha…</p>}
      {entry && (
        <form className="form" style={{ maxWidth: '620px' }} onSubmit={(e) => e.preventDefault()}>
          <label>
            Especie y forma
            <SpeciesPicker names={names} forms={forms} label="Especie" onChange={setSelectedFormId} />
          </label>
          <EntryForm
            initial={values}
            names={names}
            features={features}
            submitLabel="Guardar cambios"
            onSubmit={save}
          />
        </form>
      )}
    </section>
  );
}
