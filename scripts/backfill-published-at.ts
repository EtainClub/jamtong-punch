import { Timestamp } from "firebase-admin/firestore";
import { db } from "../src/lib/firebase/admin";

// One-off: records published before firstPublishedAt existed get the time their
// first anchor version was queued (when they were published), or their last
// update if they were never anchored.
async function main() {
  for (const type of ["statements", "evaluations", "people", "topics", "events"]) {
    const snapshots = await db.collection(type).where("status", "==", "published").get();
    for (const snapshot of snapshots.docs) {
      if (snapshot.get("firstPublishedAt")) continue;
      const anchorType = type === "statements" ? "statement" : type === "evaluations" ? "evaluation" : null;
      const versions = anchorType ? ((await db.doc(`anchors/${anchorType}_${snapshot.id}`).get()).get("versions") ?? []) as Array<{ queuedAt: string }> : [];
      const firstPublishedAt = versions[0] ? Timestamp.fromDate(new Date(versions[0].queuedAt)) : snapshot.get("updatedAt") ?? Timestamp.now();
      await snapshot.ref.update({ firstPublishedAt });
      console.log(type, snapshot.id, firstPublishedAt.toDate().toISOString());
    }
  }
}
main().catch((error) => { console.error(error); process.exit(1); });
