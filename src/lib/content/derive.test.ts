import { describe, expect, test } from "vitest";
import type { Evaluation } from "@/content/schema";
import { buildRelationship, detectMentions, evaluationPairs, labelWordsIn, mentionedPersonIds, pairId, searchTokens, statementPairs } from "./derive";

const people = [
  { id: "lee-jaemyung", name: "이재명", aliases: ["Lee Jae-myung"] },
  { id: "han-donghoon", name: "한동훈", aliases: [] },
  { id: "cho-kuk", name: "조국", aliases: [] },
  { id: "lee", name: "이", aliases: [] },
];

describe("detectMentions", () => {
  test("finds names with Korean particles attached", () => {
    expect(detectMentions("한동훈 대표는 이재명이 말한 것과 다르다", "cho-kuk", people)).toEqual(["han-donghoon", "lee-jaemyung"]);
  });

  test("never links the speaker to themself", () => {
    expect(detectMentions("저 이재명은", "lee-jaemyung", people)).toEqual([]);
  });

  test("matches Latin aliases only as whole words", () => {
    expect(detectMentions("I met Lee Jae-myung today", "han-donghoon", people)).toEqual(["lee-jaemyung"]);
    expect(detectMentions("Leeds Jae-myungs", "han-donghoon", people)).toEqual([]);
  });

  test("ignores one-letter names that would match everywhere", () => {
    expect(detectMentions("이 문제는", "han-donghoon", people)).toEqual([]);
  });

  test("a party named after a person is not a mention of them", () => {
    const withCho = [...people, { id: "cho-kuk", name: "조국", aliases: [] }];
    expect(detectMentions("조국혁신당과의 합당 제안은 멈춰 주십시오", "han-donghoon", withCho)).toEqual([]);
    expect(detectMentions("조국혁신당 조국 대표에게 묻습니다", "han-donghoon", withCho)).toEqual(["cho-kuk"]);
  });

  test("an action without a quote names no one", () => {
    expect(detectMentions(null, "han-donghoon", people)).toEqual([]);
  });

  test("operators can drop a false match but not add one", () => {
    const statement = { quote: "조국을 위해 이재명과 함께", personId: "han-donghoon", mentionExclusions: ["cho-kuk", "someone-else"] };
    expect(mentionedPersonIds(statement, people)).toEqual(["lee-jaemyung"]);
  });
});

describe("relationship pairs", () => {
  test("pair ids do not depend on argument order", () => {
    expect(pairId("lee", "han")).toBe("han__lee");
    expect(pairId("han", "lee")).toBe("han__lee");
    expect(() => pairId("lee", "lee")).toThrow();
  });

  test("a statement links its speaker to each mentioned person once", () => {
    expect(statementPairs({ personId: "a", mentionedPersonIds: ["b", "b", "c"] })).toEqual(["a__b", "a__c"]);
  });

  test("only a registered evaluator creates an edge", () => {
    expect(evaluationPairs({ targetPersonId: "b", evaluator: { personId: "a", name: "A", descriptor: "x" } } as Evaluation)).toEqual(["a__b"]);
    expect(evaluationPairs({ targetPersonId: "b", evaluator: { personId: null, name: "유튜버", descriptor: "x" } } as Evaluation)).toEqual([]);
  });
});

describe("buildRelationship", () => {
  test("disappears when no evidence is left", () => {
    expect(buildRelationship("a__b", [])).toBeNull();
  });

  test("orders evidence by date and counts each kind", () => {
    const relationship = buildRelationship("a__b", [
      { type: "evaluation", id: "e1", at: "2025-04-01", from: "b", headline: "평가" },
      { type: "mention", id: "s2", at: "2022-05-01", from: "b", headline: "언급" },
      { type: "mention", id: "s1", at: "2024-11-01", from: "a", headline: "언급" },
    ])!;
    expect(relationship.personIds).toEqual(["a", "b"]);
    expect(relationship.weight).toBe(3);
    expect(relationship.counts).toEqual({ mentions: 2, evaluations: 1 });
    expect([relationship.firstAt, relationship.lastAt]).toEqual(["2022-05-01", "2025-04-01"]);
    expect(relationship.evidence.map((item) => item.id)).toEqual(["s2", "s1", "e1"]);
  });
});

describe("searchTokens", () => {
  test("finds a person by any prefix of the name or an alias", () => {
    const tokens = searchTokens("이재명", ["Lee Jae-myung"]);
    expect(tokens).toEqual(expect.arrayContaining(["이", "이재", "이재명", "lee", "jae-myung", "leejae"]));
  });
});

describe("labelWordsIn", () => {
  test("flags allegiance labels", () => {
    expect(labelWordsIn("친명계 국회의원")).toEqual(["친명"]);
    expect(labelWordsIn("국회의원 · 법제사법위원장")).toEqual([]);
  });
});
