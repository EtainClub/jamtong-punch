import type { Outcome } from "@/content/schema";
import type { EvaluationView, StatementView } from "@/lib/archive/read";
import { formatDate, formatShortDate, statementKindLabels } from "@/lib/content/format";
import type { Names } from "./components";

// What a shared link says about one record: the same words on the page
// title, the search result, the link preview and the preview image. Written
// the way people search: who, what, when, from which source, and what the
// data showed afterwards.
export type ShareExtras = { publisher?: string | null; outcome?: Outcome | null };

const MAX_DESCRIPTION = 200;
function sentence(parts: Array<string | null | undefined | false>) {
  const text = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return text.length > MAX_DESCRIPTION ? `${text.slice(0, MAX_DESCRIPTION - 1)}…` : text;
}
const after = (outcome?: Outcome | null) => outcome && `그 후(${formatShortDate(outcome.asOf)} 기준): ${outcome.summary}`;

export function statementShare(statement: StatementView, names: Names, extras: ShareExtras = {}) {
  const speaker = names[statement.personId] ?? "알 수 없는 인물";
  const date = formatDate(statement.occurredAt, statement.datePrecision, { withYear: true, certainty: statement.dateCertainty });
  return {
    title: `${speaker}: ${statement.headline}`,
    description: sentence([
      `${date} ${speaker}의 ${statementKindLabels[statement.kind] ?? "언행"}.`,
      statement.quote ? `“${statement.quote}”` : statement.context,
      extras.publisher && `(출처: ${extras.publisher})`,
      after(extras.outcome),
    ]),
    speaker,
    date,
  };
}

export function evaluationShare(evaluation: EvaluationView, names: Names, extras: ShareExtras = {}) {
  const target = names[evaluation.targetPersonId] ?? "알 수 없는 인물";
  const date = formatDate(evaluation.occurredAt, evaluation.datePrecision, { withYear: true, certainty: evaluation.dateCertainty });
  return {
    // No particle after the name: 이/가 depends on the last syllable.
    title: `${evaluation.evaluator.name} → ${target}`,
    description: sentence([
      `${date}.`,
      evaluation.claim,
      extras.publisher && `(출처: ${extras.publisher})`,
      after(extras.outcome),
    ]),
    target,
    date,
  };
}
