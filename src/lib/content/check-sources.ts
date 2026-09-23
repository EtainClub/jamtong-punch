import type { SourceAvailability } from "@/content/schema";
import { kstDate } from "@/lib/date/kst";
import { db } from "@/lib/firebase/admin";
import { checkAvailability } from "@/lib/content/availability";
import { authored } from "@/lib/content/store";

// A network hiccup must not erase what we already know: an "unknown" result
// keeps the last definite status and only moves the check date.
function merge(previous: SourceAvailability | undefined, result: SourceAvailability): SourceAvailability {
  return result.status === "unknown" && previous && previous.status !== "unknown" ? { ...previous, checkedAt: result.checkedAt } : result;
}

export async function refreshSourceAvailability(sourceId: string, today = kstDate()) {
  const ref = db.doc(`sources/${sourceId}`);
  const snapshot = await ref.get();
  if (!snapshot.exists) return null;
  const next = merge(snapshot.get("availability"), await checkAvailability(authored("sources", snapshot.data()!), today));
  await ref.update({ availability: next });
  return next;
}

// Checks the sources that were checked longest ago. Weekly is enough: what
// matters is noticing a deletion, and the text is already kept regardless.
export async function checkSources(limit = 200, today = kstDate()) {
  const snapshots = await db.collection("sources").get();
  const due = snapshots.docs
    .sort((left, right) => String(left.get("availability")?.checkedAt ?? "").localeCompare(String(right.get("availability")?.checkedAt ?? "")))
    .slice(0, limit);
  let changed = 0;
  for (const snapshot of due) {
    const previous = snapshot.get("availability") as SourceAvailability | undefined;
    const next = merge(previous, await checkAvailability(authored("sources", snapshot.data()), today));
    await snapshot.ref.update({ availability: next });
    if (next.status !== previous?.status) changed += 1;
  }
  return { checked: due.length, changed };
}
