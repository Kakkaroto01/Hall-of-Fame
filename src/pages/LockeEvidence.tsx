import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db, saveRow } from '../db/local';
import { SyncChip } from '../layout/Shell';

export function LockeEvidence() {
  const { id: lockeId, entryId } = useParams<{ id: string; entryId: string }>();
  const { session } = useAuth();
  const me = session?.uid ?? null;
  const navigate = useNavigate();
  const [evidences, setEvidences] = useState<any[]>([]);
  const [newKind, setNewKind] = useState<'text' | 'link' | 'image' | 'video_link'>('text');
  const [newContent, setNewContent] = useState('');
  const [newAwardId, setNewAwardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!entryId) return;
    db.evidence.filter((e: any) => e.entry_id === entryId && e.deleted_at === null).toArray().then(setEvidences);
  }, [entryId]);

  const addEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!entryId || !me || !lockeId) return;
    if (!newContent.trim() && newKind !== 'image') {
      setError('El contenido es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      await saveRow('evidence', id, {
        entry_id: entryId,
        locke_id: lockeId,
        owner_id: me,
        award_id: newAwardId,
        kind: newKind,
        content: newContent.trim() || null,
        visibility: 'private',
        version: 1,
      });
      setNewContent('');
      setNewAwardId(null);
      const updated = await db.evidence.filter((e: any) => e.entry_id === entryId && e.deleted_at === null).toArray();
      setEvidences(updated);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const delEvidence = async (id: string) => {
    if (!confirm('¿Eliminar esta evidencia?')) return;
    await saveRow('evidence', id, { deleted_at: new Date().toISOString() });
    const updated = await db.evidence.filter((e: any) => e.entry_id === entryId && e.deleted_at === null).toArray();
    setEvidences(updated);
  };

  if (!entryId) return <section className="page"><p className="muted">Cargando evidencias…</p></section>;

  const evidencesByAward = evidences.reduce((acc: Record<string, any[]>, e: any) => {
    const key = e.award_id || 'sin-reconocimiento';
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <section className="page">
      <div className="page__head">
        <h1>Evidencias</h1>
        <nav>
          <Link to={`/lockes/${lockeId}/pokemon/${entryId}`} className="btn btn--ghost">Volver a la ficha</Link>
        </nav>
      </div>

      <form onSubmit={addEvidence} className="form" style={{ maxWidth: '620px', marginBottom: 24 }}>
        <h2>Agregar evidencia</h2>
        <label>
          Tipo
          <select value={newKind} onChange={(e) => setNewKind(e.target.value as any)}>
            <option value="text">Texto</option>
            <option value="link">Enlace</option>
            <option value="image">Imagen (URL)</option>
            <option value="video_link">Vídeo (enlace)</option>
          </select>
        </label>
        <label>
          Contenido
          <input
            type={newKind === 'link' || newKind === 'video_link' ? 'url' : 'text'}
            placeholder={newKind === 'image' ? 'URL de la imagen' : 'Escribe la evidencia…'}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
          />
        </label>
        <label>
          Reconocimiento vinculado (opcional)
          <select value={newAwardId ?? ''} onChange={(e) => setNewAwardId(e.target.value || null)}>
            <option value="">Ninguno</option>
          </select>
        </label>
        {error && <p role="alert" className="msg msg--error">{error}</p>}
        <button className="btn btn--primary" type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Agregar evidencia'}
        </button>
      </form>

      <h2>Evidencias guardadas</h2>
      {evidences.length === 0 ? (
        <p className="muted">Aún no hay evidencias para esta ficha.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {Object.entries(evidencesByAward).map(([awardKey, evs]) => (
            <div key={awardKey} style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '14px', marginBottom: 12 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '1rem' }}>
                {awardKey === 'sin-reconocimiento' ? 'Sin reconocimiento' : 'Reconocimiento'}
              </h3>
              {evs.map((e: any) => (
                <div key={e.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p className="muted small">{e.kind}</p>
                    <p style={{ margin: '2px 0' }}>{e.content}</p>
                    <p className="muted small">{new Date(e.created_at).toLocaleDateString('es-ES')}</p>
                  </div>
                  <button className="btn btn--ghost" onClick={() => delEvidence(e.id)} style={{ padding: '4px 8px', fontSize: '.8rem' }}>
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
