import { nameMap } from "@/features/archive/components";
import { outcomeLine, shareExtras } from "@/features/archive/share-extras";
import { statementShare } from "@/features/archive/share-text";
import { getPublishedRecord, listPeople, type StatementView } from "@/lib/archive/read";
import { formatShortDate } from "@/lib/content/format";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";

export const alt = "임통 언행 기록";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const [record, people] = await Promise.all([getPublishedRecord("statement", (await params).id), listPeople()]);
  if (!record) return ogCard({ eyebrow: "언행", title: "찾을 수 없는 기록입니다" });
  const statement = record.value as StatementView;
  const extras = await shareExtras(statement.id, statement.citations);
  const share = statementShare(statement, nameMap(people), extras);
  return ogCard({
    eyebrow: `${share.speaker}의 언행`, title: statement.headline, quote: statement.quote,
    footer: [share.date, extras.publisher && `출처 ${extras.publisher}`].filter(Boolean).join(" · "),
    outcome: extras.outcome ? { asOf: formatShortDate(extras.outcome.asOf), text: outcomeLine(extras.outcome) } : null,
  });
}
