import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { DELETED_CONTRIBUTOR, forgetAccount } from "@/lib/account/delete";
import { saveContent } from "@/lib/content/store";
import { setNickname } from "@/lib/contributors/profile";
import { db } from "@/lib/firebase/admin";
import { submitReport } from "@/lib/report/submit";

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const uid = "acct-test-user";
const ops = "acct-test-ops";

(enabled ? describe : describe.skip)("forgetting an account", () => {
  beforeAll(async () => {
    await setNickname(uid, "지울사람");
    await saveContent("sources", "acct-source", { id: "acct-source", kind: "article", title: "기사", publisher: "언론사", url: "https://example.com/acct", publishedAt: "2024-01-01", license: "public", rightsStatus: "cleared" }, ops);
    await saveContent("people", "acct-a", { id: "acct-a", name: "가나다", summary: "국회의원", status: "published" }, ops);
    const statement = { id: "acct-s1", personId: "acct-a", quote: "원문", occurredAt: "2024-06-01", datePrecision: "day", kind: "remark", headline: "요약", context: "맥락", citations: [{ sourceId: "acct-source" }], assertionType: "FACT", status: "review" };
    await saveContent("statements", "acct-s1", statement, { uid, isOps: false, nickname: "지울사람" });
    await saveContent("statements", "acct-s1", { ...statement, status: "published" }, ops);
    await submitReport(uid, { targetType: "statement", targetId: "acct-s1", reason: "기타", detail: "확인 부탁" });
  });

  afterAll(async () => {
    const batch = db.batch();
    for (const path of ["statements/acct-s1", "people/acct-a", "sources/acct-source", "anchors/statement_acct-s1"]) batch.delete(db.doc(path));
    await batch.commit();
    for (const doc of (await db.collection("reports").where("targetId", "==", "acct-s1").get()).docs) await doc.ref.delete();
  });

  test("public records stay but no longer name the contributor, and reports lose the reporter", async () => {
    expect((await db.doc("statements/acct-s1").get()).get("contributor.nickname")).toBe("지울사람");
    expect(await forgetAccount(uid)).toEqual({ credits: 1, reports: 1 });
    const statement = await db.doc("statements/acct-s1").get();
    expect(statement.get("status")).toBe("published");
    expect(statement.get("contributor")).toEqual({ uid: null, nickname: DELETED_CONTRIBUTOR });
    expect((await db.doc(`contributors/${uid}`).get()).exists).toBe(false);
    const reports = await db.collection("reports").where("targetId", "==", "acct-s1").get();
    expect(reports.docs.map((doc) => doc.get("reporterUid"))).toEqual([null]);
  });
});
