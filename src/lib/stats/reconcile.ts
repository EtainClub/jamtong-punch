import { Timestamp } from "firebase-admin/firestore";
import { cutoff, kstDate } from "@/lib/date/kst";
import { listedInIndex, type Kind, type Stance } from "@/lib/domain";
import { db } from "@/lib/firebase/admin";
import { invalidateStats } from "@/lib/stats/read";

type Counts = Record<Stance, number>;
const empty = (): Counts => ({ punch: 0, cheer: 0, unknown: 0 });

function sum(target: Counts, source: Partial<Counts>) {
  target.punch += source.punch ?? 0;
  target.cheer += source.cheer ?? 0;
  target.unknown += source.unknown ?? 0;
}

function same(left: Counts, right: Counts) {
  return left.punch === right.punch && left.cheer === right.cheer && left.unknown === right.unknown;
}

function budget() {
  const value = Number.parseInt(process.env.RECONCILE_READ_BUDGET ?? "50000", 10);
  return Number.isSafeInteger(value) && value > 0 ? value : 50_000;
}

function queueRef(subjectId: string) {
  return db.doc(`system/reconcileQueue/subjects/${subjectId}`);
}

/** Stage 1: detect window drift without scanning the ledger. */
export async function reconcileInvariants(today = kstDate()) {
  const active = await db.collection("dailyStats").where("date", "==", today).get();
  let reads = active.size;
  let checked = 0;
  let queued = 0;
  for (const activeDoc of active.docs) {
    if (reads >= budget()) break;
    const subjectId = activeDoc.get("subjectId") as string;
    const cohorts = await db.collection("subjectCohorts")
      .where("subjectId", "==", subjectId)
      .where("date", ">=", cutoff(today, 30))
      .get();
    reads += cohorts.size + 1;
    const expected30 = empty();
    const expected7 = empty();
    for (const cohort of cohorts.docs) {
      const values = cohort.data() as Partial<Counts> & { date: string };
      sum(expected30, values);
      if (values.date >= cutoff(today, 7)) sum(expected7, values);
    }
    const stats = await db.doc(`subjectStats/${subjectId}`).get();
    const actual30 = (stats.get("windows")?.d30 ?? empty()) as Counts;
    const actual7 = (stats.get("windows")?.d7 ?? empty()) as Counts;
    checked += 1;
    if (!same(expected30, actual30) || !same(expected7, actual7)) {
      await queueRef(subjectId).set({ reason: "drift", queuedAt: Timestamp.now() }, { merge: true });
      queued += 1;
    }
  }
  return { checked, queued, reads, budget: budget() };
}

type LedgerEntry = { subjectId: string; kind?: Kind; date: string; stance: Stance; excluded: boolean };

/** Stage 2: rebuild one subject's cohorts and windows from the ledger source of truth. */
export async function rebuildSubject(subjectId: string, today = kstDate()) {
  const ledger = await db.collectionGroup("stances").where("subjectId", "==", subjectId).get();
  const latestByUid = new Map<string, LedgerEntry>();
  let kind: Kind | undefined;
  for (const snapshot of ledger.docs) {
    const entry = snapshot.data() as LedgerEntry;
    kind ??= entry.kind;
    if (entry.excluded) continue;
    const uid = snapshot.ref.parent.parent?.id;
    if (!uid) throw new Error(`invalid stance path: ${snapshot.ref.path}`);
    const previous = latestByUid.get(uid);
    if (!previous || previous.date < entry.date) latestByUid.set(uid, entry);
  }

  const rebuilt = new Map<string, Counts>();
  for (const entry of latestByUid.values()) {
    let cohort = rebuilt.get(entry.date);
    if (!cohort) {
      cohort = empty();
      rebuilt.set(entry.date, cohort);
    }
    cohort[entry.stance] += 1;
  }
  const oldCohorts = await db.collection("subjectCohorts").where("subjectId", "==", subjectId).get();
  const writes: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
  for (const cohort of oldCohorts.docs) writes.push((batch) => batch.delete(cohort.ref));
  for (const [date, counts] of rebuilt) writes.push((batch) => batch.set(db.doc(`subjectCohorts/${subjectId}_${date}`), { subjectId, date, kind: kind ?? "person", ...counts }));
  for (let offset = 0; offset < writes.length; offset += 450) {
    const batch = db.batch();
    for (const write of writes.slice(offset, offset + 450)) write(batch);
    await batch.commit();
  }

  const all = empty();
  const d7 = empty();
  const d30 = empty();
  for (const [date, counts] of rebuilt) {
    sum(all, counts);
    if (date >= cutoff(today, 7)) sum(d7, counts);
    if (date >= cutoff(today, 30)) sum(d30, counts);
  }
  const batch = db.batch();
  batch.set(db.doc(`subjectStats/${subjectId}`), { windows: { d7, d30, all }, computedAt: Timestamp.now(), schemaVersion: 2 }, { merge: true });
  if (listedInIndex(kind)) batch.set(db.doc("subjectStats/_index"), { s: { [subjectId]: { d30 } }, computedAt: Timestamp.now() }, { merge: true });
  batch.delete(queueRef(subjectId));
  await batch.commit();
  invalidateStats([subjectId]);
  return { subjectId, ledgerReads: ledger.size, users: latestByUid.size };
}

/** Drains explicitly queued repairs up to the configured read budget. */
export async function rebuildQueuedSubjects(today = kstDate()) {
  const queued = await db.collection("system/reconcileQueue/subjects").orderBy("queuedAt").get();
  let reads = queued.size;
  let rebuilt = 0;
  for (const item of queued.docs) {
    if (reads >= budget()) break;
    const result = await rebuildSubject(item.id, today);
    reads += result.ledgerReads;
    rebuilt += 1;
  }
  return { rebuilt, reads, budget: budget() };
}
