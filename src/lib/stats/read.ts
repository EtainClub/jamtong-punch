import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/firebase/admin";

export type PublicSubjectStats = {
  windows: { d7: Record<string, number>; d30: Record<string, number>; all: Record<string, number> };
  computedAt: FirebaseFirestore.Timestamp;
  schemaVersion: number;
};

export function getPublicSubjectStats(subjectId: string) {
  return unstable_cache(async () => {
    const snapshot = await db.doc(`subjectStats/${subjectId}`).get();
    if (!snapshot.exists) return null;
    const data = snapshot.data()!;
    if (data.schemaVersion !== 2) return null;
    return data as PublicSubjectStats;
  }, ["subject-stats", subjectId], { revalidate: 60, tags: [`stats:${subjectId}`] })();
}

export const getPublicStatsIndex = unstable_cache(async () => {
  const snapshot = await db.doc("subjectStats/_index").get();
  return snapshot.exists ? snapshot.data()! : null;
}, ["subject-stats-index"], { revalidate: 60, tags: ["stats:index"] });

export function invalidateStats(subjectIds: Iterable<string>) {
  // Unit tests and one-off Admin scripts have no Next cache context; aggregation
  // must still complete because Firestore is the source of the public value.
  try {
    for (const subjectId of new Set(subjectIds)) revalidateTag(`stats:${subjectId}`, "max");
    revalidateTag("stats:index", "max");
  } catch {
    // No cache context exists outside a Route Handler/server render.
  }
}

// Whole-period counts for a page of statements in one read. A statement is a
// fixed past event, so its figure uses the `all` window (latest stance per
// participant), not the 30-day window used for people.
export function getStatementStats(statementIds: string[]) {
  const ids = [...new Set(statementIds)].sort();
  return unstable_cache(async (): Promise<Record<string, Record<"punch" | "cheer" | "unknown", number>>> => {
    if (!ids.length) return {};
    const snapshots = await db.getAll(...ids.map((id) => db.doc(`subjectStats/${id}`)));
    return Object.fromEntries(snapshots.filter((snapshot) => snapshot.exists && snapshot.get("schemaVersion") === 2).map((snapshot) => {
      const all = (snapshot.get("windows")?.all ?? {}) as Record<string, number>;
      return [snapshot.id, { punch: Number(all.punch ?? 0), cheer: Number(all.cheer ?? 0), unknown: Number(all.unknown ?? 0) }];
    }));
  }, ["statement-stats", ...ids], { revalidate: 60, tags: ids.map((id) => `stats:${id}`) })();
}
