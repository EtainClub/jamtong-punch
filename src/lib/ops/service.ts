import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";

function queueRef(subjectId: string) {
  return db.doc(`system/reconcileQueue/subjects/${subjectId}`);
}

export async function setReportStatus(reportId: string, status: "open" | "reviewing" | "resolved" | "dismissed", actorUid: string) {
  const ref = db.doc(`reports/${reportId}`);
  const report = await ref.get();
  if (!report.exists) return false;
  await ref.update({ status, updatedAt: Timestamp.now(), updatedBy: actorUid });
  return true;
}

export async function setStanceExclusion(input: { uid: string; subjectId: string; date: string; excluded: boolean }, actorUid: string) {
  const stance = db.doc(`users/${input.uid}/stances/${input.subjectId}_${input.date}`);
  const snapshot = await stance.get();
  if (!snapshot.exists || snapshot.get("subjectId") !== input.subjectId) return false;
  // Rebuild is authoritative: do not run a reverse incremental delta for a moderation action.
  const batch = db.batch();
  batch.update(stance, { excluded: input.excluded, moderatedAt: Timestamp.now(), moderatedBy: actorUid });
  batch.set(queueRef(input.subjectId), { reason: "ops-exclude", queuedAt: Timestamp.now() }, { merge: true });
  await batch.commit();
  return true;
}

export async function setSystemFlags(input: { ratiosHidden?: boolean; hiddenSubjects?: string[] }, actorUid: string) {
  await db.doc("system/flags").set({ ...input, updatedAt: Timestamp.now(), updatedBy: actorUid }, { merge: true });
}
