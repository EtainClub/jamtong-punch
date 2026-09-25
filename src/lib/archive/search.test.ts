import { describe, expect, test } from "vitest";
import type { EvaluationView, PersonView, StatementView, TopicView } from "@/lib/archive/read";
import { searchArchive } from "./search";

const person = (id: string, name: string, summary = "국회의원") => ({ id, name, aliases: [], roles: [], summary }) as unknown as PersonView;
const statement = (id: string, personId: string, headline: string, quote: string, topicIds: string[] = []) => ({ id, personId, headline, quote, context: "맥락", topicIds }) as unknown as StatementView;
const data = {
  people: [person("yoo", "유시민", "작가"), person("han", "한동훈")],
  statements: [
    statement("s1", "yoo", "검찰개혁 목표를 두고 '국민을 속였다'고 말함", "지금까지 국민을 속인 것이에요", ["pr"]),
    statement("s2", "han", "국방부 발표를 비판함", "국민을 우롱하는 것"),
  ],
  evaluations: [{ id: "e1", targetPersonId: "yoo", evaluator: { personId: null, name: "윤건영", descriptor: "국회의원" }, claim: "윤건영은 유시민의 비판을 예방주사에 빗댔다", quote: null, topicIds: [] }] as unknown as EvaluationView[],
  topics: [{ id: "pr", name: "검찰개혁" }] as unknown as TopicView[],
};

describe("searchArchive", () => {
  test("every word must match, across name, headline, quote and topic", () => {
    expect(searchArchive("유시민 속였다", data).statements.map((item) => item.id)).toEqual(["s1"]);
    expect(searchArchive("국민", data).statements.map((item) => item.id).sort()).toEqual(["s1", "s2"]);
    expect(searchArchive("검찰개혁 한동훈", data).statements).toEqual([]);
  });

  test("finds people and evaluations by name", () => {
    expect(searchArchive("유시민", data).people.map((item) => item.id)).toEqual(["yoo"]);
    expect(searchArchive("예방주사", data).evaluations.map((item) => item.id)).toEqual(["e1"]);
  });

  test("an empty query finds nothing", () => {
    expect(searchArchive("   ", data)).toEqual({ people: [], statements: [], evaluations: [] });
  });
});
