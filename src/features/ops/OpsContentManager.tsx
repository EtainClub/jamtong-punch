"use client";

import { useEffect, useMemo, useState } from "react";
import { firebaseJsonFetch } from "@/lib/firebase/api";
import { useFirebaseAuth } from "@/lib/firebase/auth";
import styles from "./ops-content.module.css";

const types = [
  ["subjects", "인물·정책"],
  ["sources", "출처"],
  ["records", "기록"],
  ["brackets", "월드컵 브래킷"],
] as const;
type ContentType = (typeof types)[number][0];
type Item = { id: string; status?: string; name?: string; title?: string; publisher?: string } & Record<string, unknown>;

const templates: Record<ContentType, Record<string, unknown>> = {
  subjects: { id: "", kind: "person", slug: "", name: "", category: "", description: "", image: { path: "", sourceUrl: "https://", license: "cleared", rightsStatus: "cleared" }, status: "draft" },
  sources: { id: "", title: "", publisher: "", url: "https://", publishedAt: new Date().toISOString().slice(0, 10), license: "link-only", rightsStatus: "pending" },
  records: { id: "", subject: "", type: "statement", occurredAt: new Date().toISOString().slice(0, 10), title: "", summary: "", assertionType: "FACT", sourceIds: [], corrections: [], status: "draft" },
  brackets: { id: "", status: "draft", questionId: "more-problematic", items: [] },
};

function label(item: Item) {
  return String(item.name ?? item.title ?? item.publisher ?? item.id);
}

export function OpsContentManager() {
  const { user, ready, error: authError } = useFirebaseAuth();
  const [type, setType] = useState<ContentType>("subjects");
  const [items, setItems] = useState<Item[]>([]);
  const [id, setId] = useState("");
  const [text, setText] = useState(() => JSON.stringify(templates.subjects, null, 2));
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedLabel = useMemo(() => types.find(([key]) => key === type)?.[1] ?? type, [type]);
  const load = async (nextType = type) => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await firebaseJsonFetch<{ items: Item[] }>(user, `/api/ops/content?type=${nextType}`);
      setItems(result.items);
      setNotice(null);
    } catch (cause) {
      setNotice(cause instanceof Error ? `목록을 불러오지 못했습니다: ${cause.message}` : "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
    // load intentionally follows the selected type and authenticated user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, type]);

  function chooseType(nextType: ContentType) {
    setType(nextType);
    setId("");
    setText(JSON.stringify(templates[nextType], null, 2));
    setNotice(null);
  }

  function edit(item: Item) {
    setId(item.id);
    setText(JSON.stringify(item, null, 2));
    setNotice(null);
  }

  async function save() {
    if (!user) return;
    try {
      const data = JSON.parse(text) as Item;
      const targetId = id || data.id;
      if (!targetId) throw new Error("id를 입력하세요.");
      setLoading(true);
      await firebaseJsonFetch(user, `/api/ops/content/${type}/${targetId}`, { method: "PUT", body: JSON.stringify({ data }) });
      setId(targetId);
      setNotice("저장했습니다. published 상태는 공개 화면과 참여 API에 즉시 반영됩니다.");
      await load();
    } catch (cause) {
      setNotice(cause instanceof Error ? `저장하지 못했습니다: ${cause.message}` : "저장하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!user || !id || !confirm(`'${id}' 콘텐츠를 삭제할까요?`)) return;
    setLoading(true);
    try {
      await firebaseJsonFetch<void>(user, `/api/ops/content/${type}/${id}`, { method: "DELETE" });
      setId("");
      setText(JSON.stringify(templates[type], null, 2));
      setNotice("삭제했습니다.");
      await load();
    } catch (cause) {
      setNotice(cause instanceof Error ? `삭제하지 못했습니다: ${cause.message}` : "삭제하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshOpsToken() {
    await user?.getIdToken(true);
    setNotice("권한 토큰을 새로고침했습니다. 목록을 다시 불러옵니다.");
    await load();
  }

  if (!ready) return <main className={styles.loading}>운영자 인증을 확인하고 있습니다…</main>;
  if (!user || authError) return <main className={styles.loading}>로그인할 수 없습니다. {authError?.message}</main>;

  return <main className={styles.page}>
    <header className={styles.header}><p>JAMTONG PUNCH · OPS</p><h1>콘텐츠 등록</h1><span>저장은 운영자 권한으로만 가능하며, 공개 전에는 반드시 출처와 권리를 검토하세요.</span><div className={styles.identity}>현재 UID <code>{user.uid}</code><button onClick={() => void refreshOpsToken()} type="button">권한 새로고침</button></div></header>
    <div className={styles.tabs}>{types.map(([key, name]) => <button key={key} className={key === type ? styles.active : ""} onClick={() => chooseType(key)} type="button">{name}</button>)}</div>
    <section className={styles.layout}>
      <aside className={styles.sidebar}><div className={styles.sidebarHead}><strong>{selectedLabel}</strong><button onClick={() => void load()} disabled={loading} type="button">새로고침</button></div>
        {items.length ? <ul>{items.map((item) => <li key={item.id}><button onClick={() => edit(item)} className={item.id === id ? styles.selected : ""} type="button"><b>{label(item)}</b><small>{item.id}{item.status ? ` · ${item.status}` : ""}</small></button></li>)}</ul> : <p>아직 등록된 항목이 없습니다.</p>}
      </aside>
      <section className={styles.editor}><div className={styles.editorHead}><label>문서 ID<input value={id} onChange={(event) => setId(event.target.value)} placeholder="소문자·숫자·하이픈" /></label><span>{selectedLabel} JSON</span></div>
        <textarea value={text} onChange={(event) => setText(event.target.value)} spellCheck={false} aria-label={`${selectedLabel} JSON 편집기`} />
        {notice && <p className={notice.startsWith("저장") || notice === "삭제했습니다." ? styles.success : styles.error}>{notice}</p>}
        <footer><button className={styles.delete} onClick={() => void remove()} disabled={!id || loading} type="button">삭제</button><button className={styles.save} onClick={() => void save()} disabled={loading} type="button">{loading ? "처리 중…" : "검증 후 저장"}</button></footer>
      </section>
    </section>
  </main>;
}
