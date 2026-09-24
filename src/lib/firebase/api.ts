"use client";

import { getLimitedUseToken } from "firebase/app-check";
import { getIdToken } from "firebase/auth";
import { firebaseAppCheck } from "@/lib/firebase/client";

type FirebaseUser = Parameters<typeof getIdToken>[0];

async function authenticatedFetch(user: FirebaseUser, input: RequestInfo | URL, init: RequestInit, withAppCheck: boolean) {
  const idToken = await getIdToken(user);
  const appCheckToken = !withAppCheck || process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"
    ? null
    : await getLimitedUseToken(firebaseAppCheck());
  return fetch(input, {
    ...init,
    headers: {
      authorization: `Bearer ${idToken}`,
      ...(appCheckToken ? { "x-firebase-appcheck": appCheckToken.token } : {}),
      ...init.headers,
    },
  });
}

async function unwrap<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error((await response.json().catch(() => ({ error: "request-failed" }))).error);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const json = (init: RequestInit): RequestInit => ({ ...init, headers: { "content-type": "application/json", ...init.headers } });

export async function firebaseJsonFetch<T>(user: FirebaseUser, input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  return unwrap<T>(await authenticatedFetch(user, input, json(init), true));
}

// For editing and profile routes, which trust a signed-in Google account
// without App Check (see verifyCaller's accountsSkipAppCheck).
export async function accountJsonFetch<T>(user: FirebaseUser, input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  return unwrap<T>(await authenticatedFetch(user, input, json(init), false));
}

export async function accountFormFetch<T>(user: FirebaseUser, input: RequestInfo | URL, form: FormData): Promise<T> {
  return unwrap<T>(await authenticatedFetch(user, input, { method: "POST", body: form }, false));
}
