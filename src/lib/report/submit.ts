import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { requirePublishedRecord, requirePublishedSubjectId } from "@/lib/content/store";
import { db } from "@/lib/firebase/admin";
import type { ReportInput } from "@/lib/report/schema";

function reportId(uid: string, input: ReportInput): string {
  return createHash("sha256").update(`${uid}\u0000${input.targetType}\u0000${input.targetId}\u0000${input.reason}`).digest("hex").slice(0, 32);
}

async function requireReportTarget(input: ReportInput) {
  if (input.targetType === "record") return requirePublishedRecord(input.targetId);
  const subject = await requirePublishedSubjectId(input.targetId);
  if (input.targetType === "photo" && !subject.image) throw new Error(`unknown published photo: ${input.targetId}`);
  return subject;
}

export async function submitReport(uid: string, input: ReportInput) {
  await requireReportTarget(input);
  const ref = db.doc(`reports/${reportId(uid, input)}`);
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) return { id: ref.id, duplicate: true };
    tx.create(ref, {
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      detail: input.detail,
      ...(input.evidenceUrl ? { evidenceUrl: input.evidenceUrl } : {}),
      reporterUid: uid,
      status: "open",
      createdAt: Timestamp.now(),
    });
    return { id: ref.id, duplicate: false };
  });
}
