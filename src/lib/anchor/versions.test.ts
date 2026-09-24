import { describe, expect, test } from "vitest";
import { statementSchema } from "@/content/schema";
import { canonicalJson, payloadHash, statementPayload } from "./canonical";
import { nextVersion, type AnchorVersion } from "./versions";

describe("fields added after the first anchors", () => {
  const base = { id: "s", personId: "p", occurredAt: "2019-09-24", datePrecision: "day", kind: "remark", headline: "h", quote: "q", context: "c", citations: [{ sourceId: "src" }], assertionType: "FACT", status: "published" };
  const refs = { src: { url: "https://example.com", videoId: null } };

  test("a confirmed date and review flags leave existing hashes unchanged", () => {
    const before = canonicalJson(statementPayload(statementSchema.parse(base), refs));
    const after = canonicalJson(statementPayload(statementSchema.parse({ ...base, dateCertainty: "confirmed", speakerVerified: true }), refs));
    expect(after).toBe(before);
    expect(before).not.toContain("dateCertainty");
  });

  test("an estimated date is part of what is hashed", () => {
    expect(canonicalJson(statementPayload(statementSchema.parse({ ...base, dateCertainty: "estimated" }), refs))).toContain('"dateCertainty":"estimated"');
  });
});

const at = "2026-09-24T00:00:00.000Z";
const anchored = (version: AnchorVersion | null): AnchorVersion => ({ ...version!, txId: "tx", blockNum: 1, anchoredAt: at });

describe("canonicalJson", () => {
  test("does not depend on key order or Unicode normalisation", async () => {
    const decomposed = "한"; // 한 in decomposed jamo
    expect(canonicalJson({ b: 1, a: { d: "한", c: [2, 1] } })).toBe(canonicalJson({ a: { c: [2, 1], d: decomposed }, b: 1 }));
    expect(await payloadHash({ a: 1 })).toBe(await payloadHash({ a: 1 }));
    expect(await payloadHash({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });

  test("drops undefined but keeps null", () => {
    expect(canonicalJson({ a: undefined, b: null })).toBe('{"b":null}');
  });
});

describe("nextVersion", () => {
  test("publishing, editing and taking down each leave a link", () => {
    const v1 = anchored(nextVersion([], "h1", at));
    expect(v1).toMatchObject({ v: 1, op: "publish", hash: "h1", prev: null });
    const v2 = anchored(nextVersion([v1], "h2", at));
    expect(v2).toMatchObject({ v: 2, op: "update", hash: "h2", prev: "h1" });
    const v3 = anchored(nextVersion([v1, v2], null, at));
    expect(v3).toMatchObject({ v: 3, op: "retract", hash: null, prev: "h2" });
    expect(nextVersion([v1, v2, v3], "h2", at)).toMatchObject({ v: 4, op: "publish", prev: "h2" });
  });

  test("records nothing when nothing public changed", () => {
    const v1 = anchored(nextVersion([], "h1", at));
    expect(nextVersion([v1], "h1", at)).toBeNull();
    expect(nextVersion([], null, at)).toBeNull();
  });
});
