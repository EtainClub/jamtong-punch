import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, CitationLinks, Empty, EvaluationCard, nameMap, SiteHeader, StatementCard } from "@/features/archive/components";
import styles from "@/features/archive/archive.module.css";
import { eventEvaluations, eventStatements, getEvent, getSources, listPeople, listTopics, sourceIdsOf } from "@/lib/archive/read";
import { formatDate, participantRoleLabels } from "@/lib/content/format";
import { getStatementStats } from "@/lib/stats/read";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEvent((await params).id);
  return event ? { title: event.title, description: event.summary } : {};
}

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();
  const [people, topics, statements, evaluations] = await Promise.all([listPeople(), listTopics(), eventStatements(id), eventEvaluations(id)]);
  const [sources, stats] = await Promise.all([getSources(sourceIdsOf([event, ...statements, ...evaluations])), getStatementStats(statements.map((item) => item.id))]);
  const names = nameMap(people);
  const topicNames = nameMap(topics);
  const byId = new Map(people.map((person) => [person.id, person]));
  const roles = (["principal", "participant", "commenter"] as const)
    .map((role) => ({ role, members: event.participants.filter((item) => item.role === role && byId.has(item.personId)) }))
    .filter((group) => group.members.length);

  return <>
    <SiteHeader />
    <main className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>사건</p>
        <h1>{event.title}</h1>
        <p><time dateTime={event.occurredAt}>{formatDate(event.occurredAt, event.datePrecision, { certainty: event.dateCertainty })}</time>{event.endAt && <> – <time dateTime={event.endAt}>{formatDate(event.endAt, "day")}</time></>}</p>
        <p>{event.summary}</p>
        <CitationLinks citations={event.citations} sources={sources} />
        {event.topicIds.length > 0 && <ul className={styles.chips}>{event.topicIds.filter((topic) => topicNames[topic]).map((topic) => <li key={topic}><Link className={styles.chip} href={`/topics/${topic}`}>#{topicNames[topic]}</Link></li>)}</ul>}
      </section>

      <section className={styles.section} aria-labelledby="people-title">
        <div className={styles.sectionHead}><h2 id="people-title">등장 인물</h2></div>
        <p className={styles.note}>사건에 함께 등장했다는 것만으로는 관계도에 이어지지 않습니다.</p>
        <div className={styles.eventPeople}>{roles.map(({ role, members }) => <div key={role}>
          <h3>{participantRoleLabels[role]}</h3>
          <ul>{members.map((member) => <li key={member.personId}><Link className={styles.personChip} href={`/people/${member.personId}`}><Avatar person={byId.get(member.personId)!} size={32} />{names[member.personId]}{member.note && <small>{member.note}</small>}</Link></li>)}</ul>
        </div>)}</div>
      </section>

      <section className={styles.section} aria-labelledby="statements-title">
        <div className={styles.sectionHead}><h2 id="statements-title">이 사건에 대한 언행</h2></div>
        {statements.length ? <ol className={styles.viewList}>{statements.map((statement) => <li key={statement.id}><div className={styles.viewCard}><StatementCard statement={statement} sources={sources} names={names} topics={topicNames} stats={stats} showSpeaker /></div></li>)}</ol> : <Empty>공개된 언행이 아직 없습니다.</Empty>}
      </section>

      {evaluations.length > 0 && <section className={styles.section} aria-labelledby="evaluations-title">
        <div className={styles.sectionHead}><h2 id="evaluations-title">이 사건을 언급한 평가</h2></div>
        <ol className={styles.viewList}>{evaluations.map((evaluation) => <li key={evaluation.id}><EvaluationCard evaluation={evaluation} sources={sources} names={names} topics={topicNames} showTarget /></li>)}</ol>
      </section>}
    </main>
  </>;
}
