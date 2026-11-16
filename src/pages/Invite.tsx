import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, approveUser } from '../auth/AuthProvider';
import { getFirebaseAuth, getFirebaseDb, doc, getDoc } from '../lib/firebase';

export function Invite() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [sending, setSending] = useState(false);

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('No hay sesión iniciada');

      const db = getFirebaseDb();
      const snap = await getDoc(doc(db, 'invite_codes', code.trim()));
      if (!snap.exists()) throw new Error('Código de invitación no válido o ya usado.');

      // Marcar usuario como aprobado
      await approveUser(user.uid);

      // Marcar código como usado (opcional)
      const { setDoc } = await import('../lib/firebase');
      await setDoc(doc(db, 'invite_codes', code.trim()), { used_by: user.uid, used_at: new Date().toISOString() }, { merge: true });

      setOk(true);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSending(false);
    }
  };

  if (ok) {
    return (
      <section className="auth">
        <div className="auth__card">
          <h1>¡Listo!</h1>
          <p className="msg msg--ok">Tu cuenta ha sido aprobada. Ya puedes usar la aplicación.</p>
          <button className="btn btn--primary" onClick={() => navigate('/')}>
            Ir al inicio
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="auth">
      <div className="auth__card">
        <h1>Código de invitación</h1>
        <p className="muted small">
          Este servidor requiere un código de invitación. Pídelo a un administrador.
        </p>
        <form onSubmit={redeem} className="form">
          <label>
            Código
            <input required maxLength={40} value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          {error && <p role="alert" className="msg msg--error">{error}</p>}
          <button className="btn btn--primary" type="submit" disabled={sending}>
            {sending ? '…' : 'Canjear código'}
          </button>
        </form>
        {profile && <p className="muted small" style={{ textAlign: 'center', marginTop: 10 }}>
          {profile.display_name}
        </p>}
        <button className="btn btn--ghost" onClick={() => void signOut()} style={{ marginTop: 6, width: '100%' }}>
          Usar otra cuenta
        </button>
      </div>
    </section>
  );
}
