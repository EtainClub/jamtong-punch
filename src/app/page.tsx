import Link from "next/link";
import { Avatar, currentRole, Empty, EvaluationCard, nameMap, SiteHeader, StatementCard } from "@/features/archive/components";
import { PeopleSearch } from "@/features/archive/PeopleSearch";
import styles from "@/features/archive/archive.module.css";
import { getSources, listPeople, listTopics, recentlyPublished, sourceIdsOf } from "@/lib/archive/read";
import { getStatementStats } from "@/lib/stats/read";

export const dynamic = "force-dynamic";

function publishedLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });
}

export default async function Home() {
  const [people, topics, recent] = await Promise.all([listPeople(), listTopics(), recentlyPublished(12)]);
  const statementIds = recent.flatMap((item) => (item.kind === "statement" ? [item.value.id] : []));
  const [sources, stats] = await Promise.all([getSources(sourceIdsOf(recent.map((item) => item.value))), getStatementStats(statementIds)]);
  const names = nameMap(people);
  const topicNames = nameMap(topics);

  return <>
    <SiteHeader />
    <main className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>임통 · 인물 아카이브</p>
        <h1>사람의 말과 관계를<br />기록으로 봅니다.</h1>
        <p>누가 어떤 말을 해왔는지, 다른 사람들은 그를 어떻게 평가했는지, 누구를 언급해 왔는지. 모든 카드는 원자료로 끝납니다. 임통은 인물을 규정하지 않습니다.</p>
      </section>
      <PeopleSearch people={people.map((person) => ({ id: person.id, name: person.name, aliases: person.aliases, role: currentRole(person) }))} />

      <section className={styles.section} aria-labelledby="people-title">
        <div className={styles.sectionHead}><h2 id="people-title">인물</h2><Link href="/people">전체 보기</Link></div>
        {people.length ? <ul className={styles.peopleRow}>{people.map((person) => <li key={person.id}><Link href={`/people/${person.id}`}><Avatar person={person} size={60} />{person.name}</Link></li>)}</ul> : <Empty>공개된 인물이 아직 없습니다.</Empty>}
      </section>

      <section className={styles.section} aria-labelledby="recent-title">
        <div className={styles.sectionHead}><h2 id="recent-title">새로 올라온 기록</h2><Link href="/contribute">기록 등록하기</Link></div>
        {recent.length ? <ol className={styles.viewList}>{recent.map((item) => <li key={item.value.id}>
          <p className={styles.published}>{publishedLabel(item.publishedAt)} 공개</p>
          {item.kind === "statement"
            ? <div className={styles.viewCard}><StatementCard statement={item.value} sources={sources} names={names} topics={topicNames} stats={stats} showSpeaker /></div>
            : <EvaluationCard evaluation={item.value} sources={sources} names={names} topics={topicNames} showTarget />}
        </li>)}</ol> : <Empty>공개된 기록이 아직 없습니다.</Empty>}
      </section>

      {topics.length > 0 && <section className={styles.section} aria-labelledby="topics-title">
        <div className={styles.sectionHead}><h2 id="topics-title">쟁점</h2><Link href="/topics">전체 보기</Link></div>
        <ul className={styles.chips}>{topics.slice(0, 12).map((topic) => <li key={topic.id}><Link className={styles.chip} href={`/topics/${topic.id}`}>#{topic.name}</Link></li>)}</ul>
      </section>}
    </main>
  </>;
}
