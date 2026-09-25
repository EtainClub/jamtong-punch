import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, SiteHeader } from "@/features/archive/components";
import { QUESTIONS } from "@/features/play/questions";
import styles from "@/features/play/hub.module.css";
import { listBrackets, listPeople } from "@/lib/archive/read";
import { shareMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = shareMetadata("게임", "펀치·응원 게임, 카드 훑어보기, 언행 월드컵. 게임은 나만 보고, 기록되는 입장은 대상마다 하루 1건입니다.");

export default async function PlayPage() {
  const [people, brackets] = await Promise.all([listPeople(), listBrackets()]);
  const playable = people.filter((person) => person.playable);
  return <>
    <SiteHeader current="play" />
    <main className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>임통 · 게임</p>
        <h1>시원하게 치고,<br />입장은 1건만.</h1>
        <p>게임 화면은 나만 봅니다. 몇 번을 치든 오늘 한 대상에 대한 입장은 1건으로 기록되고, 모든 게임은 버튼 하나로 같은 입장을 남기는 길과 같은 무게입니다.</p>
      </section>

      <section className={styles.section} aria-labelledby="reflex-title">
        <h2 id="reflex-title">펀치 · 응원</h2>
        <p>한 사람을 골라 얼굴이 옮겨 다니는 판에서 치거나 응원합니다. 시간 제한은 없고, 맞힐수록 빨라집니다.</p>
        {playable.length ? <ul className={styles.people}>{playable.map((person) => <li key={person.id}>
          <Avatar person={person} size={56} />
          <span>{person.name}</span>
          <span className={styles.modes}><Link className={styles.punch} href={`/people/${person.id}/play/punch`}>👊 펀치</Link><Link className={styles.cheer} href={`/people/${person.id}/play/cheer`}>👏 응원</Link></span>
        </li>)}</ul> : <p className={styles.empty}>게임에 쓸 수 있는 인물이 아직 없습니다.</p>}
      </section>

      <section className={styles.section} aria-labelledby="swipe-title">
        <h2 id="swipe-title">훑어보기</h2>
        <p>인물과 언행 카드를 최대 25장 넘기며 펀치·응원·잘 모름을 고릅니다. 카드마다 대표 기록과 출처가 붙어 있습니다.</p>
        <Link className={styles.cta} href="/play/swipe">카드 넘기기 →</Link>
      </section>

      <section className={styles.section} aria-labelledby="worldcup-title">
        <h2 id="worldcup-title">언행 월드컵</h2>
        <p>사람이 아니라 언행끼리 겨룹니다. 결과는 나의 비교 기록일 뿐 지지율이 아닙니다.</p>
        {brackets.length ? <ul className={styles.brackets}>{brackets.map((bracket) => <li key={bracket.id}><Link href={`/play/worldcup/${bracket.id}`}>{QUESTIONS[bracket.questionId]} <small>{bracket.statementIds.length}강</small></Link></li>)}</ul> : <p className={styles.empty}>열린 월드컵이 아직 없습니다.</p>}
      </section>
    </main>
  </>;
}
