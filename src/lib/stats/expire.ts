import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { kstDate, shiftDate } from "@/lib/date/kst";
import { db } from "@/lib/firebase/admin";
import { listedInIndex, type Kind } from "@/lib/domain";
import { invalidateStats } from "@/lib/stats/read";

const CHUNK_SIZE = 450;

export async function expireWindows(today = kstDate()): Promise<number> {
  let processed = 0;
  for (const [name, days] of [["d7", 7], ["d30", 30]] as const) {
    const expiredDate = shiftDate(today, -days);
    const cohorts = await db.collection("subjectCohorts").where("date", "==", expiredDate).get();
    for (let offset = 0; offset < cohorts.docs.length; offset += CHUNK_SIZE) {
      const batch = db.batch();
      const changed: string[] = [];
      for (const cohort of cohorts.docs.slice(offset, offset + CHUNK_SIZE)) {
        const data = cohort.data() as { subjectId: string; kind?: Kind; punch?: number; cheer?: number; unknown?: number };
        batch.set(db.doc(`subjectStats/${data.subjectId}`), {
          windows: { [name]: {
            punch: FieldValue.increment(-(data.punch ?? 0)),
            cheer: FieldValue.increment(-(data.cheer ?? 0)),
            unknown: FieldValue.increment(-(data.unknown ?? 0)),
          } },
          computedAt: Timestamp.now(),
          schemaVersion: 2,
        }, { merge: true });
        if (listedInIndex(data.kind)) batch.set(db.doc("subjectStats/_index"), {
          s: { [data.subjectId]: { d30: {
            punch: FieldValue.increment(name === "d30" ? -(data.punch ?? 0) : 0),
            cheer: FieldValue.increment(name === "d30" ? -(data.cheer ?? 0) : 0),
            unknown: FieldValue.increment(name === "d30" ? -(data.unknown ?? 0) : 0),
          } }, computedAt: Timestamp.now() },
        }, { merge: true });
        changed.push(data.subjectId);
        processed += 1;
      }
      await batch.commit();
      invalidateStats(changed);
    }
  }
  return processed;
}
