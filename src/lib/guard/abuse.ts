import { createHash, randomInt } from "node:crypto";
import { isIP } from "node:net";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { kstDate } from "@/lib/date/kst";
import { db } from "@/lib/firebase/admin";

const IP_SHARDS = 10;
const NEW_UID_CAP = 20;
const TTL_MS = 7 * 86_400_000;

function clientIp(req: Request): string | null {
  const candidate = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}

function dailyIpHash(ip: string, date: string): string {
  const pepper = process.env.IP_HASH_PEPPER;
  if (!pepper) throw new Error("IP_HASH_PEPPER is not configured");
  return createHash("sha256").update(`${date}\u0000${pepper}\u0000${ip}`).digest("hex").slice(0, 16);
}

/** Records request volume in a random shard and enforces the stale-summary new-UID cap. */
export async function recordSubmissionAbuse(req: Request, uid: string) {
  const ip = clientIp(req);
  if (!ip) return { allowed: true, tracked: false } as const;
  const date = kstDate().replaceAll("-", "");
  const hash = dailyIpHash(ip, date);
  const ipRef = db.doc(`abuse/${date}/ip/${hash}`);
  const uidRef = db.doc(`abuse/${date}/ip/${hash}/uids/${uid}`);
  const shardRef = db.doc(`abuse/${date}/ip/${hash}/shards/${randomInt(IP_SHARDS)}`);
  const pendingRef = db.doc(`system/abusePending/items/${date}_${hash}`);
  const expiresAt = Timestamp.fromMillis(Date.now() + TTL_MS);

  return db.runTransaction(async (tx) => {
    const [summary, marker] = await tx.getAll(ipRef, uidRef);
    const isNewUid = !marker.exists;
    if (isNewUid && Number(summary.get("newUids") ?? 0) >= NEW_UID_CAP) return { allowed: false, tracked: true } as const;
    if (isNewUid) tx.create(uidRef, { expiresAt });
    tx.set(shardRef, {
      submits: FieldValue.increment(1),
      newUids: FieldValue.increment(isNewUid ? 1 : 0),
      updatedAt: Timestamp.now(),
      expiresAt,
    }, { merge: true });
    tx.set(pendingRef, { date, hash, updatedAt: Timestamp.now(), expiresAt }, { merge: true });
    return { allowed: true, tracked: true } as const;
  });
}

/** Called only by a non-empty rollup run, so there is no idle abuse-counter cost. */
export async function summarizePendingAbuse(limit = 20) {
  const pending = await db.collection("system/abusePending/items").orderBy("updatedAt").limit(limit).get();
  if (pending.empty) return 0;
  const summaries = await Promise.all(pending.docs.map(async (item) => {
    const { date, hash } = item.data() as { date: string; hash: string };
    const shards = await db.collection(`abuse/${date}/ip/${hash}/shards`).get();
    return { item, date, hash, newUids: shards.docs.reduce((sum, shard) => sum + Number(shard.get("newUids") ?? 0), 0), submits: shards.docs.reduce((sum, shard) => sum + Number(shard.get("submits") ?? 0), 0) };
  }));
  const batch = db.batch();
  for (const summary of summaries) {
    batch.set(db.doc(`abuse/${summary.date}/ip/${summary.hash}`), {
      newUids: summary.newUids,
      submits: summary.submits,
      summarizedAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + TTL_MS),
    }, { merge: true });
    batch.delete(summary.item.ref);
  }
  await batch.commit();
  return summaries.length;
}
