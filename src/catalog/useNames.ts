import { useEffect, useState } from 'react';
import { loadNames, type NameTables } from './names';
import { DISPLAY_LANG } from '../config';

/** Tablas de nombres: `display` en el idioma de la app y `en` para reconocer texto de Showdown. */
export function useNames(): { display: NameTables; en: NameTables } | null {
  const [t, setT] = useState<{ display: NameTables; en: NameTables } | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all([loadNames(DISPLAY_LANG), loadNames('en')]).then(([display, en]) => { if (alive) setT({ display, en }); });
    return () => { alive = false; };
  }, []);
  return t;
}
