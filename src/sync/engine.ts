import {
  getFirebaseAuth,
  getFirebaseDb,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDocs,
} from '../lib/firebase';
import { db as localDb, purgeOthersCache, SYNC_TABLES, type OutboxOp, type SyncTable, type LocalRow } from '../db/local';

let running = false;

/** Envía la cola local a Firestore. */
export async function push(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return;

  const ops = await localDb.outbox.where('status').equals('pending').sortBy('id');

  for (const op of ops) {
    try {
      if (op.table === 'league_team_member') {
        await pushMember(op, user.uid);
      } else if (op.kind === 'insert') {
        await pushInsert(op, user.uid);
      } else {
        await pushUpdate(op, user.uid);
      }
    } catch (e: any) {
      await localDb.outbox.update(op.id!, { status: 'error', error: String(e?.message ?? e) });
    }
  }
}

async function pushMember(op: OutboxOp, uid: string) {
  const { locke_id, entry_id } = op.patch as { locke_id: string; entry_id: string };
  const fb = getFirebaseDb();
  const ref = doc(fb, 'league_team_member', `${locke_id}_${entry_id}`);
  if (op.kind === 'insert') {
    await setDoc(ref, { locke_id, entry_id, owner_id: uid, created_at: serverTimestamp() }, { merge: true });
  } else {
    await deleteDoc(ref);
  }
  await localDb.outbox.delete(op.id!);
}

async function pushInsert(op: OutboxOp, uid: string) {
  const fb = getFirebaseDb();
  const ref = doc(fb, op.table as string, op.rowId);
  await setDoc(ref, { ...op.patch, owner_id: uid, created_at: serverTimestamp() }, { merge: true });
  await localDb.outbox.delete(op.id!);
}

async function pushUpdate(op: OutboxOp, uid: string) {
  const fb = getFirebaseDb();
  const ref = doc(fb, op.table as string, op.rowId);
  await updateDoc(ref, { ...op.patch, owner_id: uid, updated_at: serverTimestamp() });
  await localDb.outbox.delete(op.id!);
}

/** Descarga cambios de Firestore. */
export async function pull(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return;

  const fb = getFirebaseDb();
  for (const table of SYNC_TABLES) {
    const q = query(collection(fb, table), where('owner_id', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach(async (change) => {
        if (change.type === 'added' || change.type === 'modified') {
          await (localDb[table as keyof typeof localDb] as any).put({ id: change.doc.id, ...change.doc.data(), updated_at: new Date().toISOString() });
        } else if (change.type === 'removed') {
          await (localDb[table as keyof typeof localDb] as any).delete(change.doc.id);
        }
      });
    });
    // onSnapshot se mantiene activo; en una app real se gestionaría la suscripción.
  }
}

/** Descarga amistades y perfiles de implicados. */
export async function pullFriends(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return;
  const fb = getFirebaseDb();
  const q = query(collection(fb, 'friendships'), where('requester_id', '==', user.uid));
  const snap = await getDocs(q);
  const rows: any[] = [];
  snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
  // Guardar en Dexie (friendship)
  await localDb.friendship.clear();
  await localDb.friendship.bulkPut(rows as any);
  // Perfiles de los otros usuarios
  const others = [...new Set(rows.flatMap((r) => [r.requester_id, r.addressee_id]).filter((x: string) => x !== user.uid))];
  if (others.length) {
    const profSnap = await getDocs(query(collection(fb, 'profiles'), where('__name__', 'in', others)));
    const profiles: any[] = [];
    profSnap.forEach((d) => profiles.push({ id: d.id, ...d.data() }));
    await localDb.profile_cache.bulkPut(profiles as any);
  }
}

/** Sincroniza al abrir y cada 30 s. */
export function startSync(): () => void {
  const trigger = () => void (push().then(() => pull()).then(() => pullFriends()));
  const timer = window.setInterval(trigger, 30_000);
  trigger();
  return () => window.clearInterval(timer);
}

/** Resuelve un conflicto (en Firebase no hay conflictos de versión como en Supabase, se sobrescribe). */
export async function resolveConflict(rowId: string, merged: Record<string, unknown>) {
  const c = await localDb.conflicts.get(rowId);
  if (!c) return;
  await localDb.outbox.where('rowId').equals(rowId).delete();
  await localDb.outbox.add({
    table: c.table, kind: 'update', rowId, baseVersion: 0,
    patch: merged, status: 'pending', createdAt: Date.now(),
  });
  await localDb.conflicts.update(rowId, { status: 'resolved', resolution: merged });
}
