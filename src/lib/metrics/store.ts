import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { kstDate, shiftDate } from "@/lib/date/kst";
import { SOURCES, type MetricEvent, type Source } from "./events";

export type DailyMetrics = {
  date: string;
  visits: Record<Source, { first: number; return: number }>;
  secondRecord: number;
};

// One document per KST day holding only totals.
export async function recordMetric(event: MetricEvent) {
  const ref = db.doc(`metrics/${kstDate()}`);
  if (event.event === "visit") {
    await ref.set({ visits: { [event.source]: { [event.first ? "first" : "return"]: FieldValue.increment(1) } } }, { merge: true });
  } else {
    await ref.set({ secondRecord: FieldValue.increment(1) }, { merge: true });
  }
}

export async function readMetrics(days: number): Promise<DailyMetrics[]> {
  const today = kstDate();
  const dates = Array.from({ length: days }, (_, index) => shiftDate(today, -index));
  const snapshots = await db.getAll(...dates.map((date) => db.doc(`metrics/${date}`)));
  return snapshots.map((snapshot, index) => {
    const visits = (snapshot.get("visits") ?? {}) as Partial<Record<Source, { first?: number; return?: number }>>;
    return {
      date: dates[index],
      visits: Object.fromEntries(SOURCES.map((source) => [source, { first: visits[source]?.first ?? 0, return: visits[source]?.return ?? 0 }])) as DailyMetrics["visits"],
      secondRecord: Number(snapshot.get("secondRecord") ?? 0),
    };
  });
}
