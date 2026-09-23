import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import type { AnchorType } from "./canonical";
import { isPending, type AnchorVersion } from "./versions";

export const CUSTOM_JSON_ID = "imtong";
export const ANCHOR_APP = "imtong/1";

// What goes on chain: identity, version, hash and the link to the previous
// version. Never the text itself — content on chain can never be taken down.
export type AnchorMessage = { app: string; t: AnchorType; id: string; v: number; op: AnchorVersion["op"]; h: string | null; prev: string | null };
export type SendAnchor = (message: AnchorMessage) => Promise<{ txId: string; blockNum: number }>;

export function anchorMessage(type: AnchorType, id: string, version: AnchorVersion): AnchorMessage {
  return { app: ANCHOR_APP, t: type, id, v: version.v, op: version.op, h: version.hash, prev: version.prev };
}

async function acquireLease(): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const ref = db.doc("system/anchors");
    const state = await tx.get(ref);
    if ((state.get("leaseUntil")?.toMillis() ?? 0) > Date.now()) return false;
    tx.set(ref, { leaseUntil: Timestamp.fromMillis(Date.now() + 120_000) }, { merge: true });
    return true;
  });
}

async function releaseLease() {
  await db.doc("system/anchors").set({ leaseUntil: Timestamp.fromMillis(0), lastRunAt: Timestamp.now() }, { merge: true });
}

// Sends pending versions oldest first. A version is only sent after the one
// before it is on chain, so the prev links on chain always resolve. A lease
// keeps two overlapping runs from sending the same version twice.
export async function broadcastPending(send: SendAnchor, limit = 20) {
  const pending = await db.collection("anchors").where("hasPending", "==", true).limit(limit).get();
  if (pending.empty) return { sent: 0, failed: 0 };
  if (!(await acquireLease())) return { sent: 0, failed: 0, skipped: "busy" as const };
  let sent = 0;
  let failed = 0;
  try {
    for (const snapshot of pending.docs) {
      const type = snapshot.get("type") as AnchorType;
      const id = snapshot.get("id") as string;
      const versions = [...(snapshot.get("versions") as AnchorVersion[])];
      for (let index = 0; index < versions.length; index += 1) {
        if (!isPending(versions[index])) continue;
        try {
          const result = await send(anchorMessage(type, id, versions[index]));
          versions[index] = { ...versions[index], txId: result.txId, blockNum: result.blockNum, anchoredAt: new Date().toISOString(), error: null };
          sent += 1;
        } catch (error) {
          versions[index] = { ...versions[index], error: error instanceof Error ? error.message.slice(0, 300) : String(error) };
          failed += 1;
          break;
        }
      }
      await snapshot.ref.update({ versions, hasPending: versions.some(isPending) });
    }
  } finally {
    await releaseLease();
  }
  return { sent, failed };
}
