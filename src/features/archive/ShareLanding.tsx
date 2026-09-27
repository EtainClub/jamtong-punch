import Link from "next/link";
import { topicEvaluations, topicStatements } from "@/lib/archive/read";
import { formatShortDate } from "@/lib/content/format";
import type { Names } from "./components";
import styles from "./archive.module.css";

// Shown above a record opened from a shared link (?s=1): someone sent it, so
// say in one breath what 임통 is and where to start.
export function ShareWelcome() {
  return <aside className={styles.shareWelcome}>
    <strong>누군가 이 기록을 보냈네요</strong>
    <p>임통은 정치인·언론인·유튜버가 공개적으로 한 말을 원자료와 함께 남기는 곳입니다. 누가 옳은지 대신 정하지 않습니다. 원문과 출처, 그 뒤 실제로 어떻게 됐는지를 직접 확인하세요.</p>
    <Link href="/guide">처음이라면 둘러보기 →</Link>
  </aside>;
}

// Below a record: what other people said on the same topics, so one shared
// quote is never the whole picture.
export async function OtherVoices({ topicIds, recordId, speakerId, names }: { topicIds: string[]; recordId: string; speakerId: string | null; names: Names }) {
  const topics = topicIds.slice(0, 3);
  if (!topics.length) return null;
  const lists = await Promise.all(topics.map(async (topicId) => {
    const [statements, evaluations] = await Promise.all([topicStatements(topicId, 20), topicEvaluations(topicId)]);
    return [
      ...statements.items.filter((item) => item.personId !== speakerId).map((item) => ({ id: item.id, at: item.occurredAt, who: names[item.personId] ?? "", text: item.headline, href: `/statements/${item.id}` })),
      ...evaluations.filter((item) => item.evaluator.personId !== speakerId).map((item) => ({ id: item.id, at: item.occurredAt, who: `${item.evaluator.name} → ${names[item.targetPersonId] ?? ""}`, text: item.claim, href: `/evaluations/${item.id}` })),
    ];
  }));
  const seen = new Set([recordId]);
  const items = lists.flat().filter((item) => !seen.has(item.id) && seen.add(item.id)).sort((left, right) => right.at.localeCompare(left.at)).slice(0, 5);
  if (!items.length) return null;
  return <section className={styles.section} aria-labelledby="other-voices-title">
    <div className={styles.sectionHead}><h2 id="other-voices-title">같은 쟁점, 다른 사람의 말</h2></div>
    <ol className={styles.otherVoices}>{items.map((item) => <li key={item.id}>
      <small>{item.who} · {formatShortDate(item.at)}</small>
      <Link href={item.href}>{item.text}</Link>
    </li>)}</ol>
  </section>;
}
