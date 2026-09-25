import { Timestamp } from "firebase-admin/firestore";
import { auth, db } from "@/lib/firebase/admin";

function queueRef(subjectId: string) {
  return db.doc(`system/reconcileQueue/subjects/${subjectId}`);
}

async function queueSubjects(subjectIds: Iterable<string>, reason: "user-delete") {
  const ids = [...new Set(subjectIds)];
  for (let offset = 0; offset < ids.length; offset += 450) {
    const batch = db.batch();
    for (const subjectId of ids.slice(offset, offset + 450)) batch.set(queueRef(subjectId), { reason, queuedAt: Timestamp.now() }, { merge: true });
    await batch.commit();
  }
}

export const DELETED_CONTRIBUTOR = "탈퇴한 기여자";
const CONTENT_COLLECTIONS = ["people", "statements", "evaluations", "sources", "topics"];

// What an account leaves behind in shared data. Public records stay (they are
// the archive) but no longer name the contributor; reports stay for the
// operators but no longer point at the reporter.
export async function forgetAccount(uid: string) {
  await db.recursiveDelete(db.doc(`contributors/${uid}`));
  const credited = await Promise.all(CONTENT_COLLECTIONS.map((name) => db.collection(name).where("contributor.uid", "==", uid).get()));
  const reports = await db.collection("reports").where("reporterUid", "==", uid).get();
  const updates = [
    ...credited.flatMap((result) => result.docs).map((snapshot) => [snapshot.ref, { contributor: { uid: null, nickname: DELETED_CONTRIBUTOR } }] as const),
    ...reports.docs.map((snapshot) => [snapshot.ref, { reporterUid: null }] as const),
  ];
  for (let offset = 0; offset < updates.length; offset += 450) {
    const batch = db.batch();
    for (const [ref, data] of updates.slice(offset, offset + 450)) batch.update(ref, data);
    await batch.commit();
  }
  return { credits: updates.length - reports.size, reports: reports.size };
}

export async function deleteUserData(uid: string, scope: "stances" | "account") {
  const userRef = db.doc(`users/${uid}`);
  const stances = await userRef.collection("stances").get();
  const subjectIds = stances.docs.map((snapshot) => snapshot.get("subjectId") as string);
  await queueSubjects(subjectIds, "user-delete");

  if (scope === "account") {
    await db.recursiveDelete(userRef);
    const forgotten = await forgetAccount(uid);
    await auth.deleteUser(uid);
    return { deleted: stances.size, scope, ...forgotten };
  }

  for (let offset = 0; offset < stances.docs.length; offset += 450) {
    const batch = db.batch();
    for (const snapshot of stances.docs.slice(offset, offset + 450)) batch.delete(snapshot.ref);
    if (offset === 0) batch.delete(userRef.collection("state").doc("subjects"));
    await batch.commit();
  }
  if (stances.empty) await userRef.collection("state").doc("subjects").delete();
  return { deleted: stances.size, scope };
}
