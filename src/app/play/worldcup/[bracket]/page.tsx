import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { nameMap, SiteHeader } from "@/features/archive/components";
import { WorldCup, type Contender } from "@/features/play/WorldCup";
import { QUESTIONS } from "@/features/play/questions";
import styles from "@/features/play/play.module.css";
import { bracketStatements, getSources, listBrackets, listPeople } from "@/lib/archive/read";
import { citationHref, citationLabel, formatDate } from "@/lib/content/format";
import { shareMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ bracket: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bracket: id } = await params;
  const bracket = (await listBrackets()).find((item) => item.id === id);
  return bracket ? shareMetadata(`언행 월드컵 · ${QUESTIONS[bracket.questionId]}`, `${bracket.statementIds.length}개의 언행 가운데 고르는 비교 게임. 결과는 지지율이 아닙니다.`) : {};
}

export default async function WorldCupPage({ params }: Props) {
  const { bracket: id } = await params;
  const bracket = (await listBrackets()).find((item) => item.id === id);
  if (!bracket) notFound();
  const [statements, people] = await Promise.all([bracketStatements(bracket.statementIds), listPeople()]);
  if (!statements) notFound();
  const sources = await getSources(statements.flatMap((statement) => statement.citations.map((citation) => citation.sourceId)));
  const names = nameMap(people);
  const contenders = statements.map((statement): Contender => {
    const citation = statement.citations.find((item) => sources[item.sourceId]);
    const source = citation ? sources[citation.sourceId] : null;
    return {
      id: statement.id, speaker: names[statement.personId] ?? "알 수 없는 인물", headline: statement.headline, quote: statement.quote,
      date: formatDate(statement.occurredAt, statement.datePrecision, { withYear: true, certainty: statement.dateCertainty }),
      sourceLabel: citation && source ? `${citationLabel(citation, source)} · ${source.publisher}` : null,
      sourceHref: citation && source ? citationHref(citation, source) : null,
    };
  });
  return <>
    <SiteHeader />
    <main className={styles.shell}>
      <WorldCup bracketId={bracket.id} question={QUESTIONS[bracket.questionId]} contenders={contenders} />
    </main>
  </>;
}
