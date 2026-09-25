"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ShareButton } from "@/features/archive/ShareButton";
import { firebaseJsonFetch } from "@/lib/firebase/api";
import { useFirebaseAuth } from "@/lib/firebase/auth";
import { playPick, saveSoundPreference, soundPreference, type PickTone } from "./sound";
import styles from "./worldcup.module.css";

// A statement (speaker, headline, quote, source) or a person (name, role, photo).
export type Contender = { id: string; title: string; subtitle: string; quote: string | null; imageUrl: string | null; sourceLabel: string | null; sourceHref: string | null };
type Match = { round: number; leftId: string; rightId: string; winner: "left" | "right" };

const roundName = (size: number) => (size === 2 ? "결승" : `${size}강`);

// What a pick looks and sounds like, by question: choosing who to punch (or
// the more problematic statement) lands a punch, choosing who to cheer sends
// a heart, "more urgent" flashes. The champion gets a trophy and a fanfare.
const PICK_FX: Record<string, { emoji: string; tone: PickTone }> = {
  "more-punch": { emoji: "👊", tone: "punch" },
  "more-problematic": { emoji: "👊", tone: "punch" },
  "more-cheer": { emoji: "❤️", tone: "cheer" },
  "more-urgent": { emoji: "⚡", tone: "pick" },
};
const PICK_MS = 420;

// implementation-design 7.5: entrants meet in the given order (the server
// checks that exact shape), and the picks go to the comparison ledger only,
// never to stances. A random draw (reshuffle) deals new entrants on replay.
export function WorldCup({ bracketId, questionId, question, contenders, sharePath, reshuffle = false }: {
  bracketId: string;
  questionId?: string;
  question: string;
  contenders: Contender[];
  sharePath: string;
  reshuffle?: boolean;
}) {
  const { user } = useFirebaseAuth();
  const byId = new Map(contenders.map((item) => [item.id, item]));
  const [field, setField] = useState(contenders.map((item) => item.id));
  const [winners, setWinners] = useState<string[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [round, setRound] = useState(1);
  const [champion, setChampion] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sound, setSound] = useState(false);
  const [picked, setPicked] = useState<{ side: "left" | "right"; key: number } | null>(null);
  const sessionId = useRef<string | null>(null);
  const pickCount = useRef(0);
  const fx = PICK_FX[questionId ?? ""] ?? { emoji: "✔️", tone: "pick" as const };

  useEffect(() => {
    const timeout = window.setTimeout(() => setSound(soundPreference()), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function toggleSound() {
    const next = !sound;
    setSound(next);
    saveSoundPreference(next);
  }

  const pair = winners.length * 2;
  const left = byId.get(field[pair]);
  const right = byId.get(field[pair + 1]);

  async function submit(all: Match[]) {
    if (!user) { setStatus("로그인을 준비하지 못해 결과를 기록하지 못했습니다."); return; }
    sessionId.current ??= crypto.randomUUID();
    try {
      await firebaseJsonFetch(user, "/api/comparison", { method: "POST", body: JSON.stringify({ sessionId: sessionId.current, bracket: bracketId, ...(questionId ? { question: questionId } : {}), matches: all }) });
      setStatus("비교 결과를 기록했습니다. 이 결과는 펀치·응원 입장 수치에 들어가지 않습니다.");
    } catch {
      setStatus("결과를 기록하지 못했습니다. 잠시 뒤 다시 해 주세요.");
    }
  }

  // The chosen card shows the pick for a moment before the next pair comes up.
  function pick(side: "left" | "right") {
    if (!left || !right || champion || picked) return;
    if (sound) playPick(fx.tone, field.length === 2);
    pickCount.current += 1;
    setPicked({ side, key: pickCount.current });
    window.setTimeout(() => { setPicked(null); advance(side); }, PICK_MS);
  }

  function advance(side: "left" | "right") {
    if (!left || !right) return;
    const allMatches = [...matches, { round, leftId: left.id, rightId: right.id, winner: side }];
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
    if (reshuffle) { window.location.reload(); return; }
    setField(contenders.map((item) => item.id));
    setWinners([]); setMatches([]); setRound(1); setChampion(null); setStatus(null);
    sessionId.current = null;
  }

  if (champion) {
    const winner = byId.get(champion)!;
    return <section className={styles.result} aria-live="polite">
      <p className={styles.question}>{question}</p>
      <h1>내가 고른 1위</h1>
      <div className={styles.champion}><Card item={winner} /><span className={styles.trophy} aria-hidden="true">🏆</span></div>
      <p className={styles.recorded}>{status}</p>
      <p className={styles.help}>이것은 나의 비교 기록입니다. 지지율이나 여론조사 결과가 아니고, 임통은 이 결과로 순위를 공개하지 않습니다.</p>
      <ol className={styles.path}>{matches.map((match, index) => {
        const won = byId.get(match.winner === "left" ? match.leftId : match.rightId)!;
        const lost = byId.get(match.winner === "left" ? match.rightId : match.leftId)!;
        return <li key={index}><span>{roundName(Math.max(2, (contenders.length) / 2 ** (match.round - 1)))}</span> <b>{won.title}</b> <small>vs {lost.title}</small></li>;
      })}</ol>
      <div className={styles.actions}>
        <button onClick={restart} type="button">{reshuffle ? "새 대진으로 다시" : "다시 하기"}</button>
        <ShareButton path={sharePath} title={`임통 월드컵 · ${question}`} />
        <Link href="/play">다른 게임</Link>
      </div>
    </section>;
  }

  return <section className={styles.game} aria-label="월드컵">
    <div className={styles.top}>
      <p className={styles.round}>{roundName(field.length)} · {winners.length + 1} / {field.length / 2}</p>
      <button className={styles.sound} onClick={toggleSound} type="button" aria-pressed={sound} aria-label={sound ? "효과음 끄기" : "효과음 켜기"}>{sound ? "🔊" : "🔈"}</button>
    </div>
    <h1 className={styles.question}>{question}</h1>
    <div className={styles.pair} role="group" aria-label="둘 중 하나를 고르세요">
      {left && <button className={`${styles.choice} ${picked?.side === "left" ? styles.chosen : picked ? styles.dropped : ""}`} onClick={() => pick("left")} type="button"><Card item={left} />{picked?.side === "left" && <span key={picked.key} className={styles.pop} aria-hidden="true">{fx.emoji}</span>}</button>}
      <span className={styles.vs} aria-hidden="true">VS</span>
      {right && <button className={`${styles.choice} ${picked?.side === "right" ? styles.chosen : picked ? styles.dropped : ""}`} onClick={() => pick("right")} type="button"><Card item={right} />{picked?.side === "right" && <span key={picked.key} className={styles.pop} aria-hidden="true">{fx.emoji}</span>}</button>}
    </div>
    <p className={styles.help}>카드를 눌러 고릅니다.{left?.sourceHref ? " 출처는 고르기 전에 새 창으로 확인할 수 있습니다." : ""}</p>
    <div className={styles.sources}>{[left, right].map((item) => item?.sourceHref && <a key={item.id} href={item.sourceHref} target="_blank" rel="noreferrer">{item.title} 출처: {item.sourceLabel}</a>)}</div>
  </section>;
}

function Card({ item }: { item: Contender }) {
  return <span className={styles.card}>
    {item.imageUrl
      // eslint-disable-next-line @next/next/no-img-element
      ? <span className={styles.person}><img src={item.imageUrl} alt="" /><span><strong>{item.title}</strong><small>{item.subtitle}</small></span></span>
      : <><small>{item.subtitle}</small><strong>{item.title}</strong></>}
    {item.quote && <q>{item.quote}</q>}
  </span>;
}
