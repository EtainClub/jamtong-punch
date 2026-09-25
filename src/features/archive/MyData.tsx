"use client";

import { useState } from "react";
import { accountJsonFetch, firebaseJsonFetch } from "@/lib/firebase/api";
import { signOutOfGoogle, useFirebaseAuth } from "@/lib/firebase/auth";
import styles from "./archive.module.css";

// The two deletion paths the privacy policy promises: this browser's stances,
// or the whole account (stances, nickname, sign-in). Public records the user
// registered stay, credited to "탈퇴한 기여자".
export function MyData() {
  const { user } = useFirebaseAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const signedIn = Boolean(user && !user.isAnonymous);

  async function remove(scope: "stances" | "account") {
    if (!user) return;
    const question = scope === "stances"
      ? "이 계정으로 남긴 펀치·응원 입장을 모두 지울까요? 되돌릴 수 없습니다."
      : "계정을 삭제할까요? 참여 기록, 닉네임, 로그인 정보가 지워지고 되돌릴 수 없습니다. 등록해 공개된 기록은 '탈퇴한 기여자'로 남습니다.";
    if (!confirm(question)) return;
    setBusy(true);
    try {
      const fetcher = user.isAnonymous ? firebaseJsonFetch : accountJsonFetch;
      const result = await fetcher<{ deleted: number }>(user, `/api/me?scope=${scope}`, { method: "DELETE" });
      if (scope === "account") await signOutOfGoogle();
      setMessage(scope === "account" ? `계정을 삭제했습니다(입장 ${result.deleted}건 포함). 새 익명 사용자로 이어집니다.` : `입장 ${result.deleted}건을 지웠습니다. 집계 수치는 다음 재집계 때 빠집니다.`);
    } catch {
      setMessage("지우지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return <div className={styles.myData}>
    <p>지금 이 브라우저는 {signedIn ? "구글 계정으로 로그인한" : "익명"} 사용자입니다.</p>
    <div>
      <button onClick={() => void remove("stances")} disabled={busy || !user} type="button">내 입장 기록 지우기</button>
      <button onClick={() => void remove("account")} disabled={busy || !user} type="button">{signedIn ? "계정 삭제" : "익명 계정 삭제"}</button>
    </div>
    {message && <p role="status">{message}</p>}
  </div>;
}
