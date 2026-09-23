import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Evaluation } from "@/content/schema";
import { EvaluationCard, nameMap, SiteHeader, StatementCard } from "@/features/archive/components";
import { VerifyPanel } from "@/features/archive/VerifyPanel";
import styles from "@/features/archive/archive.module.css";
import { CUSTOM_JSON_ID } from "@/lib/anchor/broadcast";
import { ANCHOR_TYPES, evaluationPayload, statementPayload, type AnchorType, type SourceRefs } from "@/lib/anchor/canonical";
import { ANCHOR_ACCOUNT, STEEM_NODES } from "@/lib/anchor/config";
import { getAnchorVersions, getPublishedRecord, getSources, listPeople, listTopics, sourceIdsOf, type StatementView } from "@/lib/archive/read";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "블록체인 대조" };

type Props = { params: Promise<{ type: string; id: string }> };

export default async function VerifyPage({ params }: Props) {
  const { type: rawType, id } = await params;
  if (!ANCHOR_TYPES.includes(rawType as AnchorType)) notFound();
  const type = rawType as AnchorType;
  const record = await getPublishedRecord(type, id);
  if (!record) notFound();
  const [versions, people, topics, sources] = await Promise.all([
    getAnchorVersions(type, id), listPeople(), listTopics(), getSources(sourceIdsOf([record.value])),
  ]);
  const refs: SourceRefs = Object.fromEntries(Object.entries(sources).map(([sourceId, source]) => [sourceId, { url: source.url, videoId: source.video?.videoId ?? null }]));
  const payload = record.type === "statement" ? statementPayload(record.value as StatementView, refs) : evaluationPayload(record.value as Evaluation, refs);
  const names = nameMap(people);
  const topicNames = nameMap(topics);
  return <>
    <SiteHeader />
    <main className={styles.shell}>
      <section className={styles.hero}><p className={styles.eyebrow}>블록체인 대조</p><h1>이 기록은 바뀌지 않았을까요?</h1></section>
      <div className={styles.viewCard}>{record.type === "statement"
        ? <StatementCard statement={record.value as StatementView} sources={sources} names={names} topics={topicNames} showSpeaker />
        : <EvaluationCard evaluation={record.value as Evaluation} sources={sources} names={names} topics={topicNames} showTarget />}</div>
      <VerifyPanel payload={payload} versions={versions} account={ANCHOR_ACCOUNT} nodes={STEEM_NODES} customJsonId={CUSTOM_JSON_ID} />
    </main>
  </>;
}
