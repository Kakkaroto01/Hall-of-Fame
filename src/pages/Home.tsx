import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../db/local';
import { SyncChip } from '../layout/Shell';
import { STATUS_LABEL } from '../domain/locke';

export function Home() {
  const { profile } = useAuth();
  const [lockes, setLockes] = useState<any[]>([]);

  useEffect(() => {
    db.locke.where('deleted_at').equals(null as any).toArray().then(setLockes);
  }, []);

  const active = lockes.filter((l) => l.status === 'in_progress').length;
  const done = lockes.length - active;

  return (
    <section className="page">
      <div className="page__head">
        <h1>Inicio</h1>
        <SyncChip />
      </div>
      {profile && <p className="muted">Hola, {profile.display_name}</p>}
      <div className="tally">
        <li><strong>{lockes.length}</strong> lockes</li>
        <li><strong>{active}</strong> en curso</li>
        <li><strong>{done}</strong> finalizados</li>
      </div>
      <h2>Tus lockes</h2>
      {lockes.length === 0 ? (
        <p className="muted">Aún no tienes ninguna aventura. Crea tu primer locke.</p>
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
                  · {new Date(l.started_on as string).toLocaleDateString('es-ES')}
                </p>
              </div>
              <div className="actions">
                <Link to={`/lockes/${l.id}`} className="btn btn--ghost">
                  Ver
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="actions" style={{ marginTop: 24 }}>
        <Link to="/lockes/nuevo" className="btn btn--primary">
          Nuevo locke
        </Link>
      </div>
    </section>
  );
}
