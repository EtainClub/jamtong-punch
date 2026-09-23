import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, CitationLinks, currentRole, Empty, EvaluationCard, MoreLink, nameMap, SiteHeader, StatementTimeline, type Names, type Sources } from "@/features/archive/components";
import styles from "@/features/archive/archive.module.css";
import { RelationsSection } from "@/features/archive/RelationsSection";
import { getPerson, getSources, listPeople, listTopics, personEvaluations, personStatements, personTopicIds, sourceIdsOf, type PersonView, type StatementView } from "@/lib/archive/read";
import { formatShortDate } from "@/lib/content/format";
import { present } from "@/lib/stats/present";
import { getPublicSubjectStats, getStatementStats } from "@/lib/stats/read";
import { StanceButtons } from "@/features/archive/StanceButtons";
import { OpsEditLink } from "@/features/archive/OpsEditLink";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const TABS = [["records", "기록"], ["views", "시선"], ["relations", "관계"]] as const;
type Tab = (typeof TABS)[number][0];
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const person = await getPerson((await params).slug);
  return person ? { title: person.name, description: `${person.name}의 언행, 다른 사람들의 평가, 발언으로 이어진 관계를 원자료와 함께 봅니다.` } : {};
}

export default async function PersonPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const person = await getPerson(slug);
  if (!person) notFound();
  const tab: Tab = TABS.some(([key]) => key === query.tab) ? query.tab as Tab : "records";
  const more = Math.min(Math.max(Number.parseInt(single(query.more) ?? "0", 10) || 0, 0), 20);
  const topic = single(query.topic) ?? null;
  const compare = single(query.compare) ?? null;
  const href = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const merged = { tab: tab === "records" ? null : tab, topic, ...patch };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    const search = next.toString();
    return `/people/${person.id}${search ? `?${search}` : ""}`;
  };
  const [people, topics] = await Promise.all([listPeople(), listTopics()]);
  const names = nameMap(people);
  const topicNames = nameMap(topics);

  return <>
    <SiteHeader current="people" />
    <main className={styles.shell}>
      <Profile person={person} />
      <nav className={styles.tabs} aria-label="인물 기록 구분">{TABS.map(([key, label]) => <Link key={key} href={`/people/${person.id}${key === "records" ? "" : `?tab=${key}`}`} aria-current={tab === key ? "page" : undefined}>{label}</Link>)}</nav>
      {tab === "records" && <Records person={person} limit={PAGE_SIZE * (more + 1)} more={more} topic={topic} compare={compare} names={names} topicNames={topicNames} href={href} />}
      {tab === "views" && <Views person={person} limit={PAGE_SIZE * (more + 1)} more={more} names={names} topicNames={topicNames} href={href} />}
      {tab === "relations" && <RelationsSection person={person} people={people} mode="tab" />}
    </main>
  </>;
}

async function Profile({ person }: { person: PersonView }) {
  const stats = person.playable ? await getPublicSubjectStats(person.id) : null;
  const d30 = stats ? present({ punch: Number(stats.windows.d30.punch ?? 0), cheer: Number(stats.windows.d30.cheer ?? 0), unknown: Number(stats.windows.d30.unknown ?? 0) }) : null;
  return <section className={styles.profile} aria-labelledby="person-name">
    <Avatar person={person} size={112} />
    {person.image?.rightsStatus === "cleared" && person.image.credit && <a className={styles.photoCredit} href={person.image.sourceUrl} target="_blank" rel="noreferrer">사진: {person.image.credit}</a>}
    <h1 id="person-name">{person.name}</h1>
    <p className={styles.roles}>{currentRole(person)}</p>
    <OpsEditLink type="people" id={person.id} label="인물 정보" />
    <p className={styles.counts}><span>기록 <b>{person.counts.statements}</b></span><span>평가 <b>{person.counts.evaluationsReceived}</b></span><span>관계 <b>{person.counts.relations}</b></span></p>
    {person.playable && <div className={styles.participation}>
      {d30 && d30.ratio !== null
        ? <p>30일 · 참여 {d30.n.toLocaleString("ko-KR")}명 · <span className={styles.punch}>펀치 {d30.ratio}%</span></p>
        : <p>30일 · 참여 {(d30?.n ?? 0).toLocaleString("ko-KR")}명 · 참여 30명부터 표시합니다</p>}
      <small>임통 참여자의 기록입니다. 일반 국민 여론이나 여론조사와 다릅니다.</small>
      <StanceButtons kind="person" id={person.id} options={["punch", "cheer"]} note="오늘 이 인물에 대한 입장 1건으로 기록됩니다. 여러 번 눌러도 1건입니다." />
    </div>}
  </section>;
}

async function Records({ person, limit, more, topic, compare, names, topicNames, href }: {
  person: PersonView; limit: number; more: number; topic: string | null; compare: string | null; names: Names; topicNames: Names; href: (patch: Record<string, string | null>) => string;
}) {
  const [page, personTopics, comparison] = await Promise.all([
    personStatements(person.id, limit, topic),
    personTopicIds(person.id),
    compare ? personStatements(person.id, 50, compare) : Promise.resolve(null),
  ]);
  const [sources, stats] = await Promise.all([getSources(sourceIdsOf([...page.items, ...(comparison?.items ?? [])])), getStatementStats(page.items.map((item) => item.id))]);
  const topicChoices = personTopics.filter((id) => topicNames[id]);
  return <>
    {topicChoices.length > 0 && <ul className={styles.chips} aria-label="쟁점으로 거르기">
      <li><Link className={styles.chip} href={href({ topic: null })} aria-current={topic === null}>전체</Link></li>
      {topicChoices.map((id) => <li key={id}><Link className={styles.chip} href={href({ topic: id })} aria-current={topic === id}>#{topicNames[id]}</Link></li>)}
    </ul>}
    {page.items.length
      ? <StatementTimeline statements={page.items} sources={sources} names={names} topics={topicNames} stats={stats} compareHref={(id) => href({ compare: id, more: more ? String(more) : null })} />
      : <Empty>{topic ? "이 쟁점에 대한 공개 기록이 없습니다." : "공개된 기록이 아직 없습니다."}</Empty>}
    {page.hasMore && <MoreLink href={href({ more: String(more + 1) })} />}
    {comparison && compare && topicNames[compare] && <CompareSheet person={person} topicName={topicNames[compare]} statements={comparison.items} sources={sources} closeHref={href({ more: more ? String(more) : null })} />}
  </>;
}

// Side by side, oldest first. The archive shows what was said over time and
// deliberately does not label a change of position.
function CompareSheet({ person, topicName, statements, sources, closeHref }: { person: PersonView; topicName: string; statements: StatementView[]; sources: Sources; closeHref: string }) {
  const ordered = [...statements].reverse();
  return <>
    <Link className={styles.sheetBackdrop} href={closeHref} scroll={false} aria-label="닫기" />
    <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="compare-title">
      <div className={styles.sheetHead}><h2 id="compare-title">{person.name} · #{topicName}</h2><Link href={closeHref} scroll={false} aria-label="닫기">✕</Link></div>
      <ol className={styles.timeline}>{ordered.map((statement) => <li key={statement.id}><div className={styles.card}>
        <p className={styles.meta}><time dateTime={statement.occurredAt}>{formatShortDate(statement.occurredAt, statement.datePrecision)}</time></p>
        {statement.quote ? <blockquote className={styles.quote}>“{statement.quote}”</blockquote> : <p className={styles.headline}>{statement.headline}</p>}
        <CitationLinks citations={statement.citations} sources={sources} />
      </div></li>)}</ol>
      <p className={styles.note}>임통은 입장 변화를 판정하지 않습니다. 원자료를 확인해 직접 판단하세요.</p>
    </section>
  </>;
}

async function Views({ person, limit, more, names, topicNames, href }: { person: PersonView; limit: number; more: number; names: Names; topicNames: Names; href: (patch: Record<string, string | null>) => string }) {
  const page = await personEvaluations(person.id, limit);
  const sources = await getSources(sourceIdsOf(page.items));
  return <>
    <p className={styles.note}>{person.name}에 대해 다른 사람들이 한 말입니다. 요약의 주어는 언제나 평가한 사람이며, 임통의 판단이 아닙니다.</p>
    {page.items.length
      ? <ol className={styles.viewList}>{page.items.map((evaluation) => <li key={evaluation.id}><EvaluationCard evaluation={evaluation} sources={sources} names={names} topics={topicNames} responses={page.items.filter((item) => item.respondsTo === evaluation.id)} /></li>)}</ol>
      : <Empty>공개된 평가가 아직 없습니다.</Empty>}
    {page.hasMore && <MoreLink href={href({ more: String(more + 1) })} />}
  </>;
}
