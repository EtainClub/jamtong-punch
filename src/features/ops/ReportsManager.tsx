"use client";

import Link from "next/link";
import type { User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { accountJsonFetch } from "@/lib/firebase/api";
import type { ReportRow } from "@/lib/report/list";
import { OpsGate } from "./OpsGate";
import styles from "./ops-pages.module.css";

const STATUS: Record<string, string> = { open: "접수", reviewing: "확인 중", resolved: "처리함", dismissed: "기각" };
const FILTERS = [["active", "처리할 것"], ["all", "전체"]] as const;

// Correction and takedown requests. Fixing the record itself happens in the
// content editor (the link opens it); here an operator tracks each request.
function Reports({ user }: { user: User }) {
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setReports((await accountJsonFetch<{ reports: ReportRow[] }>(user, "/api/ops/reports")).reports); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "불러오지 못했습니다."); }
  }, [user]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function setStatus(id: string, status: string) {
    try {
      await accountJsonFetch<void>(user, `/api/ops/reports/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setReports((current) => current?.map((report) => (report.id === id ? { ...report, status } : report)) ?? null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "바꾸지 못했습니다."); }
  }

  const shown = (reports ?? []).filter((report) => filter === "all" || report.status === "open" || report.status === "reviewing");
  const editorType = (type: string) => (type === "statement" ? "statements" : type === "evaluation" ? "evaluations" : "people");
  return <>
    <div className={styles.toolbar}>{FILTERS.map(([key, label]) => <button key={key} className={filter === key ? styles.active : undefined} onClick={() => setFilter(key)} type="button">{label}</button>)}<button onClick={() => void load()} type="button">새로고침</button></div>
    {error && <p className={styles.error}>{error}</p>}
    {reports === null ? <p className={styles.note}>불러오는 중…</p> : shown.length === 0 ? <p className={styles.note}>{filter === "active" ? "처리할 신고가 없습니다." : "신고가 없습니다."}</p> : <ul className={styles.reports}>{shown.map((report) => <li key={report.id}>
      <p className={styles.meta}><span className={styles[`status_${report.status}`]}>{STATUS[report.status] ?? report.status}</span> {report.reason} · {new Date(report.createdAt).toLocaleString("ko-KR")}</p>
      <p><Link href={report.href} target="_blank">{report.label}</Link> <small>({report.targetType})</small></p>
      <blockquote>{report.detail}</blockquote>
      {report.evidenceUrl && <p><a href={report.evidenceUrl} target="_blank" rel="noreferrer">근거 링크</a></p>}
      <div className={styles.actions}>
        <Link href={`/ops/content?type=${editorType(report.targetType)}&id=${report.targetId}`}>편집기에서 열기</Link>
        {(["reviewing", "resolved", "dismissed"] as const).filter((status) => status !== report.status).map((status) => <button key={status} onClick={() => void setStatus(report.id, status)} type="button">{STATUS[status]}</button>)}
      </div>
    </li>)}</ul>}
  </>;
}

export function ReportsManager() {
  return <main className={styles.page}>
    <h1>신고·정정 요청</h1>
    <p className={styles.lead}>기록을 고치거나 내리는 일은 편집기에서 하고, 여기서는 요청마다 처리 상태를 남깁니다. 사진 요청은 해당 인물의 사진을 빼거나 게임 대상을 끄는 것이 1차 대응입니다.</p>
    <OpsGate>{(user) => <Reports user={user} />}</OpsGate>
  </main>;
}
