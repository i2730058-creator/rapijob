import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SignUpInput, User } from '@/types';
import { repo } from '@/lib/repo';

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (input: SignUpInput) => Promise<User>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<User>) => Promise<User>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    repo.auth
      .current()
      .then((current) => {
        if (active) setUser(current);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await repo.auth.signIn(email, password);
    setUser(next);
    return next;
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const next = await repo.auth.signUp(input);
    setUser(next);
    return next;
  }, []);

  const signOut = useCallback(async () => {
    await repo.auth.signOut();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch: Partial<User>) => {
    const next = await repo.auth.updateProfile(patch);
    setUser(next);
    return next;
  }, []);

  const refresh = useCallback(async () => {
    const next = await repo.auth.current();
    setUser(next);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, signIn, signUp, signOut, updateProfile, refresh }),
    [user, ready, signIn, signUp, signOut, updateProfile, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
