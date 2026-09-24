import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { nameMap, SiteHeader, StatementCard } from "@/features/archive/components";
import { statementShare } from "@/features/archive/share-text";
import styles from "@/features/archive/archive.module.css";
import { getPublishedRecord, getSources, listPeople, listTopics, sourceIdsOf, type StatementView } from "@/lib/archive/read";
import { shareMetadata } from "@/lib/site";
import { getStatementStats } from "@/lib/stats/read";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const record = await getPublishedRecord("statement", id);
  return record ? record.value as StatementView : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [statement, people] = await Promise.all([load((await params).id), listPeople()]);
  if (!statement) return {};
  const share = statementShare(statement, nameMap(people));
  return shareMetadata(share.title, share.description);
}

// One statement on its own page, so it can be linked and shared.
export default async function StatementPage({ params }: Props) {
  const { id } = await params;
  const statement = await load(id);
  if (!statement) notFound();
  const [people, topics, sources, stats] = await Promise.all([listPeople(), listTopics(), getSources(sourceIdsOf([statement])), getStatementStats([id])]);
  const names = nameMap(people);
  return <>
    <SiteHeader />
    <main className={styles.shell}>
      <section className={styles.hero}><p className={styles.eyebrow}>언행</p></section>
      <div className={styles.viewCard}><StatementCard statement={statement} sources={sources} names={names} topics={nameMap(topics)} stats={stats} showSpeaker /></div>
      <p className={styles.more}><Link href={`/people/${statement.personId}`}>{names[statement.personId]}의 기록 전체 보기 →</Link></p>
    </main>
  </>;
}
