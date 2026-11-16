import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../db/local';
import { searchUsers, sendRequest, acceptRequest, removeFriendship } from '../social/friends';
import { SyncChip } from '../layout/Shell';

export function Friends() {
  const { session, profile } = useAuth();
  const me = session?.uid ?? null;
  const [query, setQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [sending, setSending] = useState<Set<string>>(new Set());

  const [friendships, setFriendships] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    db.friendship.toArray().then(setFriendships);
    db.profile_cache.toArray().then(setProfiles);
  }, [me]);

  const relationOf = (other: string): 'friends' | 'sent' | 'received' | 'none' => {
    const f = friendships.find((x: any) => (x.requester_id === me && x.addressee_id === other) || (x.requester_id === other && x.addressee_id === me));
    if (!f) return 'none';
    if (f.status === 'accepted') return 'friends';
    return f.requester_id === me ? 'sent' : 'received';
  };

  const accepted = friendships.filter((f: any) => f.status === 'accepted');

  const handleSearch = async () => {
    setSearchError(null);
    setSearchResults(null);
    if (!query.trim() || !me) return;
    const r = await searchUsers(query, me);
    if (!r.ok) { setSearchError((r as { message: string }).message); return; }
    setSearchResults(r.data ?? []);
  };

  const handleAction = async (id: string, kind: 'accept' | 'remove') => {
    setSending((prev) => new Set([...prev, id]));
    try {
      if (kind === 'accept') await acceptRequest(id);
      else await removeFriendship(id);
      db.friendship.toArray().then(setFriendships);
    } finally {
      setSending((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleSend = async (id: string) => {
    if (!me) return;
    setSending((prev) => new Set([...prev, id]));
    try {
      await sendRequest(me, id);
      db.friendship.toArray().then(setFriendships);
    } finally {
      setSending((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  return (
    <section className="page">
      <div className="page__head">
        <h1>Amigos</h1>
        <SyncChip />
      </div>

      <div style={{ maxWidth: '620px', marginBottom: 18 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Buscar nombre de usuario (mín. 3 caracteres)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn--primary" onClick={handleSearch} disabled={!query.trim() || query.trim().length < 3}>
            Buscar
          </button>
        </label>
        {searchError && <p role="alert" className="msg msg--error">{searchError}</p>}
        {searchResults && searchResults.length > 0 && (
          <ul className="list">
            {searchResults.map((u: any) => {
              const rel = relationOf(u.id);
              return (
                <li key={u.id} className="item item--col">
                  <div>
                    <h3>{u.display_name}</h3>
                    <p className="muted small">@{u.username}</p>
                  </div>
                  <div className="actions">
                    {rel === 'none' && (
                      <button className="btn btn--ghost" onClick={() => void handleSend(u.id)} disabled={sending.has(u.id)}>
                        {sending.has(u.id) ? '…' : 'Enviar solicitud'}
                      </button>
                    )}
                    {rel === 'sent' && <span className="muted small">Solicitud enviada</span>}
                    {rel === 'received' && (
                      <>
                        <button className="btn btn--ghost" onClick={() => void handleAction(u.id, 'accept')} disabled={sending.has(u.id)}>Aceptar</button>
                        <button className="btn btn--ghost" onClick={() => void handleAction(u.id, 'remove')} disabled={sending.has(u.id)}>Rechazar</button>
                      </>
                    )}
                    {rel === 'friends' && (
                      <button className="btn btn--ghost" onClick={() => void handleAction(u.id, 'remove')} disabled={sending.has(u.id)}>Eliminar</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {searchResults && searchResults.length === 0 && query.trim().length >= 3 && <p className="muted">No se encontró ningún usuario.</p>}
      </div>

      <h2>Tus amistades</h2>
      {accepted.length === 0 ? (
        <p className="muted">No tienes amistades todavía.</p>
      ) : (
        <ul className="list">
          {accepted.map((f: any) => {
            const other = f.requester_id === me ? f.addressee_id : f.requester_id;
            const p = profiles.find((x: any) => x.id === other);
            return (
              <li key={f.id} className="item item--col">
                <div>
                  <h3>
                    <Link to={`/amigos/${other}`}>{p?.display_name ?? 'Desconocido'}</Link>
                  </h3>
                  <p className="muted small">@{p?.username ?? ''}</p>
                </div>
                <button className="btn btn--ghost" onClick={() => void handleAction(f.id, 'remove')}>Eliminar</button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
