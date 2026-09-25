import Link from "next/link";
import styles from "./hub.module.css";

// Step one of a random world cup: pick one of the fixed questions.
export function QuestionPicker({ title, lead, basePath, questions, note }: {
  title: string;
  lead: string;
  basePath: string;
  questions: Array<{ id: string; label: string }>;
  note?: string;
}) {
  return <section className={styles.hero}>
    <p className={styles.eyebrow}>임통 · 월드컵</p>
    <h1>{title}</h1>
    <p>{lead}</p>
    <ul className={styles.questions}>{questions.map((question) => <li key={question.id}><Link href={`${basePath}?q=${question.id}`}>{question.label}<span aria-hidden="true">→</span></Link></li>)}</ul>
    {note && <p className={styles.note}>{note}</p>}
  </section>;
}
