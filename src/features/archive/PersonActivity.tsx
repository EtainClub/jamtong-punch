import Link from "next/link";
import type { EvaluationView, StatementView } from "@/lib/archive/read";
import styles from "./archive.module.css";

const MAX_YEARS = 12;

type Row = { key: "statements" | "evaluations"; label: string; counts: Map<number, number>; href: (year: number) => string };

// Two small bar rows by year: what the person said, and what others said
// about them. Separate rows (not two colors in one chart) so each has its own
// scale and its own title; one ink color, no legend needed. A bar links to
// that year of the record; the same numbers are in the table for screen
// readers.
export function PersonActivity({ statements, evaluations, statementYearHref, viewsHref }: {
  statements: StatementView[];
  evaluations: EvaluationView[];
  statementYearHref: (year: number) => string;
  viewsHref: string;
}) {
  const yearOf = (date: string) => Number(date.slice(0, 4));
  const count = (dates: string[]) => dates.reduce((map, date) => map.set(yearOf(date), (map.get(yearOf(date)) ?? 0) + 1), new Map<number, number>());
  const rows: Row[] = [
    { key: "statements", label: "언행", counts: count(statements.map((item) => item.occurredAt)), href: statementYearHref },
    { key: "evaluations", label: "받은 평가", counts: count(evaluations.map((item) => item.occurredAt)), href: () => viewsHref },
  ];
  const years = [...new Set(rows.flatMap((row) => [...row.counts.keys()]))];
  if (!years.length) return null;
  const last = Math.max(...years);
  const first = Math.max(Math.min(...years), last - MAX_YEARS + 1);
  const span = Array.from({ length: last - first + 1 }, (_, index) => first + index);

  return <section className={styles.activity} aria-labelledby="activity-title">
    <h2 id="activity-title">연도별 기록</h2>
    {rows.map((row) => {
      const max = Math.max(1, ...row.counts.values());
      return <div key={row.key} className={styles.activityRow}>
        <span className={styles.activityLabel}>{row.label}</span>
        <ol style={{ gridTemplateColumns: `repeat(${span.length}, minmax(0, 1fr))` }} aria-hidden="true">{span.map((year) => {
          const value = row.counts.get(year) ?? 0;
          const bar = <span className={styles.bar} style={{ height: value ? `${Math.max(12, (value / max) * 100)}%` : "2px" }} />;
          return <li key={year} title={`${year}년 ${row.label} ${value}건`}>{value ? <Link href={row.href(year)} tabIndex={-1}>{bar}</Link> : bar}</li>;
        })}</ol>
      </div>;
    })}
    <ol className={styles.activityYears} style={{ gridTemplateColumns: `repeat(${span.length}, minmax(0, 1fr))` }} aria-hidden="true">{span.map((year) => <li key={year}>{year === first || year === last || span.length <= 6 ? `'${String(year).slice(2)}` : ""}</li>)}</ol>
    <table className={styles.visuallyHidden}>
      <caption>연도별 언행과 받은 평가 건수</caption>
      <thead><tr><th scope="col">연도</th>{rows.map((row) => <th key={row.key} scope="col">{row.label}</th>)}</tr></thead>
      <tbody>{span.map((year) => <tr key={year}><th scope="row">{year}</th>{rows.map((row) => <td key={row.key}>{row.counts.get(year) ?? 0}</td>)}</tr>)}</tbody>
    </table>
  </section>;
}
