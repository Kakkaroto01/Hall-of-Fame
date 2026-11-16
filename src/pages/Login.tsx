import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, authMessage } from '../auth/AuthProvider';
import {
  getFirebaseAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from '../lib/firebase';

export function Login() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const auth = getFirebaseAuth();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Crear perfil en Firestore
        const { setDoc, doc, getFirebaseDb } = await import('../lib/firebase');
        await setDoc(doc(getFirebaseDb(), 'profiles', cred.user.uid), {
          id: cred.user.uid,
          username: email.split('@')[0],
          display_name: email.split('@')[0],
          avatar_url: null,
          role: 'user',
          approved: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e: any) {
      setError(authMessage(e) ?? String(e?.message ?? e));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="auth">
      <div className="auth__card">
        <h1>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
        <form onSubmit={onSubmit} className="form">
          <label>
            Correo electrónico
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p role="alert" className="msg msg--error">{error}</p>}
          <button className="btn btn--primary" type="submit" disabled={sending}>
            {sending ? '…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
        <div className="divider"><span>{mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}</span></div>
        <button className="btn btn--ghost" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
        </button>
        <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '14px 0' }} />
        <p className="muted small" style={{ textAlign: 'center', marginTop: 10 }}>
          Tu cuenta queda pendiente hasta que un administrador la apruebe en Firebase.
        </p>
        <Link to="/" className="btn btn--ghost" style={{ marginTop: 8, textAlign: 'center', display: 'block' }}>
          Volver
        </Link>
      </div>
    </section>
  );
}
