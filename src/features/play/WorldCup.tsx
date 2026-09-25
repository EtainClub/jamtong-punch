"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ShareButton } from "@/features/archive/ShareButton";
import { firebaseJsonFetch } from "@/lib/firebase/api";
import { useFirebaseAuth } from "@/lib/firebase/auth";
import styles from "./worldcup.module.css";

export type Contender = { id: string; speaker: string; headline: string; quote: string | null; date: string; sourceLabel: string | null; sourceHref: string | null };
type Match = { round: number; leftId: string; rightId: string; winner: "left" | "right" };

const roundName = (size: number) => (size === 2 ? "결승" : `${size}강`);

// implementation-design 7.5: statements face each other in the operator's
// bracket order (the server checks that exact shape), and the picks go to the
// comparison ledger only, never to stances.
export function WorldCup({ bracketId, question, contenders }: { bracketId: string; question: string; contenders: Contender[] }) {
  const { user } = useFirebaseAuth();
  const byId = new Map(contenders.map((item) => [item.id, item]));
  const [field, setField] = useState(contenders.map((item) => item.id));
  const [winners, setWinners] = useState<string[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [round, setRound] = useState(1);
  const [champion, setChampion] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const sessionId = useRef<string | null>(null);

  const pair = winners.length * 2;
  const left = byId.get(field[pair]);
  const right = byId.get(field[pair + 1]);

  async function submit(all: Match[]) {
    if (!user) { setStatus("로그인을 준비하지 못해 결과를 기록하지 못했습니다."); return; }
    sessionId.current ??= crypto.randomUUID();
    try {
      await firebaseJsonFetch(user, "/api/comparison", { method: "POST", body: JSON.stringify({ sessionId: sessionId.current, bracket: bracketId, matches: all }) });
      setStatus("비교 결과를 기록했습니다. 이 결과는 인물 입장(펀치·응원) 수치에 들어가지 않습니다.");
    } catch {
      setStatus("결과를 기록하지 못했습니다. 잠시 뒤 다시 해 주세요.");
    }
  }

  function pick(side: "left" | "right") {
    if (!left || !right || champion) return;
    const match: Match = { round, leftId: left.id, rightId: right.id, winner: side };
    const allMatches = [...matches, match];
    const nextWinners = [...winners, side === "left" ? left.id : right.id];
    setMatches(allMatches);
    if (nextWinners.length * 2 < field.length) { setWinners(nextWinners); return; }
    if (nextWinners.length === 1) {
      setChampion(nextWinners[0]);
      setStatus("기록하는 중…");
      void submit(allMatches);
      return;
    }
    setField(nextWinners);
    setWinners([]);
    setRound(round + 1);
  }

  function restart() {
    setField(contenders.map((item) => item.id));
    setWinners([]); setMatches([]); setRound(1); setChampion(null); setStatus(null);
    sessionId.current = null;
  }

  if (champion) {
    const winner = byId.get(champion)!;
    return <section className={styles.result} aria-live="polite">
      <p className={styles.question}>{question}</p>
      <h1>내가 고른 1위</h1>
      <Card item={winner} />
      <p className={styles.recorded}>{status}</p>
      <p className={styles.help}>이것은 나의 비교 기록입니다. 지지율이나 여론조사 결과가 아닙니다.</p>
      <ol className={styles.path}>{matches.map((match, index) => {
        const won = byId.get(match.winner === "left" ? match.leftId : match.rightId)!;
        const lost = byId.get(match.winner === "left" ? match.rightId : match.leftId)!;
        return <li key={index}><span>{match.round}라운드</span> <b>{won.speaker} · {won.headline}</b> <small>vs {lost.speaker} · {lost.headline}</small></li>;
      })}</ol>
      <div className={styles.actions}>
        <button onClick={restart} type="button">다시 하기</button>
        <ShareButton path={`/play/worldcup/${bracketId}`} title={`임통 월드컵 · ${question}`} />
        <Link href="/play">다른 게임</Link>
      </div>
    </section>;
  }

  return <section className={styles.game} aria-label="언행 월드컵">
    <p className={styles.round}>{roundName(field.length)} · {winners.length + 1} / {field.length / 2}</p>
    <h1 className={styles.question}>{question}</h1>
    <div className={styles.pair} role="group" aria-label="둘 중 하나를 고르세요">
      {left && <button className={styles.choice} onClick={() => pick("left")} type="button"><Card item={left} /></button>}
      <span className={styles.vs} aria-hidden="true">VS</span>
      {right && <button className={styles.choice} onClick={() => pick("right")} type="button"><Card item={right} /></button>}
    </div>
    <p className={styles.help}>카드를 눌러 고릅니다. 출처는 고르기 전에 새 창으로 확인할 수 있습니다.</p>
    <div className={styles.sources}>{[left, right].map((item) => item?.sourceHref && <a key={item.id} href={item.sourceHref} target="_blank" rel="noreferrer">{item.speaker} 출처: {item.sourceLabel}</a>)}</div>
  </section>;
}

function Card({ item }: { item: Contender }) {
  return <span className={styles.card}>
    <small>{item.speaker} · {item.date}</small>
    <strong>{item.headline}</strong>
    {item.quote && <q>{item.quote}</q>}
  </span>;
}
