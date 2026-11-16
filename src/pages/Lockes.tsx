import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db, softDelete } from '../db/local';
import { SyncChip } from '../layout/Shell';
import { STATUS_LABEL, VISIBILITY_LABEL } from '../domain/locke';

export function Lockes() {
  const { session } = useAuth();
  const me = session?.uid ?? null;
  const [lockes, setLockes] = useState<any[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    db.locke.where('deleted_at').equals(null as any).toArray().then(setLockes);
  }, [me]);

  const del = async (id: string) => {
    if (!confirm('¿Mover este locke a la papelera? Se podrá restaurar más tarde.')) return;
    setDeleting(id);
    try {
      await softDelete('locke', id);
      setLockes((prev) => prev.filter((l) => l.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <section className="page">
      <div className="page__head">
        <h1>Mis lockes</h1>
        <SyncChip />
      </div>
      <p className="muted">Cada locke es una aventura con su propio equipo y resultados.</p>
      <div className="actions" style={{ marginBottom: 14 }}>
        <Link to="/lockes/nuevo" className="btn btn--primary">
          Nuevo locke
        </Link>
      </div>
      {lockes.length === 0 ? (
        <p className="muted">No tienes lockes todavía.</p>
      ) : (
        <ul className="list">
          {lockes.map((l: any) => (
            <li key={l.id} className="item item--col">
              <div>
                <h2>
                  <Link to={`/lockes/${l.id}`}>{l.title}</Link>
                </h2>
                <p className="muted small">
                  {STATUS_LABEL[l.status as keyof typeof STATUS_LABEL] ?? l.status}
                  ·
                  {VISIBILITY_LABEL[l.visibility as keyof typeof VISIBILITY_LABEL] ?? l.visibility}
                </p>
              </div>
              <div className="actions">
                <Link to={`/lockes/${l.id}`} className="btn btn--ghost">
                  Ver
                </Link>
                <button
                  className="btn btn--ghost"
                  onClick={() => del(l.id)}
                  disabled={deleting === l.id}
                >
                  {deleting === l.id ? '…' : 'Papelera'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
