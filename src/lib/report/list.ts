import { db } from "@/lib/firebase/admin";

export type ReportRow = {
  id: string;
  targetType: string;
  targetId: string;
  label: string;
  href: string;
  reason: string;
  detail: string;
  evidenceUrl: string | null;
  status: string;
  createdAt: string;
};

const LIMIT = 200;

// Newest first, with each target resolved to something an operator can read.
// The reporter's uid stays out: operators act on the content, not the person.
export async function listReports(): Promise<ReportRow[]> {
  const snapshots = await db.collection("reports").orderBy("createdAt", "desc").limit(LIMIT).get();
  const refs = snapshots.docs.map((snapshot) => {
    const type = snapshot.get("targetType") as string;
    const collection = type === "statement" ? "statements" : type === "evaluation" ? "evaluations" : "people";
    return db.doc(`${collection}/${snapshot.get("targetId")}`);
  });
  const targets = refs.length ? await db.getAll(...refs) : [];
  return snapshots.docs.map((snapshot, index) => {
    const type = snapshot.get("targetType") as string;
    const target = targets[index];
    const id = snapshot.get("targetId") as string;
    const label = !target?.exists ? `(삭제됨) ${id}`
      : type === "statement" ? String(target.get("headline"))
      : type === "evaluation" ? `${target.get("evaluator.name")}의 시선: ${String(target.get("claim")).slice(0, 60)}`
      : `${target.get("name")}${type === "photo" ? " (사진)" : ""}`;
    const href = type === "statement" ? `/statements/${id}` : type === "evaluation" ? `/evaluations/${id}` : `/people/${id}`;
    return {
      id: snapshot.id,
      targetType: type,
      targetId: id,
      label,
      href,
      reason: String(snapshot.get("reason")),
      detail: String(snapshot.get("detail")),
      evidenceUrl: snapshot.get("evidenceUrl") ?? null,
      status: String(snapshot.get("status")),
      createdAt: (snapshot.get("createdAt") as FirebaseFirestore.Timestamp).toDate().toISOString(),
    };
  });
}

export async function openReportCount(): Promise<number> {
  return (await db.collection("reports").where("status", "in", ["open", "reviewing"]).count().get()).data().count;
}
