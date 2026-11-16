import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../db/local';
import { PokemonCard } from '../ui/PokemonCard';
import { useAwards } from '../domain/useAwards';

export function HallOfFame() {
  const { id: lockeId } = useParams<{ id: string }>();
  const [showParade, setShowParade] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    db.pokemon_entry.where('locke_id').equals(lockeId ?? '').filter((e: any) => e.deleted_at === null).toArray().then(setEntries);
    const t = setTimeout(() => setShowParade(false), 3500);
    return () => clearTimeout(t);
  }, [lockeId]);

  const { medalsOf } = useAwards(lockeId ?? '');

  const finished = entries.filter((e: any) => e.status === 'dead').length;
  const alive = entries.length - finished;

  if (showParade && entries.length > 0) {
    return (
      <section className="parade" role="dialog" aria-modal="true" aria-label="Entrada al Hall of Fame">
        <div>
          <p className="parade__kicker">Entrada al Hall of Fame</p>
          <h1 className="parade__title">{lockeId}</h1>
          <ul className="parade__row">
            {entries.map((e: any, i: number) => {
              return <li key={e.id} style={{ ['--i' as unknown as string]: String(i) } as any}>
                <div className="parade__ph" />
                <p className="parade__mvp">{e.nickname || 'Pokémon'}</p>
              </li>
            })}
          </ul>
          <form method="dialog" style={{ marginTop: 14 }}>
            <button className="btn btn--primary" onClick={() => setShowParade(false)}>
              Seguir viendo
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="page hall">
      <div className="page__head">
        <h1>Hall of Fame</h1>
        <Link to={`/lockes/${lockeId}`} className="btn btn--ghost">Volver al locke</Link>
      </div>

      <div className="hall__hero">
        <h2>Resumen</h2>
        <ul className="tally">
          <li><strong>{entries.length}</strong> fichas</li>
          <li><strong>{alive}</strong> activas</li>
          <li><strong>{finished}</strong> caídas</li>
        </ul>
      </div>

      <h2>Equipo</h2>
      <div className="cards">
        {entries.length === 0 ? (
          <p className="muted">Aún no hay fichas en este locke.</p>
        ) : (
          entries.map((e: any) => {
            const awards = medalsOf(e.id);
            return (
              <PokemonCard
                key={e.id}
                data={{
                  nickname: e.nickname,
                  speciesName: 'Pokémon',
                  level: e.level,
                  types: ['normal', null],
                  gender: e.gender,
                  shiny: Boolean(e.is_shiny),
                  dead: e.status === 'dead',
                  deathNote: e.death_note,
                  pokeapiId: 0,
                  spriteSet: 'home',
                  moves: (e.moves ?? []).filter(Boolean),
                  awards,
                  stats: e.stats,
                  ivs: e.ivs,
                  evs: e.evs,
                }}
              />
            );
          })
        )}
      </div>
    </section>
  );
}
