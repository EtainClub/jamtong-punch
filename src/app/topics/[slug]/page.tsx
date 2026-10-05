import { shareMetadata } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComparePicker } from "@/features/archive/ComparePicker";
import { ShareButton } from "@/features/archive/ShareButton";
import { Avatar, Empty, EvaluationCard, MoreLink, nameMap, SiteHeader, StatementCard } from "@/features/archive/components";
import styles from "@/features/archive/archive.module.css";
import { lifeDoor } from "@/features/archive/life";
import { getSources, listPeople, listTopics, outcomesFor, sourceIdsOf, topicEvaluations, topicEvents, topicStatements, type StatementView } from "@/lib/archive/read";
import { formatShortDate } from "@/lib/content/format";
import { getStatementStats } from "@/lib/stats/read";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;
// Three ways to read one topic: grouped by speaker (full cards), speakers
// side by side in short form, or everything in date order.
const VIEWS = [["people", "인물별"], ["compare", "나란히 비교"], ["timeline", "시간순"]] as const;
type View = (typeof VIEWS)[number][0];
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const topic = (await listTopics()).find((item) => item.id === slug);
  if (!topic) return {};
  // Written the way people search a topic: the topic, who spoke on it, how much.
  const [statements, evaluations, people] = await Promise.all([topicStatements(slug, 40), topicEvaluations(slug), listPeople()]);
  const names = nameMap(people);
  const counts = new Map<string, number>();
  for (const name of [...statements.items.map((item) => names[item.personId]), ...evaluations.map((item) => item.evaluator.name)]) if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  const speakers = [...counts].sort((left, right) => right[1] - left[1]).slice(0, 4).map(([name]) => name);
  const total = topic.counts.statements + topic.counts.evaluations;
  const who = speakers.length ? `${speakers.join("·")}${counts.size > speakers.length ? " 등" : ""}` : "";
  return shareMetadata(`#${topic.name}: 누가 뭐라고 했나`, `${topic.description}. ${who ? `${who}의 ` : ""}발언과 평가 ${total}건을 원자료와 함께, 그 뒤 실제로 어떻게 됐는지까지 봅니다.`, `/topics/${topic.id}`);
}

export default async function TopicPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const topics = await listTopics();
  const topic = topics.find((item) => item.id === slug);
  if (!topic) notFound();
  const more = Math.min(Math.max(Number.parseInt(typeof query.more === "string" ? query.more : "0", 10) || 0, 0), 10);
  const view: View = VIEWS.some(([key]) => key === query.view) ? query.view as View : "people";
  const viewHref = (next: View) => `/topics/${slug}${next === "people" ? "" : `?view=${next}`}`;
  const [people, statements, evaluations, events] = await Promise.all([listPeople(), topicStatements(slug, PAGE_SIZE * (more + 1)), topicEvaluations(slug), topicEvents(slug)]);
  const outcomes = await outcomesFor([...statements.items, ...evaluations].map((item) => item.id));
  const [sources, stats] = await Promise.all([getSources(sourceIdsOf([...statements.items, ...evaluations, ...Object.values(outcomes).flat()])), getStatementStats(statements.items.map((item) => item.id))]);
  const names = nameMap(people);
  // Records that already have "그 후 실제로는", newest words first.
  const said = [
    ...statements.items.map((item) => ({ id: item.id, at: item.occurredAt, who: names[item.personId] ?? "", text: item.headline, href: `/statements/${item.id}` })),
    ...evaluations.map((item) => ({ id: item.id, at: item.occurredAt, who: `${item.evaluator.name} → ${names[item.targetPersonId] ?? ""}`, text: item.claim, href: `/evaluations/${item.id}` })),
  ].filter((item) => outcomes[item.id]).sort((left, right) => right.at.localeCompare(left.at));
  const topicNames = nameMap(topics);
  const byId = new Map(people.map((person) => [person.id, person]));
  // Grouped by speaker, the speaker with the most statements first, so the
  // page reads as "who said what about this" rather than one mixed feed.
  const groups = new Map<string, StatementView[]>();
  for (const statement of statements.items) groups.set(statement.personId, [...(groups.get(statement.personId) ?? []), statement]);
  const speakers = [...groups].filter(([id]) => byId.has(id)).sort((left, right) => right[1].length - left[1].length);
  const parent = topic.parentId ? topics.find((item) => item.id === topic.parentId) : null;
  const children = topics.filter((item) => item.parentId === topic.id);
  const targets = [...evaluations.reduce((counts, evaluation) => counts.set(evaluation.targetPersonId, (counts.get(evaluation.targetPersonId) ?? 0) + 1), new Map<string, number>())]
    .filter(([id]) => byId.has(id)).sort((left, right) => right[1] - left[1]);
  const timeline = [
    ...statements.items.map((item) => ({ kind: "statement" as const, at: item.occurredAt, item })),
    ...evaluations.map((item) => ({ kind: "evaluation" as const, at: item.occurredAt, item })),
  ].sort((left, right) => right.at.localeCompare(left.at));
  // Two speakers side by side (?a=&b=), the two who said most by default.
  // Picking the other column's speaker swaps the columns.
  const speakerIds = speakers.map(([id]) => id);
  const pickA = typeof query.a === "string" && speakerIds.includes(query.a) ? query.a : speakerIds[0];
  const pickB = typeof query.b === "string" && speakerIds.includes(query.b) && query.b !== pickA ? query.b : speakerIds.find((id) => id !== pickA);
  const compareHref = (a: string, b: string | undefined) => `/topics/${slug}?view=compare&a=${a}${b ? `&b=${b}` : ""}`;
  const choices = speakers.map(([id, items]) => ({ id, name: names[id], count: items.length }));
  const pairs = [
    { id: pickA, label: "왼쪽 인물", hrefFor: Object.fromEntries(speakerIds.map((id) => [id, compareHref(id, id === pickB ? pickA : pickB)])) },
    { id: pickB, label: "오른쪽 인물", hrefFor: Object.fromEntries(speakerIds.map((id) => [id, compareHref(id === pickA ? pickB! : pickA, id)])) },
  ].filter((column): column is typeof column & { id: string } => Boolean(column.id));

  return <>
    <SiteHeader current="topics" />
    <main className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>{lifeDoor(topic.id) ? `${lifeDoor(topic.id)!.icon} 생활 쟁점` : "쟁점"}{parent && <> · <Link href={`/topics/${parent.id}`}>#{parent.name}</Link></>}</p>
        <div className={styles.detailTitle}><h1>#{topic.name}</h1><ShareButton path={`/topics/${topic.id}`} title={`#${topic.name}: 누가 뭐라고 했나`} prominent /></div>
        <p>{topic.description}</p>
        {children.length > 0 && <ul className={styles.chips}>{children.map((child) => <li key={child.id}><Link className={styles.chip} href={`/topics/${child.id}`}>#{child.name}</Link></li>)}</ul>}
      </section>

      {(speakers.length > 0 || targets.length > 0) && <section className={styles.topicSummary} aria-label="이 쟁점의 인물">
        {speakers.length > 0 && <div><h2>말한 사람</h2><ul>{speakers.map(([personId, items]) => <li key={personId}><Link href={`${viewHref("people")}#speaker-${personId}`}><Avatar person={byId.get(personId)!} size={28} />{names[personId]}<b>{items.length}</b></Link></li>)}</ul></div>}
        {targets.length > 0 && <div><h2>평가받은 사람</h2><ul>{targets.map(([personId, count]) => <li key={personId}><Link href={`/people/${personId}?tab=views`}><Avatar person={byId.get(personId)!} size={28} />{names[personId]}<b>{count}</b></Link></li>)}</ul></div>}
      </section>}

      {said.length > 0 && <section className={styles.section} aria-labelledby="words-facts-title">
        <div className={styles.sectionHead}><h2 id="words-facts-title">말과 결과</h2></div>
        <p className={styles.note}>누가 무엇을 말했고, 그 뒤 공식 자료로 확인된 사실은 무엇인지 나란히 놓았습니다. 임통은 옳고 그름을 판정하지 않습니다.</p>
        <ol className={styles.wordsFacts}>{said.map((item) => {
          const fact = outcomes[item.id].at(-1)!;
          return <li key={item.id}>
            <div><small>{item.who} · {formatShortDate(item.at)}</small><Link href={item.href}>{item.text}</Link></div>
            <div className={styles.fact}><small>그 후 실제로는 · {formatShortDate(fact.asOf)} 기준</small><p>{fact.summary}</p></div>
          </li>;
        })}</ol>
      </section>}

      <nav className={styles.tabs} aria-label="보기 방식">{VIEWS.map(([key, label]) => <Link key={key} href={viewHref(key)} aria-current={view === key ? "page" : undefined}>{label}</Link>)}</nav>

      {view === "people" && <section className={styles.section} aria-labelledby="speakers-title">
        <div className={styles.sectionHead}><h2 id="speakers-title">인물별 언행</h2></div>
        {speakers.length ? speakers.map(([personId, items]) => <div key={personId} id={`speaker-${personId}`} className={styles.speakerGroup}>
          <h3><Avatar person={byId.get(personId)!} size={28} /><Link href={`/people/${personId}?compare=${topic.id}`}>{names[personId]}</Link></h3>
          <ol className={styles.timeline}>{items.map((statement) => <li key={statement.id}><StatementCard statement={statement} sources={sources} names={names} topics={topicNames} stats={stats} outcomes={outcomes} withYear /></li>)}</ol>
        </div>) : <Empty>이 쟁점에 대한 공개 언행이 아직 없습니다.</Empty>}
        {statements.hasMore && <MoreLink href={`/topics/${topic.id}?more=${more + 1}`} />}
      </section>}

      {view === "compare" && <section className={styles.section} aria-labelledby="compare-title">
        <div className={styles.sectionHead}><h2 id="compare-title">나란히 비교</h2></div>
        <p className={styles.note}>같은 쟁점에 대해 두 사람이 무엇을 말했는지 나란히 놓았습니다. 이름 칸에서 비교할 사람을 바꿉니다. 임통은 누가 옳은지 판정하지 않습니다.</p>
        {speakers.length ? <div className={styles.compareColumns}>{pairs.map((column) => <section key={column.label} aria-label={`${names[column.id]}의 언행`}>
          <h3><Link href={`/people/${column.id}?compare=${topic.id}`} aria-label={`${names[column.id]} 인물 페이지`}><Avatar person={byId.get(column.id)!} size={32} /></Link>
            {speakers.length > 2 ? <ComparePicker label={column.label} value={column.id} choices={choices} hrefFor={column.hrefFor} /> : <span>{names[column.id]} <small>{groups.get(column.id)!.length}건</small></span>}</h3>
          <ol>{groups.get(column.id)!.map((statement) => <li key={statement.id}>
            <time dateTime={statement.occurredAt}>{formatShortDate(statement.occurredAt, statement.datePrecision, statement.dateCertainty)}</time>
            <Link href={`/statements/${statement.id}`}>{statement.headline}</Link>
            {statement.quote && <q>{statement.quote}</q>}
          </li>)}</ol>
        </section>)}</div> : <Empty>이 쟁점에 대한 공개 언행이 아직 없습니다.</Empty>}
      </section>}

      {view === "timeline" && <section className={styles.section} aria-labelledby="timeline-title">
        <div className={styles.sectionHead}><h2 id="timeline-title">시간순</h2></div>
        {timeline.length ? <ol className={styles.topicTimeline}>{timeline.map((entry) => entry.kind === "statement"
          ? <li key={entry.item.id}><time dateTime={entry.at}>{formatShortDate(entry.item.occurredAt, entry.item.datePrecision, entry.item.dateCertainty)}</time><span className={styles.kindBadge}>언행</span><span><b>{names[entry.item.personId]}</b> <Link href={`/statements/${entry.item.id}`}>{entry.item.headline}</Link></span></li>
          : <li key={entry.item.id}><time dateTime={entry.at}>{formatShortDate(entry.item.occurredAt, entry.item.datePrecision, entry.item.dateCertainty)}</time><span className={`${styles.kindBadge} ${styles.kindView}`}>시선</span><span><b>{entry.item.evaluator.name} → {names[entry.item.targetPersonId]}</b> <Link href={`/evaluations/${entry.item.id}`}>{entry.item.claim}</Link></span></li>)}</ol>
          : <Empty>이 쟁점에 대한 공개 기록이 아직 없습니다.</Empty>}
      </section>}

      {view === "people" && evaluations.length > 0 && <section className={styles.section} aria-labelledby="evaluations-title">
        <div className={styles.sectionHead}><h2 id="evaluations-title">평가</h2></div>
        <ol className={styles.viewList}>{evaluations.map((evaluation) => <li key={evaluation.id}><EvaluationCard evaluation={evaluation} sources={sources} names={names} topics={topicNames} outcomes={outcomes} showTarget /></li>)}</ol>
      </section>}

      {events.length > 0 && <section className={styles.section} aria-labelledby="events-title">
        <div className={styles.sectionHead}><h2 id="events-title">관련 사건</h2></div>
        <ul className={styles.topicList}>{events.map((event) => <li key={event.id}><Link href={`/events/${event.id}`}><strong>{event.title}</strong><span>{formatShortDate(event.occurredAt, event.datePrecision, event.dateCertainty)}</span></Link></li>)}</ul>
      </section>}
    </main>
  </>;
}
