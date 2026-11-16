import { useEffect, useState } from 'react';
import { firstLoadable } from '../catalog/sprites';

/** Devuelve la primera URL que cargue (o `override` si se fija un sprite propio). */
export function useSprite(candidates: string[], override?: string | null): { url: string | null; loading: boolean } {
  const key = candidates.join('|');
  const [state, setState] = useState<{ url: string | null; loading: boolean }>({ url: override ?? null, loading: !override });
  useEffect(() => {
    if (override) { setState({ url: override, loading: false }); return; }
    let cancelled = false;
    setState({ url: null, loading: true });
    firstLoadable(candidates).then((url) => { if (!cancelled) setState({ url, loading: false }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, override]);
  return state;
}
