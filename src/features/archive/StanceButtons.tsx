"use client";

import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { Kind, Stance, StateEntry } from "@/lib/domain";
import { firebaseJsonFetch } from "@/lib/firebase/api";
import { useFirebaseAuth } from "@/lib/firebase/auth";
import { firebaseDb } from "@/lib/firebase/client";
import styles from "./archive.module.css";

type Result = { accepted: string[]; replaced: string[]; capped: string[]; date: string };

const LABELS: Record<Stance, { icon: string; text: string }> = {
  punch: { icon: "👊", text: "펀치" },
  cheer: { icon: "👏", text: "응원" },
  unknown: { icon: "·", text: "잘 모름" },
};

// One read of the user's own stance map per page, shared by every button set.
const mine = new Map<string, Promise<Record<string, StateEntry>>>();
function loadMine(uid: string) {
  let pending = mine.get(uid);
  if (!pending) {
    pending = getDoc(doc(firebaseDb, `users/${uid}/state/subjects`)).then((snapshot) => (snapshot.get("m") ?? {}) as Record<string, StateEntry>).catch(() => ({}));
    mine.set(uid, pending);
  }
  return pending;
}

// The static participation path (implementation-design 7.7). A press records
// exactly what a game would: one stance for this target, no score. Pressing
// again replaces it; it is never counted twice.
export function StanceButtons({ kind, id, options, note }: { kind: Kind; id: string; options: Stance[]; note: string }) {
  const { user } = useFirebaseAuth();
  const [startedAt] = useState(() => new Date().toISOString());
  const [current, setCurrent] = useState<StateEntry | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void loadMine(user.uid).then((map) => { if (active && map[id]) setCurrent(map[id]); });
    return () => { active = false; };
  }, [id, user]);

  async function choose(stance: Stance) {
    if (!user) { setMessage("로그인을 준비하고 있습니다. 잠시 뒤 다시 눌러 주세요."); return; }
    setSending(true);
    try {
      const result = await firebaseJsonFetch<Result>(user, "/api/participation", {
        method: "POST",
        body: JSON.stringify({ sessionId: crypto.randomUUID(), game: "static", startedAt, stances: [{ kind, slug: id, stance }] }),
      });
      if (result.capped.includes(id)) {
        setMessage("오늘 반영할 수 있는 만큼 반영했습니다.");
      } else {
        const entry = { s: stance, d: result.date };
        setCurrent(entry);
        void loadMine(user.uid).then((map) => { map[id] = entry; });
        setMessage(result.replaced.includes(id) ? "입장을 바꿨습니다. 여전히 1건으로 셉니다." : "기록했습니다. 수치에는 1분 안에 반영됩니다.");
      }
    } catch {
      setMessage("기록하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setSending(false);
    }
  }

  return <div className={styles.stance}>
    <div className={styles.stanceButtons} role="group" aria-label="내 입장">
      {options.map((stance) => <button key={stance} type="button" className={`${styles.stanceButton} ${styles[`stance_${stance}`]}`} aria-pressed={current?.s === stance} disabled={sending} onClick={() => void choose(stance)}>
        <span aria-hidden="true">{LABELS[stance].icon}</span> {LABELS[stance].text}
      </button>)}
    </div>
    <p className={styles.stanceNote} aria-live="polite">{message ?? (current ? `내 입장: ${LABELS[current.s].text} (${current.d}). ${note}` : note)}</p>
  </div>;
}
