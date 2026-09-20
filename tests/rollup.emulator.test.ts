import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { kstDate, shiftDate } from "@/lib/date/kst";
import { runRollup } from "@/lib/stats/rollup";

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const subjectId = "rollup-test-subject";
const today = kstDate();
const yesterday = shiftDate(today, -1);
const refs = [
  db.doc(`users/rollup-a/stances/${subjectId}_${yesterday}`),
  db.doc(`users/rollup-a/stances/${subjectId}_${today}`),
  db.doc(`users/rollup-b/stances/${subjectId}_${today}`),
];

(enabled ? describe : describe.skip)("rollup emulator", () => {
  beforeAll(async () => {
    const batch = db.batch();
    const first = Timestamp.fromMillis(Date.now() - 2_000);
    const second = Timestamp.fromMillis(Date.now() - 1_000);
    batch.set(refs[0], { subjectId, kind: "person", shard: 0, date: yesterday, stance: "cheer", game: "static", prev: null, excluded: false, updatedAt: first, rolledUpAt: null });
    batch.set(refs[1], { subjectId, kind: "person", shard: 0, date: today, stance: "punch", game: "static", prev: { stance: "cheer", date: yesterday }, excluded: false, updatedAt: second, rolledUpAt: null });
    batch.set(refs[2], { subjectId, kind: "person", shard: 0, date: today, stance: "unknown", game: "swipe", prev: null, excluded: false, updatedAt: Timestamp.now(), rolledUpAt: null });
    await batch.commit();
  });

  afterAll(async () => {
    const batch = db.batch();
    for (const ref of refs) batch.delete(ref);
    batch.delete(db.doc(`subjectCohorts/${subjectId}_${yesterday}`));
    batch.delete(db.doc(`subjectCohorts/${subjectId}_${today}`));
    batch.delete(db.doc(`dailyStats/${subjectId}_${yesterday}`));
    batch.delete(db.doc(`dailyStats/${subjectId}_${today}`));
    batch.delete(db.doc(`subjectStats/${subjectId}`));
    batch.delete(db.doc("system/rollup"));
    await batch.commit();
  });

  test("moves a user's previous cohort and keeps one latest vote", async () => {
    await runRollup();
    const [stats, oldCohort, newCohort] = await db.getAll(
      db.doc(`subjectStats/${subjectId}`),
      db.doc(`subjectCohorts/${subjectId}_${yesterday}`),
      db.doc(`subjectCohorts/${subjectId}_${today}`),
    );
    expect(stats.get("windows").all).toMatchObject({ punch: 1, cheer: 0, unknown: 1 });
    expect(oldCohort.get("cheer")).toBe(0);
    expect(newCohort.data()).toMatchObject({ punch: 1, unknown: 1 });
    for (const ref of refs) expect((await ref.get()).get("rolledUpAt")).toBeTruthy();
  });

  test("does not skip ledger documents with an identical updatedAt timestamp", async () => {
    const tieSubject = "rollup-timestamp-tie";
    const tieRefs = [
      db.doc(`users/rollup-tie-a/stances/${tieSubject}_${today}`),
      db.doc(`users/rollup-tie-b/stances/${tieSubject}_${today}`),
    ];
    const timestamp = Timestamp.fromMillis(Date.now() + 1_000);
    const previousBatchSize = process.env.ROLLUP_BATCH_SIZE;
    const previousPasses = process.env.ROLLUP_MAX_PASSES;
    process.env.ROLLUP_BATCH_SIZE = "1";
    process.env.ROLLUP_MAX_PASSES = "1";
    try {
      const batch = db.batch();
      for (const [index, ref] of tieRefs.entries()) {
        batch.set(ref, { subjectId: tieSubject, kind: "person", shard: index, date: today, stance: "punch", game: "static", prev: null, excluded: false, updatedAt: timestamp, rolledUpAt: null });
      }
      await batch.commit();

      expect((await runRollup()).processed).toBe(1);
      expect((await runRollup()).processed).toBe(1);
      expect((await db.doc(`subjectStats/${tieSubject}`).get()).get("windows").all.punch).toBe(2);
      for (const ref of tieRefs) expect((await ref.get()).get("rolledUpAt")).toBeTruthy();
    } finally {
      if (previousBatchSize === undefined) delete process.env.ROLLUP_BATCH_SIZE;
      else process.env.ROLLUP_BATCH_SIZE = previousBatchSize;
      if (previousPasses === undefined) delete process.env.ROLLUP_MAX_PASSES;
      else process.env.ROLLUP_MAX_PASSES = previousPasses;
      const cleanup = db.batch();
      for (const ref of tieRefs) cleanup.delete(ref);
      cleanup.delete(db.doc(`subjectCohorts/${tieSubject}_${today}`));
      cleanup.delete(db.doc(`dailyStats/${tieSubject}_${today}`));
      cleanup.delete(db.doc(`subjectStats/${tieSubject}`));
      await cleanup.commit();
    }
  });
});
