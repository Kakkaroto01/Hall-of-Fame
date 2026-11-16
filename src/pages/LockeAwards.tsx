import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db, saveRow } from '../db/local';
import { useAwards } from '../domain/useAwards';
import { Medal } from '../ui/Medal';
import { canAddToTeam, TEAM_MAX } from '../domain/awards';
import { SyncChip } from '../layout/Shell';

export function LockeAwards() {
  const { id: lockeId } = useParams<{ id: string }>();
  const { session } = useAuth();
  const me = session?.uid ?? null;
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [entries, setEntries] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    db.pokemon_entry.where('locke_id').equals(lockeId ?? '').filter((e: any) => e.deleted_at === null).toArray().then(setEntries);
    db.league_team_member.where('locke_id').equals(lockeId ?? '').toArray().then(setMembers);
    db.category.filter((c: any) => c.deleted_at === null).toArray().then(setCategories);
  }, [lockeId, me]);

  const { medalsOf } = useAwards(lockeId ?? '');

  const teamMembers = members.filter((m: any) => m.locke_id === lockeId);

  const addToTeam = async (entryId: string) => {
    const ok = canAddToTeam(teamMembers, lockeId ?? '', entryId);
    if (!ok.ok) { setError(ok.reason ?? 'No se pudo completar la operación.'); return; }
    setSaving(true);
    try {
      await db.transaction('rw', db.league_team_member, db.outbox, async () => {
        await db.league_team_member.put({ locke_id: lockeId!, entry_id: entryId });
        await db.outbox.add({
          table: 'league_team_member', kind: 'insert', rowId: `${lockeId}:${entryId}`,
          baseVersion: 0, patch: { locke_id: lockeId!, entry_id: entryId }, status: 'pending', createdAt: Date.now(),
        });
      });
      setError(null);
      setMembers([...members, { locke_id: lockeId, entry_id: entryId }]);
    } catch {
      setError('No se pudo añadir al equipo.');
    } finally {
      setSaving(false);
    }
  };

  const removeFromTeam = async (entryId: string) => {
    setSaving(true);
    try {
      await db.transaction('rw', db.league_team_member, db.outbox, async () => {
        await db.league_team_member.delete([lockeId!, entryId]);
        await db.outbox.add({
          table: 'league_team_member', kind: 'delete', rowId: `${lockeId}:${entryId}`,
          baseVersion: 0, patch: { locke_id: lockeId!, entry_id: entryId }, status: 'pending', createdAt: Date.now(),
        });
      });
      setError(null);
      setMembers(members.filter((m: any) => !(m.locke_id === lockeId && m.entry_id === entryId)));
    } catch {
      setError('No se pudo quitar del equipo.');
    } finally {
      setSaving(false);
    }
  };

  const giveAward = async (entryId: string, categoryId: string) => {
    setSaving(true);
    try {
      await saveRow('award', crypto.randomUUID(), {
        entry_id: entryId,
        locke_id: lockeId!,
        category_id: categoryId,
        note: null,
        version: 1,
      });
      setError(null);
    } catch (e: any) {
      setError(String(e?.message ?? 'No se pudo conceder el reconocimiento.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page">
      <div className="page__head">
        <h1>Reconocimientos y equipo</h1>
        <Link to={`/lockes/${lockeId}`} className="btn btn--ghost">Volver al locke</Link>
      </div>
      {error && <p role="alert" className="msg msg--error">{error}</p>}

      <h2>Equipo de la Liga ({teamMembers.length}/{TEAM_MAX})</h2>
      <div className="cards">
        {teamMembers.length === 0 ? (
          <p className="muted">Ningún Pokémon en el equipo todavía.</p>
        ) : (
          teamMembers.map((m: any) => {
            const e = entries.find((entry: any) => entry.id === m.entry_id);
            return (
              <div key={m.entry_id} className="item item--col">
                <div>
                  <h3>{e ? (e.nickname || 'Pokémon') : m.entry_id}</h3>
                  <p className="muted small">En el equipo de la Liga</p>
                </div>
                <button className="btn btn--ghost" onClick={() => void removeFromTeam(m.entry_id)} disabled={saving}>
                  Quitar
                </button>
              </div>
            );
          })
        )}
        {teamMembers.length >= TEAM_MAX && (
          <p className="muted small">El equipo está completo (máx. 6).</p>
        )}
        {teamMembers.length < TEAM_MAX && entries.length > 0 && (
          <div className="actions" style={{ marginTop: 10 }}>
            {entries.filter((e: any) => !teamMembers.some((m: any) => m.entry_id === e.id)).map((e: any) => (
              <button key={e.id} className="btn btn--ghost" onClick={() => void addToTeam(e.id)} disabled={saving}>
                Añadir {e.nickname || 'Pokémon'}
              </button>
            ))}
          </div>
        )}
      </div>

      <h2>Categorías disponibles</h2>
      <ul className="list">
        {categories.map((c: any) => (
          <li key={c.id} className="item item--col">
            <div>
              <h3>{c.name}</h3>
              <p className="muted small">{c.kind === 'official' ? 'Oficial' : 'Personal'} · {c.selection}</p>
            </div>
            <div className="actions">
              <Medal medalKey={c.key ?? c.id} label={c.name} size={20} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
