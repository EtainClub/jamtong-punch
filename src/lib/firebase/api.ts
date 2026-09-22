"use client";

import { getLimitedUseToken } from "firebase/app-check";
import { getIdToken } from "firebase/auth";
import { firebaseAppCheck } from "@/lib/firebase/client";

async function authenticatedFetch(user: Parameters<typeof getIdToken>[0], input: RequestInfo | URL, init: RequestInit = {}) {
  const idToken = await getIdToken(user);
  const appCheckToken = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"
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

export async function firebaseJsonFetch<T>(user: Parameters<typeof getIdToken>[0], input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  return unwrap<T>(await authenticatedFetch(user, input, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  }));
}

export async function firebaseFormFetch<T>(user: Parameters<typeof getIdToken>[0], input: RequestInfo | URL, form: FormData): Promise<T> {
  return unwrap<T>(await authenticatedFetch(user, input, { method: "POST", body: form }));
}
