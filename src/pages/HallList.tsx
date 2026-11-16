import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../db/local';
import { SyncChip } from '../layout/Shell';

export function HallList() {
  const { session } = useAuth();
  const me = session?.uid ?? null;
  const [lockes, setLockes] = useState<any[]>([]);

  useEffect(() => {
    db.locke.where('deleted_at').equals(null as any).toArray().then(setLockes);
  }, [me]);

  const mine = lockes.filter((l: any) => l.owner_id === me || (!l.owner_id && me));
  const others = lockes.filter((l: any) => l.owner_id !== me && l.owner_id != null);

  return (
    <section className="page">
      <div className="page__head">
        <h1>Hall of Fame</h1>
        <SyncChip />
      </div>
      <p className="muted">Tus aventuras terminadas y las de tus amigos.</p>

      <h2>Tus lockes</h2>
      {mine.length === 0 ? <p className="muted">No tienes lockes todavía.</p> : (
        <ul className="list">
          {mine.map((l: any) => (
            <li key={l.id} className="item item--col">
              <div>
                <h2>
                  <Link to={`/hall/${l.id}`}>{l.title}</Link>
                </h2>
                <p className="muted small">{l.status}</p>
              </div>
              <div className="actions">
                <Link to={`/hall/${l.id}`} className="btn btn--ghost">Ver Hall</Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {others.length > 0 && (
        <>
          <h2>De tus amigos</h2>
          <ul className="list">
            {others.map((l: any) => (
              <li key={l.id} className="item item--col">
                <div>
                  <h2>
                    <Link to={`/hall/${l.id}`}>{l.title}</Link>
                  </h2>
                  <p className="muted small">{l.status} · de otro entrenador</p>
                </div>
                <div className="actions">
                  <Link to={`/hall/${l.id}`} className="btn btn--ghost">Ver Hall</Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
