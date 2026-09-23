import Image from "next/image";
import Link from "next/link";
import type { Citation, Evaluation, Person, Source } from "@/content/schema";
import type { StatementView } from "@/lib/archive/read";
import { citationHref, citationLabel, evaluationFormatLabels, formatDate, formatShortDate, statementKindLabels, youtubeThumbnail } from "@/lib/content/format";
import type { Stance } from "@/lib/domain";
import { present } from "@/lib/stats/present";
import { StanceButtons } from "./StanceButtons";
import styles from "./archive.module.css";

export type Names = Record<string, string>;
export type Sources = Record<string, Source>;

export function SiteHeader({ current }: { current?: "people" | "topics" }) {
  return <header className={styles.siteHeader}><nav aria-label="주요 메뉴">
    <Link className={styles.brand} href="/">임통</Link>
    <Link href="/people" aria-current={current === "people" ? "page" : undefined}>인물</Link>
    <Link href="/topics" aria-current={current === "topics" ? "page" : undefined}>쟁점</Link>
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

export function CitationLinks({ citations, sources }: { citations: Citation[]; sources: Sources }) {
  return <ul className={styles.citations}>{citations.map((citation, index) => {
    const source = sources[citation.sourceId];
    if (!source) return null;
    return <li key={index}><a href={citationHref(citation, source)} target="_blank" rel="noreferrer">{citationLabel(citation, source)}</a> <small>{source.publisher}</small></li>;
  })}</ul>;
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
      <time dateTime={statement.occurredAt}>{formatDate(statement.occurredAt, statement.datePrecision, { withYear: withYear ?? showSpeaker })}</time>
      <span>· {statementKindLabels[statement.kind]}</span>
      <AssertionBadge type={statement.assertionType} />
    </p>
    <h3 className={styles.headline}>{statement.headline}</h3>
    {statement.quote && <blockquote className={styles.quote}>“{statement.quote}”</blockquote>}
    <CitationLinks citations={statement.citations} sources={sources} />
    <details className={styles.context}><summary>맥락</summary><p>{statement.context}</p></details>
    {(statement.topicIds.length > 0 || mentioned.length > 0) && <div className={styles.links}>
      {statement.topicIds.filter((id) => topics[id]).map((id) => <Link key={id} className={styles.tag} href={compareHref ? compareHref(id) : `/topics/${id}`}>#{topics[id]}{compareHref ? " · 같은 주제 발언" : ""}</Link>)}
      {mentioned.map((id) => <Link key={id} href={`/people/${id}`}>언급: {names[id]}</Link>)}
    </div>}
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
  evaluation: Evaluation; sources: Sources; names: Names; topics: Names; responses?: Evaluation[]; showTarget?: boolean;
}) {
  const source = sources[evaluation.citation.sourceId];
  const thumbnail = source ? youtubeThumbnail(source) : null;
  const evaluatorName = evaluation.evaluator.personId && names[evaluation.evaluator.personId]
    ? <Link href={`/people/${evaluation.evaluator.personId}`}>{evaluation.evaluator.name}</Link>
    : evaluation.evaluator.name;
  return <article className={styles.viewCard}>
    <p className={styles.evaluator}>{evaluatorName}<span>{evaluation.evaluator.descriptor}</span>{showTarget && names[evaluation.targetPersonId] && <span>→ <Link href={`/people/${evaluation.targetPersonId}?tab=views`}>{names[evaluation.targetPersonId]}</Link></span>}</p>
    <p className={styles.meta}><time dateTime={evaluation.occurredAt}>{formatShortDate(evaluation.occurredAt, evaluation.datePrecision)}</time><span>· {evaluationFormatLabels[evaluation.format]}</span></p>
    {thumbnail && source && <a className={styles.thumb} href={citationHref(evaluation.citation, source)} target="_blank" rel="noreferrer">
      <Image src={thumbnail} alt="" width={120} height={68} unoptimized />{citationLabel(evaluation.citation, source)}
    </a>}
    <p className={styles.claim}>{evaluation.claim}</p>
    {evaluation.quote && <blockquote className={styles.quote}>“{evaluation.quote}”</blockquote>}
    {!thumbnail && <CitationLinks citations={[evaluation.citation]} sources={sources} />}
    <div className={styles.links}>
      {evaluation.topicIds.filter((id) => topics[id]).map((id) => <Link key={id} className={styles.tag} href={`/topics/${id}`}>#{topics[id]}</Link>)}
      {evaluation.eventIds.map((id) => <Link key={id} href={`/events/${id}`}>관련 사건</Link>)}
      {responses.length > 0 && <span>↳ 이 평가에 대한 반론 {responses.length}: {responses.map((item) => item.evaluator.name).join(", ")}</span>}
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
