import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvaluationCard, nameMap, SiteHeader, StatementCard, type Outcomes } from "@/features/archive/components";
import { VerifyPanel } from "@/features/archive/VerifyPanel";
import styles from "@/features/archive/archive.module.css";
import { CUSTOM_JSON_ID } from "@/lib/anchor/broadcast";
import { ANCHOR_TYPES, payloadFor, type AnchorType, type SourceRefs } from "@/lib/anchor/canonical";
import { ANCHOR_ACCOUNT, STEEM_NODES } from "@/lib/anchor/config";
import { getAnchorVersions, getPublishedRecord, getSources, listPeople, listTopics, sourceIdsOf, type PublishedRecord } from "@/lib/archive/read";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "블록체인 대조" };

type Props = { params: Promise<{ type: string; id: string }> };

export default async function VerifyPage({ params }: Props) {
  const { type: rawType, id } = await params;
  if (!ANCHOR_TYPES.includes(rawType as AnchorType)) notFound();
  const type = rawType as AnchorType;
  const record = await getPublishedRecord(type, id);
  if (!record) notFound();
  // An outcome is shown inside the record it follows, so that record is
  // loaded too; only the outcome itself is hashed and compared.
  const subject = record.type === "outcome" ? await getPublishedRecord(record.value.subject.type, record.value.subject.id) : null;
  const [versions, people, topics, sources] = await Promise.all([
    getAnchorVersions(type, id), listPeople(), listTopics(), getSources(sourceIdsOf([record.value, ...(subject ? [subject.value] : [])])),
  ]);
  const refs: SourceRefs = Object.fromEntries(Object.entries(sources).map(([sourceId, source]) => [sourceId, { url: source.url, videoId: source.video?.videoId ?? null }]));
  const payload = payloadFor(type, record.value, refs);
  const names = nameMap(people);
  const topicNames = nameMap(topics);
  const card = (item: PublishedRecord, outcomes?: Outcomes) => item.type === "statement"
    ? <StatementCard statement={item.value} sources={sources} names={names} topics={topicNames} showSpeaker outcomes={outcomes} />
    : item.type === "evaluation" ? <EvaluationCard evaluation={item.value} sources={sources} names={names} topics={topicNames} showTarget outcomes={outcomes} /> : null;
  return <>
    <SiteHeader />
    <main className={styles.shell}>
      <section className={styles.hero}><p className={styles.eyebrow}>블록체인 대조</p><h1>이 기록은 바뀌지 않았을까요?</h1>
        {record.type === "outcome" && <p>아래 카드 안의 &lsquo;그 후 실제로는&rsquo;을 대조합니다. 카드는 이 결과가 뒤따르는 원래 기록입니다{subject && <> (<Link href={`/verify/${subject.type}/${subject.value.id}`}>원래 기록 대조</Link>)</>}.</p>}
      </section>
      <div className={styles.viewCard}>{record.type === "outcome"
        ? subject && card(subject, { [record.value.subject.id]: [record.value] })
        : card(record)}</div>
      <VerifyPanel payload={payload} versions={versions} account={ANCHOR_ACCOUNT} nodes={STEEM_NODES} customJsonId={CUSTOM_JSON_ID} />
    </main>
  </>;
}
