import { shareMetadata } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, CitationLinks, currentRole, Empty, EvaluationCard, MoreLink, nameMap, RATIOS_HIDDEN_NOTE, SiteHeader, StatementTimeline, type Names, type Sources } from "@/features/archive/components";
import styles from "@/features/archive/archive.module.css";
import { RelationsSection } from "@/features/archive/RelationsSection";
import { getPerson, getSources, listPeople, listTopics, outcomesFor, personEvaluations, personEvaluationsGiven, personStatements, personTopicIds, sourceIdsOf, type PersonView, type StatementView } from "@/lib/archive/read";
import { formatShortDate } from "@/lib/content/format";
import { MIN_PARTICIPANTS, present } from "@/lib/stats/present";
import { ReportButton } from "@/features/archive/ReportButton";
import { getPublicSubjectStats, getRatioFlags, getStatementStats, ratioHidden } from "@/lib/stats/read";
import { StanceButtons } from "@/features/archive/StanceButtons";
import { OpsEditLink } from "@/features/archive/OpsEditLink";
import { PersonActivity } from "@/features/archive/PersonActivity";
import { RelationPreview } from "@/features/archive/RelationPreview";
import { CheerGauge } from "@/features/archive/CheerGauge";
import { ShareButton } from "@/features/archive/ShareButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
// How many records the year chart counts. Beyond this it shows the latest ones.
const ACTIVITY_LIMIT = 500;
const TABS = [["records", "기록"], ["views", "시선"], ["relations", "관계"]] as const;
type Tab = (typeof TABS)[number][0];
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const person = await getPerson((await params).slug);
  if (!person) return {};
  return shareMetadata(`${person.name} 발언·평가 모음`, `${person.name} — ${currentRole(person).replace(/\.$/, "")}. 직접 한 말 ${person.counts.statements + person.counts.evaluationsGiven}건, 다른 사람들의 평가 ${person.counts.evaluationsReceived}건을 원자료와 함께 봅니다.`, `/people/${person.id}`);
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
      {tab !== "relations" && <RelationPreview person={person} people={people} />}
      <nav className={styles.tabs} aria-label="인물 기록 구분">{TABS.map(([key, label]) => <Link key={key} href={`/people/${person.id}${key === "records" ? "" : `?tab=${key}`}`} aria-current={tab === key ? "page" : undefined}>{label}</Link>)}</nav>
      {tab === "records" && <Records person={person} limit={PAGE_SIZE * (more + 1)} more={more} topic={topic} compare={compare} names={names} topicNames={topicNames} href={href} />}
      {tab === "views" && <Views person={person} limit={PAGE_SIZE * (more + 1)} more={more} names={names} topicNames={topicNames} href={href} />}
      {tab === "relations" && <RelationsSection person={person} people={people} mode="tab" />}
    </main>
  </>;
}

async function Profile({ person }: { person: PersonView }) {
  const hidden = ratioHidden(await getRatioFlags(), person.id);
  const stats = !hidden ? await getPublicSubjectStats(person.id) : null;
  const d30 = stats ? present({ punch: Number(stats.windows.d30.punch ?? 0), cheer: Number(stats.windows.d30.cheer ?? 0), unknown: Number(stats.windows.d30.unknown ?? 0) }) : null;
  return <section className={styles.profile} aria-labelledby="person-name">
    <Avatar person={person} size={112} />
    {person.image?.rightsStatus === "cleared" && person.image.credit && <a className={styles.photoCredit} href={person.image.sourceUrl} target="_blank" rel="noreferrer">사진: {person.image.credit}</a>}
    <div className={styles.detailTitle}><h1 id="person-name">{person.name}</h1><ShareButton path={`/people/${person.id}`} title={`${person.name} 발언·평가 모음`} prominent /></div>
    <p className={styles.roles}>{currentRole(person)}</p>
    <OpsEditLink type="people" id={person.id} label="인물 정보" />
    <ReportButton targetType="person" targetId={person.id} hasPhoto={Boolean(person.image)} />
    <p className={styles.counts}><span>기록 <b>{person.counts.statements}</b></span><span>평가 <b>{person.counts.evaluationsReceived}</b></span><span>관계 <b>{person.counts.relations}</b></span></p>
    <div className={styles.participation}>
      <div className={styles.participationSummary}>
        <div className={styles.participationInfo}>
          <h2>참여자의 응원율</h2>
          {hidden ? <p>{RATIOS_HIDDEN_NOTE}</p> : <>
            <p>최근 30일 <span aria-hidden="true">·</span> 참여 <b>{(d30?.n ?? 0).toLocaleString("ko-KR")}명</b></p>
            {d30?.ratio === null || !d30 ? <small>참여 {MIN_PARTICIPANTS}명부터 비율을 표시합니다</small> : null}
          </>}
        </div>
        <CheerGauge rate={d30?.ratio === null || d30?.ratio === undefined ? null : 100 - d30.ratio} hidden={hidden} />
      </div>
      <div className={styles.participationActions} data-playable={person.playable}>
        {person.playable && <>
          <span className={styles.gameLabel}>게임으로 참여</span>
          <div className={styles.playLinks}>
            <Link className={styles.playPunch} href={`/people/${person.id}/play/punch`}>👊 펀치 게임</Link>
            <Link className={styles.playCheer} href={`/people/${person.id}/play/cheer`}>👏 응원 게임</Link>
          </div>
        </>}
        <span className={styles.quickLabel}>바로 참여</span>
        <StanceButtons kind="person" id={person.id} options={["punch", "cheer"]} note="오늘의 입장은 1건만 반영됩니다. 다시 참여하면 이전 입장을 바꿉니다." />
      </div>
      <small className={styles.participationDisclaimer}>임통 참여자의 기록이며, 일반 국민 여론이나 여론조사가 아닙니다.</small>
    </div>
  </section>;
}

async function Records({ person, limit, more, topic, compare, names, topicNames, href }: {
  person: PersonView; limit: number; more: number; topic: string | null; compare: string | null; names: Names; topicNames: Names; href: (patch: Record<string, string | null>) => string;
}) {
  const [page, personTopics, comparison, all, received, allGiven] = await Promise.all([
    personStatements(person.id, limit, topic),
    personTopicIds(person.id),
    compare ? personStatements(person.id, 50, compare) : Promise.resolve(null),
    personStatements(person.id, ACTIVITY_LIMIT, null),
    personEvaluations(person.id, ACTIVITY_LIMIT),
    personEvaluationsGiven(person.id),
  ]);
  // The record is everything this person said: their statements and the
  // evaluations they made of others.
  const given = topic ? allGiven.filter((item) => item.topicIds.includes(topic)) : allGiven;
  // A year's bar opens the page far enough down the (newest-first) record to
  // reach that year, then jumps to its heading.
  const statementYearHref = (year: number) => {
    const index = all.items.findIndex((item) => item.occurredAt.startsWith(String(year)));
    const pages = Math.floor(Math.max(index, 0) / PAGE_SIZE);
    return `${href({ topic: null, more: pages ? String(pages) : null })}#y${year}`;
  };
  const outcomes = await outcomesFor([...page.items, ...given].map((item) => item.id));
  const [sources, stats] = await Promise.all([getSources(sourceIdsOf([...page.items, ...(comparison?.items ?? []), ...given, ...Object.values(outcomes).flat()])), getStatementStats(page.items.map((item) => item.id))]);
  const topicChoices = [...new Set([...personTopics, ...allGiven.flatMap((item) => item.topicIds)])].filter((id) => topicNames[id]);
  return <>
    {!topic && <PersonActivity statements={all.items} evaluations={received.items} statementYearHref={statementYearHref} viewsHref={`/people/${person.id}?tab=views`} />}
    {topicChoices.length > 0 && <ul className={styles.chips} aria-label="쟁점으로 거르기">
      <li><Link className={styles.chip} href={href({ topic: null })} aria-current={topic === null}>전체</Link></li>
      {topicChoices.map((id) => <li key={id}><Link className={styles.chip} href={href({ topic: id })} aria-current={topic === id}>#{topicNames[id]}</Link></li>)}
    </ul>}
    {page.items.length
      ? <StatementTimeline statements={page.items} sources={sources} names={names} topics={topicNames} stats={stats} outcomes={outcomes} compareHref={(id) => href({ compare: id, more: more ? String(more) : null })} />
      : !given.length && <Empty>{topic ? "이 쟁점에 대한 공개 기록이 없습니다." : "공개된 기록이 아직 없습니다."}</Empty>}
    {page.hasMore && <MoreLink href={href({ more: String(more + 1) })} />}
    {given.length > 0 && <section className={styles.section} aria-labelledby="given-title">
      <div className={styles.sectionHead}><h2 id="given-title">다른 사람에 대한 평가 <small>{given.length}</small></h2></div>
      <p className={styles.note}>{person.name}이(가) 다른 사람을 두고 한 말입니다. 평가받은 사람의 시선 탭에도 함께 실립니다.</p>
      <ol className={styles.viewList}>{given.map((evaluation) => <li key={evaluation.id}><EvaluationCard evaluation={evaluation} sources={sources} names={names} topics={topicNames} outcomes={outcomes} showTarget /></li>)}</ol>
    </section>}
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
        <p className={styles.meta}><time dateTime={statement.occurredAt}>{formatShortDate(statement.occurredAt, statement.datePrecision, statement.dateCertainty)}</time></p>
        {statement.quote ? <blockquote className={styles.quote}>“{statement.quote}”</blockquote> : <p className={styles.headline}>{statement.headline}</p>}
        <CitationLinks citations={statement.citations} sources={sources} />
      </div></li>)}</ol>
      <p className={styles.note}>임통은 입장 변화를 판정하지 않습니다. 원자료를 확인해 직접 판단하세요.</p>
    </section>
  </>;
}

async function Views({ person, limit, more, names, topicNames, href }: { person: PersonView; limit: number; more: number; names: Names; topicNames: Names; href: (patch: Record<string, string | null>) => string }) {
  const page = await personEvaluations(person.id, limit);
  const outcomes = await outcomesFor(page.items.map((item) => item.id));
  const sources = await getSources(sourceIdsOf([...page.items, ...Object.values(outcomes).flat()]));
  return <>
    <p className={styles.note}>{person.name}에 대해 다른 사람들이 한 말입니다. 요약의 주어는 언제나 평가한 사람이며, 임통의 판단이 아닙니다.</p>
    {page.items.length
      ? <ol className={styles.viewList}>{page.items.map((evaluation) => <li key={evaluation.id}><EvaluationCard evaluation={evaluation} sources={sources} names={names} topics={topicNames} outcomes={outcomes} responses={page.items.filter((item) => item.respondsTo === evaluation.id)} /></li>)}</ol>
      : <Empty>공개된 평가가 아직 없습니다.</Empty>}
    {page.hasMore && <MoreLink href={href({ more: String(more + 1) })} />}
  </>;
}
