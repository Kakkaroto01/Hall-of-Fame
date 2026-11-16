import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getFirebaseAuth,
  getFirebaseDb,
  type FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
} from '../lib/firebase';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: 'user' | 'admin';
  approved: boolean;
}

interface AuthState {
  loading: boolean;
  session: FirebaseUser | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fuera de <AuthProvider>');
  return v;
};

export function authMessage(error: { code?: string; message?: string } | null): string | null {
  if (!error) return null;
  const code = (error.code ?? '').toLowerCase();
  const msg = (error.message ?? '').toLowerCase();
  if (code.includes('auth/wrong-password') || msg.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (code.includes('auth/email-already-in-use') || msg.includes('already registered')) return 'Ese correo ya tiene una cuenta. Inicia sesión.';
  if (code.includes('auth/weak-password') || msg.includes('password should be')) return 'La contraseña es demasiado corta: usa al menos 6 caracteres.';
  if (code.includes('auth/user-not-found')) return 'No existe una cuenta con ese correo.';
  if (code.includes('auth/too-many-requests') || msg.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos.';
  if (code.includes('auth/network-request-failed') || msg.includes('network')) return 'No hay conexión. Inténtalo de nuevo cuando vuelva.';
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string | null) => {
    if (!userId) { setProfile(null); return; }
    try {
      const db = getFirebaseDb();
      const snap = await getDoc(doc(db, 'profiles', userId));
      if (snap.exists()) {
        const data = snap.data() as Profile;
        setProfile({ id: userId, username: data.username, display_name: data.display_name, avatar_url: data.avatar_url ?? null, role: data.role, approved: data.approved });
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      setSession(user);
      if (user) {
        await loadProfile(user.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [loadProfile]);

  const value = useMemo<AuthState>(() => ({
    loading, session, profile,
    refreshProfile: () => loadProfile(session?.uid ?? null),
    signOut: async () => {
      await signOut(getFirebaseAuth());
      setProfile(null);
    },
  }), [loading, session, profile, loadProfile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export async function createUserProfile(uid: string, email: string, displayName: string) {
  const db = getFirebaseDb();
  await setDoc(doc(db, 'profiles', uid), {
    username: email.split('@')[0],
    display_name: displayName,
    avatar_url: null,
    role: 'user',
    approved: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { merge: true });
}

export async function approveUser(uid: string) {
  const db = getFirebaseDb();
  await setDoc(doc(db, 'profiles', uid), {
    approved: true,
    role: 'admin',
    updated_at: new Date().toISOString(),
  }, { merge: true });
}
