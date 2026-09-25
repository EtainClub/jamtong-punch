"use client";

import { useState } from "react";
import { firebaseJsonFetch } from "@/lib/firebase/api";
import { useFirebaseAuth } from "@/lib/firebase/auth";
import { PERSON_REASONS, PHOTO_REASON, RECORD_REASONS } from "@/lib/report/reasons";
import styles from "./archive.module.css";

type TargetType = "person" | "statement" | "evaluation" | "photo";

// Correction and takedown requests (implementation-design 11장 6번). Anyone can
// send one; operators see them in /ops/reports. A photo request is filed
// against the photo so it can be handled apart from the person's record.
export function ReportButton({ targetType, targetId, hasPhoto = false }: { targetType: Exclude<TargetType, "photo">; targetId: string; hasPhoto?: boolean }) {
  const { user } = useFirebaseAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [state, setState] = useState<{ sending: boolean; message: string | null; done: boolean }>({ sending: false, message: null, done: false });
  const reasons = targetType === "person" ? PERSON_REASONS.filter((item) => hasPhoto || item !== PHOTO_REASON) : RECORD_REASONS;

  async function submit() {
    if (!user) { setState({ sending: false, message: "잠시 뒤 다시 시도해 주세요.", done: false }); return; }
    setState({ sending: true, message: null, done: false });
    try {
      const type: TargetType = reason === PHOTO_REASON ? "photo" : targetType;
      const result = await firebaseJsonFetch<{ duplicate: boolean }>(user, "/api/report", {
        method: "POST",
        body: JSON.stringify({ targetType: type, targetId, reason, detail, ...(evidenceUrl.trim() ? { evidenceUrl: evidenceUrl.trim() } : {}) }),
      });
      setState({ sending: false, done: true, message: result.duplicate ? "같은 사유로 이미 접수된 요청이 있습니다. 운영자가 확인하고 있습니다." : "접수했습니다. 운영자가 확인한 뒤 고치거나 내립니다." });
    } catch {
      setState({ sending: false, done: false, message: "접수하지 못했습니다. 근거 링크가 올바른 주소인지 확인하고 다시 시도해 주세요." });
    }
  }

  if (!open) return <button className={styles.reportLink} onClick={() => setOpen(true)} type="button">신고·정정 요청</button>;
  return <div className={styles.reportForm}>
    {state.done ? <p role="status">{state.message}</p> : <>
      <label>사유<select value={reason} onChange={(event) => setReason(event.target.value)}><option value="">고르세요</option>{reasons.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>내용<textarea value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={2000} placeholder="무엇이 어떻게 다른지 적어 주세요. 본인이라면 그렇게 밝혀 주시면 빨리 확인합니다." /></label>
      <label>근거 링크 <small>(선택)</small><input value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} inputMode="url" placeholder="https://" /></label>
      {state.message && <p className={styles.reportError} role="alert">{state.message}</p>}
      <div><button onClick={() => void submit()} disabled={!reason || !detail.trim() || state.sending} type="button">{state.sending ? "보내는 중…" : "보내기"}</button><button onClick={() => setOpen(false)} type="button">닫기</button></div>
    </>}
  </div>;
}
