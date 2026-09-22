"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { firebaseFormFetch, firebaseJsonFetch } from "@/lib/firebase/api";
import { useFirebaseAuth } from "@/lib/firebase/auth";
import styles from "./ops-content.module.css";

const types = [["subjects", "인물·정책"], ["sources", "출처"], ["records", "기록"], ["brackets", "월드컵 브래킷"]] as const;
type ContentType = (typeof types)[number][0];
type Item = { id: string; status?: string; name?: string; title?: string; publisher?: string; kind?: string; slug?: string } & Record<string, unknown>;
type Draft = Record<string, unknown>;
const peopleCategories = ["대통령", "국회의원", "정당", "지방자치", "정부·행정", "기타"];
const policyCategories = ["경제", "사회", "외교·안보", "교육", "복지", "환경·에너지", "기타"];
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function today() { return new Date().toISOString().slice(0, 10); }
function generatedId(prefix: string) { return `${prefix}-${crypto.randomUUID().slice(0, 8)}`; }
function slugify(value: string, fallback: string) {
  const slug = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || fallback;
}
function emptyDraft(type: ContentType): Draft {
  const id = generatedId(type === "subjects" ? "person" : type.slice(0, -1));
  if (type === "subjects") return { id, kind: "person", slug: id, name: "", category: "기타", description: "", image: { path: "", sourceUrl: "", license: "public", rightsStatus: "pending" }, status: "draft" };
  if (type === "sources") return { id, title: "", publisher: "", url: "", publishedAt: today(), license: "link-only", rightsStatus: "pending" };
  if (type === "records") return { id, subject: "", type: "statement", occurredAt: today(), title: "", summary: "", assertionType: "FACT", sourceIds: [], corrections: [], status: "draft" };
  return { id, status: "draft", questionId: "more-problematic", items: [] };
}
function label(item: Item) { return String(item.name ?? item.title ?? item.publisher ?? item.id); }
function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function stringList(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function correctionText(value: unknown) { return Array.isArray(value) ? value.map((item) => { const correction = item as { at?: unknown; note?: unknown }; return `${stringValue(correction.at)} | ${stringValue(correction.note)}`; }).join("\n") : ""; }
function parseCorrections(value: string) { return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => { const [at, ...note] = line.split("|"); return { at: at.trim(), note: note.join("|").trim() }; }); }
function Field({ label, required = false, optional = false, hint, children }: { label: string; required?: boolean; optional?: boolean; hint?: string; children: React.ReactNode }) {
  return <label className={styles.field}><span>{label} {required && <b className={styles.required}>필수</b>}{optional && <em className={styles.optional}>선택</em>}</span>{children}{hint && <small>{hint}</small>}</label>;
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
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      if (nextType === "records") { setSubjects(firstReference?.items ?? []); setSources(secondReference?.items ?? []); }
      if (nextType === "brackets") { setSubjects(firstReference?.items ?? []); setRecords(secondReference?.items ?? []); }
      setNotice(null);
    } catch (cause) { setNotice(cause instanceof Error ? `목록을 불러오지 못했습니다: ${cause.message}` : "목록을 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }, [type, user]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const setField = (field: string, value: unknown) => setDraft((current) => ({ ...current, [field]: value }));
  const setImageField = (field: string, value: string) => setDraft((current) => ({ ...current, image: { ...(current.image as Record<string, unknown>), [field]: value } }));
  function chooseType(nextType: ContentType) { setType(nextType); setSelectedId(""); setDraft(emptyDraft(nextType)); setNotice(null); }
  function edit(item: Item) { setSelectedId(item.id); setDraft(item); setNotice(null); }
  function createNew() { setSelectedId(""); setDraft(emptyDraft(type)); setNotice(null); }
  function changeSubjectKind(kind: string) { setDraft((current) => ({ ...current, kind, category: kind === "person" ? "기타" : "경제" })); }
  function changeName(name: string) { setDraft((current) => ({ ...current, name, slug: selectedId ? current.slug : slugify(name, stringValue(current.id)) })); }

  async function uploadImage(file: File) {
    if (!user) return;
    if (!imageTypes.has(file.type) || file.size > 5 * 1024 * 1024) { setNotice("이미지는 JPG·PNG·WebP 형식, 5MiB 이하만 올릴 수 있습니다."); return; }
    setUploading(true);
    try {
      const form = new FormData(); form.set("file", file);
      const result = await firebaseFormFetch<{ url: string }>(user, "/api/ops/media", form);
      setImageField("path", result.url);
      setNotice("이미지를 올렸습니다. 원본 출처와 권리 상태를 이어서 입력하세요.");
    } catch (cause) { setNotice(cause instanceof Error ? `이미지를 올리지 못했습니다: ${cause.message}` : "이미지를 올리지 못했습니다."); }
    finally { setUploading(false); }
  }
  function pasteImage(event: React.ClipboardEvent<HTMLDivElement>) { const file = [...event.clipboardData.files].find((candidate) => candidate.type.startsWith("image/")); if (file) { event.preventDefault(); void uploadImage(file); } }
  async function save() {
    if (!user) return;
    try { setLoading(true); const id = stringValue(draft.id); await firebaseJsonFetch(user, `/api/ops/content/${type}/${id}`, { method: "PUT", body: JSON.stringify({ data: draft }) }); setSelectedId(id); setNotice("저장했습니다. published 상태는 공개 화면과 참여 API에 즉시 반영됩니다."); await load(); }
    catch (cause) { setNotice(cause instanceof Error ? `저장하지 못했습니다: ${cause.message}` : "저장하지 못했습니다."); }
    finally { setLoading(false); }
  }
  async function remove() {
    if (!user || !selectedId || !confirm(`'${selectedId}' 콘텐츠를 삭제할까요?`)) return;
    setLoading(true); try { await firebaseJsonFetch<void>(user, `/api/ops/content/${type}/${selectedId}`, { method: "DELETE" }); createNew(); setNotice("삭제했습니다."); await load(); }
    catch (cause) { setNotice(cause instanceof Error ? `삭제하지 못했습니다: ${cause.message}` : "삭제하지 못했습니다."); } finally { setLoading(false); }
  }
  async function refreshOpsToken() { await user?.getIdToken(true); setNotice("권한 토큰을 새로고침했습니다."); await load(); }

  const image = (draft.image as Record<string, unknown> | undefined) ?? {};
  const selectedSources = stringList(draft.sourceIds);
  const bracketItems = Array.isArray(draft.items) ? draft.items as Array<{ id: string; type: "record" | "policy" }> : [];
  const referenceItems = [...records.map((item) => ({ id: item.id, type: "record" as const, label: label(item) })), ...subjects.filter((item) => item.kind === "policy").map((item) => ({ id: item.id, type: "policy" as const, label: label(item) }))];
  const categories = stringValue(draft.kind) === "policy" ? policyCategories : peopleCategories;
  const toggleSource = (id: string) => setField("sourceIds", selectedSources.includes(id) ? selectedSources.filter((item) => item !== id) : [...selectedSources, id]);
  const toggleBracketItem = (item: { id: string; type: "record" | "policy" }) => { const exists = bracketItems.some((current) => current.id === item.id && current.type === item.type); setField("items", exists ? bracketItems.filter((current) => current.id !== item.id || current.type !== item.type) : [...bracketItems, item]); };

  if (!ready) return <main className={styles.loading}>운영자 인증을 확인하고 있습니다…</main>;
  if (!user || authError) return <main className={styles.loading}>로그인할 수 없습니다. {authError?.message}</main>;
  return <main className={styles.page}>
    <header className={styles.header}><p>JAMTONG PUNCH · OPS</p><h1>콘텐츠 등록</h1><span><b className={styles.required}>필수</b> 항목을 채운 뒤 초안으로 저장하고, 출처·권리 검토가 끝난 뒤 공개하세요.</span><div className={styles.identity}>현재 UID <code>{user.uid}</code><button onClick={() => void refreshOpsToken()} type="button">권한 새로고침</button></div></header>
    <div className={styles.tabs}>{types.map(([key, name]) => <button key={key} className={key === type ? styles.active : ""} onClick={() => chooseType(key)} type="button">{name}</button>)}</div>
    <section className={styles.layout}>
      <aside className={styles.sidebar}><div className={styles.sidebarHead}><strong>{selectedLabel}</strong><button onClick={() => void load()} disabled={loading} type="button">새로고침</button></div>{items.length ? <ul>{items.map((item) => <li key={item.id}><button onClick={() => edit(item)} className={item.id === selectedId ? styles.selected : ""} type="button"><b>{label(item)}</b><small>{item.status === "published" ? "공개" : item.status === "archived" ? "보관" : "초안"}</small></button></li>)}</ul> : <p>아직 등록된 항목이 없습니다.</p>}</aside>
      <section className={styles.editor}>
        <div className={styles.editorHead}><div><strong>{selectedId ? "콘텐츠 수정" : "새 콘텐츠"}</strong><p>문서 ID와 슬러그는 자동 생성됩니다.</p></div><button className={styles.secondary} onClick={createNew} type="button">새로 만들기</button></div>
        <div className={styles.form}>
          <Field label="문서 ID" hint="자동 생성됨"><output>{stringValue(draft.id)}</output></Field>
          {type === "subjects" && <>
            <Field label="종류" required><select value={stringValue(draft.kind)} onChange={(event) => changeSubjectKind(event.target.value)}><option value="person">인물</option><option value="policy">정책</option></select></Field>
            <Field label="이름" required><input value={stringValue(draft.name)} onChange={(event) => changeName(event.target.value)} placeholder="이름을 입력하세요" required /></Field>
            <Field label="분류" required><select value={stringValue(draft.category)} onChange={(event) => setField("category", event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field>
            <Field label="슬러그" hint="이름에서 자동 생성됨"><output>{stringValue(draft.slug)}</output></Field>
            <Field label="설명" required><textarea value={stringValue(draft.description)} onChange={(event) => setField("description", event.target.value)} placeholder="대상에 대한 짧은 설명" required /></Field>
            <fieldset className={styles.wide}><legend>이미지와 권리 <b className={styles.required}>필수</b></legend><div className={styles.imageArea} onPaste={pasteImage} tabIndex={0}><input className={styles.visuallyHidden} ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.target.value = ""; }} /><div className={styles.preview} style={stringValue(image.path) ? { backgroundImage: `url(${stringValue(image.path)})` } : undefined}>{stringValue(image.path) ? "" : "이미지 미리보기"}</div><div><strong>사진을 선택하거나 이곳에 붙여넣으세요</strong><p>JPG · PNG · WebP, 최대 5MiB</p><button className={styles.secondary} onClick={() => fileRef.current?.click()} disabled={uploading} type="button">{uploading ? "업로드 중…" : "파일 선택"}</button></div></div><div className={styles.fieldGrid}><Field label="원본 출처 URL" required hint="업로드한 파일의 원 출처를 기록하세요"><input type="url" value={stringValue(image.sourceUrl)} onChange={(event) => setImageField("sourceUrl", event.target.value)} placeholder="https://" required /></Field><Field label="라이선스" required><select value={stringValue(image.license)} onChange={(event) => setImageField("license", event.target.value)}><option value="public">공개</option><option value="cleared">권리 확인</option><option value="link-only">링크만</option></select></Field><Field label="권리 상태" required><select value={stringValue(image.rightsStatus)} onChange={(event) => setImageField("rightsStatus", event.target.value)}><option value="pending">확인 대기</option><option value="cleared">확인됨</option><option value="replace-requested">교체 요청</option></select></Field></div></fieldset>
          </>}
          {type === "sources" && <><Field label="제목" required><input value={stringValue(draft.title)} onChange={(event) => setField("title", event.target.value)} required /></Field><Field label="발행처" required><input value={stringValue(draft.publisher)} onChange={(event) => setField("publisher", event.target.value)} required /></Field><Field label="URL" required><input type="url" value={stringValue(draft.url)} onChange={(event) => setField("url", event.target.value)} placeholder="https://" required /></Field><Field label="발행일" required><input type="date" value={stringValue(draft.publishedAt)} onChange={(event) => setField("publishedAt", event.target.value)} required /></Field><Field label="라이선스" required><select value={stringValue(draft.license)} onChange={(event) => setField("license", event.target.value)}><option value="public">공개</option><option value="quotable">인용 가능</option><option value="link-only">링크만</option></select></Field><Field label="권리 상태" required><select value={stringValue(draft.rightsStatus)} onChange={(event) => setField("rightsStatus", event.target.value)}><option value="pending">확인 대기</option><option value="cleared">확인됨</option><option value="flagged">문제 있음</option></select></Field></>}
          {type === "records" && <><Field label="대상" required><select value={stringValue(draft.subject)} onChange={(event) => setField("subject", event.target.value)} required><option value="">선택하세요</option>{subjects.map((item) => <option key={item.id} value={item.slug}>{label(item)}</option>)}</select></Field><Field label="기록 종류" required><select value={stringValue(draft.type)} onChange={(event) => setField("type", event.target.value)}><option value="statement">발언</option><option value="action">행동</option><option value="decision">결정</option><option value="policy-event">정책 사건</option></select></Field><Field label="발생일" required><input type="date" value={stringValue(draft.occurredAt)} onChange={(event) => setField("occurredAt", event.target.value)} required /></Field><Field label="판정" required><select value={stringValue(draft.assertionType)} onChange={(event) => setField("assertionType", event.target.value)}><option value="FACT">사실</option><option value="CLAIM">주장</option><option value="INTERPRETATION">해석</option></select></Field><Field label="제목" required><input value={stringValue(draft.title)} onChange={(event) => setField("title", event.target.value)} required /></Field><Field label="요약" required><textarea value={stringValue(draft.summary)} onChange={(event) => setField("summary", event.target.value)} required /></Field><fieldset className={styles.wide}><legend>출처 <b className={styles.required}>필수</b></legend><div className={styles.checkList}>{sources.map((item) => <label key={item.id}><input type="checkbox" checked={selectedSources.includes(item.id)} onChange={() => toggleSource(item.id)} />{label(item)}</label>)}</div></fieldset><Field label="정정 이력" optional hint="한 줄에 YYYY-MM-DD | 내용"><textarea value={correctionText(draft.corrections)} onChange={(event) => setField("corrections", parseCorrections(event.target.value))} /></Field></>}
          {type === "brackets" && <><Field label="질문" required><select value={stringValue(draft.questionId)} onChange={(event) => setField("questionId", event.target.value)}><option value="more-problematic">더 문제적인 것은?</option><option value="more-urgent">더 시급한 것은?</option></select></Field><fieldset className={styles.wide}><legend>대진 항목 <b className={styles.required}>필수</b></legend><p className={styles.help}>기록 또는 정책을 정확히 8개 또는 16개 고르세요. 현재 {bracketItems.length}개</p><div className={styles.checkList}>{referenceItems.map((item) => <label key={`${item.type}:${item.id}`}><input type="checkbox" checked={bracketItems.some((current) => current.id === item.id && current.type === item.type)} onChange={() => toggleBracketItem(item)} />{item.label} <small>{item.type === "record" ? "기록" : "정책"}</small></label>)}</div></fieldset></>}
          <Field label="공개 상태" required><select value={stringValue(draft.status)} onChange={(event) => setField("status", event.target.value)}><option value="draft">초안</option><option value="published">공개</option><option value="archived">보관</option></select></Field>
        </div>
        {notice && <p className={notice.startsWith("저장") || notice.startsWith("이미지를 올렸습니다") || notice === "삭제했습니다." ? styles.success : styles.error}>{notice}</p>}
        <footer><button className={styles.delete} onClick={() => void remove()} disabled={!selectedId || loading || uploading} type="button">삭제</button><button className={styles.save} onClick={() => void save()} disabled={loading || uploading} type="button">{loading ? "처리 중…" : "검증 후 저장"}</button></footer>
      </section>
    </section>
  </main>;
}
