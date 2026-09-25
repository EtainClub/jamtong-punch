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

// Operator switches (implementation-design 11장 3번): hide participation
// ratios everywhere (an election period) or for listed subjects. Stances are
// still recorded; only the public figures are withheld.
export type RatioFlags = { ratiosHidden: boolean; hiddenSubjects: string[] };
export const FLAGS_TAG = "system:flags";

export const getRatioFlags = unstable_cache(async (): Promise<RatioFlags> => {
  const snapshot = await db.doc("system/flags").get();
  return { ratiosHidden: snapshot.get("ratiosHidden") === true, hiddenSubjects: (snapshot.get("hiddenSubjects") ?? []) as string[] };
}, ["system-flags"], { revalidate: 60, tags: [FLAGS_TAG] });

export function ratioHidden(flags: RatioFlags, subjectId: string): boolean {
  return flags.ratiosHidden || flags.hiddenSubjects.includes(subjectId);
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
// A hidden subject comes back as zeros with `hidden`, so no figure can leak.
export type StatementCounts = Record<"punch" | "cheer" | "unknown", number> & { hidden?: boolean };

export function getStatementStats(statementIds: string[]) {
  const ids = [...new Set(statementIds)].sort();
  return unstable_cache(async (): Promise<Record<string, StatementCounts>> => {
    if (!ids.length) return {};
    const [snapshots, flags] = await Promise.all([db.getAll(...ids.map((id) => db.doc(`subjectStats/${id}`))), getRatioFlags()]);
    const counts = Object.fromEntries(snapshots.filter((snapshot) => snapshot.exists && snapshot.get("schemaVersion") === 2).map((snapshot) => {
      const all = (snapshot.get("windows")?.all ?? {}) as Record<string, number>;
      return [snapshot.id, { punch: Number(all.punch ?? 0), cheer: Number(all.cheer ?? 0), unknown: Number(all.unknown ?? 0) }];
    })) as Record<string, StatementCounts>;
    for (const id of ids) if (ratioHidden(flags, id)) counts[id] = { punch: 0, cheer: 0, unknown: 0, hidden: true };
    return counts;
  }, ["statement-stats", ...ids], { revalidate: 60, tags: [...ids.map((id) => `stats:${id}`), FLAGS_TAG] })();
}
