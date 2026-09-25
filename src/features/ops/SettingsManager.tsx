"use client";

import type { User } from "firebase/auth";
import { useEffect, useState } from "react";
import { accountJsonFetch } from "@/lib/firebase/api";
import { OpsGate } from "./OpsGate";
import styles from "./ops-pages.module.css";

type Flags = { ratiosHidden: boolean; hiddenSubjects: string[] };

// The election-period switch (implementation-design 11장 3번): hides the
// public participation figures without a deploy. Stances keep being recorded.
function Settings({ user }: { user: User }) {
  const [flags, setFlags] = useState<Flags | null>(null);
  const [subjects, setSubjects] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void accountJsonFetch<Flags>(user, "/api/ops/flags").then((value) => {
      if (!active) return;
      setFlags(value);
      setSubjects(value.hiddenSubjects.join("\n"));
    }).catch((cause: unknown) => setMessage(cause instanceof Error ? cause.message : "불러오지 못했습니다."));
    return () => { active = false; };
  }, [user]);

  async function save(next: Partial<Flags>) {
    try {
      await accountJsonFetch<void>(user, "/api/ops/flags", { method: "PATCH", body: JSON.stringify(next) });
      setFlags((current) => (current ? { ...current, ...next } : current));
      setMessage("저장했습니다. 공개 화면에 바로 반영됩니다.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "저장하지 못했습니다."); }
  }

  if (!flags) return <p className={styles.note}>{message ?? "불러오는 중…"}</p>;
  const list = subjects.split(/\s+/).map((item) => item.trim()).filter(Boolean);
  return <div className={styles.settings}>
    <section>
      <h2>전체 비율 숨김</h2>
      <p>켜면 모든 인물·언행의 참여 수와 펀치 비율 대신 &lsquo;지금은 참여 수치를 공개하지 않습니다&rsquo;가 나옵니다. 선거일 전 공표 제한 기간에 켭니다.</p>
      <button className={flags.ratiosHidden ? styles.danger : styles.primary} onClick={() => void save({ ratiosHidden: !flags.ratiosHidden })} type="button">{flags.ratiosHidden ? "지금 숨기는 중 · 다시 공개하기" : "비율 숨기기"}</button>
    </section>
    <section>
      <h2>대상별 숨김</h2>
      <p>인물 ID나 언행 ID를 한 줄에 하나씩 적습니다(예: <code>lee-jaemyung</code>). 해당 대상의 수치만 숨깁니다.</p>
      <textarea value={subjects} onChange={(event) => setSubjects(event.target.value)} rows={5} />
      <button className={styles.primary} onClick={() => void save({ hiddenSubjects: list })} disabled={!list.every((item) => /^[a-z0-9-]+$/.test(item))} type="button">대상 {list.length}개 저장</button>
    </section>
    {message && <p className={styles.note} role="status">{message}</p>}
  </div>;
}

export function SettingsManager() {
  return <main className={styles.page}>
    <h1>운영 설정</h1>
    <OpsGate>{(user) => <Settings user={user} />}</OpsGate>
  </main>;
}
