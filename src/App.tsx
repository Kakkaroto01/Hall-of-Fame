import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { startSync } from './sync/engine';
import { Shell } from './layout/Shell';
import { Login } from './pages/Login';
import { Invite } from './pages/Invite';
import { Home } from './pages/Home';
import { Lockes } from './pages/Lockes';
import { NewLocke } from './pages/NewLocke';
import { LockeDetail } from './pages/LockeDetail';
import { Pokedex } from './pages/Pokedex';
import { PokedexDetail } from './pages/PokedexDetail';
import { Rankings } from './pages/Rankings';
import { Import } from './pages/Import';
import { NewEntry } from './pages/NewEntry';
import { EntryDetail } from './pages/EntryDetail';
import { EditEntry } from './pages/EditEntry';
import { LockeAwards } from './pages/LockeAwards';
import { LockeEvidence } from './pages/LockeEvidence';
import { Library } from './pages/Library';
import { ConflictResolver } from './pages/ConflictResolver';
import { LockePvp } from './pages/LockePvp';
import { LockeFiles } from './pages/LockeFiles';
import { Export } from './pages/Export';
import { HallOfFame } from './pages/HallOfFame';
import { HallList } from './pages/HallList';
import { Friends } from './pages/Friends';
import { FriendProfile } from './pages/FriendProfile';
import { Profile } from './pages/Profile';
import { OwnerOnly } from './domain/useOwner';

function Gate() {
  const { loading, session, profile } = useAuth();
  useEffect(() => (session && profile?.approved ? startSync() : undefined), [session, profile?.approved]);

  if (loading) return <p className="splash" role="status">Cargando…</p>;
  if (!session) return <Login />;
  if (!profile?.approved) return <Invite />;
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="lockes" element={<Lockes />} />
        <Route path="lockes/nuevo" element={<NewLocke />} />
        <Route path="lockes/:id" element={<LockeDetail />} />
        <Route path="lockes/:id/importar" element={<OwnerOnly><Import /></OwnerOnly>} />
        <Route path="lockes/:id/reconocimientos" element={<OwnerOnly><LockeAwards /></OwnerOnly>} />
        <Route path="lockes/:id/pokemon/nuevo" element={<OwnerOnly><NewEntry /></OwnerOnly>} />
        <Route path="lockes/:id/pokemon/:entryId" element={<EntryDetail />} />
        <Route path="lockes/:id/pokemon/:entryId/editar" element={<OwnerOnly><EditEntry /></OwnerOnly>} />
        <Route path="lockes/:id/pokemon/:entryId/evidencias" element={<OwnerOnly><LockeEvidence /></OwnerOnly>} />
        <Route path="lockes/:id/pvp" element={<OwnerOnly><LockePvp /></OwnerOnly>} />
        <Route path="lockes/:id/archivos" element={<OwnerOnly><LockeFiles /></OwnerOnly>} />
        <Route path="hall" element={<HallList />} />
        <Route path="hall/:id" element={<HallOfFame />} />
        <Route path="pokedex" element={<Pokedex />} />
        <Route path="pokedex/:id" element={<PokedexDetail />} />
        <Route path="rankings" element={<Rankings />} />
        <Route path="amigos" element={<Friends />} />
        <Route path="amigos/:userId" element={<FriendProfile />} />
        <Route path="biblioteca" element={<Library />} />
        <Route path="perfil" element={<Profile />} />
        <Route path="exportar" element={<Export />} />
        <Route path="conflictos" element={<ConflictResolver />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return <HashRouter><AuthProvider><Gate /></AuthProvider></HashRouter>;
}
