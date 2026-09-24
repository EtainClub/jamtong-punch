import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { kstDate } from "@/lib/date/kst";
import { db } from "@/lib/firebase/admin";

// Shown publicly as "등록: <nickname>" on content a contributor submitted.
// Their Google name and email are never shown.
export const nicknameSchema = z.string().trim().min(2, "닉네임은 2자 이상").max(20, "닉네임은 20자 이하")
  .regex(/^[\p{L}\p{N} ._-]+$/u, "닉네임에는 글자, 숫자, 공백, . _ - 만 쓸 수 있습니다");

export type Contributor = { uid: string; nickname: string };

export async function getNickname(uid: string): Promise<string | null> {
  const snapshot = await db.doc(`contributors/${uid}`).get();
  return snapshot.exists ? String(snapshot.get("nickname")) : null;
}

export async function setNickname(uid: string, nickname: string) {
  const value = nicknameSchema.parse(nickname);
  const ref = db.doc(`contributors/${uid}`);
  await db.runTransaction(async (tx) => {
    const current = await tx.get(ref);
    tx.set(ref, { nickname: value, createdAt: current.get("createdAt") ?? Timestamp.now(), updatedAt: Timestamp.now() });
  });
  return value;
}

export const DAILY_CONTRIBUTION_CAP = 50;

// Contributors are anyone with a Google account, so saves are capped per day.
// Operators are not counted.
export async function consumeContribution(uid: string): Promise<boolean> {
  const ref = db.doc(`contributors/${uid}/daily/${kstDate()}`);
  return db.runTransaction(async (tx) => {
    const count = Number((await tx.get(ref)).get("saves") ?? 0);
    if (count >= DAILY_CONTRIBUTION_CAP) return false;
    tx.set(ref, { saves: FieldValue.increment(1), expiresAt: Timestamp.fromMillis(Date.now() + 7 * 86_400_000) }, { merge: true });
    return true;
  });
}
