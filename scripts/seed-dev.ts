import { Timestamp } from "firebase-admin/firestore";
import { db } from "../src/lib/firebase/admin";
import { publishedSubjects } from "../src/content/subjects";
import { shiftDate, kstDate } from "../src/lib/date/kst";

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("seed-dev only runs against FIRESTORE_EMULATOR_HOST");
if (!publishedSubjects.length) throw new Error("seed-dev requires published content; no political content is generated automatically");

const users = 200;
const days = 40;
const today = kstDate();
const batchLimit = 450;
const writes: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];

for (let user = 0; user < users; user += 1) {
  for (let offset = 0; offset < days; offset += 1) {
    const subject = publishedSubjects[(user + offset) % publishedSubjects.length];
    const date = shiftDate(today, -offset);
    const stance = (["punch", "cheer", "unknown"] as const)[(user * 7 + offset) % 3];
    writes.push((batch) => batch.set(db.doc(`users/seed-${user}/stances/${subject.id}_${date}`), {
      subjectId: subject.id,
      kind: subject.kind,
      shard: 0,
      date,
      stance,
      game: "static",
      prev: null,
      recordId: null,
      sessionId: `seed-${user}-${offset}`,
      score: null,
      excluded: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      rolledUpAt: null,
    }));
  }
}

for (let offset = 0; offset < writes.length; offset += batchLimit) {
  const batch = db.batch();
  for (const write of writes.slice(offset, offset + batchLimit)) write(batch);
  await batch.commit();
}

console.log(`seeded ${writes.length} ledger entries for ${users} users`);
