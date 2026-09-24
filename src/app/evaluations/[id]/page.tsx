import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvaluationCard, nameMap, SiteHeader } from "@/features/archive/components";
import { evaluationShare } from "@/features/archive/share-text";
import styles from "@/features/archive/archive.module.css";
import { getPublishedRecord, getSources, listPeople, listTopics, sourceIdsOf, type EvaluationView } from "@/lib/archive/read";
import { shareMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const record = await getPublishedRecord("evaluation", id);
  return record ? record.value as EvaluationView : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [evaluation, people] = await Promise.all([load((await params).id), listPeople()]);
  if (!evaluation) return {};
  const share = evaluationShare(evaluation, nameMap(people));
  return shareMetadata(share.title, share.description);
}

// One evaluation on its own page, so it can be linked and shared.
export default async function EvaluationPage({ params }: Props) {
  const { id } = await params;
  const evaluation = await load(id);
  if (!evaluation) notFound();
  const [people, topics, sources] = await Promise.all([listPeople(), listTopics(), getSources(sourceIdsOf([evaluation]))]);
  const names = nameMap(people);
  return <>
    <SiteHeader />
    <main className={styles.shell}>
      <section className={styles.hero}><p className={styles.eyebrow}>시선</p></section>
      <EvaluationCard evaluation={evaluation} sources={sources} names={names} topics={nameMap(topics)} showTarget />
      <p className={styles.more}><Link href={`/people/${evaluation.targetPersonId}?tab=views`}>{names[evaluation.targetPersonId]}에 대한 시선 전체 보기 →</Link></p>
    </main>
  </>;
}
