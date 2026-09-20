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
