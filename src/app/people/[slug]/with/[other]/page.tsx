import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar, CitationLinks, Empty, EvaluationCard, nameMap, SiteHeader, type Names, type Sources } from "@/features/archive/components";
import styles from "@/features/archive/archive.module.css";
import type { Evaluation, RelationshipEvidence } from "@/content/schema";
import { getEvidence, getPerson, getRelationship, getSources, listTopics, sourceIdsOf, type PersonView, type StatementView } from "@/lib/archive/read";
import { pairId } from "@/lib/content/derive";
import { formatShortDate, statementKindLabels } from "@/lib/content/format";

export const dynamic = "force-dynamic";

const TYPES = [["all", "전체"], ["mention", "언급"], ["evaluation", "평가"]] as const;
type Props = { params: Promise<{ slug: string; other: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function load(slug: string, other: string) {
  if (slug === other) return null;
  const [left, right] = await Promise.all([getPerson(slug), getPerson(other)]);
  if (!left || !right) return null;
  const relationship = await getRelationship(pairId(slug, other));
  return relationship ? { left, right, relationship } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, other } = await params;
  const pair = await load(slug, other);
  return pair ? { title: `${pair.left.name} ↔ ${pair.right.name}`, description: `${pair.left.name}와 ${pair.right.name}가 서로를 언급하거나 평가한 공개 발언 ${pair.relationship.weight}건.` } : {};
}

export default async function PairPage({ params, searchParams }: Props) {
  const [{ slug, other }, query] = await Promise.all([params, searchParams]);
  // One canonical address per pair; the order in the URL carries no meaning.
  if (slug > other) redirect(`/people/${other}/with/${slug}${typeof query.type === "string" ? `?type=${query.type}` : ""}`);
  const pair = await load(slug, other);
  if (!pair) notFound();
  const { left, right, relationship } = pair;
  const type = TYPES.some(([key]) => key === query.type) ? query.type as (typeof TYPES)[number][0] : "all";
  const evidence = [...relationship.evidence].reverse().filter((item) => type === "all" || item.type === type);
  const [resolved, topics] = await Promise.all([
    getEvidence(evidence.filter((item) => item.type === "mention").map((item) => item.id), evidence.filter((item) => item.type === "evaluation").map((item) => item.id)),
    listTopics(),
  ]);
  const sources = await getSources(sourceIdsOf([...resolved.statements, ...resolved.evaluations]));
  const names = nameMap([left, right]);
  const topicNames = nameMap(topics);
  const statements = new Map(resolved.statements.map((item) => [item.id, item]));
  const evaluations = new Map(resolved.evaluations.map((item) => [item.id, item]));
  const directed = (from: string, kind: RelationshipEvidence["type"]) => relationship.evidence.filter((item) => item.from === from && item.type === kind).length;

  return <>
    <SiteHeader current="people" />
    <main className={styles.shell}>
      <div className={styles.pairHead}><Avatar person={left} size={64} /><span className={styles.pairArrow} aria-hidden="true">↔</span><Avatar person={right} size={64} /></div>
      <h1 className={styles.pairTitle}><Link href={`/people/${left.id}?tab=relations`}>{left.name}</Link> ↔ <Link href={`/people/${right.id}?tab=relations`}>{right.name}</Link></h1>
      <p className={styles.note} style={{ textAlign: "center" }}>근거 {relationship.weight}건 · {formatShortDate(relationship.firstAt, "month")} – {formatShortDate(relationship.lastAt, "month")}</p>
      <ul className={styles.directions}>
        {[[left, right], [right, left]].map(([from, to]) => <li key={from.id}>{from.name} → {to.name}: 언급 {directed(from.id, "mention")} · 평가 {directed(from.id, "evaluation")}</li>)}
      </ul>
      <p className={styles.note}>두 사람이 서로를 언급하거나 평가한 공개 발언만 모았습니다. 임통은 두 사람의 관계를 규정하지 않습니다.{relationship.weight > relationship.evidence.length && ` 가장 최근 ${relationship.evidence.length}건을 보여 줍니다.`}</p>
      <ul className={styles.chips} aria-label="근거 종류">{TYPES.map(([key, label]) => <li key={key}><Link className={styles.chip} href={`/people/${left.id}/with/${right.id}${key === "all" ? "" : `?type=${key}`}`} aria-current={type === key}>{label} {key === "all" ? relationship.weight : key === "mention" ? relationship.counts.mentions : relationship.counts.evaluations}</Link></li>)}</ul>
      {evidence.length ? <ol className={styles.viewList}>{evidence.map((item) => {
        if (item.type === "mention") {
          const statement = statements.get(item.id);
          return statement ? <li key={item.id}><MentionCard statement={statement} names={names} sources={sources} people={[left, right]} /></li> : null;
        }
        const evaluation = evaluations.get(item.id);
        return evaluation ? <li key={item.id}><EvaluationEvidence evaluation={evaluation} names={names} sources={sources} topics={topicNames} /></li> : null;
      })}</ol> : <Empty>이 종류의 근거가 없습니다.</Empty>}
    </main>
  </>;
}

function MentionCard({ statement, names, sources, people }: { statement: StatementView; names: Names; sources: Sources; people: PersonView[] }) {
  const target = people.find((person) => person.id !== statement.personId)!;
  return <article className={styles.viewCard}>
    <p className={styles.arrow}>언급 · <Link href={`/people/${statement.personId}`}>{names[statement.personId]}</Link> → <Link href={`/people/${target.id}`}>{target.name}</Link></p>
    <p className={styles.meta}><time dateTime={statement.occurredAt}>{formatShortDate(statement.occurredAt, statement.datePrecision, statement.dateCertainty)}</time><span>· {statementKindLabels[statement.kind]}</span></p>
    <h2 className={styles.headline}>{statement.headline}</h2>
    {statement.quote && <blockquote className={styles.quote}>“{statement.quote}”</blockquote>}
    <CitationLinks citations={statement.citations} sources={sources} />
  </article>;
}

function EvaluationEvidence({ evaluation, names, sources, topics }: { evaluation: Evaluation; names: Names; sources: Sources; topics: Names }) {
  return <div className={styles.card}>
    <p className={styles.arrow}>평가 · {names[evaluation.evaluator.personId ?? ""] ?? evaluation.evaluator.name} → {names[evaluation.targetPersonId]}</p>
    <EvaluationCard evaluation={evaluation} sources={sources} names={names} topics={topics} />
  </div>;
}
