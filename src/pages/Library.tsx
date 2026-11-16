import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db, saveRow } from '../db/local';
import { SyncChip } from '../layout/Shell';

export function Library() {
  const { session } = useAuth();
  const me = session?.uid ?? null;
  const [categories, setCategories] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newVisibility, setNewVisibility] = useState<'private' | 'friends' | 'community'>('private');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.category.filter((c: any) => c.deleted_at === null).toArray().then(setCategories);
  }, [me]);

  const official = categories.filter((c: any) => c.kind === 'official');
  const custom = categories.filter((c: any) => c.kind === 'custom');

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!me || !newName.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      await saveRow('category', id, {
        kind: 'custom',
        owner_id: me,
        name: newName.trim(),
        description: newDescription.trim() || null,
        selection: 'manual',
        scores_points: false,
        visibility: newVisibility,
        revision: 1,
        version: 1,
      });
      setNewName('');
      setNewDescription('');
      setNewVisibility('private');
      const updated = await db.category.filter((c: any) => c.deleted_at === null).toArray();
      setCategories(updated);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page">
      <div className="page__head">
        <h1>Biblioteca</h1>
        <SyncChip />
      </div>
      <p className="muted">Las categorías oficiales se aplican a cualquier ficha. Las personales son tuyas y puedes compartirlas.</p>

      <form onSubmit={createCategory} className="form" style={{ maxWidth: '620px', marginBottom: 24 }}>
        <h2>Crear categoría personal</h2>
        <label>
          Nombre
          <input required value={newName} onChange={(e) => setNewName(e.target.value)} />
        </label>
        <label>
          Descripción (opcional)
          <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
        </label>
        <label>
          Visibilidad
          <select value={newVisibility} onChange={(e) => setNewVisibility(e.target.value as any)}>
            <option value="private">Privada (solo tú)</option>
            <option value="friends">Amigos</option>
            <option value="community">Comunidad (descubrible)</option>
          </select>
        </label>
        {error && <p role="alert" className="msg msg--error">{error}</p>}
        <button className="btn btn--primary" type="submit" disabled={saving}>
          {saving ? 'Creando…' : 'Crear categoría'}
        </button>
      </form>

      <h2>Oficiales</h2>
      {official.length === 0 ? <p className="muted">Sin categorías oficiales cargadas.</p> : (
        <ul className="list">
          {official.map((c: any) => (
            <li key={c.id} className="item item--col">
              <div>
                <h3>{c.name}</h3>
                <p className="muted small">{c.description ?? 'Sin descripción'}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2>Tus categorías</h2>
      {custom.length === 0 ? (
        <p className="muted">Aún no has creado categorías personales.</p>
      ) : (
        <ul className="list">
          {custom.map((c: any) => (
            <li key={c.id} className="item item--col">
              <div>
                <h3>{c.name}</h3>
                <p className="muted small">{c.description ?? 'Sin descripción'} · revisión {c.revision}</p>
              </div>
              <div className="actions">
                <Link to={`/biblioteca/${c.id}`} className="btn btn--ghost">Editar</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
