"use client";

import { useRef, useState, type ReactNode } from "react";
import { emptyCitation, formatTimecode, orNull, parseTimecode, slugify, youtubeVideoId, type Citation, type ContentType, type Draft } from "./content-form";
import { detectMentions } from "@/lib/content/derive";
import { firebaseJsonFetch } from "@/lib/firebase/api";
import { useFirebaseAuth } from "@/lib/firebase/auth";
import styles from "./ops-content.module.css";

export type Refs = Record<ContentType, Draft[]>;
type Update = (patch: Record<string, unknown>) => void;
type Option = { id: string; label: string };
type Choices = readonly (readonly [string, string])[];

const str = (value: unknown) => (typeof value === "string" ? value : "");
function list<T>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }

const precisions: Choices = [["day", "일"], ["month", "월"], ["year", "연"]];
const statuses: Choices = [["draft", "초안"], ["published", "공개"], ["archived", "보관"]];
const statementKinds: Choices = [["remark", "발언"], ["interview", "인터뷰"], ["speech", "연설"], ["sns", "SNS"], ["hearing", "국회·청문"], ["action", "행동"], ["decision", "결정"], ["policy", "정책"]];
const quoteKinds = new Set(["remark", "interview", "speech", "sns", "hearing"]);
const evaluationFormats: Choices = [["video", "영상"], ["broadcast", "방송"], ["interview", "인터뷰"], ["column", "칼럼"], ["sns", "SNS"], ["book", "책"]];
const segmentFormats = new Set(["video", "broadcast"]);
const participantRoles: Choices = [["principal", "당사자"], ["participant", "참여"], ["commenter", "발언만"]];
const sourceKinds: Choices = [["article", "기사"], ["video", "영상"], ["broadcast", "방송"], ["sns", "SNS"], ["document", "문서"], ["transcript", "속기록"]];

export function Field({ label, required = false, optional = false, hint, wide = false, children }: { label: string; required?: boolean; optional?: boolean; hint?: string; wide?: boolean; children: ReactNode }) {
  return <label className={`${styles.field} ${wide ? styles.wide : ""}`}><span>{label} {required && <b className={styles.required}>필수</b>}{optional && <em className={styles.optional}>선택</em>}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function Select({ value, onChange, choices, placeholder }: { value: string; onChange: (value: string) => void; choices: Choices; placeholder?: string }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)}>{placeholder !== undefined && <option value="">{placeholder}</option>}{choices.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select>;
}

function toChoices(options: Option[]): Choices { return options.map((option) => [option.id, option.label] as const); }

function CheckList({ legend, options, selected, onChange, required = false, help }: { legend: string; options: Option[]; selected: string[]; onChange: (ids: string[]) => void; required?: boolean; help?: string }) {
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  return <fieldset className={styles.wide}><legend>{legend} {required ? <b className={styles.required}>필수</b> : <em className={styles.optional}>선택</em>}</legend>{help && <p className={styles.help}>{help}</p>}{options.length ? <div className={styles.checkList}>{options.map((option) => <label key={option.id}><input type="checkbox" checked={selected.includes(option.id)} onChange={() => toggle(option.id)} />{option.label}</label>)}</div> : <p className={styles.help}>등록된 항목이 없습니다.</p>}</fieldset>;
}

// Text is kept locally while typing and committed on blur, so a half-typed
// timecode or a trailing comma is not normalized away under the cursor.
function CommitInput({ value, parse, format, onCommit, placeholder, invalidHint }: { value: unknown; parse: (text: string) => unknown; format: (value: unknown) => string; onCommit: (value: unknown) => void; placeholder?: string; invalidHint?: string }) {
  const [text, setText] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  function commit() {
    if (text === null) return;
    const parsed = parse(text);
    if (typeof parsed === "number" && Number.isNaN(parsed)) { setInvalid(true); return; }
    setInvalid(false); setText(null); onCommit(parsed);
  }
  return <><input value={text ?? format(value)} onChange={(event) => setText(event.target.value)} onBlur={commit} placeholder={placeholder} aria-invalid={invalid} />{invalid && <small className={styles.error}>{invalidHint}</small>}</>;
}

function TimecodeInput({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  return <CommitInput value={value} parse={parseTimecode} format={(current) => formatTimecode(current as number | null)} onCommit={(next) => onChange(next as number | null)} placeholder="17:32 또는 유튜브 링크" invalidHint="읽을 수 없는 시간입니다. 예: 17:32, 1:02:03" />;
}

function ListInput({ value, onChange, placeholder }: { value: string[]; onChange: (value: string[]) => void; placeholder?: string }) {
  return <CommitInput value={value} parse={(text) => text.split(",").map((item) => item.trim()).filter(Boolean)} format={(current) => (current as string[]).join(", ")} onCommit={(next) => onChange(next as string[])} placeholder={placeholder} />;
}

function CitationEditor({ value, sources, onChange, onRemove, segmentRequired = false }: { value: Citation; sources: Draft[]; onChange: (value: Citation) => void; onRemove?: () => void; segmentRequired?: boolean }) {
  const source = sources.find((item) => item.id === value.sourceId);
  const isVideo = source?.kind === "video" || source?.kind === "broadcast";
  const videoId = (source?.video as { videoId?: string } | null | undefined)?.videoId;
  const set = (patch: Partial<Citation>) => onChange({ ...value, ...patch });
  return <div className={styles.row}>
    <Field label="출처" required><Select value={value.sourceId} onChange={(sourceId) => set({ sourceId, startSec: null, endSec: null })} choices={sources.map((item) => [item.id, `${str(item.title)} · ${str(item.publisher)}`] as const)} placeholder="출처를 고르세요" /></Field>
    {isVideo ? <>
      <Field label="구간 시작" required={segmentRequired} optional={!segmentRequired}><TimecodeInput value={value.startSec} onChange={(startSec) => set({ startSec })} /></Field>
      <Field label="구간 끝" required={segmentRequired} optional={!segmentRequired}><TimecodeInput value={value.endSec} onChange={(endSec) => set({ endSec })} /></Field>
    </> : <Field label="위치" optional hint="문단, 쪽수 등"><input value={value.locator ?? ""} onChange={(event) => set({ locator: orNull(event.target.value) })} /></Field>}
    {videoId && value.startSec !== null && <a className={styles.help} href={`https://www.youtube.com/watch?v=${videoId}&t=${value.startSec}`} target="_blank" rel="noreferrer">구간 열어 확인 ↗</a>}
    {onRemove && <button className={styles.secondary} onClick={onRemove} type="button">출처 빼기</button>}
    <Field label="구간 원문(전사)" optional wide hint="인용한 구간에서 한 말을 그대로 받아 적습니다. 영상이 사라져도 임통에 남습니다. 구간 밖의 내용은 넣지 않습니다"><textarea value={value.transcript ?? ""} onChange={(event) => { const transcript = orNull(event.target.value); set({ transcript, transcriptOrigin: transcript ? value.transcriptOrigin ?? "manual" : null, transcriptVerified: transcript ? value.transcriptVerified : false }); }} /></Field>
    {value.transcript && <>
      <Field label="전사 방식" required><Select value={value.transcriptOrigin ?? "manual"} onChange={(origin) => set({ transcriptOrigin: origin as Citation["transcriptOrigin"] })} choices={[["manual", "사람이 받아 적음"], ["auto-caption", "유튜브 자동 자막"], ["asr", "음성 인식"]]} /></Field>
      <label className={styles.checkbox}><input type="checkbox" checked={value.transcriptVerified} onChange={(event) => set({ transcriptVerified: event.target.checked })} />원본과 대조해 확인함</label>
    </>}
  </div>;
}

function CitationList({ value, sources, onChange }: { value: Citation[]; sources: Draft[]; onChange: (value: Citation[]) => void }) {
  return <fieldset className={styles.wide}><legend>근거 <b className={styles.required}>필수</b></legend>
    <p className={styles.help}>영상은 전체가 아니라 해당 구간을 적습니다. 출처가 없으면 &lsquo;출처&rsquo; 탭에서 먼저 등록하세요.</p>
    <div className={styles.rows}>{value.map((citation, index) => <CitationEditor key={index} value={citation} sources={sources} onChange={(next) => onChange(value.map((item, at) => (at === index ? next : item)))} onRemove={value.length > 1 ? () => onChange(value.filter((_, at) => at !== index)) : undefined} />)}</div>
    <button className={styles.secondary} onClick={() => onChange([...value, emptyCitation()])} type="button">근거 추가</button>
  </fieldset>;
}

function DateFields({ draft, update, label = "발생일" }: { draft: Draft; update: Update; label?: string }) {
  return <>
    <Field label={label} required><input type="date" value={str(draft.occurredAt)} onChange={(event) => update({ occurredAt: event.target.value })} /></Field>
    <Field label="날짜 정밀도" required hint="연도만 아는 기록을 1월 1일로 적지 않습니다"><Select value={str(draft.datePrecision)} onChange={(datePrecision) => update({ datePrecision })} choices={precisions} /></Field>
  </>;
}

function Corrections({ draft, update }: { draft: Draft; update: Update }) {
  const value = list<{ at: string; note: string }>(draft.corrections);
  return <Field label="정정 이력" optional wide hint="한 줄에 YYYY-MM-DD | 내용">
    <CommitInput value={value} format={(current) => (current as typeof value).map((item) => `${item.at} | ${item.note}`).join("\n")} parse={(text) => text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => { const [at, ...note] = line.split("|"); return { at: at.trim(), note: note.join("|").trim() }; })} onCommit={(corrections) => update({ corrections })} />
  </Field>;
}

function Status({ draft, update }: { draft: Draft; update: Update }) {
  return <Field label="공개 상태" required hint="공개하려면 참조하는 인물·사건·쟁점도 공개 상태여야 합니다"><Select value={str(draft.status)} onChange={(status) => update({ status })} choices={statuses} /></Field>;
}

function withStatus(items: Draft[], label: (item: Draft) => string): Option[] {
  return items.map((item) => ({ id: item.id, label: `${label(item)}${item.status === "published" ? "" : item.status === "archived" ? " (보관)" : " (초안)"}` }));
}

// ---------------------------------------------------------------- forms

export type FormProps = {
  type: ContentType;
  draft: Draft;
  update: Update;
  refs: Refs;
  isNew: boolean;
  image: { uploading: boolean; onFile: (file: File) => void };
};

export function ContentForm(props: FormProps) {
  switch (props.type) {
    case "people": return <PersonForm {...props} />;
    case "statements": return <StatementForm {...props} />;
    case "evaluations": return <EvaluationForm {...props} />;
    case "events": return <EventForm {...props} />;
    case "topics": return <TopicForm {...props} />;
    case "sources": return <SourceForm {...props} />;
    case "brackets": return <BracketForm {...props} />;
  }
}

function people(refs: Refs) { return withStatus(refs.people, (item) => str(item.name)); }
function topics(refs: Refs) { return withStatus(refs.topics, (item) => str(item.name)); }

type Role = { title: string; org: string | null; from: string | null; to: string | null; citation: Citation };
type Image = { path: string; sourceUrl: string; license: string; rightsStatus: string; credit: string | null };

function PersonForm({ draft, update, refs, isNew, image: upload }: FormProps) {
  const roles = list<Role>(draft.roles);
  const image = draft.image as Image | null;
  const fileRef = useRef<HTMLInputElement>(null);
  const setRole = (index: number, patch: Partial<Role>) => update({ roles: roles.map((role, at) => (at === index ? { ...role, ...patch } : role)) });
  const setImage = (patch: Partial<Image>) => update({ image: { ...image!, ...patch } });
  return <>
    {isNew
      ? <Field label="문서 ID" required hint="인물 주소에 쓰입니다. 영문 소문자·숫자·하이픈 (예: lee-jaemyung)"><input value={draft.id} onChange={(event) => update({ id: slugify(event.target.value) || event.target.value })} /></Field>
      : <Field label="문서 ID" hint="공개 주소가 바뀌지 않도록 수정할 수 없습니다"><output>{draft.id}</output></Field>}
    <Field label="이름" required><input value={str(draft.name)} onChange={(event) => update({ name: event.target.value })} /></Field>
    <Field label="별칭" optional hint="검색용 공식 표기만 (한자·영문). 쉼표로 구분"><ListInput value={list<string>(draft.aliases)} onChange={(aliases) => update({ aliases })} placeholder="李在明, Lee Jae-myung" /></Field>
    <Field label="한 줄 소개" required hint="직함·활동 분야만 적습니다. 성향·진영 표현은 저장되지 않습니다"><input value={str(draft.summary)} onChange={(event) => update({ summary: event.target.value })} placeholder="작가 · 전 보건복지부 장관" /></Field>
    <fieldset className={styles.wide}><legend>직함 이력 <em className={styles.optional}>선택</em></legend>
      <div className={styles.rows}>{roles.map((role, index) => <div key={index} className={styles.rowBlock}>
        <div className={styles.row}>
          <Field label="직함" required><input value={role.title} onChange={(event) => setRole(index, { title: event.target.value })} /></Field>
          <Field label="소속" optional><input value={role.org ?? ""} onChange={(event) => setRole(index, { org: orNull(event.target.value) })} /></Field>
          <Field label="시작" optional><input type="date" value={role.from ?? ""} onChange={(event) => setRole(index, { from: orNull(event.target.value) })} /></Field>
          <Field label="종료" optional hint="현재 직함이면 비워 둡니다"><input type="date" value={role.to ?? ""} onChange={(event) => setRole(index, { to: orNull(event.target.value) })} /></Field>
        </div>
        <CitationEditor value={role.citation} sources={refs.sources} onChange={(citation) => setRole(index, { citation })} />
        <button className={styles.secondary} onClick={() => update({ roles: roles.filter((_, at) => at !== index) })} type="button">직함 빼기</button>
      </div>)}</div>
      <button className={styles.secondary} onClick={() => update({ roles: [...roles, { title: "", org: null, from: null, to: null, citation: emptyCitation() }] })} type="button">직함 추가</button>
    </fieldset>
    <fieldset className={styles.wide}><legend>사진과 권리 <em className={styles.optional}>선택</em></legend>
      {image ? <>
        <div className={styles.imageArea}><input className={styles.visuallyHidden} ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.onFile(file); event.target.value = ""; }} /><div className={styles.preview} style={image.path ? { backgroundImage: `url(${image.path})` } : undefined}>{image.path ? "" : "이미지 미리보기"}</div><div><strong>사진을 선택하거나 화면에서 붙여넣으세요</strong><p>JPG · PNG · WebP, 최대 5MiB</p><button className={styles.secondary} onClick={() => fileRef.current?.click()} disabled={upload.uploading} type="button">{upload.uploading ? "업로드 중…" : "파일 선택"}</button> <button className={styles.secondary} onClick={() => update({ image: null, playable: false })} type="button">사진 없음</button></div></div>
        <div className={styles.fieldGrid}>
          <Field label="원본 출처 URL" required><input type="url" value={image.sourceUrl} onChange={(event) => setImage({ sourceUrl: event.target.value })} placeholder="https://" /></Field>
          <Field label="라이선스" required><Select value={image.license} onChange={(license) => setImage({ license })} choices={[["public", "공개"], ["cleared", "권리 확인"], ["link-only", "링크만"]]} /></Field>
          <Field label="권리 상태" required hint="공개 인물의 사진은 '확인됨'이어야 합니다"><Select value={image.rightsStatus} onChange={(rightsStatus) => setImage({ rightsStatus })} choices={[["pending", "확인 대기"], ["cleared", "확인됨"], ["replace-requested", "교체 요청"]]} /></Field>
          <Field label="저작자 표시" optional hint="CC BY·공공누리 사진은 필수. 예: 대한민국 대통령실 · CC BY 3.0"><input value={image.credit ?? ""} onChange={(event) => setImage({ credit: orNull(event.target.value) })} /></Field>
        </div>
      </> : <><p className={styles.help}>사진이 없어도 아카이브에는 공개할 수 있습니다. 게임 대상이 되려면 권리가 확인된 사진이 필요합니다.</p><button className={styles.secondary} onClick={() => update({ image: { path: "", sourceUrl: "", license: "public", rightsStatus: "pending", credit: null } })} type="button">사진 추가</button></>}
    </fieldset>
    <label className={`${styles.checkbox} ${styles.wide}`}><input type="checkbox" checked={draft.playable === true} disabled={image?.rightsStatus !== "cleared"} onChange={(event) => update({ playable: event.target.checked })} />게임 대상으로 쓰기 <small>권리가 확인된 사진이 있어야 켤 수 있습니다</small></label>
    <Status draft={draft} update={update} />
    <Corrections draft={draft} update={update} />
  </>;
}

function StatementForm({ draft, update, refs }: FormProps) {
  const kind = str(draft.kind);
  const speaker = str(draft.personId);
  return <>
    <Field label="화자" required><Select value={speaker} onChange={(personId) => update({ personId })} choices={toChoices(people(refs))} placeholder="인물을 고르세요" /></Field>
    <Field label="종류" required><Select value={kind} onChange={(next) => update({ kind: next })} choices={statementKinds} /></Field>
    <DateFields draft={draft} update={update} />
    <Field label="요약" required wide hint="앱의 목소리로 쓰는 한 줄. 사실만 적습니다"><input value={str(draft.headline)} onChange={(event) => update({ headline: event.target.value })} /></Field>
    <Field label="원문" required={quoteKinds.has(kind)} optional={!quoteKinds.has(kind)} wide hint="실제 발언 그대로. 행동·결정·정책은 비워 둘 수 있습니다"><textarea value={str(draft.quote)} onChange={(event) => update({ quote: orNull(event.target.value) })} /></Field>
    <Field label="맥락" required wide hint="어떤 질문·상황에 대한 것이었나"><textarea value={str(draft.context)} onChange={(event) => update({ context: event.target.value })} /></Field>
    <CitationList value={list<Citation>(draft.citations)} sources={refs.sources} onChange={(citations) => update({ citations })} />
    <Field label="판정" required><Select value={str(draft.assertionType)} onChange={(assertionType) => update({ assertionType })} choices={[["FACT", "사실"], ["CLAIM", "주장"], ["INTERPRETATION", "해석"]]} /></Field>
    <Field label="관련 사건" optional><Select value={str(draft.eventId)} onChange={(eventId) => update({ eventId: orNull(eventId) })} choices={toChoices(withStatus(refs.events, (item) => `${str(item.occurredAt)} ${str(item.title)}`))} placeholder="없음" /></Field>
    <CheckList legend="쟁점" options={topics(refs)} selected={list<string>(draft.topicIds)} onChange={(topicIds) => update({ topicIds })} />
    <DetectedMentions draft={draft} update={update} refs={refs} />
    <Status draft={draft} update={update} />
    <Corrections draft={draft} update={update} />
  </>;
}

// Mentions come from the quote alone. The operator sees what was detected and
// may drop a false match ("조국" meaning homeland), but cannot add a person
// who was not named: the relationship map records speech, not editorial links.
function DetectedMentions({ draft, update, refs }: Pick<FormProps, "draft" | "update" | "refs">) {
  const names = refs.people.map((item) => ({ id: item.id, name: str(item.name), aliases: list<string>(item.aliases) }));
  const detected = detectMentions(typeof draft.quote === "string" ? draft.quote : null, str(draft.personId), names);
  const excluded = list<string>(draft.mentionExclusions);
  const toggle = (id: string) => update({ mentionExclusions: excluded.includes(id) ? excluded.filter((item) => item !== id) : [...excluded, id] });
  return <fieldset className={styles.wide}><legend>언급된 인물 <em className={styles.optional}>자동</em></legend>
    <p className={styles.help}>원문에서 등록 인물의 이름·별칭을 찾아 관계도에 잇습니다. 직접 추가할 수는 없고, 동명이인이나 다른 뜻으로 잡힌 이름만 뺄 수 있습니다.</p>
    {detected.length ? <div className={styles.checkList}>{detected.map((id) => <label key={id}><input type="checkbox" checked={!excluded.includes(id)} onChange={() => toggle(id)} />{names.find((item) => item.id === id)?.name ?? id}{excluded.includes(id) && <small>제외됨 — 다른 뜻으로 쓰인 이름</small>}</label>)}</div> : <p className={styles.help}>원문에서 찾은 인물이 없습니다.</p>}
  </fieldset>;
}

function EvaluationForm({ draft, update, refs }: FormProps) {
  const target = str(draft.targetPersonId);
  const evaluator = (draft.evaluator ?? { personId: null, name: "", descriptor: "" }) as { personId: string | null; name: string; descriptor: string };
  const [external, setExternal] = useState(evaluator.personId === null && evaluator.name !== "");
  const setEvaluator = (patch: Partial<typeof evaluator>) => update({ evaluator: { ...evaluator, ...patch } });
  const format = str(draft.format);
  return <>
    <Field label="평가 대상" required><Select value={target} onChange={(targetPersonId) => update({ targetPersonId, respondsTo: null })} choices={toChoices(people(refs))} placeholder="인물을 고르세요" /></Field>
    <Field label="형식" required><Select value={format} onChange={(next) => update({ format: next })} choices={evaluationFormats} /></Field>
    <fieldset className={styles.wide}><legend>평가자 <b className={styles.required}>필수</b></legend>
      <div className={styles.segmented}><button className={external ? "" : styles.active} onClick={() => { setExternal(false); setEvaluator({ name: "", personId: null }); }} type="button">등록 인물</button><button className={external ? styles.active : ""} onClick={() => { setExternal(true); setEvaluator({ personId: null }); }} type="button">외부 인물</button></div>
      <div className={styles.fieldGrid}>
        {external
          ? <Field label="이름" required hint="유튜버·평론가 등. 인물 페이지는 만들지 않습니다"><input value={evaluator.name} onChange={(event) => setEvaluator({ name: event.target.value })} /></Field>
          : <Field label="인물" required><Select value={evaluator.personId ?? ""} onChange={(personId) => setEvaluator({ personId: orNull(personId), name: str(refs.people.find((item) => item.id === personId)?.name) })} choices={toChoices(people(refs).filter((option) => option.id !== target))} placeholder="인물을 고르세요" /></Field>}
        <Field label="설명" required hint="직함·매체만. 예: 유튜브 채널 운영자"><input value={evaluator.descriptor} onChange={(event) => setEvaluator({ descriptor: event.target.value })} /></Field>
      </div>
    </fieldset>
    <DateFields draft={draft} update={update} />
    <Field label="주장 요약" required wide hint="주어는 평가자입니다. 'OOO는 △△가 …라고 말했다'. 원문 범위를 넘지 않습니다"><textarea value={str(draft.claim)} onChange={(event) => update({ claim: event.target.value })} /></Field>
    <Field label="원문" optional wide><textarea value={str(draft.quote)} onChange={(event) => update({ quote: orNull(event.target.value) })} /></Field>
    <fieldset className={styles.wide}><legend>근거 <b className={styles.required}>필수</b></legend>
      {segmentFormats.has(format) && <p className={styles.help}>영상·방송 평가는 구간이 필요합니다. 영상 전체를 근거로 등록하지 않습니다.</p>}
      <CitationEditor value={draft.citation as Citation} sources={refs.sources} onChange={(citation) => update({ citation })} segmentRequired={segmentFormats.has(format)} />
    </fieldset>
    <Field label="반론 대상" optional hint="같은 인물에 대한 다른 평가에 답하는 경우"><Select value={str(draft.respondsTo)} onChange={(respondsTo) => update({ respondsTo: orNull(respondsTo) })} choices={toChoices(withStatus(refs.evaluations.filter((item) => item.targetPersonId === target && item.id !== draft.id), (item) => `${str((item.evaluator as { name?: string })?.name)} · ${str(item.occurredAt)}`))} placeholder="없음" /></Field>
    <CheckList legend="쟁점" options={topics(refs)} selected={list<string>(draft.topicIds)} onChange={(topicIds) => update({ topicIds })} />
    <CheckList legend="언급된 사건" options={withStatus(refs.events, (item) => `${str(item.occurredAt)} ${str(item.title)}`)} selected={list<string>(draft.eventIds)} onChange={(eventIds) => update({ eventIds })} />
    <Status draft={draft} update={update} />
    <Corrections draft={draft} update={update} />
  </>;
}

type Participant = { personId: string; role: string; note: string | null };

function EventForm({ draft, update, refs }: FormProps) {
  const participants = list<Participant>(draft.participants);
  const setParticipant = (index: number, patch: Partial<Participant>) => update({ participants: participants.map((item, at) => (at === index ? { ...item, ...patch } : item)) });
  return <>
    <Field label="사건명" required wide hint="중립적 명칭. 한쪽이 붙인 이름을 쓰지 않습니다"><input value={str(draft.title)} onChange={(event) => update({ title: event.target.value })} /></Field>
    <DateFields draft={draft} update={update} label="시작일" />
    <Field label="종료일" optional><input type="date" value={str(draft.endAt)} onChange={(event) => update({ endAt: orNull(event.target.value) })} /></Field>
    <Field label="요약" required wide><textarea value={str(draft.summary)} onChange={(event) => update({ summary: event.target.value })} /></Field>
    <fieldset className={styles.wide}><legend>등장 인물 <b className={styles.required}>필수</b></legend>
      <p className={styles.help}>사건 화면에 누가 등장했는지 보여 줍니다. 관계도는 사건이 아니라 인물의 언행에서만 만들어집니다.</p>
      <div className={styles.rows}>{participants.map((participant, index) => <div key={index} className={styles.row}>
        <Field label="인물" required><Select value={participant.personId} onChange={(personId) => setParticipant(index, { personId })} choices={toChoices(people(refs).filter((option) => option.id === participant.personId || !participants.some((item) => item.personId === option.id)))} placeholder="인물을 고르세요" /></Field>
        <Field label="역할" required><Select value={participant.role} onChange={(role) => setParticipant(index, { role })} choices={participantRoles} /></Field>
        <Field label="메모" optional hint="기소, 증인 출석 등 사실만"><input value={participant.note ?? ""} onChange={(event) => setParticipant(index, { note: orNull(event.target.value) })} /></Field>
        <button className={styles.secondary} onClick={() => update({ participants: participants.filter((_, at) => at !== index) })} type="button">빼기</button>
      </div>)}</div>
      <button className={styles.secondary} onClick={() => update({ participants: [...participants, { personId: "", role: "participant", note: null }] })} type="button">인물 추가</button>
    </fieldset>
    <CitationList value={list<Citation>(draft.citations)} sources={refs.sources} onChange={(citations) => update({ citations })} />
    <CheckList legend="쟁점" options={topics(refs)} selected={list<string>(draft.topicIds)} onChange={(topicIds) => update({ topicIds })} />
    <Status draft={draft} update={update} />
    <Corrections draft={draft} update={update} />
  </>;
}

function TopicForm({ draft, update, refs }: FormProps) {
  const parents = refs.topics.filter((item) => item.id !== draft.id && !item.parentId);
  return <>
    <Field label="쟁점명" required><input value={str(draft.name)} onChange={(event) => update({ name: event.target.value })} placeholder="검찰개혁" /></Field>
    <Field label="상위 쟁점" optional hint="한 단계만 둡니다"><Select value={str(draft.parentId)} onChange={(parentId) => update({ parentId: orNull(parentId) })} choices={toChoices(withStatus(parents, (item) => str(item.name)))} placeholder="없음" /></Field>
    <Field label="설명" required wide><textarea value={str(draft.description)} onChange={(event) => update({ description: event.target.value })} /></Field>
    <Status draft={draft} update={update} />
    <Corrections draft={draft} update={update} />
  </>;
}

type Video = { platform: "youtube"; videoId: string; durationSec: number | null };

function SourceForm({ draft, update, isNew }: FormProps) {
  const { user } = useFirebaseAuth();
  const [busy, setBusy] = useState<"lookup" | "archive" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const video = draft.video as Video | null;
  const kind = str(draft.kind);
  function changeUrl(url: string) {
    const videoId = youtubeVideoId(url);
    update(videoId
      ? { url, video: { platform: "youtube", videoId, durationSec: video?.durationSec ?? null }, kind: kind === "video" || kind === "broadcast" ? kind : "video" }
      : { url, video: null });
  }
  async function lookup() {
    if (!user || !video) return;
    setBusy("lookup"); setMessage(null);
    try {
      const found = await firebaseJsonFetch<{ title: string | null; channel: string | null }>(user, `/api/ops/sources/lookup?videoId=${video.videoId}`);
      update({ ...(found.title ? { title: found.title } : {}), ...(found.channel ? { publisher: found.channel } : {}) });
      setMessage("제목과 채널을 채웠습니다. 게시일과 영상 길이는 직접 확인해 넣어 주세요.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "영상 정보를 가져오지 못했습니다."); }
    finally { setBusy(null); }
  }
  async function archive() {
    if (!user) return;
    setBusy("archive"); setMessage("보존본을 만드는 중입니다. 1분 정도 걸릴 수 있습니다…");
    try {
      const { item } = await firebaseJsonFetch<{ item: Draft }>(user, `/api/ops/sources/${draft.id}/archive`, { method: "POST" });
      update({ archiveUrl: item.archiveUrl });
      setMessage("보존본을 저장했습니다.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "보존본을 만들지 못했습니다."); }
    finally { setBusy(null); }
  }
  return <>
    <Field label="URL" required wide hint="유튜브 주소를 넣으면 영상 ID가 채워지고, 제목·채널을 가져올 수 있습니다"><input type="url" value={str(draft.url)} onChange={(event) => changeUrl(event.target.value)} placeholder="https://" /></Field>
    {video && <div className={styles.wide}><button className={styles.secondary} onClick={() => void lookup()} disabled={busy !== null} type="button">{busy === "lookup" ? "가져오는 중…" : "영상 제목·채널 가져오기"}</button></div>}
    <Field label="종류" required><Select value={kind} onChange={(next) => update({ kind: next, ...(next === "video" || next === "broadcast" ? {} : { video: null }) })} choices={sourceKinds} /></Field>
    <Field label="발행일" required><input type="date" value={str(draft.publishedAt)} onChange={(event) => update({ publishedAt: event.target.value })} /></Field>
    <Field label="제목" required><input value={str(draft.title)} onChange={(event) => update({ title: event.target.value })} /></Field>
    <Field label="발행처" required hint="언론사, 채널명, 기관"><input value={str(draft.publisher)} onChange={(event) => update({ publisher: event.target.value })} /></Field>
    {video && <>
      <Field label="유튜브 영상 ID"><output>{video.videoId}</output></Field>
      <Field label="영상 길이" optional hint="적어 두면 구간이 영상 길이를 넘는지 검사합니다"><TimecodeInput value={video.durationSec} onChange={(durationSec) => update({ video: { ...video, durationSec } })} /></Field>
    </>}
    <Field label="설명란 스냅샷" optional wide hint="영상·기사의 설명을 등록 시점 그대로 옮겨 둡니다. 원본이 사라져도 무엇이었는지 남습니다"><textarea value={str(draft.description)} onChange={(event) => update({ description: orNull(event.target.value) })} /></Field>
    <Field label="확인한 날" optional hint="위 정보를 원본에서 확인한 날"><input type="date" value={str(draft.capturedAt)} onChange={(event) => update({ capturedAt: orNull(event.target.value) })} /></Field>
    <Field label="보존본 URL" optional hint="원본이 사라질 때를 대비한 아카이브 주소"><input type="url" value={str(draft.archiveUrl)} onChange={(event) => update({ archiveUrl: orNull(event.target.value) })} placeholder="https://web.archive.org/…" /></Field>
    <div className={styles.wide}>{isNew
      ? <p className={styles.help}>먼저 저장하면 인터넷 아카이브에 보존본을 만들 수 있습니다.</p>
      : <button className={styles.secondary} onClick={() => void archive()} disabled={busy !== null} type="button">{busy === "archive" ? "보존본 만드는 중…" : "인터넷 아카이브에 보존본 만들기"}</button>}
      {message && <p className={styles.help} aria-live="polite">{message}</p>}</div>
    <Field label="라이선스" required><Select value={str(draft.license)} onChange={(license) => update({ license })} choices={[["public", "공개"], ["quotable", "인용 가능"], ["link-only", "링크만"]]} /></Field>
    <Field label="권리 상태" required><Select value={str(draft.rightsStatus)} onChange={(rightsStatus) => update({ rightsStatus })} choices={[["pending", "확인 대기"], ["cleared", "확인됨"], ["flagged", "문제 있음"]]} /></Field>
  </>;
}

function BracketForm({ draft, update, refs }: FormProps) {
  const selected = list<string>(draft.statementIds);
  const names = new Map(refs.people.map((item) => [item.id, str(item.name)]));
  return <>
    <Field label="질문" required><Select value={str(draft.questionId)} onChange={(questionId) => update({ questionId })} choices={[["more-problematic", "더 문제적인 것은?"], ["more-urgent", "더 시급한 것은?"]]} /></Field>
    <CheckList legend="대진 언행" required help={`언행을 정확히 8개 또는 16개 고르세요. 현재 ${selected.length}개`} options={withStatus(refs.statements, (item) => `${names.get(str(item.personId)) ?? "?"} · ${str(item.headline)}`)} selected={selected} onChange={(statementIds) => update({ statementIds })} />
    <Status draft={draft} update={update} />
  </>;
}
