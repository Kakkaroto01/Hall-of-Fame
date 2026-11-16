import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db, saveRow } from '../db/local';
import { loadCarouselGames } from '../catalog/remote';
import { GameCarousel } from '../ui/GameCarousel';
import { SyncChip } from '../layout/Shell';

export function NewLocke() {
  const { session } = useAuth();
  const me = session?.uid ?? null;
  const navigate = useNavigate();
  const [games, setGames] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [startedOn, setStartedOn] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'friends' | 'community'>('private');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCarouselGames().then(setGames);
  }, []);

  const currentGame = games.find((g: any) => g.id === selectedGameId);
  const [versions, setVersions] = useState<any[]>([]);

  useEffect(() => {
    if (selectedGameId) {
      db.game_version.where('game_id').equals(selectedGameId).toArray().then(setVersions);
    } else {
      setVersions([]);
    }
  }, [selectedGameId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError('Ponle un título a la aventura.'); return; }
    if (!selectedVersionId) { setError('Elige una versión de juego.'); return; }
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString().slice(0, 10);
      await saveRow('locke', id, {
        owner_id: me,
        title: title.trim(),
        game_version_id: selectedVersionId,
        started_on: startedOn || now,
        status: 'in_progress',
        result: null,
        rules: {},
        difficulty: null,
        rival_user_id: null,
        rival_locke_id: null,
        description: null,
        visibility,
        version: 1,
      });
      navigate(`/lockes/${id}`);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page">
      <div className="page__head">
        <h1>Nuevo locke</h1>
        <Link to="/lockes" className="btn btn--ghost">Cancelar</Link>
      </div>
      <form onSubmit={create} className="form" style={{ maxWidth: '620px' }}>
        <label>
          Título de la aventura
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        {error && <p role="alert" className="msg msg--error">{error}</p>}
        <GameCarousel
          games={games}
          selectedId={selectedGameId ?? undefined}
          onSelect={(g: any) => setSelectedGameId(g.id)}
          onOpen={(g: any) => setSelectedGameId(g.id)}
        />
        {currentGame && versions.length > 0 && (
          <>
            <label>Versión
              <select
                required
                value={selectedVersionId ?? ''}
                onChange={(e) => setSelectedVersionId(e.target.value || null)}
              >
                {versions.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fecha de inicio
              <input type="date" required value={startedOn} onChange={(e) => setStartedOn(e.target.value)} />
            </label>
          </>
        )}
        {!currentGame && <p className="muted">Elige un juego del carrusel.</p>}
        {currentGame && versions.length === 0 && <p className="muted">Este juego no tiene versiones cargadas.</p>}
        <label>
          Quién puede verlo
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
            <option value="private">Privado (solo tú)</option>
            <option value="friends">Amigos</option>
            <option value="community">Comunidad (rankings)</option>
          </select>
        </label>
        <button className="btn btn--primary" type="submit" disabled={saving || !selectedVersionId}>
          {saving ? 'Creando…' : 'Crear locke'}
        </button>
      </form>
    </section>
  );
}
