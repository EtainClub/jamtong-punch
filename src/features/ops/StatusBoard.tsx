"use client";

import Link from "next/link";
import type { User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { accountJsonFetch } from "@/lib/firebase/api";
import type { OpsHealth } from "@/lib/ops/health";
import { OpsGate } from "./OpsGate";
import styles from "./ops-pages.module.css";

const STATE: Record<string, string> = { ok: "정상", late: "지연", failing: "실패", never: "기록 없음" };
const every = (minutes: number) => (minutes < 60 ? `${minutes}분마다` : minutes < 1440 ? `${minutes / 60}시간마다` : minutes < 10080 ? "매일" : "매주");
const when = (value: string | null) => (value ? new Date(value).toLocaleString("ko-KR") : "—");

function Board({ user }: { user: User }) {
  const [health, setHealth] = useState<OpsHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setHealth(await accountJsonFetch<OpsHealth>(user, "/api/ops/health")); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "불러오지 못했습니다."); }
  }, [user]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  if (!health) return <p className={error ? styles.error : styles.note}>{error ?? "불러오는 중…"}</p>;
  const { anchors } = health;
  return <>
    <div className={styles.toolbar}><button onClick={() => void load()} type="button">새로고침</button><span className={styles.note}>확인 {when(health.checkedAt)}</span></div>
    <section className={styles.cards}>
      <Link href="/ops/content" className={health.reviewPending ? styles.attention : undefined}><b>{health.reviewPending}</b>검토 대기</Link>
      <Link href="/ops/reports" className={health.reportsOpen ? styles.attention : undefined}><b>{health.reportsOpen}</b>처리할 신고</Link>
      <div className={anchors.failing ? styles.alert : anchors.pending ? styles.attention : undefined}><b>{anchors.pending}</b>블록체인 전송 대기{anchors.failing ? ` · 실패 ${anchors.failing}` : ""}</div>
      <Link href="/ops/content?type=sources" className={health.sourcesGone ? styles.attention : undefined}><b>{health.sourcesGone}</b>사라진 출처</Link>
    </section>
    {(anchors.pending > 0 || anchors.lastError) && <p className={styles.note}>
      가장 오래 기다린 전송: {when(anchors.oldestPendingAt)}. 매시 17분에 최대 20개 기록씩 보냅니다.{anchors.lastError && <><br /><span className={styles.error}>마지막 전송 오류: {anchors.lastError}</span></>}
    </p>}
    <table className={styles.jobs}>
      <thead><tr><th>예약 작업</th><th>주기</th><th>상태</th><th>마지막 성공</th><th>마지막 실패</th></tr></thead>
      <tbody>{health.jobs.map((job) => <tr key={job.job}>
        <td>{job.label}<small>{job.job}</small></td>
        <td>{every(job.everyMinutes)}</td>
        <td><span className={styles[`job_${job.state}`]}>{STATE[job.state]}</span>{job.lastError && <small className={styles.error}>{job.lastError}</small>}</td>
        <td>{when(job.lastSucceededAt)}</td>
        <td>{when(job.lastFailedAt)}</td>
      </tr>)}</tbody>
    </table>
    <p className={styles.note}>예약 작업이 실패하거나 서버 오류가 나면 운영자 메일로 알림이 갑니다. &lsquo;기록 없음&rsquo;은 이 화면이 생긴 뒤 아직 한 번도 돌지 않은 작업입니다.</p>
  </>;
}

export function StatusBoard() {
  return <main className={styles.page}>
    <h1>운영 상태</h1>
    <OpsGate>{(user) => <Board user={user} />}</OpsGate>
  </main>;
}
