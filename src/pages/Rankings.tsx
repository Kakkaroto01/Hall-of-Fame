import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/local';

export function Rankings() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [awards, entryScores] = await Promise.all([
        db.award.filter((a: any) => a.deleted_at === null).toArray(),
        db.pokemon_entry.filter((e: any) => e.deleted_at === null).toArray(),
      ]);

      const pointsByEntry: Record<string, number> = {};
      awards.forEach((a: any) => {
        if (!a.deleted_at) {
          pointsByEntry[a.entry_id] = (pointsByEntry[a.entry_id] || 0) + 1;
        }
      });

      const ranked = entryScores
        .filter((e: any) => e.visibility === 'community' && !e.deleted_at)
        .map((e: any) => ({
          ...e,
          points: pointsByEntry[e.id] || 0,
        }))
        .filter((e: any) => e.points > 0)
        .sort((a: any, b: any) => b.points - a.points);

      setEntries(ranked);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <section className="page"><p className="muted">Cargando rankings…</p></section>;
  }

  return (
    <section className="page">
      <div className="page__head">
        <h1>Rankings</h1>
      </div>

      <p className="muted">
        Solo las fichas con visibilidad «Comunidad» aparecen en los rankings.
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', maxWidth: '700px', marginTop: 16 }}>
        <thead>
          <tr>
            <th style={{ padding: '8px', textAlign: 'left', color: 'var(--soft)', fontSize: '.85rem' }}>#</th>
            <th style={{ padding: '8px', textAlign: 'left', color: 'var(--soft)', fontSize: '.85rem' }}>Pokémon</th>
            <th style={{ padding: '8px', textAlign: 'right', color: 'var(--soft)', fontSize: '.85rem' }}>Puntos</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: 'var(--soft)' }}>
                Aún no hay entradas clasificadas.
              </td>
            </tr>
          ) : (
            entries.map((e: any, i: number) => (
              <tr key={e.id}>
                <td style={{ padding: '10px', fontWeight: '700', color: 'var(--soft)' }}>{i + 1}</td>
                <td style={{ padding: '10px' }}>
                  <Link to={`/lockes/${e.locke_id}/pokemon/${e.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {e.nickname || 'Pokémon'}
                  </Link>
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700' }}>{e.points}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
