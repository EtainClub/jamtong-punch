import { db } from "@/lib/firebase/admin";
import { payloadFor, payloadHash, type AnchoredRecord, type AnchorType, type SourceRefs } from "./canonical";
import { isPending, nextVersion, type AnchorVersion } from "./versions";

export function anchorDocId(type: AnchorType, id: string) {
  return `${type}_${id}`;
}

// Called after every content write that can change what the public sees.
// The chain write itself happens later (cron), so saving never waits on a
// Steem node.
export async function queueAnchor(type: AnchorType, id: string, value: AnchoredRecord | null, sources: SourceRefs) {
  const hash = value && value.status === "published" ? await payloadHash(payloadFor(type, value, sources)) : null;
  const ref = db.collection("anchors").doc(anchorDocId(type, id));
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const versions = (snapshot.get("versions") ?? []) as AnchorVersion[];
    const next = nextVersion(versions, hash, new Date().toISOString());
    if (!next) return null;
    const all = [...versions, next];
    tx.set(ref, { type, id, versions: all, hasPending: all.some(isPending) });
    return next;
  });
}
