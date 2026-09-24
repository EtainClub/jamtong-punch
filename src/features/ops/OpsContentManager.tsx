"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { firebaseFormFetch, firebaseJsonFetch } from "@/lib/firebase/api";
import { signInWithGoogle, useFirebaseAuth } from "@/lib/firebase/auth";
import { contentTypes, emptyDraft, itemLabel, type ContentType, type Draft } from "./content-form";
import { ContentForm, EditorRoleProvider, Field, type Refs } from "./ContentForms";
import styles from "./ops-content.module.css";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const emptyRefs = (): Refs => Object.fromEntries(contentTypes.map(([key]) => [key, []])) as unknown as Refs;
// Events and world-cup brackets stay with operators.
const CONTRIBUTOR_TYPES = new Set<ContentType>(["people", "statements", "evaluations", "topics", "sources"]);
const STATUS_LABELS: Record<string, string> = { draft: "초안", review: "검토 대기", published: "공개", archived: "보관" };

type Profile = { isOps: boolean; isContributor: boolean; nickname: string | null };
export type EditorMode = "ops" | "contributor";

function clipboardImage(data: DataTransfer) {
  const fromFiles = Array.from(data.files).find((file) => file.type.startsWith("image/"));
  if (fromFiles) return fromFiles;
  return Array.from(data.items).find((item) => item.kind === "file" && item.type.startsWith("image/"))?.getAsFile() ?? null;
}

function failure(prefix: string, cause: unknown) {
  return cause instanceof Error ? `${prefix}: ${cause.message}` : `${prefix}.`;
}

function SignInPanel({ mode }: { mode: EditorMode }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function signIn() {
    setBusy(true); setError(null);
    try { await signInWithGoogle(); }
    catch (cause) { setError(failure("로그인하지 못했습니다", cause)); }
    finally { setBusy(false); }
  }
  return <main className={styles.gate}>
    <h1>{mode === "ops" ? "운영자 로그인" : "언행·시선 등록하기"}</h1>
    <p>{mode === "ops" ? "운영자 권한이 있는 구글 계정으로 로그인하세요." : "구글 계정으로 로그인하면 인물의 언행과 다른 사람의 평가(시선)를 등록할 수 있습니다. 등록한 내용은 운영자가 확인한 뒤 공개됩니다."}</p>
    <button className={styles.save} onClick={() => void signIn()} disabled={busy} type="button">{busy ? "로그인 중…" : "구글 계정으로 로그인"}</button>
    {error && <p className={styles.error}>{error}</p>}
  </main>;
}

function NicknamePanel({ onSave }: { onSave: (nickname: string) => Promise<void> }) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setError(null);
    try { await onSave(nickname); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "닉네임을 저장하지 못했습니다."); }
    finally { setBusy(false); }
  }
  return <main className={styles.gate}>
    <h1>닉네임 정하기</h1>
    <p>공개된 기록에 &lsquo;등록: 닉네임&rsquo;으로 표시됩니다. 구글 이름이나 이메일은 공개되지 않습니다.</p>
    <Field label="닉네임" required hint="2~20자"><input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={20} /></Field>
    <button className={styles.save} onClick={() => void submit()} disabled={busy || nickname.trim().length < 2} type="button">{busy ? "저장 중…" : "시작하기"}</button>
    {error && <p className={styles.error}>{error}</p>}
  </main>;
}

export function OpsContentManager({ mode = "ops" }: { mode?: EditorMode }) {
  const { user, ready, error: authError } = useFirebaseAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
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

  // Linking to Google keeps the same User object, so the flag is tracked on its own.
  const signedIn = Boolean(user && !user.isAnonymous);
  const asOps = mode === "ops" && profile?.isOps === true;
  const canEdit = profile !== null && (asOps || (mode === "contributor" && (profile.isOps || profile.nickname !== null)));
  const visibleTypes = contentTypes.filter(([key]) => asOps || CONTRIBUTOR_TYPES.has(key));
  const names = useMemo(() => new Map(refs.people.map((item) => [item.id, String(item.name ?? item.id)])), [refs.people]);
  const typeName = contentTypes.find(([key]) => key === type)?.[1] ?? type;

  const loadProfile = useCallback(async () => {
    if (!user || !signedIn) { setProfile(null); return; }
    try { setProfile(await firebaseJsonFetch<Profile>(user, "/api/me/profile")); }
    catch (cause) { setNotice({ ok: false, text: failure("계정 정보를 불러오지 못했습니다", cause) }); }
  }, [user, signedIn]);
  useEffect(() => { const timer = window.setTimeout(() => { void loadProfile(); }, 0); return () => window.clearTimeout(timer); }, [loadProfile]);

  // Every form references other types (people, sources, topics, events), so
  // all lists are loaded together. Contributors get what is public plus their own.
  const load = useCallback(async () => {
    if (!user || !canEdit) return;
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
  }, [user, canEdit]);
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
    if (type !== "people" || !asOps) return;
    function handlePaste(event: ClipboardEvent) {
      const file = event.clipboardData ? clipboardImage(event.clipboardData) : null;
      if (!file) return;
      event.preventDefault();
      void uploadImage(file);
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [type, uploadImage, asOps]);

  async function save() {
    if (!user) return;
    setLoading(true);
    try {
      const { item } = await firebaseJsonFetch<{ item: Draft }>(user, `/api/ops/content/${type}/${draft.id}`, { method: "PUT", body: JSON.stringify({ data: draft }) });
      setSelectedId(item.id); setDraft(item);
      setNotice({ ok: true, text: item.status === "published" ? "저장했습니다. 공개 화면과 관계도에 반영되고 블록체인에 기록됩니다." : item.status === "review" ? "검토를 요청했습니다. 운영자가 확인한 뒤 공개합니다." : "저장했습니다." });
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
  async function saveNickname(nickname: string) {
    if (!user) return;
    await firebaseJsonFetch(user, "/api/me/profile", { method: "PUT", body: JSON.stringify({ nickname }) });
    await loadProfile();
  }

  if (!ready) return <main className={styles.loading}>계정을 확인하고 있습니다…</main>;
  if (!user || authError) return <main className={styles.loading}>로그인할 수 없습니다. {authError?.message}</main>;
  if (!signedIn) return <SignInPanel mode={mode} />;
  if (!profile) return <main className={styles.loading}>계정 정보를 불러오고 있습니다…{notice && <span className={styles.error}> {notice.text}</span>}</main>;
  if (mode === "ops" && !profile.isOps) {
    return <main className={styles.gate}>
      <h1>운영자 권한이 없습니다</h1>
      <p>이 계정에는 운영자 권한이 없습니다. 언행·시선 등록은 <Link href="/contribute">등록하기</Link>에서 할 수 있습니다.</p>
      <p className={styles.help}>운영자라면 이 UID를 관리자에게 알려 주세요: <code>{user.uid}</code></p>
      <button className={styles.secondary} onClick={() => void user.getIdToken(true).then(loadProfile)} type="button">권한 다시 확인</button>
    </main>;
  }
  if (mode === "contributor" && !profile.isOps && !profile.nickname) return <NicknamePanel onSave={saveNickname} />;

  // Contributors see their own drafts and requests; public items are only
  // loaded so their forms can reference them.
  const items = refs[type].filter((item) => asOps || item.status === "draft" || item.status === "review" || type === "sources");
  const reviewCount = (key: ContentType) => refs[key].filter((item) => item.status === "review").length;
  const editable = asOps || draft.status === undefined || draft.status === "draft" || draft.status === "review";
  return <EditorRoleProvider value={asOps ? "ops" : "contributor"}>
    <main className={styles.page}>
      <header className={styles.header}>
        <p>{asOps ? "임통 · OPS" : "임통 · 기여"}</p>
        <h1>{asOps ? "콘텐츠 관리" : "언행·시선 등록"}</h1>
        <span>{asOps
          ? <><b className={styles.required}>검토 대기</b> 항목을 확인해 공개하세요. 공개하면 블록체인에 지문이 기록되어 되돌릴 수 없습니다.</>
          : <>필수 항목을 채워 &lsquo;검토 요청&rsquo;으로 저장하면 운영자가 확인한 뒤 공개합니다. 공개 전까지는 언제든 고칠 수 있고, 공개된 기록에는 &lsquo;등록: {profile.nickname}&rsquo;으로 표시됩니다.</>}</span>
      </header>
      <div className={styles.tabs}>{visibleTypes.map(([key, name]) => <button key={key} className={key === type ? styles.active : ""} onClick={() => open(key, null)} type="button">{name}{asOps && reviewCount(key) > 0 && <small className={styles.reviewCount}>검토 {reviewCount(key)}</small>}</button>)}</div>
      <section className={styles.layout}>
        <aside className={styles.sidebar}><div className={styles.sidebarHead}><strong>{asOps ? typeName : `내 ${typeName}`}</strong><button onClick={() => void load()} disabled={loading} type="button">새로고침</button></div>{items.length ? <ul>{[...items].sort((left, right) => Number(right.status === "review") - Number(left.status === "review")).map((item) => <li key={item.id}><button onClick={() => open(type, item)} className={item.id === selectedId ? styles.selected : ""} type="button"><b>{itemLabel(type, item, names)}</b><small className={item.status === "review" ? styles.reviewLabel : undefined}>{STATUS_LABELS[String(item.status)] ?? String(item.publisher ?? "")}</small></button></li>)}</ul> : <p>{asOps ? "아직 등록된 항목이 없습니다." : "아직 등록한 항목이 없습니다. 오른쪽에서 새로 등록하세요."}</p>}</aside>
        <section className={styles.editor}>
          <div className={styles.editorHead}><div><strong>{selectedId ? `${typeName} 수정` : `새 ${typeName}`}</strong><p>{type === "people" ? "인물 ID는 공개 주소가 됩니다." : "문서 ID는 자동 생성됩니다."}</p></div><button className={styles.secondary} onClick={() => open(type, null)} type="button">새로 만들기</button></div>
          {!editable && <p className={styles.help}>공개된 기록은 운영자만 고칠 수 있습니다. 고칠 점이 있으면 운영자에게 알려 주세요.</p>}
          <div className={styles.form}>
            {type !== "people" && <Field label="문서 ID" hint="자동 생성됨"><output>{draft.id}</output></Field>}
            <ContentForm key={formKey} type={type} draft={draft} update={update} refs={refs} isNew={!selectedId} image={{ uploading, onFile: (file) => void uploadImage(file) }} />
          </div>
          {notice && <p className={notice.ok ? styles.success : styles.error}>{notice.text}</p>}
          <footer><button className={styles.delete} onClick={() => void remove()} disabled={!selectedId || loading || uploading || !editable} type="button">삭제</button><button className={styles.save} onClick={() => void save()} disabled={loading || uploading || !editable} type="button">{loading ? "처리 중…" : "검증 후 저장"}</button></footer>
        </section>
      </section>
    </main>
  </EditorRoleProvider>;
}
