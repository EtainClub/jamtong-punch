"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { firebaseFormFetch, firebaseJsonFetch } from "@/lib/firebase/api";
import { useFirebaseAuth } from "@/lib/firebase/auth";
import { contentTypes, emptyDraft, itemLabel, type ContentType, type Draft } from "./content-form";
import { ContentForm, Field, type Refs } from "./ContentForms";
import styles from "./ops-content.module.css";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const emptyRefs = (): Refs => Object.fromEntries(contentTypes.map(([key]) => [key, []])) as unknown as Refs;

function clipboardImage(data: DataTransfer) {
  const fromFiles = Array.from(data.files).find((file) => file.type.startsWith("image/"));
  if (fromFiles) return fromFiles;
  return Array.from(data.items).find((item) => item.kind === "file" && item.type.startsWith("image/"))?.getAsFile() ?? null;
}

function failure(prefix: string, cause: unknown) {
  return cause instanceof Error ? `${prefix}: ${cause.message}` : `${prefix}.`;
}

export function OpsContentManager() {
  const { user, ready, error: authError } = useFirebaseAuth();
  const [type, setType] = useState<ContentType>("people");
  const [refs, setRefs] = useState<Refs>(emptyRefs);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft("people"));
  const [selectedId, setSelectedId] = useState("");
  // Remounts the form whenever a different item is opened so local input
  // state (half-typed timecodes, evaluator mode) never leaks between items.
  const [formKey, setFormKey] = useState(0);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const deepLinkHandled = useRef(false);

  const names = useMemo(() => new Map(refs.people.map((item) => [item.id, String(item.name ?? item.id)])), [refs.people]);
  const typeName = contentTypes.find(([key]) => key === type)?.[1] ?? type;

  // Every form references other types (people, sources, topics, events), so
  // all lists are loaded together. Content volume is small and this is ops-only.
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const lists = await Promise.all(contentTypes.map(([key]) => firebaseJsonFetch<{ items: Draft[] }>(user, `/api/ops/content?type=${key}`)));
      setRefs(Object.fromEntries(contentTypes.map(([key], index) => [key, lists[index].items])) as unknown as Refs);
      // A link from a public page (?type=people&id=…) opens that item once.
      if (!deepLinkHandled.current) {
        deepLinkHandled.current = true;
        const params = new URLSearchParams(window.location.search);
        const index = contentTypes.findIndex(([key]) => key === params.get("type"));
        if (index >= 0) {
          const linkedType = contentTypes[index][0];
          const linked = lists[index].items.find((item) => item.id === params.get("id"));
          setType(linkedType); setSelectedId(linked?.id ?? ""); setDraft(linked ?? emptyDraft(linkedType)); setFormKey((key) => key + 1);
          if (params.get("id") && !linked) setNotice({ ok: false, text: `'${params.get("id")}' 항목을 찾지 못했습니다.` });
        }
      }
    } catch (cause) { setNotice({ ok: false, text: failure("목록을 불러오지 못했습니다", cause) }); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const update = useCallback((patch: Record<string, unknown>) => setDraft((current) => ({ ...current, ...patch })), []);
  function open(nextType: ContentType, item: Draft | null) {
    setType(nextType); setSelectedId(item?.id ?? ""); setDraft(item ?? emptyDraft(nextType)); setFormKey((key) => key + 1); setNotice(null);
  }

  const uploadImage = useCallback(async (file: File) => {
    if (!user) return;
    if (!imageTypes.has(file.type) || file.size > 5 * 1024 * 1024) { setNotice({ ok: false, text: "이미지는 JPG·PNG·WebP 형식, 5MiB 이하만 올릴 수 있습니다." }); return; }
    setUploading(true);
    try {
      const form = new FormData(); form.set("file", file);
      const result = await firebaseFormFetch<{ url: string }>(user, "/api/ops/media", form);
      setDraft((current) => ({ ...current, image: { ...(current.image as Record<string, unknown> ?? { sourceUrl: "", license: "public", rightsStatus: "pending", credit: null }), path: result.url } }));
      setNotice({ ok: true, text: "이미지를 올렸습니다. 원본 출처와 권리 상태를 이어서 입력하세요." });
    } catch (cause) { setNotice({ ok: false, text: failure("이미지를 올리지 못했습니다", cause) }); }
    finally { setUploading(false); }
  }, [user]);
  useEffect(() => {
    if (type !== "people") return;
    function handlePaste(event: ClipboardEvent) {
      const file = event.clipboardData ? clipboardImage(event.clipboardData) : null;
      if (!file) return;
      event.preventDefault();
      void uploadImage(file);
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [type, uploadImage]);

  async function save() {
    if (!user) return;
    setLoading(true);
    try {
      const { item } = await firebaseJsonFetch<{ item: Draft }>(user, `/api/ops/content/${type}/${draft.id}`, { method: "PUT", body: JSON.stringify({ data: draft }) });
      setSelectedId(item.id); setDraft(item);
      setNotice({ ok: true, text: item.status === "published" ? "저장했습니다. 공개 화면과 관계도에 반영됩니다." : "저장했습니다." });
      await load();
    } catch (cause) { setNotice({ ok: false, text: failure("저장하지 못했습니다", cause) }); }
    finally { setLoading(false); }
  }
  async function remove() {
    if (!user || !selectedId || !confirm(`'${selectedId}' 콘텐츠를 삭제할까요?`)) return;
    setLoading(true);
    try { await firebaseJsonFetch<void>(user, `/api/ops/content/${type}/${selectedId}`, { method: "DELETE" }); open(type, null); setNotice({ ok: true, text: "삭제했습니다." }); await load(); }
    catch (cause) { setNotice({ ok: false, text: failure("삭제하지 못했습니다", cause) }); }
    finally { setLoading(false); }
  }
  async function refreshOpsToken() { await user?.getIdToken(true); setNotice({ ok: true, text: "권한 토큰을 새로고침했습니다." }); await load(); }

  if (!ready) return <main className={styles.loading}>운영자 인증을 확인하고 있습니다…</main>;
  if (!user || authError) return <main className={styles.loading}>로그인할 수 없습니다. {authError?.message}</main>;
  const items = refs[type];
  return <main className={styles.page}>
    <header className={styles.header}><p>임통 · OPS</p><h1>콘텐츠 등록</h1><span><b className={styles.required}>필수</b> 항목을 채워 초안으로 저장하고, 출처·권리 검토가 끝난 뒤 공개하세요. 관계도는 사건·언급·평가에서 자동으로 만들어집니다.</span><div className={styles.identity}>현재 UID <code>{user.uid}</code><button onClick={() => void refreshOpsToken()} type="button">권한 새로고침</button></div></header>
    <div className={styles.tabs}>{contentTypes.map(([key, name]) => <button key={key} className={key === type ? styles.active : ""} onClick={() => open(key, null)} type="button">{name} <small>{refs[key].length}</small></button>)}</div>
    <section className={styles.layout}>
      <aside className={styles.sidebar}><div className={styles.sidebarHead}><strong>{typeName}</strong><button onClick={() => void load()} disabled={loading} type="button">새로고침</button></div>{items.length ? <ul>{items.map((item) => <li key={item.id}><button onClick={() => open(type, item)} className={item.id === selectedId ? styles.selected : ""} type="button"><b>{itemLabel(type, item, names)}</b><small>{item.status === "published" ? "공개" : item.status === "archived" ? "보관" : item.status === "draft" ? "초안" : String(item.publisher ?? "")}</small></button></li>)}</ul> : <p>아직 등록된 항목이 없습니다.</p>}</aside>
      <section className={styles.editor}>
        <div className={styles.editorHead}><div><strong>{selectedId ? `${typeName} 수정` : `새 ${typeName}`}</strong><p>{type === "people" ? "인물 ID는 공개 주소가 됩니다." : "문서 ID는 자동 생성됩니다."}</p></div><button className={styles.secondary} onClick={() => open(type, null)} type="button">새로 만들기</button></div>
        <div className={styles.form}>
          {type !== "people" && <Field label="문서 ID" hint="자동 생성됨"><output>{draft.id}</output></Field>}
          <ContentForm key={formKey} type={type} draft={draft} update={update} refs={refs} isNew={!selectedId} image={{ uploading, onFile: (file) => void uploadImage(file) }} />
        </div>
        {notice && <p className={notice.ok ? styles.success : styles.error}>{notice.text}</p>}
        <footer><button className={styles.delete} onClick={() => void remove()} disabled={!selectedId || loading || uploading} type="button">삭제</button><button className={styles.save} onClick={() => void save()} disabled={loading || uploading} type="button">{loading ? "처리 중…" : "검증 후 저장"}</button></footer>
      </section>
    </section>
  </main>;
}
