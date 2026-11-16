import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../auth/AuthProvider';
import { db, syncState, type SyncState } from '../db/local';

export const PRIMARY = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/lockes', label: 'Mis lockes' },
  { to: '/hall', label: 'Hall of Fame' },
  { to: '/pokedex', label: 'Pokédex' },
  { to: '/rankings', label: 'Rankings' },
];
export const SECONDARY = [
  { to: '/amigos', label: 'Amigos' },
  { to: '/biblioteca', label: 'Biblioteca' },
  { to: '/perfil', label: 'Perfil y ajustes' },
];

const SYNC_TEXT: Record<SyncState, { icon: string; text: string }> = {
  synced: { icon: '✓', text: 'Todo sincronizado' },
  pending: { icon: '↻', text: 'Cambios pendientes de enviar' },
  offline: { icon: '⚠', text: 'Sin conexión: se guarda en este dispositivo' },
  conflict: { icon: '!', text: 'Hay conflictos por resolver' },
};

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

export function SyncChip() {
  const online = useOnline();
  const state = useLiveQuery(() => syncState(), [online], 'synced' as SyncState);
  const s = SYNC_TEXT[state];
  return <p className="sync" data-state={state} role="status"><span aria-hidden="true">{s.icon}</span> {s.text}</p>;
}

/** Cambios que el servidor rechazó por una regla (ya deshechos en local): se avisa una vez. */
export function RejectedBanner() {
  const msgs = useLiveQuery(async () => ((await db.meta.get('rejected'))?.value as string[] | undefined) ?? [], [], [] as string[]);
  if (msgs.length === 0) return null;
  return (
    <div className="banner" role="alert">
      <div>{msgs.map((m, i) => <p key={i} className="small" style={{ margin: 0 }}>{m}</p>)}</div>
      <button className="btn" onClick={() => void db.meta.delete('rejected')}>Entendido</button>
    </div>
  );
}

export function Shell() {
  const { profile, signOut } = useAuth();
  const [more, setMore] = useState(false);
  const link = (i: { to: string; label: string; end?: boolean }) => (
    <NavLink key={i.to} to={i.to} end={i.end} onClick={() => setMore(false)}
             className={({ isActive }) => 'nav__link' + (isActive ? ' is-active' : '')}>{i.label}</NavLink>
  );
  return (
    <div className="shell">
      <aside className="side" aria-label="Navegación principal">
        <p className="side__brand">Hall of Fame</p>
        <nav className="side__nav">{PRIMARY.map(link)}<hr />{SECONDARY.map(link)}</nav>
        <div className="side__foot">
          <SyncChip />
          <p className="muted small">{profile?.display_name}</p>
          <button className="btn btn--ghost" onClick={() => void signOut()}>Cerrar sesión</button>
        </div>
      </aside>

      <div className="content">
        <header className="topbar"><span className="side__brand">Hall of Fame</span><SyncChip /></header>
        <RejectedBanner />
        <Outlet />
      </div>

      <nav className="bottom" aria-label="Navegación principal">
        {PRIMARY.map(link)}
        <button className="nav__link" aria-expanded={more} onClick={() => setMore((v) => !v)}>Más</button>
        {more && (
          <div className="sheet" role="menu">
            {SECONDARY.map(link)}
            <button className="nav__link" onClick={() => void signOut()}>Cerrar sesión</button>
          </div>
        )}
      </nav>
    </div>
  );
}
