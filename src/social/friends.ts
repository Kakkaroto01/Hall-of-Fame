import {
  getFirebaseAuth,
  getFirebaseDb,
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
} from '../lib/firebase';
import { pullFriends } from '../sync/engine';

export type Relation = 'friends' | 'sent' | 'received' | 'none';

export function relationOf(friendships: any[], me: string, other: string): { relation: Relation; id?: string } {
  const f = friendships.find((x) => (x.requester_id === me && x.addressee_id === other) || (x.requester_id === other && x.addressee_id === me));
  if (!f) return { relation: 'none' };
  if (f.status === 'accepted') return { relation: 'friends', id: f.id };
  return { relation: f.requester_id === me ? 'sent' : 'received', id: f.id };
}

export interface FoundUser { id: string; username: string; display_name: string; avatar_url: string | null }

const fail = (message: string) => ({ ok: false, message } as const);

export async function searchUsers(queryText: string, me: string) {
  const q = queryText.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (q.length < 3) return fail('Escribe al menos 3 caracteres del nombre de usuario.');
  try {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, 'profiles'));
    const all: FoundUser[] = [];
    snap.forEach((d) => {
      const data = d.data() as FoundUser & { id: string };
      if (data.id !== me && data.username.toLowerCase().includes(q)) {
        all.push({ id: data.id, username: data.username, display_name: data.display_name, avatar_url: data.avatar_url ?? null });
      }
    });
    return { ok: true, data: all.slice(0, 10) };
  } catch {
    return fail('No se pudo buscar. Inténtalo de nuevo.');
  }
}

async function act(run: () => PromiseLike<{ error?: any }>, dupMessage?: string) {
  try {
    await run();
    await pullFriends().catch(() => undefined);
    return { ok: true, data: undefined } as const;
  } catch (e: any) {
    return fail(dupMessage ?? 'No se pudo completar la operación. Inténtalo de nuevo.');
  }
}

export const sendRequest = (me: string, other: string) =>
  act(async () => {
    const db = getFirebaseDb();
    await addDoc(collection(db, 'friendships'), { requester_id: me, addressee_id: other, status: 'pending', created_at: new Date().toISOString() });
    return { error: null };
  }, 'Ya existe una solicitud o una amistad con esa persona.');

export const acceptRequest = (id: string) => act(async () => {
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'friendships', id), { status: 'accepted', responded_at: new Date().toISOString() });
  return { error: null };
});

export const removeFriendship = (id: string) => act(async () => {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, 'friendships', id));
  return { error: null };
});
