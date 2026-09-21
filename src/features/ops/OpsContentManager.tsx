"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
type Item = { id: string; status?: string; name?: string; title?: string; publisher?: string; kind?: string; slug?: string } & Record<string, unknown>;
type Draft = Record<string, unknown>;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(type: ContentType): Draft {
  switch (type) {
    case "subjects": return { id: "", kind: "person", slug: "", name: "", category: "", description: "", image: { path: "", sourceUrl: "https://", license: "cleared", rightsStatus: "cleared" }, status: "draft" };
    case "sources": return { id: "", title: "", publisher: "", url: "https://", publishedAt: today(), license: "link-only", rightsStatus: "pending" };
    case "records": return { id: "", subject: "", type: "statement", occurredAt: today(), title: "", summary: "", assertionType: "FACT", sourceIds: [], corrections: [], status: "draft" };
    case "brackets": return { id: "", status: "draft", questionId: "more-problematic", items: [] };
  }
}

function label(item: Item) {
  return String(item.name ?? item.title ?? item.publisher ?? item.id);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function correctionText(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value.map((item) => {
    const correction = item as { at?: unknown; note?: unknown };
    return `${stringValue(correction.at)} | ${stringValue(correction.note)}`;
  }).join("\n");
}

function parseCorrections(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [at, ...note] = line.split("|");
    return { at: at.trim(), note: note.join("|").trim() };
  });
}

export function OpsContentManager() {
  const { user, ready, error: authError } = useFirebaseAuth();
  const [type, setType] = useState<ContentType>("subjects");
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft("subjects"));
  const [selectedId, setSelectedId] = useState("");
  const [subjects, setSubjects] = useState<Item[]>([]);
  const [sources, setSources] = useState<Item[]>([]);
  const [records, setRecords] = useState<Item[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedLabel = useMemo(() => types.find(([key]) => key === type)?.[1] ?? type, [type]);
  const load = useCallback(async (nextType: ContentType = type) => {
    if (!user) return;
    setLoading(true);
    try {
      const requests: Array<Promise<{ items: Item[] }>> = [firebaseJsonFetch(user, `/api/ops/content?type=${nextType}`)];
      if (nextType === "records" || nextType === "brackets") requests.push(firebaseJsonFetch(user, "/api/ops/content?type=subjects"));
      if (nextType === "records") requests.push(firebaseJsonFetch(user, "/api/ops/content?type=sources"));
      if (nextType === "brackets") requests.push(firebaseJsonFetch(user, "/api/ops/content?type=records"));
      const [current, firstReference, secondReference] = await Promise.all(requests);
      setItems(current.items);
      if (nextType === "records") {
        setSubjects(firstReference?.items ?? []);
        setSources(secondReference?.items ?? []);
      }
      if (nextType === "brackets") {
        setSubjects(firstReference?.items ?? []);
        setRecords(secondReference?.items ?? []);
      }
      setNotice(null);
    } catch (cause) {
      setNotice(cause instanceof Error ? `목록을 불러오지 못했습니다: ${cause.message}` : "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [type, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const setField = (field: string, value: unknown) => setDraft((current) => ({ ...current, [field]: value }));
  const setImageField = (field: string, value: string) => setDraft((current) => ({ ...current, image: { ...(current.image as Record<string, unknown>), [field]: value } }));

  function chooseType(nextType: ContentType) {
    setType(nextType);
    setSelectedId("");
    setDraft(emptyDraft(nextType));
    setNotice(null);
  }

  function edit(item: Item) {
    setSelectedId(item.id);
    setDraft(item);
    setNotice(null);
  }

  function createNew() {
    setSelectedId("");
    setDraft(emptyDraft(type));
    setNotice(null);
  }

  async function save() {
    if (!user) return;
    const id = stringValue(draft.id);
    if (!id) {
      setNotice("문서 ID를 입력하세요.");
      return;
    }
    try {
      setLoading(true);
      await firebaseJsonFetch(user, `/api/ops/content/${type}/${id}`, { method: "PUT", body: JSON.stringify({ data: draft }) });
      setSelectedId(id);
      setNotice("저장했습니다. published 상태는 공개 화면과 참여 API에 즉시 반영됩니다.");
      await load();
    } catch (cause) {
      setNotice(cause instanceof Error ? `저장하지 못했습니다: ${cause.message}` : "저장하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!user || !selectedId || !confirm(`'${selectedId}' 콘텐츠를 삭제할까요?`)) return;
    setLoading(true);
    try {
      await firebaseJsonFetch<void>(user, `/api/ops/content/${type}/${selectedId}`, { method: "DELETE" });
      createNew();
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

  const image = (draft.image as Record<string, unknown> | undefined) ?? {};
  const selectedSources = stringList(draft.sourceIds);
  const bracketItems = Array.isArray(draft.items) ? draft.items as Array<{ id: string; type: "record" | "policy" }> : [];
  const referenceItems = [...records.map((item) => ({ id: item.id, type: "record" as const, label: label(item) })), ...subjects.filter((item) => item.kind === "policy").map((item) => ({ id: item.id, type: "policy" as const, label: label(item) }))];

  function toggleSource(id: string) {
    setField("sourceIds", selectedSources.includes(id) ? selectedSources.filter((item) => item !== id) : [...selectedSources, id]);
  }

  function toggleBracketItem(item: { id: string; type: "record" | "policy" }) {
    const exists = bracketItems.some((current) => current.id === item.id && current.type === item.type);
    setField("items", exists ? bracketItems.filter((current) => current.id !== item.id || current.type !== item.type) : [...bracketItems, item]);
  }

  if (!ready) return <main className={styles.loading}>운영자 인증을 확인하고 있습니다…</main>;
  if (!user || authError) return <main className={styles.loading}>로그인할 수 없습니다. {authError?.message}</main>;

  return <main className={styles.page}>
    <header className={styles.header}><p>JAMTONG PUNCH · OPS</p><h1>콘텐츠 등록</h1><span>저장은 운영자 권한으로만 가능하며, 공개 전에는 반드시 출처와 권리를 검토하세요.</span><div className={styles.identity}>현재 UID <code>{user.uid}</code><button onClick={() => void refreshOpsToken()} type="button">권한 새로고침</button></div></header>
    <div className={styles.tabs}>{types.map(([key, name]) => <button key={key} className={key === type ? styles.active : ""} onClick={() => chooseType(key)} type="button">{name}</button>)}</div>
    <section className={styles.layout}>
      <aside className={styles.sidebar}><div className={styles.sidebarHead}><strong>{selectedLabel}</strong><button onClick={() => void load()} disabled={loading} type="button">새로고침</button></div>
        {items.length ? <ul>{items.map((item) => <li key={item.id}><button onClick={() => edit(item)} className={item.id === selectedId ? styles.selected : ""} type="button"><b>{label(item)}</b><small>{item.id}{item.status ? ` · ${item.status}` : ""}</small></button></li>)}</ul> : <p>아직 등록된 항목이 없습니다.</p>}
      </aside>
      <section className={styles.editor}>
        <div className={styles.editorHead}><div><strong>{selectedId ? "콘텐츠 수정" : "새 콘텐츠"}</strong><p>{selectedId ? "필드를 수정하고 저장하세요." : "필수 항목을 채운 뒤 초안으로 저장하세요."}</p></div><button className={styles.secondary} onClick={createNew} type="button">새로 만들기</button></div>
        <div className={styles.form}>
          <label>문서 ID<input value={stringValue(draft.id)} disabled={Boolean(selectedId)} onChange={(event) => setField("id", event.target.value)} placeholder="소문자·숫자·하이픈" /></label>
          {type === "subjects" && <>
            <label>종류<select value={stringValue(draft.kind)} onChange={(event) => setField("kind", event.target.value)}><option value="person">인물</option><option value="policy">정책</option></select></label>
            <label>슬러그<input value={stringValue(draft.slug)} onChange={(event) => setField("slug", event.target.value)} placeholder="hong-gildong" /></label>
            <label>이름<input value={stringValue(draft.name)} onChange={(event) => setField("name", event.target.value)} /></label>
            <label>분류<input value={stringValue(draft.category)} onChange={(event) => setField("category", event.target.value)} /></label>
            <label className={styles.wide}>설명<textarea value={stringValue(draft.description)} onChange={(event) => setField("description", event.target.value)} /></label>
            <fieldset className={styles.wide}><legend>이미지와 권리</legend><div className={styles.fieldGrid}><label>이미지 경로<input value={stringValue(image.path)} onChange={(event) => setImageField("path", event.target.value)} placeholder="/images/example.jpg" /></label><label>출처 URL<input type="url" value={stringValue(image.sourceUrl)} onChange={(event) => setImageField("sourceUrl", event.target.value)} /></label><label>라이선스<select value={stringValue(image.license)} onChange={(event) => setImageField("license", event.target.value)}><option value="cleared">권리 확인</option><option value="public">공개</option><option value="link-only">링크만</option></select></label><label>권리 상태<select value={stringValue(image.rightsStatus)} onChange={(event) => setImageField("rightsStatus", event.target.value)}><option value="cleared">확인됨</option><option value="pending">확인 대기</option><option value="replace-requested">교체 요청</option></select></label></div></fieldset>
          </>}
          {type === "sources" && <>
            <label>제목<input value={stringValue(draft.title)} onChange={(event) => setField("title", event.target.value)} /></label><label>발행처<input value={stringValue(draft.publisher)} onChange={(event) => setField("publisher", event.target.value)} /></label><label className={styles.wide}>URL<input type="url" value={stringValue(draft.url)} onChange={(event) => setField("url", event.target.value)} /></label><label>발행일<input type="date" value={stringValue(draft.publishedAt)} onChange={(event) => setField("publishedAt", event.target.value)} /></label><label>라이선스<select value={stringValue(draft.license)} onChange={(event) => setField("license", event.target.value)}><option value="public">공개</option><option value="quotable">인용 가능</option><option value="link-only">링크만</option></select></label><label>권리 상태<select value={stringValue(draft.rightsStatus)} onChange={(event) => setField("rightsStatus", event.target.value)}><option value="pending">확인 대기</option><option value="cleared">확인됨</option><option value="flagged">문제 있음</option></select></label>
          </>}
          {type === "records" && <>
            <label>대상<select value={stringValue(draft.subject)} onChange={(event) => setField("subject", event.target.value)}><option value="">선택하세요</option>{subjects.map((item) => <option key={item.id} value={item.slug}>{label(item)} · {item.slug}</option>)}</select></label><label>기록 종류<select value={stringValue(draft.type)} onChange={(event) => setField("type", event.target.value)}><option value="statement">발언</option><option value="action">행동</option><option value="decision">결정</option><option value="policy-event">정책 사건</option></select></label><label>발생일<input type="date" value={stringValue(draft.occurredAt)} onChange={(event) => setField("occurredAt", event.target.value)} /></label><label>판정<select value={stringValue(draft.assertionType)} onChange={(event) => setField("assertionType", event.target.value)}><option value="FACT">사실</option><option value="CLAIM">주장</option><option value="INTERPRETATION">해석</option></select></label><label className={styles.wide}>제목<input value={stringValue(draft.title)} onChange={(event) => setField("title", event.target.value)} /></label><label className={styles.wide}>요약<textarea value={stringValue(draft.summary)} onChange={(event) => setField("summary", event.target.value)} /></label><fieldset className={styles.wide}><legend>출처 (최소 하나 선택)</legend><div className={styles.checkList}>{sources.map((item) => <label key={item.id}><input type="checkbox" checked={selectedSources.includes(item.id)} onChange={() => toggleSource(item.id)} />{label(item)} <small>{item.id}</small></label>)}</div></fieldset><label className={styles.wide}>정정 이력 <small>한 줄에 `YYYY-MM-DD | 내용`</small><textarea value={correctionText(draft.corrections)} onChange={(event) => setField("corrections", parseCorrections(event.target.value))} /></label>
          </>}
          {type === "brackets" && <>
            <label>질문<select value={stringValue(draft.questionId)} onChange={(event) => setField("questionId", event.target.value)}><option value="more-problematic">더 문제적인 것은?</option><option value="more-urgent">더 시급한 것은?</option></select></label><fieldset className={styles.wide}><legend>대진 항목 ({bracketItems.length}/8 또는 16)</legend><p className={styles.help}>기록 또는 정책을 정확히 8개 또는 16개 고르세요.</p><div className={styles.checkList}>{referenceItems.map((item) => <label key={`${item.type}:${item.id}`}><input type="checkbox" checked={bracketItems.some((current) => current.id === item.id && current.type === item.type)} onChange={() => toggleBracketItem(item)} />{item.label} <small>{item.type === "record" ? "기록" : "정책"}</small></label>)}</div></fieldset>
          </>}
          <label>공개 상태<select value={stringValue(draft.status)} onChange={(event) => setField("status", event.target.value)}><option value="draft">초안</option><option value="published">공개</option><option value="archived">보관</option></select></label>
        </div>
        {notice && <p className={notice.startsWith("저장") || notice === "삭제했습니다." ? styles.success : styles.error}>{notice}</p>}
        <footer><button className={styles.delete} onClick={() => void remove()} disabled={!selectedId || loading} type="button">삭제</button><button className={styles.save} onClick={() => void save()} disabled={loading} type="button">{loading ? "처리 중…" : "검증 후 저장"}</button></footer>
      </section>
    </section>
  </main>;
}
