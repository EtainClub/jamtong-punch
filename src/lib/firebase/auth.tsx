"use client";

import type { FirebaseError } from "firebase/app";
import { GoogleAuthProvider, linkWithPopup, onIdTokenChanged, signInAnonymously, signInWithCredential, signInWithPopup, signOut, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { connectFirebaseEmulators, firebaseAuth } from "@/lib/firebase/client";

type AuthState = { user: User | null; ready: boolean; error: Error | null };
const AuthContext = createContext<AuthState>({ user: null, ready: false, error: null });

// Every visitor gets an anonymous identity (for punch/cheer). Signing in with
// Google upgrades it. Token changes (not just auth changes) are watched so the
// UI follows an anonymous account being linked to Google.
export function FirebaseAuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, setState] = useState<AuthState>({ user: null, ready: false, error: null });
  useEffect(() => {
    connectFirebaseEmulators();
    const unsubscribe = onIdTokenChanged(firebaseAuth, async (user) => {
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

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const current = firebaseAuth.currentUser;
  if (current?.isAnonymous) {
    try {
      // Keeps the uid, so stances made anonymously stay with the account.
      await linkWithPopup(current, provider);
      await current.getIdToken(true);
      return;
    } catch (error) {
      // This Google account already has an 임통 identity: switch to it.
      if ((error as FirebaseError).code === "auth/credential-already-in-use") {
        const credential = GoogleAuthProvider.credentialFromError(error as FirebaseError);
        if (credential) {
          await signInWithCredential(firebaseAuth, credential);
          return;
        }
      }
      throw error;
    }
  }
  await signInWithPopup(firebaseAuth, provider);
}

// The provider signs the visitor straight back in anonymously.
export async function signOutOfGoogle() {
  await signOut(firebaseAuth);
}
