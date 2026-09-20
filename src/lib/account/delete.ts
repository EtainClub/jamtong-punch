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

export async function deleteUserData(uid: string, scope: "stances" | "account") {
  const userRef = db.doc(`users/${uid}`);
  const stances = await userRef.collection("stances").get();
  const subjectIds = stances.docs.map((snapshot) => snapshot.get("subjectId") as string);
  await queueSubjects(subjectIds, "user-delete");

  if (scope === "account") {
    await db.recursiveDelete(userRef);
    await auth.deleteUser(uid);
    return { deleted: stances.size, scope };
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
