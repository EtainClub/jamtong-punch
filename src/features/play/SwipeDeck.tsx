"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Stance } from "@/lib/domain";
import { useFirebaseAuth } from "@/lib/firebase/auth";
import { submitStances, type StanceEntry } from "./participation";
import { playStance, saveSoundPreference, soundPreference } from "./sound";
import styles from "./swipe.module.css";

export type SwipeCard = {
  kind: "person" | "statement";
  id: string;
  name: string;
  subtitle: string;
  imageUrl: string | null;
  line: string | null;
  quote: string | null;
  sourceLabel: string | null;
  sourceHref: string | null;
  href: string;
};

// implementation-design 7.4: left punch, right cheer, up "don't know",
// one undo per session, at most 25 cards, only the top 3 rendered.
const THRESHOLD = 90;
const DIRECTIONS: Record<Stance, { x: number; y: number; icon: string }> = {
  punch: { x: -1, y: 0, icon: "👊" },
  cheer: { x: 1, y: 0, icon: "👏" },
  unknown: { x: 0, y: -1, icon: "🤷" },
};

type Choice = { card: SwipeCard; stance: Stance; dwellMs: number };

// What flashes over the deck as a card leaves. "Don't know" gets a sound only.
const POPS: Partial<Record<Stance, string>> = { punch: "👊", cheer: "❤️" };

export function SwipeDeck({ cards }: { cards: SwipeCard[] }) {
  const { user } = useFirebaseAuth();
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [undoUsed, setUndoUsed] = useState(false);
  const [leaving, setLeaving] = useState<Stance | null>(null);
  const [done, setDone] = useState<{ message: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sound, setSound] = useState(false);
  const [pop, setPop] = useState<{ id: number; stance: Stance } | null>(null);
  const session = useRef({ id: "", startedAt: "" });
  const shownAt = useRef(0);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const top = useRef<HTMLElement>(null);

  useEffect(() => {
    session.current = { id: crypto.randomUUID(), startedAt: new Date().toISOString() };
    shownAt.current = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => setSound(soundPreference() && !reduced), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function toggleSound() {
    const next = !sound;
    setSound(next);
    saveSoundPreference(next);
  }

  async function finish(final: Choice[]) {
    setDone({ message: "기록하는 중…" });
    if (!final.length) { setDone({ message: "아무 카드도 넘기지 않아 기록하지 않았습니다." }); return; }
    if (!user) { setDone({ message: "로그인을 준비하지 못해 기록하지 못했습니다. 잠시 뒤 다시 해 주세요." }); return; }
    setSending(true);
    try {
      const stances: StanceEntry[] = final.map((choice) => ({ kind: choice.card.kind, slug: choice.card.id, stance: choice.stance, dwellMs: Math.round(choice.dwellMs) }));
      const result = await submitStances(user, { sessionId: session.current.id, game: "swipe", startedAt: session.current.startedAt, stances });
      const kept = result.accepted.length + result.replaced.length;
      setDone({ message: `${kept}건을 기록했습니다${result.replaced.length ? ` (오늘 이미 있던 ${result.replaced.length}건은 이번 입장으로 바꿨습니다)` : ""}${result.capped.length ? `. ${result.capped.length}건은 오늘 한도를 넘어 반영하지 않았습니다` : ""}.` });
    } catch {
      setDone({ message: "기록하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setSending(false);
    }
  }

  function choose(stance: Stance) {
    if (leaving || done || index >= cards.length) return;
    const choice = { card: cards[index], stance, dwellMs: performance.now() - shownAt.current };
    const next = [...choices, choice];
    setLeaving(stance);
    if (sound) playStance(stance);
    if (POPS[stance]) {
      const id = Date.now();
      setPop({ id, stance });
      window.setTimeout(() => setPop((current) => (current?.id === id ? null : current)), 700);
    }
    window.setTimeout(() => {
      setLeaving(null);
      setChoices(next);
      setIndex(index + 1);
      shownAt.current = performance.now();
      if (index + 1 >= cards.length) void finish(next);
    }, 180);
  }

  function undo() {
    if (undoUsed || !choices.length || done) return;
    setUndoUsed(true);
    setChoices(choices.slice(0, -1));
    setIndex(index - 1);
    shownAt.current = performance.now();
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") choose("punch");
      else if (event.key === "ArrowRight") choose("cheer");
      else if (event.key === "ArrowUp") choose("unknown");
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("a, button")) return;
    drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!drag.current || !top.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    top.current.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`;
    top.current.dataset.hint = dy < -THRESHOLD && Math.abs(dx) < THRESHOLD ? "unknown" : dx < -THRESHOLD ? "punch" : dx > THRESHOLD ? "cheer" : "";
  }
  function onPointerUp() {
    if (!drag.current || !top.current) return;
    drag.current = null;
    const hint = top.current.dataset.hint;
    top.current.dataset.hint = "";
    top.current.style.transform = "";
    if (hint === "punch" || hint === "cheer" || hint === "unknown") choose(hint);
  }

  if (!cards.length) return <p className={styles.empty}>지금은 넘길 카드가 없습니다.</p>;

  if (done) {
    const counts = choices.reduce<Record<Stance, number>>((sum, choice) => ({ ...sum, [choice.stance]: sum[choice.stance] + 1 }), { punch: 0, cheer: 0, unknown: 0 });
    return <section className={styles.result} aria-live="polite">
      <h1>훑어보기 끝</h1>
      <p className={styles.tally}><span>👊 펀치 <b>{counts.punch}</b></span><span>👏 응원 <b>{counts.cheer}</b></span><span>🤷 잘 모름 <b>{counts.unknown}</b></span></p>
      <p className={styles.recorded}>{done.message}</p>
      <p className={styles.help}>카드 하나에 입장 1건입니다. 오늘 같은 대상에 다시 입장을 내면 바뀔 뿐 늘지 않습니다.</p>
      <ul className={styles.review}>{choices.map((choice) => <li key={choice.card.id}><span>{DIRECTIONS[choice.stance].icon}</span><Link href={choice.card.href}>{choice.card.kind === "person" || !choice.card.line ? choice.card.name : `${choice.card.name} · ${choice.card.line}`}</Link></li>)}</ul>
      <div className={styles.actions}><Link href="/play">다른 게임</Link><Link href="/">홈으로</Link></div>
    </section>;
  }

  const visible = cards.slice(index, index + 3);
  return <section className={styles.deckArea} aria-label="카드 훑어보기">
    <div className={styles.progress}><span>{index + 1} / {cards.length}</span><button onClick={toggleSound} type="button" aria-pressed={sound} aria-label={sound ? "효과음 끄기" : "효과음 켜기"}>{sound ? "🔊" : "🔈"}</button><button onClick={undo} disabled={undoUsed || !choices.length || sending} type="button">↶ 되돌리기{undoUsed ? " (사용함)" : ""}</button><button onClick={() => void finish(choices)} disabled={sending} type="button">끝내기</button></div>
    <div className={styles.deck}>
      {pop && <span key={pop.id} className={`${styles.pop} ${styles[`pop_${pop.stance}`]}`} aria-hidden="true">{POPS[pop.stance]}</span>}
      {visible.map((card, depth) => {
        const isTop = depth === 0;
        return <article key={card.id} ref={isTop ? top : undefined} className={`${styles.card} ${isTop && leaving ? styles[`leave_${leaving}`] : ""}`} style={{ zIndex: 3 - depth, transform: isTop ? undefined : `translateY(${depth * 10}px) scale(${1 - depth * 0.04})` }}
          onPointerDown={isTop ? onPointerDown : undefined} onPointerMove={isTop ? onPointerMove : undefined} onPointerUp={isTop ? onPointerUp : undefined} onPointerCancel={isTop ? onPointerUp : undefined}
          aria-hidden={!isTop}>
          <p className={styles.kind}>{card.kind === "person" ? "인물" : "언행"}</p>
          <div className={styles.who}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {card.imageUrl ? <img src={card.imageUrl} alt="" draggable={false} /> : <span className={styles.initial} aria-hidden="true">{card.name.slice(0, 1)}</span>}
            <div><h2>{card.name}</h2><small>{card.subtitle}</small></div>
          </div>
          {card.line && <p className={styles.line}>{card.line}</p>}
          {card.quote && <blockquote>“{card.quote}”</blockquote>}
          {card.sourceHref && <a href={card.sourceHref} target="_blank" rel="noreferrer">{card.sourceLabel}</a>}
          <span className={styles.stamp} aria-hidden="true" />
        </article>;
      })}
    </div>
    <div className={styles.buttons} role="group" aria-label="이 카드에 대한 입장">
      <button className={styles.punch} onClick={() => choose("punch")} type="button">👊 펀치<small>← 왼쪽</small></button>
      <button className={styles.unknown} onClick={() => choose("unknown")} type="button">🤷 잘 모름<small>↑ 위</small></button>
      <button className={styles.cheer} onClick={() => choose("cheer")} type="button">👏 응원<small>→ 오른쪽</small></button>
    </div>
    <p className={styles.help}>카드를 밀거나 버튼·방향키로 고릅니다. 모르는 대상은 &lsquo;잘 모름&rsquo;으로 넘기세요. 그것도 기록입니다. 마치면 넘긴 카드마다 입장 1건이 기록되고, 오늘 이미 입장을 낸 대상은 이번 선택으로 바뀝니다.</p>
  </section>;
}
