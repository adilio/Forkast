import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, firebaseConfigured } from './firebase';

type AuthState = {
  user: User | null;
  householdId: string | null;
  loading: boolean;
  configured: boolean;
};
const AuthContext = createContext<AuthState>({
  user: null,
  householdId: null,
  loading: true,
  configured: firebaseConfigured,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  useEffect(() => {
    if (!auth || !db) {
      return;
    }
    let stopProfile = () => {};
    return onAuthStateChanged(auth, (next) => {
      stopProfile();
      setUser(next);
      setHouseholdId(null);
      if (!next) {
        setLoading(false);
        return;
      }
      setLoading(true);
      stopProfile = onSnapshot(
        doc(db!, 'users', next.uid),
        (snap) => {
          setHouseholdId((snap.data()?.householdId as string | undefined) ?? null);
          setLoading(false);
        },
        () => setLoading(false),
      );
    });
  }, []);
  return (
    <AuthContext.Provider
      value={useMemo(
        () => ({ user, householdId, loading, configured: firebaseConfigured }),
        [user, householdId, loading],
      )}
    >
      {children}
    </AuthContext.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
