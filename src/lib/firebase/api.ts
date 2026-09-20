"use client";

import { getLimitedUseToken } from "firebase/app-check";
import { getIdToken } from "firebase/auth";
import { firebaseAppCheck } from "@/lib/firebase/client";

export async function firebaseJsonFetch<T>(user: Parameters<typeof getIdToken>[0], input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const idToken = await getIdToken(user);
  const appCheckToken = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"
    ? null
    : await getLimitedUseToken(firebaseAppCheck());
  const response = await fetch(input, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${idToken}`,
      ...(appCheckToken ? { "x-firebase-appcheck": appCheckToken.token } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({ error: "request-failed" }))).error);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
