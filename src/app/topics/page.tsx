import type { Metadata } from "next";
import Link from "next/link";
import { KIM_BU_SEON_TOPIC, timelineEntries } from "@/content/kim-bu-seon-timeline";
import { DAEJANGDONG_TOPIC, timelineEntries as daejangdongEntries } from "@/content/daejangdong-timeline";
import { Empty, SiteHeader } from "@/features/archive/components";
import styles from "@/features/archive/archive.module.css";
import { listTopics } from "@/lib/archive/read";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "쟁점" };

export default async function TopicsPage() {
  const topics = await listTopics();
  const parents = topics.filter((topic) => !topic.parentId);
  const children = (id: string) => topics.filter((topic) => topic.parentId === id);
  return <>
    <SiteHeader current="topics" />
    <main className={styles.shell}>
      <section className={styles.hero}><h1>쟁점</h1><p>같은 주제에 대해 여러 사람이 무엇을 말해 왔는지 모아 봅니다.</p></section>
      <section className={styles.section} aria-labelledby="research-title">
        <div className={styles.sectionHead}><h2 id="research-title">쟁점 타임라인</h2></div>
        <ul className={styles.topicList}><li>
          <Link href={`/topics/${KIM_BU_SEON_TOPIC.id}`}><strong>{KIM_BU_SEON_TOPIC.title}</strong><span>{timelineEntries.length}개 항목 · 초기 의혹부터 수사·소송과 후속 발언까지</span></Link>
          <p className={styles.note}>{KIM_BU_SEON_TOPIC.description}</p>
        </li><li>
          <Link href={`/topics/${DAEJANGDONG_TOPIC.id}`}><strong>{DAEJANGDONG_TOPIC.title}</strong><span>{daejangdongEntries.length}개 항목 · 개발사업부터 수사·재판과 정치적 대응까지</span></Link>
          <p className={styles.note}>{DAEJANGDONG_TOPIC.description}</p>
        </li></ul>
      </section>
      {parents.length ? <ul className={styles.topicList}>{parents.map((topic) => <li key={topic.id}>
        <Link href={`/topics/${topic.id}`}><strong>#{topic.name}</strong><span>인물 {topic.counts.people} · 언행 {topic.counts.statements} · 평가 {topic.counts.evaluations} · 사건 {topic.counts.events}</span></Link>
        {children(topic.id).length > 0 && <ul className={styles.chips}>{children(topic.id).map((child) => <li key={child.id}><Link className={styles.chip} href={`/topics/${child.id}`}>#{child.name}</Link></li>)}</ul>}
      </li>)}</ul> : <Empty>인물별 언행으로 묶인 공개 쟁점이 아직 없습니다.</Empty>}
    </main>
  </>;
}
