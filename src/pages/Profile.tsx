import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../db/local';
import { SyncChip } from '../layout/Shell';

export function Profile() {
  const { session, profile, refreshProfile } = useAuth();
  const me = session?.uid ?? null;
  const [name, setName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);

  const [cached, setCached] = useState<any>(null);

  useEffect(() => {
    if (me) db.profile_cache.get(me as string).then(setCached);
  }, [me]);

  const saveName = async () => {
    if (!me || !name.trim()) return;
    setSaving(true);
    try {
      await db.profile_cache.put({
        id: me as string,
        username: cached?.username ?? '',
        display_name: name.trim(),
        avatar_url: cached?.avatar_url ?? null,
      });
      await refreshProfile();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page">
      <div className="page__head">
        <h1>Perfil y ajustes</h1>
      </div>

      <div style={{ maxWidth: '620px' }}>
        <p><strong>Usuario:</strong> {cached?.username ?? '—'}</p>
        <p><strong>Nombre para mostrar:</strong> {profile?.display_name ?? cached?.display_name ?? '—'}</p>
        <p><strong>Estado:</strong> {profile?.approved ? 'Aprobado' : 'Pendiente de invitación'}</p>
        <p><strong>Rol:</strong> {profile?.role ?? 'user'}</p>

        <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '24px 0' }} />

        <div className="actions" style={{ marginBottom: 24 }}>
          <Link to="/exportar" className="btn btn--ghost">Exportar mis datos (respaldo JSON)</Link>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void saveName(); }} className="form" style={{ maxWidth: '420px' }}>
          <label>
            Nombre para mostrar
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button className="btn btn--primary" type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Guardando…' : 'Guardar nombre'}
          </button>
        </form>
      </div>
    </section>
  );
}
