import { describe, expect, test } from "vitest";
import { outcomeSchema, statementSchema } from "@/content/schema";
import { canonicalJson, outcomePayload, payloadFor, statementPayload } from "./canonical";

const refs = { src: { url: "https://example.com/data", videoId: null } };
const base = { id: "o", subject: { type: "statement", id: "s" }, asOf: "2026-06-30", summary: "상반기 착공은 1만3121호였다.", citations: [{ sourceId: "src" }], status: "published" };

describe("outcomes", () => {
  test("carry no verdict: an unknown field is rejected", () => {
    expect(() => outcomeSchema.parse({ ...base, verdict: "true" })).toThrow();
  });

  test("allow at most six figures", () => {
    const figures = Array.from({ length: 7 }, (_, index) => ({ label: `항목 ${index}`, value: "1" }));
    expect(() => outcomeSchema.parse({ ...base, figures })).toThrow();
  });

  test("hash the facts and the record they follow", () => {
    const payload = outcomePayload(outcomeSchema.parse(base), refs);
    expect(payload).toMatchObject({ type: "outcome", subject: { type: "statement", id: "s" }, asOf: "2026-06-30" });
    const edited = outcomePayload(outcomeSchema.parse({ ...base, summary: "상반기 착공은 1만3122호였다." }), refs);
    expect(canonicalJson(edited)).not.toBe(canonicalJson(payload));
  });

  test("payloadFor keeps statement hashes as before", () => {
    const statement = statementSchema.parse({ id: "s", personId: "p", occurredAt: "2019-09-24", datePrecision: "day", kind: "remark", headline: "h", quote: "q", context: "c", citations: [{ sourceId: "src" }], assertionType: "FACT", status: "published" });
    expect(canonicalJson(payloadFor("statement", statement, refs))).toBe(canonicalJson(statementPayload(statement, refs)));
  });
});
