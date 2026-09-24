import type { EvaluationView, StatementView } from "@/lib/archive/read";
import { formatDate } from "@/lib/content/format";
import type { Names } from "./components";

// What a shared link says about one record: the same words on the page
// title, the link preview and the preview image.
export function statementShare(statement: StatementView, names: Names) {
  const speaker = names[statement.personId] ?? "알 수 없는 인물";
  return {
    title: `${speaker}: ${statement.headline}`,
    description: statement.quote ?? statement.context,
    speaker,
    date: formatDate(statement.occurredAt, statement.datePrecision, { withYear: true, certainty: statement.dateCertainty }),
  };
}

export function evaluationShare(evaluation: EvaluationView, names: Names) {
  const target = names[evaluation.targetPersonId] ?? "알 수 없는 인물";
  return {
    // No particle after the name: 이/가 depends on the last syllable.
    title: `${evaluation.evaluator.name} → ${target}`,
    description: evaluation.claim,
    target,
    date: formatDate(evaluation.occurredAt, evaluation.datePrecision, { withYear: true, certainty: evaluation.dateCertainty }),
  };
}
