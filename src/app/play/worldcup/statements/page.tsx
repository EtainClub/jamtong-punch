import type { Metadata } from "next";
import Link from "next/link";
import { nameMap, SiteHeader } from "@/features/archive/components";
import { bracketSize, shuffle, statementContender } from "@/features/play/contenders";
import { QuestionPicker } from "@/features/play/QuestionPicker";
import { QUESTIONS } from "@/features/play/questions";
import { WorldCup } from "@/features/play/WorldCup";
import hub from "@/features/play/hub.module.css";
import styles from "@/features/play/play.module.css";
import { getSources, listBrackets, listPeople, publishedStatements } from "@/lib/archive/read";
import { AUTO_BRACKETS } from "@/lib/comparison/schema";
import { shareMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = shareMetadata("언행 월드컵", "공개된 언행 가운데 무작위로 뽑힌 8강·16강에서 둘 중 하나를 고르는 비교 게임. 결과는 지지율이 아닙니다.");

const BRACKET = "auto-statements";
type Props = { searchParams: Promise<{ q?: string }> };

// Statements drawn at random from everything published; a new draw on each visit.
export default async function StatementWorldCupPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const questions = AUTO_BRACKETS[BRACKET].questions;
  const question = questions.find((id) => id === q);
  const [statements, people, brackets] = await Promise.all([publishedStatements(), listPeople(), listBrackets()]);
  const size = bracketSize(statements.length);

  if (!question || !size) {
    return <>
      <SiteHeader current="play" />
      <main className={hub.shell}>
        <QuestionPicker title="언행 월드컵" lead="사람이 아니라 언행끼리 겨룹니다. 공개된 언행 가운데 무작위로 대진을 짜고, 둘 중 하나를 고르며 올라갑니다." basePath="/play/worldcup/statements"
          questions={size ? questions.map((id) => ({ id, label: QUESTIONS[id] })) : []}
          note={size ? `${size}강 · 결과는 나의 비교 기록이며 지지율이 아닙니다.` : "공개된 언행이 8건 이상이면 열립니다."} />
        {brackets.length > 0 && <section className={hub.section}>
          <h2>운영자가 고른 대진</h2>
          <ul className={hub.brackets}>{brackets.map((bracket) => <li key={bracket.id}><Link href={`/play/worldcup/${bracket.id}`}>{QUESTIONS[bracket.questionId]} <small>{bracket.statementIds.length}강</small></Link></li>)}</ul>
        </section>}
      </main>
    </>;
  }

  const drawn = shuffle(statements).slice(0, size);
  const sources = await getSources(drawn.flatMap((statement) => statement.citations.map((citation) => citation.sourceId)));
  const names = nameMap(people);
  return <>
    <SiteHeader current="play" />
    <main className={styles.shell}>
      <WorldCup bracketId={BRACKET} questionId={question} question={QUESTIONS[question]} contenders={drawn.map((statement) => statementContender(statement, names, sources))} resultKind="statements" reshuffle />
    </main>
  </>;
}
