import { FieldPath, FieldValue, Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { cutoff } from "@/lib/date/kst";
import { listedInIndex, type Game, type Kind, type PreviousStance, type Stance } from "@/lib/domain";
import { db } from "@/lib/firebase/admin";
import { summarizePendingAbuse } from "@/lib/guard/abuse";
import { invalidateStats } from "@/lib/stats/read";

// A distinct event can touch two cohorts, one daily stat, one subject stat,
// one index entry, and its ledger marker. 80 keeps the worst-case batch <500.
const DEFAULT_BATCH_SIZE = 80;
const MAX_SAFE_BATCH_SIZE = 80;
const DEFAULT_MAX_PASSES = 10;
const windows = [["d7", 7], ["d30", 30]] as const;
type Counts = Partial<Record<Stance, number>>;

type Ledger = {
  subjectId: string;
  kind?: Kind;
  date: string;
  stance: Stance;
  prev: PreviousStance | null;
  game: Game;
  excluded: boolean;
  updatedAt: Timestamp;
};

function configured(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function add(counts: Counts, stance: Stance, amount: number) {
  counts[stance] = (counts[stance] ?? 0) + amount;
}

function addNested<T>(map: Map<string, T>, key: string, init: () => T): T {
  const found = map.get(key);
  if (found) return found;
  const created = init();
  map.set(key, created);
  return created;
}

function incrementObject(counts: Counts) {
  return Object.fromEntries((["punch", "cheer", "unknown"] as const).map((stance) => [stance, FieldValue.increment(counts[stance] ?? 0)]));
}

function ledger(snapshot: DocumentSnapshot): Ledger {
  const value = snapshot.data();
  if (!value) throw new Error("missing ledger document");
  return value as Ledger;
}

export async function acquireRollupLease(): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const ref = db.doc("system/rollup");
    const state = await tx.get(ref);
    if ((state.get("leaseUntil")?.toMillis() ?? 0) > Date.now()) return false;
    tx.set(ref, { leaseUntil: Timestamp.fromMillis(Date.now() + 120_000) }, { merge: true });
    return true;
  });
}

export async function rollupOnce(): Promise<{ processed: number; skipped?: "busy"; backlog?: boolean }> {
  const rollupRef = db.doc("system/rollup");
  const state = await rollupRef.get();
  const cursor = state.get("cursor") as Timestamp | undefined;
  const cursorPath = state.get("cursorPath") as string | undefined;
  const size = Math.min(configured("ROLLUP_BATCH_SIZE", DEFAULT_BATCH_SIZE), MAX_SAFE_BATCH_SIZE);
  let changedQuery = db.collectionGroup("stances").orderBy("updatedAt").orderBy(FieldPath.documentId());
  // A timestamp alone is not a cursor: multiple writes can share one millisecond.
  // Keep the document path as its deterministic tie breaker. The legacy branch
  // preserves compatibility with an already-deployed timestamp-only cursor.
  if (cursor && cursorPath) changedQuery = changedQuery.startAfter(cursor, cursorPath);
  else if (cursor) changedQuery = changedQuery.where("updatedAt", ">", cursor);
  const changed = await changedQuery.limit(size).get();
  if (changed.empty) return { processed: 0 };
  if (!(await acquireRollupLease())) return { processed: 0, skipped: "busy" };

  const cohorts = new Map<string, { subjectId: string; date: string; counts: Counts }>();
  const daily = new Map<string, { subjectId: string; date: string; counts: Counts; excluded: number; byGame: Partial<Record<Game, number>> }>();
  const stats = new Map<string, { all: Counts; d7: Counts; d30: Counts }>();
  const kinds = new Map<string, Kind>();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  for (const snapshot of changed.docs) {
    const event = ledger(snapshot);
    kinds.set(event.subjectId, event.kind ?? "person");
    const dailyEntry = addNested(daily, `${event.subjectId}_${event.date}`, (): { subjectId: string; date: string; counts: Counts; excluded: number; byGame: Partial<Record<Game, number>> } => ({
      subjectId: event.subjectId, date: event.date, counts: {}, excluded: 0, byGame: {},
    }));
    if (event.excluded) {
      dailyEntry.excluded += 1;
      continue;
    }

    if (event.prev && event.prev.date > event.date) {
      add(dailyEntry.counts, event.stance, 1);
      dailyEntry.byGame[event.game] = (dailyEntry.byGame[event.game] ?? 0) + 1;
      continue;
    }
    const stat = addNested(stats, event.subjectId, () => ({ all: {}, d7: {}, d30: {} }));
    if (event.prev) {
      const previousCohort = addNested(cohorts, `${event.subjectId}_${event.prev.date}`, () => ({
        subjectId: event.subjectId, date: event.prev!.date, counts: {},
      }));
      add(previousCohort.counts, event.prev.stance, -1);
      add(stat.all, event.prev.stance, -1);
      for (const [name, days] of windows) if (event.prev.date >= cutoff(today, days)) add(stat[name], event.prev.stance, -1);
      if (event.prev.date === event.date) {
        add(dailyEntry.counts, event.prev.stance, -1);
        if (event.prev.game) dailyEntry.byGame[event.prev.game] = (dailyEntry.byGame[event.prev.game] ?? 0) - 1;
      }
    }

    const currentCohort = addNested(cohorts, `${event.subjectId}_${event.date}`, () => ({
      subjectId: event.subjectId, date: event.date, counts: {},
    }));
    add(currentCohort.counts, event.stance, 1);
    add(stat.all, event.stance, 1);
    for (const [name, days] of windows) if (event.date >= cutoff(today, days)) add(stat[name], event.stance, 1);
    add(dailyEntry.counts, event.stance, 1);
    dailyEntry.byGame[event.game] = (dailyEntry.byGame[event.game] ?? 0) + 1;
  }

  const batch = db.batch();
  for (const entry of cohorts.values()) batch.set(db.doc(`subjectCohorts/${entry.subjectId}_${entry.date}`), {
    subjectId: entry.subjectId, date: entry.date, kind: kinds.get(entry.subjectId) ?? "person", ...incrementObject(entry.counts),
  }, { merge: true });
  for (const entry of daily.values()) batch.set(db.doc(`dailyStats/${entry.subjectId}_${entry.date}`), {
    subjectId: entry.subjectId,
    date: entry.date,
    ...incrementObject(entry.counts),
    excluded: FieldValue.increment(entry.excluded),
    byGame: Object.fromEntries(Object.entries(entry.byGame).map(([game, count]) => [game, FieldValue.increment(count)])),
    computedAt: Timestamp.now(),
  }, { merge: true });
  for (const [subjectId, entry] of stats) {
    batch.set(db.doc(`subjectStats/${subjectId}`), {
      windows: { d7: incrementObject(entry.d7), d30: incrementObject(entry.d30), all: incrementObject(entry.all) },
      computedAt: Timestamp.now(), schemaVersion: 2,
    }, { merge: true });
    if (listedInIndex(kinds.get(subjectId))) batch.set(db.doc("subjectStats/_index"), {
      s: { [subjectId]: { d30: incrementObject(entry.d30) } }, computedAt: Timestamp.now(),
    }, { merge: true });
  }
  for (const snapshot of changed.docs) batch.update(snapshot.ref, { rolledUpAt: snapshot.get("updatedAt") });
  const last = changed.docs.at(-1)!;
  batch.set(rollupRef, {
    cursor: last.get("updatedAt"),
    cursorPath: last.ref.path,
    lastRunAt: Timestamp.now(),
    processed: FieldValue.increment(changed.size),
    backlog: changed.size === size ? 1 : 0,
    leaseUntil: Timestamp.fromMillis(0),
  }, { merge: true });
  await batch.commit();
  invalidateStats(stats.keys());
  await summarizePendingAbuse();
  return { processed: changed.size, backlog: changed.size === size };
}

export async function runRollup(): Promise<{ processed: number; skipped?: "busy"; backlog: boolean }> {
  const passes = configured("ROLLUP_MAX_PASSES", DEFAULT_MAX_PASSES);
  let processed = 0;
  for (let pass = 0; pass < passes; pass += 1) {
    const result = await rollupOnce();
    if (result.skipped) return { processed, skipped: result.skipped, backlog: false };
    processed += result.processed;
    if (!result.backlog) return { processed, backlog: false };
  }
  return { processed, backlog: true };
}
