import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db, saveRow } from '../db/local';
import { SyncChip } from '../layout/Shell';

export function LockeFiles() {
  const { id: lockeId } = useParams<{ id: string }>();
  const { session } = useAuth();
  const me = session?.uid ?? null;
  const navigate = useNavigate();
  const [files, setFiles] = useState<any[]>([]);
  const [newKind, setNewKind] = useState<'save' | 'pokemon' | 'other'>('save');
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!lockeId) return;
    db.file_asset.filter((f: any) => f.locke_id === lockeId && f.deleted_at === null).toArray().then(setFiles);
  }, [lockeId]);

  const addFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!lockeId || !me) return;
    if (!newName.trim() || !newUrl.trim()) {
      setError('El nombre y la URL/ruta son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      await saveRow('file_asset', id, {
        locke_id: lockeId,
        owner_id: me,
        entry_id: null,
        kind: newKind,
        storage_path: newUrl.trim(),
        original_name: newName.trim(),
        size_bytes: 0,
        sha256: null,
        description: newDescription.trim() || null,
        visibility: 'private',
        version: 1,
      });
      setNewName('');
      setNewUrl('');
      setNewDescription('');
      const updated = await db.file_asset.filter((f: any) => f.locke_id === lockeId && f.deleted_at === null).toArray();
      setFiles(updated.sort((a: any, b: any) => b.created_at.localeCompare(a.created_at)));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const delFile = async (id: string) => {
    if (!confirm('¿Eliminar este archivo?')) return;
    await saveRow('file_asset', id, { deleted_at: new Date().toISOString() });
    const updated = await db.file_asset.filter((f: any) => f.locke_id === lockeId && f.deleted_at === null).toArray();
    setFiles(updated.sort((a: any, b: any) => b.created_at.localeCompare(a.created_at)));
  };

  if (!lockeId) return <section className="page"><p className="muted">Cargando archivos…</p></section>;

  const KIND_LABEL: Record<string, string> = {
    save: 'Archivo de partida (.sav/.pk6)',
    pokemon: 'Archivo de Pokémon (.pk6)',
    other: 'Otro archivo',
  };

  return (
    <section className="page">
      <div className="page__head">
        <h1>Archivos de partida</h1>
        <nav>
          <Link to={`/lockes/${lockeId}`} className="btn btn--ghost">Volver al locke</Link>
        </nav>
      </div>

      <p className="muted">
        Guarda archivos relacionados con este locke (partidas, exportaciones, capturas).
        Cada archivo conserva su versión y no se sobrescribe al subir uno nuevo.
      </p>

      <form onSubmit={addFile} className="form" style={{ maxWidth: '620px', marginBottom: 24 }}>
        <h2>Agregar archivo</h2>
        <label>
          Tipo
          <select value={newKind} onChange={(e) => setNewKind(e.target.value as any)}>
            <option value="save">Archivo de partida</option>
            <option value="pokemon">Archivo de Pokémon</option>
            <option value="other">Otro archivo</option>
          </select>
        </label>
        <label>
          Nombre del archivo
          <input type="text" placeholder="ej. partida_final.sav" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </label>
        <label>
          URL o ruta del archivo
          <input type="url" placeholder="https://… o ruta local" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
        </label>
        <label>
          Descripción (opcional)
          <input type="text" placeholder="Notas sobre este archivo…" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
        </label>
        {error && <p role="alert" className="msg msg--error">{error}</p>}
        <button className="btn btn--primary" type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Agregar archivo'}
        </button>
      </form>

      <h2>Archivos guardados</h2>
      {files.length === 0 ? (
        <p className="muted">Aún no hay archivos en este locke.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {files.sort((a: any, b: any) => b.created_at.localeCompare(a.created_at)).map((f: any) => (
            <div key={f.id} style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: '700' }}>{f.original_name}</p>
                <p className="muted small" style={{ margin: '2px 0' }}>{KIND_LABEL[f.kind] ?? f.kind}</p>
                {f.description && <p className="muted small" style={{ margin: '2px 0 0' }}>{f.description}</p>}
              </div>
              <div className="actions" style={{ gap: 6 }}>
                {f.storage_path && (
                  <a href={f.storage_path} target="_blank" rel="noopener noreferrer" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: '.85rem' }}>Abrir</a>
                )}
                <button className="btn btn--ghost" onClick={() => delFile(f.id)} style={{ padding: '4px 10px', fontSize: '.85rem', color: 'var(--bad)' }}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
