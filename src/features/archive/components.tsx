import Image from "next/image";
import Link from "next/link";
import type { Citation, Evaluation, Person } from "@/content/schema";
import type { Credited, SourceView, StatementView } from "@/lib/archive/read";
import { citationHref, citationLabel, evaluationFormatLabels, formatDate, formatShortDate, formatTimecode, statementKindLabels } from "@/lib/content/format";
import type { Stance } from "@/lib/domain";
import { present } from "@/lib/stats/present";
import { AccountMenu } from "./AccountMenu";
import { ShareButton } from "./ShareButton";
import { StanceButtons } from "./StanceButtons";
import { VideoEmbed } from "./VideoEmbed";
import styles from "./archive.module.css";

export type Names = Record<string, string>;
export type Sources = Record<string, SourceView>;

export function SiteHeader({ current }: { current?: "people" | "topics" }) {
  return <header className={styles.siteHeader}><nav aria-label="주요 메뉴">
    <Link className={styles.brand} href="/"><Image src="/brand/logo.png" alt="임통" width={100} height={40} priority /></Link>
    <Link href="/people" aria-current={current === "people" ? "page" : undefined}>인물</Link>
    <Link href="/topics" aria-current={current === "topics" ? "page" : undefined}>쟁점</Link>
    <AccountMenu />
  </nav></header>;
}

export function Avatar({ person, size }: { person: Pick<Person, "name" | "image">; size: number }) {
  // Only rights-cleared photos are shown; everyone else gets an initial.
  if (person.image?.rightsStatus === "cleared" && person.image.path) {
    return <Image className={styles.avatar} src={person.image.path} alt="" width={size} height={size} unoptimized />;
  }
  return <span className={styles.avatarFallback} style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">{person.name.slice(0, 1)}</span>;
}

export function currentRole(person: Person): string {
  const current = person.roles.filter((role) => role.to === null).map((role) => role.title);
  return current.length ? current.join(" · ") : person.summary;
}

export function isGone(source: SourceView): boolean {
  return source.availability?.status === "unavailable" || source.availability?.status === "restricted";
}

export function CitationLinks({ citations, sources }: { citations: Citation[]; sources: Sources }) {
  return <ul className={styles.citations}>{citations.map((citation, index) => {
    const source = sources[citation.sourceId];
    if (!source) return null;
    return <li key={index}>
      <a href={citationHref(citation, source)} target="_blank" rel="noreferrer" className={isGone(source) ? styles.deadLink : undefined}>{citationLabel(citation, source)}</a> <small>{source.publisher}</small>
      {isGone(source) && <span className={styles.gone}>{source.availability!.status === "unavailable" ? "원본 삭제됨" : "원본 비공개"} · {formatShortDate(source.availability!.checkedAt)} 확인</span>}
      {source.archiveUrl && <a className={styles.archiveLink} href={source.archiveUrl} target="_blank" rel="noreferrer">보존본</a>}
    </li>;
  })}</ul>;
}

const ORIGIN_LABELS = { manual: "사람이 받아 적음", "auto-caption": "자동 자막", asr: "음성 인식" } as const;

// The words of the cited segment as 임통 keeps them. Collapsed while the
// original is reachable, opened and labelled once it is gone.
export function Transcripts({ citations, sources }: { citations: Citation[]; sources: Sources }) {
  const kept = citations.filter((citation) => citation.transcript);
  if (!kept.length) return null;
  return <>{kept.map((citation, index) => {
    const source = sources[citation.sourceId];
    const gone = source ? isGone(source) : false;
    const segment = citation.startSec !== null ? ` ${formatTimecode(citation.startSec)}–${formatTimecode(citation.endSec)}` : "";
    return <details key={index} className={styles.transcript} open={gone}>
      <summary>구간 원문{segment}</summary>
      {gone && <p className={styles.gone}>원본을 더 볼 수 없습니다. 아래는 임통이 보관한 원문입니다.</p>}
      <p className={styles.transcriptText}>{citation.transcript}</p>
      <small>{ORIGIN_LABELS[citation.transcriptOrigin ?? "manual"]} · {citation.transcriptVerified ? "원본과 대조 확인됨" : "대조 확인 전"}</small>
    </details>;
  })}</>;
}

// Plays the cited segment inside 임통. Only a video that is still reachable
// is offered; a deleted or private one falls back to the kept transcript.
function CitedVideo({ citations, sources, title }: { citations: Citation[]; sources: Sources; title: string }) {
  const playable = citations.find((citation) => {
    const source = sources[citation.sourceId];
    return source?.video && !isGone(source);
  });
  if (!playable) return null;
  const source = sources[playable.sourceId];
  return <VideoEmbed videoId={source.video!.videoId} startSec={playable.startSec} endSec={playable.endSec} vertical={/\/shorts\//.test(source.url)} title={title} />;
}

// Not yet checked against the original that these words are this person's.
// Same "pending" colour as claims: unverified, not wrong.
function SpeakerBadge({ verified }: { verified: boolean }) {
  if (verified) return null;
  return <span className={styles.badge} title="원본에서 이 사람의 말인지 아직 확인하지 않았습니다">화자 확인 전</span>;
}

function AssertionBadge({ type }: { type: string }) {
  // "pending" colour marks claims and interpretations: not verified, not wrong.
  if (type === "FACT") return null;
  return <span className={styles.badge}>{type === "CLAIM" ? "주장" : "해석"}</span>;
}

export function StatementCard({ statement, sources, names, topics, showSpeaker = false, withYear, compareHref, stats }: {
  statement: StatementView; sources: Sources; names: Names; topics: Names; showSpeaker?: boolean; withYear?: boolean; compareHref?: (topicId: string) => string;
  /** Participation counts per statement id; when given, the card offers punch/cheer. */
  stats?: Record<string, StanceCounts>;
}) {
  const mentioned = statement.mentionedPersonIds.filter((id) => names[id]);
  return <article className={styles.card}>
    <p className={styles.meta}>
      {showSpeaker && names[statement.personId] && <><Link href={`/people/${statement.personId}`}>{names[statement.personId]}</Link>·</>}
      <time dateTime={statement.occurredAt}>{formatDate(statement.occurredAt, statement.datePrecision, { withYear: withYear ?? showSpeaker, certainty: statement.dateCertainty })}</time>
      <span>· {statementKindLabels[statement.kind]}</span>
      <AssertionBadge type={statement.assertionType} />
      {statement.quote && <SpeakerBadge verified={statement.speakerVerified} />}
    </p>
    <h3 className={styles.headline}><Link href={`/statements/${statement.id}`}>{statement.headline}</Link></h3>
    {statement.quote && <blockquote className={styles.quote}>“{statement.quote}”</blockquote>}
    <CitedVideo citations={statement.citations} sources={sources} title={statement.headline} />
    <CitationLinks citations={statement.citations} sources={sources} />
    <Transcripts citations={statement.citations} sources={sources} />
    <details className={styles.context}><summary>맥락</summary><p>{statement.context}</p></details>
    <div className={styles.links}>
      {statement.topicIds.filter((id) => topics[id]).map((id) => <Link key={id} className={styles.tag} href={compareHref ? compareHref(id) : `/topics/${id}`}>#{topics[id]}{compareHref ? " · 같은 주제 발언" : ""}</Link>)}
      {mentioned.map((id) => <Link key={id} href={`/people/${id}`}>언급: {names[id]}</Link>)}
      {statement.contributor && <span className={styles.contributor}>등록: {statement.contributor}</span>}
      <Link className={styles.verifyLink} href={`/verify/statement/${statement.id}`}>⛓ 블록체인 대조</Link>
      <ShareButton path={`/statements/${statement.id}`} title={statement.headline} />
    </div>
    {statement.corrections.length > 0 && <details className={styles.context}><summary>정정 {statement.corrections.length}건</summary>{statement.corrections.map((item, index) => <p key={index}>{formatShortDate(item.at)} {item.note}</p>)}</details>}
    {stats && <Reaction id={statement.id} counts={stats[statement.id]} />}
  </article>;
}

export type StanceCounts = Record<Stance, number>;

// Participants' punch/cheer on one statement, over the whole period. The
// figure always travels with its sample size and the sample's nature.
function Reaction({ id, counts }: { id: string; counts?: StanceCounts }) {
  const figure = present(counts ?? { punch: 0, cheer: 0, unknown: 0 });
  return <div className={styles.reaction}>
    <StanceButtons kind="statement" id={id} options={["punch", "cheer", "unknown"]} note="언행에 대한 입장은 한 사람에 1건, 가장 최근 입장만 셉니다." />
    <p className={styles.figure}>참여 {figure.n.toLocaleString("ko-KR")}명 · {figure.ratio === null ? "30명부터 비율을 표시합니다" : <b>펀치 {figure.ratio}%</b>} · 임통 참여자의 기록이며 여론조사가 아닙니다</p>
  </div>;
}

// Statements are grouped under year headings; dates inside a year omit it.
export function StatementTimeline({ statements, ...props }: { statements: StatementView[] } & Omit<Parameters<typeof StatementCard>[0], "statement">) {
  const years = new Map<string, StatementView[]>();
  for (const statement of statements) {
    const year = statement.occurredAt.slice(0, 4);
    years.set(year, [...(years.get(year) ?? []), statement]);
  }
  return <>{[...years].map(([year, items]) => <section key={year} aria-label={`${year}년`}>
    <h2 className={styles.year}>{year}</h2>
    <ol className={styles.timeline}>{items.map((statement) => <li key={statement.id}><StatementCard statement={statement} {...props} /></li>)}</ol>
  </section>)}</>;
}

export function EvaluationCard({ evaluation, sources, names, topics, responses = [], showTarget = false }: {
  evaluation: Evaluation & Credited; sources: Sources; names: Names; topics: Names; responses?: Evaluation[]; showTarget?: boolean;
}) {
  const evaluatorName = evaluation.evaluator.personId && names[evaluation.evaluator.personId]
    ? <Link href={`/people/${evaluation.evaluator.personId}`}>{evaluation.evaluator.name}</Link>
    : evaluation.evaluator.name;
  return <article className={styles.viewCard}>
    <p className={styles.evaluator}>{evaluatorName}<span>{evaluation.evaluator.descriptor}</span>{showTarget && names[evaluation.targetPersonId] && <span>→ <Link href={`/people/${evaluation.targetPersonId}?tab=views`}>{names[evaluation.targetPersonId]}</Link></span>}</p>
    <p className={styles.meta}><time dateTime={evaluation.occurredAt}>{formatShortDate(evaluation.occurredAt, evaluation.datePrecision, evaluation.dateCertainty)}</time><span>· {evaluationFormatLabels[evaluation.format]}</span><SpeakerBadge verified={evaluation.speakerVerified} /></p>
    <CitedVideo citations={[evaluation.citation]} sources={sources} title={`${evaluation.evaluator.name}의 평가 영상`} />
    <p className={styles.claim}><Link href={`/evaluations/${evaluation.id}`}>{evaluation.claim}</Link></p>
    {evaluation.quote && <blockquote className={styles.quote}>“{evaluation.quote}”</blockquote>}
    <CitationLinks citations={[evaluation.citation]} sources={sources} />
    <Transcripts citations={[evaluation.citation]} sources={sources} />
    <div className={styles.links}>
      {evaluation.topicIds.filter((id) => topics[id]).map((id) => <Link key={id} className={styles.tag} href={`/topics/${id}`}>#{topics[id]}</Link>)}
      {evaluation.eventIds.map((id) => <Link key={id} href={`/events/${id}`}>관련 사건</Link>)}
      {responses.length > 0 && <span>↳ 이 평가에 대한 반론 {responses.length}: {responses.map((item) => item.evaluator.name).join(", ")}</span>}
      {evaluation.contributor && <span className={styles.contributor}>등록: {evaluation.contributor}</span>}
      <Link className={styles.verifyLink} href={`/verify/evaluation/${evaluation.id}`}>⛓ 블록체인 대조</Link>
      <ShareButton path={`/evaluations/${evaluation.id}`} title={evaluation.claim} />
    </div>
  </article>;
}

export function MoreLink({ href }: { href: string }) {
  return <div className={styles.more}><Link href={href} scroll={false}>더 보기</Link></div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}

export function nameMap(people: Array<Pick<Person, "id" | "name">>): Names {
  return Object.fromEntries(people.map((person) => [person.id, person.name]));
}
