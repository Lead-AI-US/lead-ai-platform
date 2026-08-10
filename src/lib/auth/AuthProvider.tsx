import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase/client";
import type { UserProfile } from "@/types/user";

interface AuthContextValue {
  /** undefined while the initial auth check is in flight. */
  user: User | null | undefined;
  isFirebaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      return;
    }
    return onAuthStateChanged(auth, setUser);
  }, []);

  async function signIn(email: string, password: string) {
    if (!auth) throw new Error("Firebase is not configured.");
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(email: string, password: string) {
    if (!auth || !db) throw new Error("Firebase is not configured.");
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const now = new Date().toISOString();
    const profile: UserProfile = {
      uid: credential.user.uid,
      email: credential.user.email ?? email,
      createdAt: now,
      updatedAt: now,
    };
    // users/{uid} - the user creates their own profile doc, allowed only for
    // their own uid (see firebase/firestore.rules).
    const existing = await getDoc(doc(db, "users", credential.user.uid));
    if (!existing.exists()) {
      await setDoc(doc(db, "users", credential.user.uid), profile);
    }
  }

  async function signOut() {
    if (!auth) return;
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, isFirebaseConfigured, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
