import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db, saveRow } from '../db/local';
import { SyncChip } from '../layout/Shell';

export function LockePvp() {
  const { id: lockeId } = useParams<{ id: string }>();
  const { session } = useAuth();
  const me = session?.uid ?? null;
  const navigate = useNavigate();
  const [matches, setMatches] = useState<any[]>([]);
  [matches, setMatches];
  const [newPosition, setNewPosition] = useState<number>(1);
  const [newWinner, setNewWinner] = useState<'self' | 'rival' | 'draw'>('self');
  const [newNote, setNewNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!lockeId) return;
    db.pvp_match.filter((m: any) => m.locke_id === lockeId && m.deleted_at === null).toArray().then(setMatches);
  }, [lockeId]);

  const addMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!lockeId || !me) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      await saveRow('pvp_match', id, {
        locke_id: lockeId,
        owner_id: me,
        position: newPosition,
        winner: newWinner,
        note: newNote.trim() || null,
        version: 1,
      });
      setNewPosition(1);
      setNewWinner('self');
      setNewNote('');
      const updated = await db.pvp_match.filter((m: any) => m.locke_id === lockeId && m.deleted_at === null).toArray();
      setMatches(updated.sort((a: any, b: any) => a.position - b.position));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const delMatch = async (id: string) => {
    if (!confirm('¿Eliminar este combate?')) return;
    await saveRow('pvp_match', id, { deleted_at: new Date().toISOString() });
    const updated = await db.pvp_match.filter((m: any) => m.locke_id === lockeId && m.deleted_at === null).toArray();
    setMatches(updated.sort((a: any, b: any) => a.position - b.position));
  };

  if (!lockeId) return <section className="page"><p className="muted">Cargando combates…</p></section>;

  const WINNER_LABEL: Record<string, string> = {
    self: 'Ganaste tú',
    rival: 'Ganó el rival',
    draw: 'Empate',
  };

  return (
    <section className="page">
      <div className="page__head">
        <h1>Combates PvP</h1>
        <nav>
          <Link to={`/lockes/${lockeId}`} className="btn btn--ghost">Volver al locke</Link>
        </nav>
      </div>

      <p className="muted">
        Registra los combates de tu locke PvP contra tu rival. Máximo uno por posición.
      </p>

      <form onSubmit={addMatch} className="form" style={{ maxWidth: '620px', marginBottom: 24 }}>
        <h2>Agregar combate</h2>
        <label>
          Posición
          <input type="number" min={1} max={10} required value={newPosition} onChange={(e) => setNewPosition(Number(e.target.value))} />
        </label>
        <label>
          Ganador
          <select value={newWinner} onChange={(e) => setNewWinner(e.target.value as any)}>
            <option value="self">Ganaste tú</option>
            <option value="rival">Ganó el rival</option>
            <option value="draw">Empate</option>
          </select>
        </label>
        <label>
          Nota (opcional)
          <input type="text" placeholder="Detalles del combate…" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
        </label>
        {error && <p role="alert" className="msg msg--error">{error}</p>}
        <button className="btn btn--primary" type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Registrar combate'}
        </button>
      </form>

      <h2>Combates registrados</h2>
      {matches.length === 0 ? (
        <p className="muted">Aún no hay combates registrados en este locke.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {matches.sort((a: any, b: any) => a.position - b.position).map((m: any) => (
            <div key={m.id} style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: '700' }}>Combate #{m.position}</p>
                <p className="muted small" style={{ margin: '2px 0' }}>{WINNER_LABEL[m.winner] ?? m.winner}</p>
                {m.note && <p className="muted small" style={{ margin: '2px 0 0' }}>{m.note}</p>}
              </div>
              <div className="actions" style={{ gap: 6 }}>
                <Link to={`/lockes/${lockeId}/pvp/${m.id}/editar`} className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: '.85rem' }}>Editar</Link>
                <button className="btn btn--ghost" onClick={() => delMatch(m.id)} style={{ padding: '4px 10px', fontSize: '.85rem', color: 'var(--bad)' }}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
