import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, currentRole, Empty, SiteHeader } from "@/features/archive/components";
import styles from "@/features/archive/archive.module.css";
import { listPeople, type PersonCounts } from "@/lib/archive/read";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "인물" };

// Most connected first by default; ties fall back to the other counts, then the name.
const SORTS = [["relations", "관계 많은 순"], ["statements", "기록 많은 순"], ["evaluations", "평가 많은 순"]] as const;
type Sort = (typeof SORTS)[number][0];
const KEY: Record<Sort, keyof PersonCounts> = { relations: "relations", statements: "statements", evaluations: "evaluationsReceived" };
const TIES: Record<Sort, Sort[]> = { relations: ["statements", "evaluations"], statements: ["relations", "evaluations"], evaluations: ["relations", "statements"] };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PeoplePage({ searchParams }: Props) {
  const query = await searchParams;
  const sort: Sort = SORTS.some(([key]) => key === query.sort) ? query.sort as Sort : "relations";
  const order = [sort, ...TIES[sort]].map((key) => KEY[key]);
  const people = [...await listPeople()].sort((left, right) => {
    for (const key of order) if (right.counts[key] !== left.counts[key]) return right.counts[key] - left.counts[key];
    return left.name.localeCompare(right.name, "ko");
  });
  const count = (label: string, value: number, active: boolean) => active ? <b>{label} {value}</b> : <>{label} {value}</>;
  return <>
    <SiteHeader current="people" />
    <main className={styles.wideShell}>
      <section className={styles.hero}><h1>인물</h1><p>공개된 인물 {people.length}명. 각 인물의 언행, 그 인물에 대한 다른 사람들의 평가, 발언으로 이어진 관계를 봅니다.</p></section>
      <ul className={styles.sortChips} aria-label="정렬">{SORTS.map(([key, label]) => <li key={key}>
        <Link className={styles.chip} href={key === "relations" ? "/people" : `/people?sort=${key}`} aria-current={sort === key}>{label}</Link>
      </li>)}</ul>
      {people.length ? <ul className={styles.peopleGrid}>{people.map((person) => <li key={person.id}>
        <Link className={styles.personTile} href={`/people/${person.id}`} title={currentRole(person)}><Avatar person={person} size={52} /><div><strong>{person.name}</strong><span className={styles.tileRole}>{currentRole(person)}</span>
          <span>{count("기록", person.counts.statements, sort === "statements")} · {count("평가", person.counts.evaluationsReceived, sort === "evaluations")} · {count("관계", person.counts.relations, sort === "relations")}</span></div></Link>
      </li>)}</ul> : <Empty>공개된 인물이 아직 없습니다.</Empty>}
    </main>
  </>;
}
