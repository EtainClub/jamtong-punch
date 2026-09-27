"use client";

import type { User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { accountJsonFetch } from "@/lib/firebase/api";
import { SOURCE_LABELS, SOURCES } from "@/lib/metrics/events";
import type { DailyMetrics } from "@/lib/metrics/store";
import { OpsGate } from "./OpsGate";
import styles from "./ops-pages.module.css";

const total = (day: DailyMetrics, kind: "first" | "return") => SOURCES.reduce((sum, source) => sum + day.visits[source][kind], 0);
const rate = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "—");

function Board({ user }: { user: User }) {
  const [days, setDays] = useState<DailyMetrics[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setDays((await accountJsonFetch<{ days: DailyMetrics[] }>(user, "/api/ops/metrics")).days); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "불러오지 못했습니다."); }
  }, [user]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  if (!days) return <p className={error ? styles.error : styles.note}>{error ?? "불러오는 중…"}</p>;

  const sum = (pick: (day: DailyMetrics) => number, span = days.length) => days.slice(0, span).reduce((acc, day) => acc + pick(day), 0);
  const firsts7 = sum((day) => total(day, "first"), 7);
  const second7 = sum((day) => day.secondRecord, 7);
  const share7 = sum((day) => day.visits.share.first, 7);
  return <>
    <div className={styles.toolbar}><button onClick={() => void load()} type="button">새로고침</button><span className={styles.note}>최근 7일 · 날짜는 한국 시간</span></div>
    <section className={styles.cards}>
      <div><b>{firsts7}</b>첫 방문</div>
      <div><b>{sum((day) => total(day, "return"), 7)}</b>다시 온 방문</div>
      <div><b>{rate(second7, firsts7)}</b>첫 방문 중 두 번째 기록까지 본 비율 ({second7})</div>
      <div><b>{share7}</b>공유 링크로 온 첫 방문</div>
    </section>
    <table className={styles.jobs}>
      <thead><tr><th>날짜</th>{SOURCES.map((source) => <th key={source}>{SOURCE_LABELS[source]}</th>)}<th>두 번째 기록</th></tr></thead>
      <tbody>{days.map((day) => <tr key={day.date}>
        <td>{day.date.slice(5)}</td>
        {SOURCES.map((source) => <td key={source}>{day.visits[source].first}<small>재방문 {day.visits[source].return}</small></td>)}
        <td>{day.secondRecord}<small>{rate(day.secondRecord, total(day, "first"))}</small></td>
      </tr>)}</tbody>
    </table>
    <p className={styles.note}>칸의 큰 숫자는 첫 방문(이 브라우저로 처음 온 방문), 작은 숫자는 재방문입니다. 방문은 탭 하나에 한 번만 셉니다. 개인을 알아볼 수 있는 정보는 받지도 저장하지도 않으며, 누구나 보낼 수 있는 합계라 참고용입니다.</p>
  </>;
}

export function MetricsBoard() {
  return <main className={styles.page}>
    <h1>방문 지표</h1>
    <OpsGate>{(user) => <Board user={user} />}</OpsGate>
  </main>;
}
