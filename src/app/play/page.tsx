import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/features/archive/components";
import { PlayRules } from "@/features/play/PlayRules";
import styles from "@/features/play/hub.module.css";
import { shareMetadata } from "@/lib/site";

export const metadata: Metadata = shareMetadata("게임", "펀치·응원, 카드 훑어보기, 언행 월드컵, 인물 월드컵. 게임은 나만 보고, 기록되는 입장은 대상마다 하루 1건입니다.");

const GAMES = [
  { href: "/play/reflex", icon: "👊", title: "펀치 · 응원", text: "한 사람을 골라 옮겨 다니는 얼굴을 치거나 응원합니다. 시간 제한 없이, 맞힐수록 빨라집니다.", tone: "punch" },
  { href: "/play/swipe", icon: "🃏", title: "카드 훑어보기", text: "인물과 언행 카드를 넘기며 펀치·응원·잘 모름을 고릅니다. 카드마다 출처가 붙어 있습니다.", tone: "neutral" },
  { href: "/play/worldcup/statements", icon: "🗯️", title: "언행 월드컵", text: "언행끼리 겨룹니다. 어느 쪽이 더 문제인지, 더 시급한지 골라 1위까지 올라갑니다.", tone: "neutral" },
  { href: "/play/worldcup/people", icon: "🏆", title: "인물 월드컵", text: "두 사람 중 더 펀치하고 싶은, 또는 더 응원하고 싶은 사람을 골라 1위까지 올라갑니다.", tone: "cheer" },
] as const;

export default function PlayPage() {
  return <>
    <SiteHeader current="play" />
    <main className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>임통 · 게임</p>
        <h1>무엇을 할까요?</h1>
      </section>
      <ul className={styles.games}>{GAMES.map((game) => <li key={game.href}>
        <Link className={`${styles.game} ${styles[`tone_${game.tone}`]}`} href={game.href}>
          <span className={styles.icon} aria-hidden="true">{game.icon}</span>
          <strong>{game.title}</strong>
          <span>{game.text}</span>
        </Link>
      </li>)}</ul>
      <PlayRules />
    </main>
  </>;
}
