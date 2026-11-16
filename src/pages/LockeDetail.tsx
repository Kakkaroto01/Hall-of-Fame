import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db, saveRow, softDelete } from '../db/local';
import { useAwards } from '../domain/useAwards';
import { resultPatch, STATUS_LABEL, VISIBILITY_LABEL } from '../domain/locke';
import { PokemonCard } from '../ui/PokemonCard';
import { SyncChip } from '../layout/Shell';

type LockeResult = 'victory' | 'lives_depleted' | 'wipeout' | 'lost_matches' | 'voluntary_abandon';

export function LockeDetail() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const me = session?.uid ?? null;
  const navigate = useNavigate();
  const [locke, setLocke] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  useEffect(() => {
    db.locke.get(id ?? '').then(setLocke);
    db.pokemon_entry.where('locke_id').equals(id ?? '').filter((e: any) => e.deleted_at === null).toArray().then(setEntries);
    db.league_team_member.where('locke_id').equals(id ?? '').toArray().then(setTeamMembers);
  }, [id]);

  const inTeam = (entryId: string) => teamMembers.some((m) => m.locke_id === id && m.entry_id === entryId);
  const teamCount = teamMembers.filter((m) => m.locke_id === id).length;
  const { medalsOf } = useAwards(id ?? '');

  const finish = async (result: LockeResult) => {
    if (!id) return;
    await saveRow('locke', id, resultPatch(result));
  };

  const delLocke = async () => {
    if (!id || !confirm('¿Mover este locke a la papelera? Se podrá restaurar más tarde.')) return;
    await softDelete('locke', id);
    navigate('/lockes');
  };

  if (!locke) return <section className="page"><p className="muted">Cargando locke…</p></section>;

  const isMine = locke.owner_id === me || (!locke.owner_id && me);

  return (
    <section className="page hall">
      <div className="page__head">
        <h1>{locke.title}</h1>
        <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isMine ? (
            <>
              <Link to={`/lockes/${id}/importar`} className="btn btn--ghost">Importar</Link>
              <Link to={`/lockes/${id}/pokemon/nuevo`} className="btn btn--ghost">Nuevo Pokémon</Link>
              <Link to={`/lockes/${id}/reconocimientos`} className="btn btn--ghost">Reconocimientos</Link>
              <Link to={`/lockes/${id}/pvp`} className="btn btn--ghost">Combates PvP</Link>
              <Link to={`/lockes/${id}/archivos`} className="btn btn--ghost">Archivos</Link>
            </>
          ) : null}
          <Link to={`/hall/${id}`} className="btn btn--ghost">Ver Hall of Fame</Link>
        </nav>
      </div>

      <div className="hall__hero">
        <h2>Estado de la aventura</h2>
        <p className="muted small">
          {STATUS_LABEL[locke.status as keyof typeof STATUS_LABEL] ?? locke.status}
          {locke.result ? ` · ${locke.result}` : ''}
          {locke.finished_on ? ` · finalizado el ${locke.finished_on}` : ''}
        </p>
        <p className="muted small">Visibilidad: {VISIBILITY_LABEL[locke.visibility as keyof typeof VISIBILITY_LABEL] ?? locke.visibility}</p>
        {!locke.finished_on && isMine && (
          <div className="actions" style={{ marginTop: 10 }}>
            <button className="btn btn--primary" onClick={() => finish('victory')}>Marcar como ganado</button>
            <button className="btn btn--ghost" onClick={() => finish('lives_depleted')}>Derrota por vidas</button>
            <button className="btn btn--ghost" onClick={() => finish('wipeout')}>Wipeout</button>
            <button className="btn btn--ghost" onClick={() => finish('voluntary_abandon')}>Abandono voluntario</button>
          </div>
        )}
        {isMine && (
          <button className="btn btn--ghost" style={{ color: 'var(--bad)' }} onClick={delLocke}>
            Papelera
          </button>
        )}
      </div>

      <h2>Equipo de la Liga ({teamCount}/6)</h2>
      <div className="cards">
        {entries.length === 0 ? (
          <p className="muted">Aún no hay fichas en este locke.</p>
        ) : (
          entries.map((e: any) => (
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
                pokeapiId: 0,
                spriteSet: 'home',
                moves: (e.moves ?? []).filter(Boolean),
                awards: medalsOf(e.id),
                stats: e.stats,
                ivs: e.ivs,
                evs: e.evs,
              }}
            />
          ))
        )}
      </div>

      <div className="actions" style={{ marginTop: 24 }}>
        <Link to="/lockes" className="btn btn--ghost">Volver a mis lockes</Link>
      </div>
    </section>
  );
}
