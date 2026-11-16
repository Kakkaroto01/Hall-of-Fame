import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../db/local';
import { PokemonCard } from '../ui/PokemonCard';
import { loadNames } from '../catalog/names';
import { DISPLAY_LANG } from '../config';
import { useAwards } from '../domain/useAwards';

export function EntryDetail() {
  const { id: lockeId, entryId } = useParams<{ id: string; entryId: string }>();
  const [entry, setEntry] = useState<any>(null);
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (entryId) {
      db.pokemon_entry.get(entryId).then(setEntry);
    }
    if (entry?.form_id) {
      db.form.get(entry.form_id).then(setForm);
    }
  }, [entryId, entry?.form_id]);

  const { medalsOf } = useAwards(lockeId ?? '');

  if (!entry || !form) return <section className="page"><p className="muted">Cargando ficha…</p></section>;

  const awards = medalsOf(entry.id);

  return (
    <section className="page">
      <div className="page__head">
        <h1>{entry.nickname || form.name}</h1>
        <nav>
          <Link to={`/lockes/${lockeId}`} className="btn btn--ghost">Volver al locke</Link>
          <Link to={`/lockes/${lockeId}/pokemon/${entryId}/evidencias`} className="btn btn--ghost">Evidencias</Link>
        </nav>
      </div>

      <PokemonCard
        data={{
          nickname: entry.nickname,
          speciesName: form.name,
          formName: form.form_key !== 'base' ? form.name : null,
          level: entry.level,
          types: [form.type1, form.type2],
          gender: entry.gender,
          shiny: Boolean(entry.is_shiny),
          dead: entry.status === 'dead',
          deathNote: entry.death_note,
          pokeapiId: form.pokeapi_id ?? 0,
          spriteSet: 'home',
          spriteUrl: null,
          nature: entry.nature,
          ability: entry.ability,
          heldItem: entry.held_item,
          moves: (entry.moves ?? []).filter(Boolean),
          stats: entry.stats,
          ivs: entry.ivs,
          evs: entry.evs,
          awards,
        }}
      />

      <div style={{ marginTop: 20 }}>
        <p className="muted small">Visibilidad: {entry.visibility}</p>
      </div>
    </section>
  );
}
