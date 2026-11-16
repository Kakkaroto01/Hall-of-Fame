import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../db/local';

/** ¿Es mío este locke? undefined mientras carga. Un locke creado sin conexión aún sin `owner_id` es mío. */
export function useIsMine(lockeId: string): boolean | undefined {
  const { session } = useAuth();
  const uid = session?.uid;
  const owner = useLiveQuery(async () => {
    const l = await db.locke.get(lockeId);
    return l ? ((l.owner_id as string | undefined) ?? uid ?? null) : null;
  }, [lockeId, uid]);
  if (owner === undefined) return undefined;
  return owner === uid;
}

/** Envuelve las pantallas de edición: solo el dueño del locke puede usarlas. */
export function OwnerOnly({ children }: { children: ReactNode }) {
  const { id = '' } = useParams();
  const mine = useIsMine(id);
  if (mine === false) {
    return <section className="page"><h1>Solo lectura</h1><p className="muted">Este locke es de otra persona: puedes verlo, pero solo su dueño puede modificarlo.</p><Link to={`/hall/${id}`}>Ver su Hall of Fame</Link></section>;
  }
  return <>{children}</>;
}
