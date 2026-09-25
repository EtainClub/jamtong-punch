import type { Metadata } from "next";
import { currentRole, SiteHeader } from "@/features/archive/components";
import { bracketSize, personContender, shuffle } from "@/features/play/contenders";
import { QuestionPicker } from "@/features/play/QuestionPicker";
import { QUESTIONS } from "@/features/play/questions";
import { WorldCup } from "@/features/play/WorldCup";
import hub from "@/features/play/hub.module.css";
import styles from "@/features/play/play.module.css";
import { listPeople } from "@/lib/archive/read";
import { AUTO_BRACKETS } from "@/lib/comparison/schema";

export const dynamic = "force-dynamic";
// Personal play: kept out of search, like the other game screens with faces.
export const metadata: Metadata = { title: "인물 월드컵", robots: { index: false, follow: false } };

const BRACKET = "auto-people";
type Props = { searchParams: Promise<{ q?: string }> };

// Game-target people drawn at random. The picks stay in the player's
// comparison ledger; the service never publishes a ranking of people from
// them (implementation-design 11장 7번, decision recorded in the design doc).
export default async function PeopleWorldCupPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const questions = AUTO_BRACKETS[BRACKET].questions;
  const question = questions.find((id) => id === q);
  const playable = (await listPeople()).filter((person) => person.playable);
  const size = bracketSize(playable.length);

  if (!question || !size) {
    return <>
      <SiteHeader current="play" />
      <main className={hub.shell}>
        <QuestionPicker title="인물 월드컵" lead="게임 대상 인물 가운데 무작위로 대진을 짜고, 둘 중 한 사람을 고르며 올라갑니다." basePath="/play/worldcup/people"
          questions={size ? questions.map((id) => ({ id, label: QUESTIONS[id] })) : []}
          note={size ? `${size}강 · 결과는 나만 보는 비교 기록입니다. 임통은 이 결과로 인물 순위를 공개하지 않습니다.` : "게임 대상 인물이 8명 이상이면 열립니다."} />
      </main>
    </>;
  }

  const drawn = shuffle(playable).slice(0, size);
  return <>
    <SiteHeader current="play" />
    <main className={styles.shell}>
      <WorldCup bracketId={BRACKET} questionId={question} question={QUESTIONS[question]} contenders={drawn.map((person) => personContender(person, currentRole(person)))} sharePath={`/play/worldcup/people?q=${question}`} reshuffle />
    </main>
  </>;
}
