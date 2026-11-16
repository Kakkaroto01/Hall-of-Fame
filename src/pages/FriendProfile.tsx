import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../db/local';
import { removeFriendship } from '../social/friends';
import { SyncChip } from '../layout/Shell';

export function FriendProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { session } = useAuth();
  const me = session?.uid ?? null;
  const navigate = useNavigate();
  const [sending, setSending] = useState<boolean>(false);

  const [profile, setProfile] = useState<any>(null);
  const [friendships, setFriendships] = useState<any[]>([]);

  useEffect(() => {
    if (userId) db.profile_cache.get(userId).then(setProfile);
    db.friendship.toArray().then(setFriendships);
  }, [userId, me]);

  const f = friendships.find((x: any) => (x.requester_id === me && x.addressee_id === userId) || (x.requester_id === userId && x.addressee_id === me));
  const isFriend = f?.status === 'accepted';

  const remove = async () => {
    if (!f) return;
    setSending(true);
    try {
      await removeFriendship(f.id);
      navigate('/amigos');
    } finally {
      setSending(false);
    }
  };

  if (!profile) return <section className="page"><p className="muted">Cargando perfil…</p></section>;

  return (
    <section className="page">
      <div className="page__head">
        <h1>{profile.display_name}</h1>
        <Link to="/amigos" className="btn btn--ghost">Volver a amigos</Link>
      </div>

      <div style={{ maxWidth: '620px' }}>
        <p><strong>Usuario:</strong> @{profile.username}</p>
        {profile.avatar_url && <p><img src={profile.avatar_url} alt="Avatar" style={{ width: 48, height: 48, borderRadius: '50%' }} /></p>}

        <h2>Su Hall of Fame (solo lectura)</h2>
        <p className="muted">Como amigo puedes ver sus lockes compartidos.</p>

        {isFriend ? (
          <button className="btn btn--ghost" onClick={remove} disabled={sending}>
            {sending ? '…' : 'Dejar de ser amigos'}
          </button>
        ) : (
          <p className="muted small">No sois amigos todavía.</p>
        )}
      </div>
    </section>
  );
}
