import Link from "next/link";
import { outcomesFor, topicEvaluations, topicStatements, type TopicView } from "@/lib/archive/read";
import { formatShortDate } from "@/lib/content/format";
import type { Names } from "./components";
import { LIFE_DOORS } from "./life";
import styles from "./archive.module.css";

// The home page's first choice for a newcomer: everyday topics, each with how
// many records it holds, how many already have "그 후 실제로는", and the latest.
export async function LifeDoors({ topics, names }: { topics: TopicView[]; names: Names }) {
  const doors = LIFE_DOORS.flatMap((door) => {
    const topic = topics.find((item) => item.id === door.topicId);
    return topic && topic.counts.statements + topic.counts.evaluations > 0 ? [{ ...door, topic }] : [];
  });
  if (!doors.length) return null;
  const filled = await Promise.all(doors.map(async (door) => {
    const [statements, evaluations] = await Promise.all([topicStatements(door.topicId, 50), topicEvaluations(door.topicId)]);
    const records = [
      ...statements.items.map((item) => ({ id: item.id, at: item.occurredAt, who: names[item.personId] ?? "", text: item.headline })),
      ...evaluations.map((item) => ({ id: item.id, at: item.occurredAt, who: item.evaluator.name, text: item.claim })),
    ].sort((left, right) => right.at.localeCompare(left.at));
    const outcomes = await outcomesFor(records.map((item) => item.id));
    return { ...door, count: records.length, withOutcome: records.filter((item) => outcomes[item.id]).length, latest: records[0] };
  }));
  return <section className={styles.section} aria-labelledby="life-title">
    <div className={styles.sectionHead}><h2 id="life-title">내 생활에서 시작하기</h2></div>
    <p className={styles.note}>정치에 관심이 없어도 괜찮습니다. 집값·기름값처럼 내 생활과 닿는 문제에서, 누가 무슨 말을 했고 그 뒤 실제로 어떻게 됐는지 보세요.</p>
    <ul className={styles.lifeDoors}>{filled.map((door) => <li key={door.topicId}>
      <Link href={`/topics/${door.topicId}`}>
        <span className={styles.lifeIcon} aria-hidden="true">{door.icon}</span>
        <strong>{door.topic.name}</strong>
        <span className={styles.lifeAbout}>{door.about}</span>
        <span className={styles.lifeCount}>기록 {door.count}{door.withOutcome > 0 && <> · <b>그 후 결과 {door.withOutcome}</b></>}</span>
        {door.latest && <span className={styles.lifeLatest}>{door.latest.who} · {formatShortDate(door.latest.at)} — {door.latest.text}</span>}
      </Link>
    </li>)}</ul>
  </section>;
}
