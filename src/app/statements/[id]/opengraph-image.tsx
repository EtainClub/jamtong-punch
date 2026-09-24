import { nameMap } from "@/features/archive/components";
import { statementShare } from "@/features/archive/share-text";
import { getPublishedRecord, listPeople, type StatementView } from "@/lib/archive/read";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";

export const alt = "임통 언행 기록";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const [record, people] = await Promise.all([getPublishedRecord("statement", (await params).id), listPeople()]);
  if (!record) return ogCard({ eyebrow: "언행", title: "찾을 수 없는 기록입니다" });
  const statement = record.value as StatementView;
  const share = statementShare(statement, nameMap(people));
  return ogCard({ eyebrow: `${share.speaker}의 언행`, title: statement.headline, quote: statement.quote, footer: share.date });
}
