"use client";

import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { connectFirebaseEmulators, firebaseAuth } from "@/lib/firebase/client";

type AuthState = { user: User | null; ready: boolean; error: Error | null };
const AuthContext = createContext<AuthState>({ user: null, ready: false, error: null });

export function FirebaseAuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, setState] = useState<AuthState>({ user: null, ready: false, error: null });
  useEffect(() => {
    connectFirebaseEmulators();
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      try {
        const resolved = user ?? (await signInAnonymously(firebaseAuth)).user;
        setState({ user: resolved, ready: true, error: null });
      } catch (error) {
        setState({ user: null, ready: true, error: error instanceof Error ? error : new Error("anonymous-auth-failed") });
      }
    });
    return unsubscribe;
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useFirebaseAuth() {
  return useContext(AuthContext);
}
