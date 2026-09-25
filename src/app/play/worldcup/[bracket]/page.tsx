import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { nameMap, SiteHeader } from "@/features/archive/components";
import { statementContender } from "@/features/play/contenders";
import { QUESTIONS } from "@/features/play/questions";
import { WorldCup } from "@/features/play/WorldCup";
import styles from "@/features/play/play.module.css";
import { bracketStatements, getSources, listBrackets, listPeople } from "@/lib/archive/read";
import { shareMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ bracket: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bracket: id } = await params;
  const bracket = (await listBrackets()).find((item) => item.id === id);
  return bracket ? shareMetadata(`언행 월드컵 · ${QUESTIONS[bracket.questionId]}`, `${bracket.statementIds.length}개의 언행 가운데 고르는 비교 게임. 결과는 지지율이 아닙니다.`) : {};
}

// A bracket an operator picked and published, played in its fixed order.
export default async function BracketPage({ params }: Props) {
  const { bracket: id } = await params;
  const bracket = (await listBrackets()).find((item) => item.id === id);
  if (!bracket) notFound();
  const [statements, people] = await Promise.all([bracketStatements(bracket.statementIds), listPeople()]);
  if (!statements) notFound();
  const sources = await getSources(statements.flatMap((statement) => statement.citations.map((citation) => citation.sourceId)));
  const names = nameMap(people);
  return <>
    <SiteHeader current="play" />
    <main className={styles.shell}>
      <WorldCup bracketId={bracket.id} questionId={bracket.questionId} question={QUESTIONS[bracket.questionId]} contenders={statements.map((statement) => statementContender(statement, names, sources))} resultKind="statements" />
    </main>
  </>;
}
