import { nameMap } from "@/features/archive/components";
import { outcomeLine, shareExtras } from "@/features/archive/share-extras";
import { evaluationShare } from "@/features/archive/share-text";
import { getPublishedRecord, listPeople, type EvaluationView } from "@/lib/archive/read";
import { formatShortDate } from "@/lib/content/format";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";

export const alt = "임통 시선 기록";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const [record, people] = await Promise.all([getPublishedRecord("evaluation", (await params).id), listPeople()]);
  if (!record) return ogCard({ eyebrow: "시선", title: "찾을 수 없는 기록입니다" });
  const evaluation = record.value as EvaluationView;
  const extras = await shareExtras(evaluation.id, [evaluation.citation]);
  const share = evaluationShare(evaluation, nameMap(people), extras);
  return ogCard({
    eyebrow: share.title, title: evaluation.claim, quote: evaluation.quote,
    footer: [evaluation.evaluator.descriptor, share.date, extras.publisher && `출처 ${extras.publisher}`].filter(Boolean).join(" · "),
    outcome: extras.outcome ? { asOf: formatShortDate(extras.outcome.asOf), text: outcomeLine(extras.outcome) } : null,
  });
}
