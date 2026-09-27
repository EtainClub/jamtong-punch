import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvaluationCard, nameMap, SiteHeader } from "@/features/archive/components";
import { shareExtras } from "@/features/archive/share-extras";
import { OtherVoices, ShareWelcome } from "@/features/archive/ShareLanding";
import { evaluationShare } from "@/features/archive/share-text";
import styles from "@/features/archive/archive.module.css";
import { getPublishedRecord, getSources, listPeople, listTopics, outcomesFor, sourceIdsOf, type EvaluationView } from "@/lib/archive/read";
import { shareMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function load(id: string) {
  const record = await getPublishedRecord("evaluation", id);
  return record ? record.value as EvaluationView : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [evaluation, people] = await Promise.all([load((await params).id), listPeople()]);
  if (!evaluation) return {};
  const share = evaluationShare(evaluation, nameMap(people), await shareExtras(evaluation.id, [evaluation.citation]));
  return shareMetadata(share.title, share.description, `/evaluations/${evaluation.id}`);
}

// One evaluation on its own page, so it can be linked and shared.
export default async function EvaluationPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const evaluation = await load(id);
  if (!evaluation) notFound();
  const outcomes = await outcomesFor([evaluation.id]);
  const [people, topics, sources] = await Promise.all([listPeople(), listTopics(), getSources(sourceIdsOf([evaluation, ...Object.values(outcomes).flat()]))]);
  const names = nameMap(people);
  return <>
    <SiteHeader />
    <main className={styles.shell}>
      <section className={styles.hero}><p className={styles.eyebrow}>시선</p></section>
      {query.s === "1" && <ShareWelcome />}
      <EvaluationCard evaluation={evaluation} sources={sources} names={names} topics={nameMap(topics)} outcomes={outcomes} showTarget />
      <p className={styles.more}><Link href={`/people/${evaluation.targetPersonId}?tab=views`}>{names[evaluation.targetPersonId]}에 대한 시선 전체 보기 →</Link></p>
      <OtherVoices topicIds={evaluation.topicIds} recordId={evaluation.id} speakerId={evaluation.evaluator.personId} names={names} />
    </main>
  </>;
}
