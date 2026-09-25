"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { StateEntry } from "@/lib/domain";
import { useFirebaseAuth } from "@/lib/firebase/auth";
import { kstToday, loadMyStances, STANCE_LABELS, submitStances } from "./participation";
import { playHit, saveSoundPreference, soundPreference } from "./sound";
import styles from "./play.module.css";

// punchpol's whack-a-mole pacing (implementation-design 7.3): the face moves
// every SPEED ms, each hit shortens it, and there are no lives and no clock.
const INITIAL_SPEED = 1000;
const MIN_SPEED = 400;
const SPEED_DECREMENT = 20;
const CELLS = 9;
const IDLE_END_MS = 20_000;
const MAX_MARKS = 40;

type Mode = "punch" | "cheer";
type Header = { statementId: string; headline: string; quote: string | null; sourceLabel: string; sourceHref: string } | null;
type Mark = { id: number; x: number; y: number; rotate: number };
type Burst = { id: number; x: number; y: number };
type Outcome = { hits: number; bestCombo: number; recorded: string };

// Punches pile up on the face for the session; cheer hearts float up and fade
// so the face stays visible.
const COPY: Record<Mode, { verb: string; icon: string; marks: string[] }> = {
  punch: { verb: "때리기", icon: "👊", marks: ["👊"] },
  cheer: { verb: "응원하기", icon: "👏", marks: ["❤️", "💖", "💕"] },
};
const HEART_MS = 1600;

export function ReflexGame({ person, mode, header, backHref }: {
  person: { id: string; name: string; imageUrl: string };
  mode: Mode;
  header: Header;
  backHref: string;
}) {
  const { user } = useFirebaseAuth();
  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [today, setToday] = useState<StateEntry | null>(null);
  const [cell, setCell] = useState(4);
  const [hits, setHits] = useState(0);
  const [combo, setCombo] = useState(0);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [flash, setFlash] = useState(0);
  const [sound, setSound] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const speed = useRef(INITIAL_SPEED);
  const timer = useRef<number | null>(null);
  const idle = useRef<number | null>(null);
  const hitThisStay = useRef(false);
  const comboRef = useRef(0);
  const best = useRef(0);
  const hitsRef = useRef(0);
  const nextId = useRef(0);
  const session = useRef({ id: "", startedAt: "" });
  const reducedMotion = useRef(false);
  const board = useRef<HTMLDivElement>(null);
  const recordId = header?.statementId ?? null;
  const moveRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => setSound(soundPreference()), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void loadMyStances(user.uid).then((map) => { if (active && map[person.id]?.d === kstToday()) setToday(map[person.id]); });
    return () => { active = false; };
  }, [user, person.id]);

  const stop = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (idle.current) window.clearTimeout(idle.current);
    timer.current = null;
    idle.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  const finish = useCallback(async () => {
    stop();
    setPhase("done");
    const result: Outcome = { hits: hitsRef.current, bestCombo: best.current, recorded: "" };
    if (!hitsRef.current) {
      setOutcome({ ...result, recorded: "한 번도 맞히지 않아 입장을 기록하지 않았습니다." });
      return;
    }
    if (!user) {
      setOutcome({ ...result, recorded: "로그인을 준비하지 못해 입장을 기록하지 못했습니다." });
      return;
    }
    try {
      const response = await submitStances(user, {
        sessionId: session.current.id,
        game: "reflex",
        startedAt: session.current.startedAt,
        stances: [{ kind: "person", slug: person.id, stance: mode, recordId, score: Math.min(hitsRef.current, 10_000) }],
      });
      const recorded = response.capped.includes(person.id)
        ? "오늘 이 인물에 대해 바꿀 수 있는 횟수를 다 써서 입장은 그대로입니다."
        : response.replaced.includes(person.id)
          ? `오늘의 입장을 ${STANCE_LABELS[mode]}(으)로 바꿨습니다. 여전히 1건입니다.`
          : `오늘 ${person.name}에 대한 입장 1건(${STANCE_LABELS[mode]})을 기록했습니다.`;
      setOutcome({ ...result, recorded });
    } catch {
      setError("입장을 기록하지 못했습니다. 인물 페이지의 버튼으로 다시 남길 수 있습니다.");
      setOutcome({ ...result, recorded: "" });
    }
  }, [recordId, mode, person.id, person.name, stop, user]);

  const armIdle = useCallback(() => {
    if (idle.current) window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => void finish(), IDLE_END_MS);
  }, [finish]);

  // The face stays SPEED ms in a cell. Leaving without being hit breaks the combo.
  const schedule = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => moveRef.current(), speed.current);
  }, []);
  useEffect(() => {
    moveRef.current = () => {
      if (!hitThisStay.current && comboRef.current) { comboRef.current = 0; setCombo(0); }
      hitThisStay.current = false;
      setCell((current) => {
        const next = Math.floor(Math.random() * (CELLS - 1));
        return next >= current ? next + 1 : next;
      });
      schedule();
    };
  }, [schedule]);

  function start() {
    session.current = { id: crypto.randomUUID(), startedAt: new Date().toISOString() };
    speed.current = INITIAL_SPEED;
    hitsRef.current = 0; comboRef.current = 0; best.current = 0; hitThisStay.current = false;
    setHits(0); setCombo(0); setMarks([]); setBursts([]); setOutcome(null); setError(null);
    setPhase("playing");
    schedule();
    armIdle();
  }

  function hit(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    hitsRef.current += 1;
    comboRef.current += 1;
    best.current = Math.max(best.current, comboRef.current);
    hitThisStay.current = true;
    setHits(hitsRef.current);
    setCombo(comboRef.current);
    const id = nextId.current++;
    // Marks stay on the face for the session only; nothing is saved or sent.
    setMarks((current) => [...current.slice(-(MAX_MARKS - 1)), { id, x, y, rotate: Math.round(Math.random() * 60 - 30) }]);
    if (mode === "cheer") window.setTimeout(() => setMarks((current) => current.filter((mark) => mark.id !== id)), HEART_MS);
    if (!reducedMotion.current) {
      setFlash(id);
      board.current?.animate([{ transform: "translate(0, 0)" }, { transform: `translate(${Math.random() > 0.5 ? 6 : -6}px, 3px)` }, { transform: "translate(-4px, -2px)" }, { transform: "translate(0, 0)" }], { duration: 160 });
      setBursts((current) => [...current, { id, x, y }]);
      window.setTimeout(() => setBursts((current) => current.filter((burst) => burst.id !== id)), 600);
    }
    navigator.vibrate?.(comboRef.current >= 10 ? [18, 12, 18] : 14);
    if (sound) playHit(mode, comboRef.current);
    speed.current = Math.max(MIN_SPEED, speed.current - SPEED_DECREMENT);
    moveRef.current();
    armIdle();
  }

  function toggleSound() {
    const next = !sound;
    setSound(next);
    saveSoundPreference(next);
  }

  const copy = COPY[mode];
  const headerCard = header && <div className={styles.headerCard}>
    <span>왜 이 사람인가</span>
    <strong>{header.headline}</strong>
    {header.quote && <q>{header.quote}</q>}
    <a href={header.sourceHref} target="_blank" rel="noreferrer">{header.sourceLabel}</a>
  </div>;

  if (phase === "intro") {
    return <section className={styles.intro} aria-labelledby="reflex-title">
      <h1 id="reflex-title">{person.name} {copy.verb}</h1>
      {headerCard}
      <div className={styles.contract}>
        <p><b>이 화면은 나만 봅니다.</b> 저장·공유되지 않고, 화면을 닫으면 흔적도 사라집니다.</p>
        <p><b>게임이 끝나면 오늘 {person.name}에 대한 입장 1건({STANCE_LABELS[mode]})이 기록됩니다.</b> 몇 번을 치든 1건이고, 오늘 다시 하면 새로 쌓이지 않고 바뀝니다.</p>
        {today && <p className={styles.notice}>오늘 이미 {STANCE_LABELS[today.s]}(으)로 기록했습니다. 이번 게임을 마치면 {STANCE_LABELS[mode]}(으)로 바뀝니다.</p>}
      </div>
      <p className={styles.help}>얼굴이 옮겨 다닙니다. 맞힐수록 빨라지고, 시간 제한은 없습니다. 20초 동안 치지 않으면 끝납니다.</p>
      <div className={styles.actions}>
        <button className={`${styles.primary} ${styles[mode]}`} onClick={start} type="button">{copy.icon} 시작</button>
        <Link href={backHref}>버튼으로 입장만 남기기</Link>
      </div>
    </section>;
  }

  if (phase === "done") {
    return <section className={styles.result} aria-live="polite">
      <h1>{person.name} {copy.verb} 끝</h1>
      <div className={styles.score}>
        <p><span>내 점수 · 나만 봅니다</span><b>{outcome?.hits ?? hits}</b>번 {mode === "punch" ? "타격" : "응원"}</p>
        <p><span>최고 연타</span><b>{outcome?.bestCombo ?? 0}</b></p>
      </div>
      <p className={styles.recorded}>{error ?? outcome?.recorded ?? "기록하는 중…"}</p>
      <p className={styles.help}>점수는 나만 보는 기록입니다. 1번을 치든 300번을 치든 남는 입장은 1건입니다.</p>
      <div className={styles.actions}>
        <button className={`${styles.primary} ${styles[mode]}`} onClick={start} type="button">다시 하기</button>
        <Link href={backHref}>{person.name} 기록 보기</Link>
      </div>
    </section>;
  }

  return <section className={styles.game} aria-label={`${person.name} ${copy.verb} 게임`}>
    <div className={styles.hud}>
      <span>{copy.icon} <b>{hits}</b></span>
      <span className={combo >= 5 ? styles.hot : undefined} aria-live="off">연타 <b>{combo}</b></span>
      <button onClick={toggleSound} type="button" aria-pressed={sound}>{sound ? "🔊" : "🔈"}</button>
      <button onClick={() => void finish()} type="button">끝내기</button>
    </div>
    {headerCard}
    <div className={styles.board} ref={board}>
      {flash > 0 && <div className={`${styles.flash} ${styles[`flash_${mode}`]}`} key={`flash-${flash}`} aria-hidden="true" />}
      {Array.from({ length: CELLS }, (_, index) => <div key={index} className={styles.cell}>
        {index === cell && <button className={styles.face} onPointerDown={hit} type="button" aria-label={`${person.name} ${mode === "punch" ? "치기" : "응원하기"}`}>
          {/* The original photo is shown as is; effects are overlays that never touch the file. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={person.imageUrl} alt="" draggable={false} />
          {marks.map((mark) => mode === "punch"
            ? <span key={mark.id} className={styles.mark} style={{ left: `${mark.x * 100}%`, top: `${mark.y * 100}%`, transform: `translate(-50%, -50%) rotate(${mark.rotate}deg)` }} aria-hidden="true">{copy.marks[0]}</span>
            : <span key={mark.id} className={styles.heart} style={{ left: `${mark.x * 100}%`, top: `${mark.y * 100}%` }} aria-hidden="true">{copy.marks[mark.id % copy.marks.length]}</span>)}
          {bursts.map((burst) => <span key={burst.id} className={`${styles.burst} ${styles[`burst_${mode}`]}`} style={{ left: `${burst.x * 100}%`, top: `${burst.y * 100}%` }} aria-hidden="true" />)}
        </button>}
      </div>)}
    </div>
    <p className={styles.help}>화면 속 얼굴과 흔적은 이 기기에서만 보이고 저장되지 않습니다.</p>
  </section>;
}
