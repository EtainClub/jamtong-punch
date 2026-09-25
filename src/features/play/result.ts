import { currentRole, nameMap } from "@/features/archive/components";
import { getPerson, getPublishedRecord, listPeople, type StatementView } from "@/lib/archive/read";
import { QUESTION_IDS } from "@/lib/comparison/schema";
import { QUESTIONS, type ResultKind } from "./questions";

// A shared world cup result: which kind of cup, which fixed question, and the
// winner. Only questions that belong to the kind and public winners resolve.
const KIND_QUESTIONS: Record<ResultKind, readonly string[]> = {
  statements: ["more-problematic", "more-urgent"],
  people: ["more-punch", "more-cheer"],
};
export const RESULT_DISCLAIMER = "한 사람의 비교 결과입니다. 지지율이나 여론조사가 아니고, 임통은 이것으로 순위를 공개하지 않습니다.";

export async function resolveResult(kind: string, question: string, winner: string) {
  if (!(kind in KIND_QUESTIONS) || !(QUESTION_IDS as readonly string[]).includes(question)) return null;
  if (!KIND_QUESTIONS[kind as ResultKind].includes(question)) return null;
  const label = QUESTIONS[question as keyof typeof QUESTIONS];
  if (kind === "people") {
    const person = await getPerson(winner);
    if (!person || !person.playable) return null;
    return { kind: "people" as const, question: label, questionId: question, title: person.name, subtitle: currentRole(person), quote: null, href: `/people/${person.id}`, playHref: `/play/worldcup/people?q=${question}` };
  }
  const record = await getPublishedRecord("statement", winner);
  if (!record) return null;
  const statement = record.value as StatementView;
  const speaker = nameMap(await listPeople())[statement.personId] ?? "알 수 없는 인물";
  return { kind: "statements" as const, question: label, questionId: question, title: statement.headline, subtitle: speaker, quote: statement.quote, href: `/statements/${statement.id}`, playHref: `/play/worldcup/statements?q=${question}` };
}

