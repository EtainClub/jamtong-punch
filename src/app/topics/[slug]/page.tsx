import { shareMetadata } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Empty, EvaluationCard, MoreLink, nameMap, SiteHeader, StatementCard } from "@/features/archive/components";
import styles from "@/features/archive/archive.module.css";
import { getSources, listPeople, listTopics, sourceIdsOf, topicEvaluations, topicEvents, topicStatements, type StatementView } from "@/lib/archive/read";
import { formatShortDate } from "@/lib/content/format";
import { getStatementStats } from "@/lib/stats/read";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const topic = (await listTopics()).find((item) => item.id === slug);
  return topic ? shareMetadata(`#${topic.name}`, topic.description) : {};
}

export default async function TopicPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const topics = await listTopics();
  const topic = topics.find((item) => item.id === slug);
  if (!topic) notFound();
  const more = Math.min(Math.max(Number.parseInt(typeof query.more === "string" ? query.more : "0", 10) || 0, 0), 10);
  const [people, statements, evaluations, events] = await Promise.all([listPeople(), topicStatements(slug, PAGE_SIZE * (more + 1)), topicEvaluations(slug), topicEvents(slug)]);
  const [sources, stats] = await Promise.all([getSources(sourceIdsOf([...statements.items, ...evaluations])), getStatementStats(statements.items.map((item) => item.id))]);
  const names = nameMap(people);
  const topicNames = nameMap(topics);
  const byId = new Map(people.map((person) => [person.id, person]));
  // Grouped by speaker, the speaker with the most statements first, so the
  // page reads as "who said what about this" rather than one mixed feed.
  const groups = new Map<string, StatementView[]>();
  for (const statement of statements.items) groups.set(statement.personId, [...(groups.get(statement.personId) ?? []), statement]);
  const speakers = [...groups].filter(([id]) => byId.has(id)).sort((left, right) => right[1].length - left[1].length);
  const parent = topic.parentId ? topics.find((item) => item.id === topic.parentId) : null;
  const children = topics.filter((item) => item.parentId === topic.id);

  return <>
    <SiteHeader current="topics" />
    <main className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>쟁점{parent && <> · <Link href={`/topics/${parent.id}`}>#{parent.name}</Link></>}</p>
        <h1>#{topic.name}</h1>
        <p>{topic.description}</p>
        {children.length > 0 && <ul className={styles.chips}>{children.map((child) => <li key={child.id}><Link className={styles.chip} href={`/topics/${child.id}`}>#{child.name}</Link></li>)}</ul>}
      </section>

      <section className={styles.section} aria-labelledby="speakers-title">
        <div className={styles.sectionHead}><h2 id="speakers-title">인물별 언행</h2></div>
        {speakers.length ? speakers.map(([personId, items]) => <div key={personId} className={styles.speakerGroup}>
          <h3><Avatar person={byId.get(personId)!} size={28} /><Link href={`/people/${personId}?compare=${topic.id}`}>{names[personId]}</Link></h3>
          <ol className={styles.timeline}>{items.map((statement) => <li key={statement.id}><StatementCard statement={statement} sources={sources} names={names} topics={topicNames} stats={stats} withYear /></li>)}</ol>
        </div>) : <Empty>이 쟁점에 대한 공개 언행이 아직 없습니다.</Empty>}
        {statements.hasMore && <MoreLink href={`/topics/${topic.id}?more=${more + 1}`} />}
      </section>

      {evaluations.length > 0 && <section className={styles.section} aria-labelledby="evaluations-title">
        <div className={styles.sectionHead}><h2 id="evaluations-title">평가</h2></div>
        <ol className={styles.viewList}>{evaluations.map((evaluation) => <li key={evaluation.id}><EvaluationCard evaluation={evaluation} sources={sources} names={names} topics={topicNames} showTarget /></li>)}</ol>
      </section>}

      {events.length > 0 && <section className={styles.section} aria-labelledby="events-title">
        <div className={styles.sectionHead}><h2 id="events-title">관련 사건</h2></div>
        <ul className={styles.topicList}>{events.map((event) => <li key={event.id}><Link href={`/events/${event.id}`}><strong>{event.title}</strong><span>{formatShortDate(event.occurredAt, event.datePrecision, event.dateCertainty)}</span></Link></li>)}</ul>
      </section>}
    </main>
  </>;
}
