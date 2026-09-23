import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/lib/firebase/admin";
import { saveContent } from "@/lib/content/store";
import { kstDate } from "@/lib/date/kst";
import { submitParticipation } from "@/lib/participation/submit";
import { runRollup } from "@/lib/stats/rollup";

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const uid = "pt-user";
const created: Array<[string, string]> = [];
const today = kstDate();

async function save(type: Parameters<typeof saveContent>[0], data: Record<string, unknown>) {
  created.push([type, String(data.id)]);
  return saveContent(type, String(data.id), data, "pt-ops");
}

const stance = (kind: "person" | "statement", slug: string, value: "punch" | "cheer" | "unknown") => submitParticipation(uid, {
  sessionId: randomUUID(),
  game: "static",
  startedAt: new Date(Date.now() - 5_000).toISOString(),
  stances: [{ kind, slug, stance: value, recordId: null, score: null }],
});

(enabled ? describe : describe.skip)("participation on people and statements", () => {
  beforeAll(async () => {
    await save("sources", { id: "pt-source", kind: "article", title: "기사", publisher: "언론사", url: "https://example.com/p", publishedAt: "2024-01-01", license: "public", rightsStatus: "cleared" });
    const image = { path: "https://example.com/p.jpg", sourceUrl: "https://example.com/p", license: "cleared", rightsStatus: "cleared" };
    await save("people", { id: "pt-playable", name: "가상갑", summary: "국회의원", image, playable: true, status: "published" });
    await save("people", { id: "pt-archive-only", name: "가상을", summary: "작가", status: "published" });
    await save("statements", { id: "pt-statement", personId: "pt-archive-only", occurredAt: "2024-02-01", datePrecision: "day", kind: "action", headline: "요약", context: "맥락", citations: [{ sourceId: "pt-source" }], assertionType: "FACT", status: "published" });
  });

  afterAll(async () => {
    const batch = db.batch();
    for (const [type, id] of created) batch.delete(db.doc(`${type}/${id}`));
    for (const id of ["pt-playable", "pt-statement"]) {
      batch.delete(db.doc(`users/${uid}/stances/${id}_${today}`));
      batch.delete(db.doc(`subjectStats/${id}`));
      batch.delete(db.doc(`subjectCohorts/${id}_${today}`));
      batch.delete(db.doc(`dailyStats/${id}_${today}`));
    }
    batch.delete(db.doc(`users/${uid}/state/subjects`));
    batch.delete(db.doc(`users/${uid}/daily/${today}`));
    await batch.commit();
  });

  test("a statement takes one stance per person, and a change replaces it", async () => {
    expect((await stance("statement", "pt-statement", "punch")).accepted).toEqual(["pt-statement"]);
    expect((await stance("statement", "pt-statement", "cheer")).replaced).toEqual(["pt-statement"]);
    const ledger = await db.doc(`users/${uid}/stances/pt-statement_${today}`).get();
    expect(ledger.data()).toMatchObject({ kind: "statement", stance: "cheer", game: "static" });
  });

  test("only playable people can be targeted", async () => {
    await expect(stance("person", "pt-archive-only", "punch")).rejects.toThrow("is not playable");
    expect((await stance("person", "pt-playable", "punch")).accepted).toEqual(["pt-playable"]);
  });

  test("statements get whole-period stats but stay out of the people index", async () => {
    await runRollup();
    const [statement, index] = await db.getAll(db.doc("subjectStats/pt-statement"), db.doc("subjectStats/_index"));
    expect(statement.get("windows").all).toMatchObject({ punch: 0, cheer: 1 });
    expect(index.get("s")?.["pt-statement"]).toBeUndefined();
    expect(index.get("s")?.["pt-playable"]?.d30?.punch).toBe(1);
    expect((await db.doc(`subjectCohorts/pt-statement_${today}`).get()).get("kind")).toBe("statement");
  });
});
