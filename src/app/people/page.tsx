import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, currentRole, Empty, SiteHeader } from "@/features/archive/components";
import styles from "@/features/archive/archive.module.css";
import { listPeople, type PersonCounts } from "@/lib/archive/read";
import { CheerGauge } from "@/features/archive/CheerGauge";
import { getPublicStatsIndex, getRatioFlags, ratioHidden } from "@/lib/stats/read";
import { MIN_PARTICIPANTS, present } from "@/lib/stats/present";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "인물" };

// Most connected first by default; ties fall back to the other counts, then the name.
const SORTS = [["relations", "관계 많은 순"], ["statements", "기록 많은 순"], ["evaluations", "평가 많은 순"], ["cheer", "응원율 높은 순"]] as const;
type Sort = (typeof SORTS)[number][0];
type CountSort = Exclude<Sort, "cheer">;
const KEY: Record<CountSort, keyof PersonCounts> = { relations: "relations", statements: "statements", evaluations: "evaluationsReceived" };
const TIES: Record<CountSort, CountSort[]> = { relations: ["statements", "evaluations"], statements: ["relations", "evaluations"], evaluations: ["relations", "statements"] };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PeoplePage({ searchParams }: Props) {
  const query = await searchParams;
  const sort: Sort = SORTS.some(([key]) => key === query.sort) ? query.sort as Sort : "relations";
  const countSort = sort === "cheer" ? "relations" : sort;
  const order = [countSort, ...TIES[countSort]].map((key) => KEY[key]);
  const [registeredPeople, statsIndex, flags] = await Promise.all([listPeople(), getPublicStatsIndex(), getRatioFlags()]);
  const figures = new Map(registeredPeople.map((person) => {
    const hidden = ratioHidden(flags, person.id);
    const counts = hidden ? null : statsIndex?.s?.[person.id]?.d30;
    const figure = present({ punch: Number(counts?.punch ?? 0), cheer: Number(counts?.cheer ?? 0), unknown: Number(counts?.unknown ?? 0) });
    return [person.id, { hidden, figure, rate: hidden || figure.ratio === null ? null : 100 - figure.ratio }] as const;
  }));
  const people = [...registeredPeople].sort((left, right) => {
    if (sort === "cheer") {
      const leftRate = figures.get(left.id)!.rate;
      const rightRate = figures.get(right.id)!.rate;
      if (leftRate !== rightRate) return (rightRate ?? -1) - (leftRate ?? -1);
    }
    for (const key of order) if (right.counts[key] !== left.counts[key]) return right.counts[key] - left.counts[key];
    return left.name.localeCompare(right.name, "ko");
  });
  const count = (label: string, value: number, active: boolean) => active ? <b>{label} {value}</b> : <>{label} {value}</>;
  return <>
    <SiteHeader current="people" />
    <main className={styles.wideShell}>
      <section className={styles.hero}><h1>인물</h1><p>공개된 인물 {registeredPeople.length}명. 각 인물의 언행, 그 인물에 대한 다른 사람들의 평가, 발언으로 이어진 관계를 봅니다.</p><p>응원율은 최근 30일 응원 ÷ (응원 + 펀치)이며, 참여 {MIN_PARTICIPANTS}명부터 표시합니다. 임통 참여자의 기록이며 여론조사가 아닙니다.</p></section>
      <ul className={styles.sortChips} aria-label="정렬">{SORTS.map(([key, label]) => <li key={key}>
        <Link className={styles.chip} href={key === "relations" ? "/people" : `/people?sort=${key}`} aria-current={sort === key}>{label}</Link>
      </li>)}</ul>
      {people.length ? <ul className={styles.peopleGrid}>{people.map((person) => {
        const { hidden, figure, rate } = figures.get(person.id)!;
        return <li key={person.id}>
          <Link className={styles.personTile} href={`/people/${person.id}`} title={currentRole(person)}><Avatar person={person} size={52} /><div className={styles.tileInfo}><strong>{person.name}</strong><span className={styles.tileRole}>{currentRole(person)}</span>
            <span>{count("기록", person.counts.statements, sort === "statements")} · {count("평가", person.counts.evaluationsReceived, sort === "evaluations")} · {count("관계", person.counts.relations, sort === "relations")}</span>
            {!hidden && <span>30일 · 참여 {figure.n.toLocaleString("ko-KR")}명</span>}</div>
            <CheerGauge rate={rate} hidden={hidden} />
          </Link>
        </li>;
      })}</ul> : <Empty>공개된 인물이 아직 없습니다.</Empty>}
    </main>
  </>;
}
