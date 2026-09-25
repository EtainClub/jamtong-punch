"use client";

import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import type { Game, Kind, Stance, StateEntry } from "@/lib/domain";
import { firebaseJsonFetch } from "@/lib/firebase/api";
import { firebaseDb } from "@/lib/firebase/client";

export type ParticipationResult = { accepted: string[]; replaced: string[]; capped: string[]; date: string };
export type StanceEntry = { kind: Kind; slug: string; stance: Stance; recordId?: string | null; score?: number | null; dwellMs?: number };

export const STANCE_LABELS: Record<Stance, string> = { punch: "펀치", cheer: "응원", unknown: "잘 모름" };

// One read of the user's own stance map per page, shared by every caller.
const mine = new Map<string, Promise<Record<string, StateEntry>>>();
export function loadMyStances(uid: string): Promise<Record<string, StateEntry>> {
  let pending = mine.get(uid);
  if (!pending) {
    pending = getDoc(doc(firebaseDb, `users/${uid}/state/subjects`)).then((snapshot) => (snapshot.get("m") ?? {}) as Record<string, StateEntry>).catch(() => ({}));
    mine.set(uid, pending);
  }
  return pending;
}

export function rememberMyStance(uid: string, id: string, entry: StateEntry) {
  void loadMyStances(uid).then((map) => { map[id] = entry; });
}

// Every game ends in the same request: one session, an array of stances
// (implementation-design 9장). The server folds them into one per target a day.
export async function submitStances(user: User, input: { sessionId: string; game: Game; startedAt: string; stances: StanceEntry[] }) {
  const result = await firebaseJsonFetch<ParticipationResult>(user, "/api/participation", { method: "POST", body: JSON.stringify(input) });
  for (const entry of input.stances) {
    if (!result.capped.includes(entry.slug)) rememberMyStance(user.uid, entry.slug, { s: entry.stance, d: result.date });
  }
  return result;
}

// Today's date in Korea, the day a stance is folded into.
export function kstToday(): string {
  return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
}
