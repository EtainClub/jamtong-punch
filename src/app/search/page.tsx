import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, currentRole, nameMap, SiteHeader } from "@/features/archive/components";
import styles from "@/features/archive/archive.module.css";
import { listPeople, listTopics, publishedEvaluations, publishedStatements } from "@/lib/archive/read";
import { searchArchive } from "@/lib/archive/search";
import { formatDate } from "@/lib/content/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "검색", robots: { index: false, follow: true } };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const query = ((await searchParams).q ?? "").trim().slice(0, 80);
  const [people, statements, evaluations, topics] = await Promise.all([listPeople(), publishedStatements(), publishedEvaluations(), listTopics()]);
  const results = searchArchive(query, { people, statements, evaluations, topics });
  const names = nameMap(people);
  const total = results.people.length + results.statements.length + results.evaluations.length;
  return <>
    <SiteHeader current="search" />
    <main className={styles.shell}>
      <section className={styles.hero}>
        <h1>검색</h1>
        <form className={styles.searchForm} action="/search" role="search">
          <input name="q" defaultValue={query} placeholder="인물, 발언, 쟁점 (예: 유시민 검찰개혁)" aria-label="검색어" autoFocus={!query} />
          <button type="submit">찾기</button>
        </form>
        {query && <p>&lsquo;{query}&rsquo; 검색 결과 {total}건</p>}
      </section>

      {results.people.length > 0 && <section className={styles.section} aria-labelledby="found-people">
        <h2 id="found-people">인물 {results.people.length}</h2>
        <ul className={styles.results}>{results.people.map((person) => <li key={person.id}><Link href={`/people/${person.id}`} className={styles.resultPerson}><Avatar person={person} size={40} /><span><b>{person.name}</b><small>{currentRole(person)}</small></span></Link></li>)}</ul>
      </section>}

      {results.statements.length > 0 && <section className={styles.section} aria-labelledby="found-statements">
        <h2 id="found-statements">언행 {results.statements.length}</h2>
        <ul className={styles.results}>{results.statements.map((statement) => <li key={statement.id}>
          <Link href={`/statements/${statement.id}`}><b>{statement.headline}</b></Link>
          <small>{names[statement.personId]} · {formatDate(statement.occurredAt, statement.datePrecision, { withYear: true, certainty: statement.dateCertainty })}</small>
          {statement.quote && <q>{statement.quote}</q>}
        </li>)}</ul>
      </section>}

      {results.evaluations.length > 0 && <section className={styles.section} aria-labelledby="found-evaluations">
        <h2 id="found-evaluations">시선 {results.evaluations.length}</h2>
        <ul className={styles.results}>{results.evaluations.map((evaluation) => <li key={evaluation.id}>
          <Link href={`/evaluations/${evaluation.id}`}><b>{evaluation.claim}</b></Link>
          <small>{evaluation.evaluator.name} → {names[evaluation.targetPersonId]} · {formatDate(evaluation.occurredAt, evaluation.datePrecision, { withYear: true, certainty: evaluation.dateCertainty })}</small>
        </li>)}</ul>
      </section>}

      {query && total === 0 && <p className={styles.empty}>찾은 기록이 없습니다. 다른 낱말로 찾아보거나, 빠진 기록이 있다면 <Link href="/contribute">직접 등록</Link>해 주세요.</p>}
    </main>
  </>;
}
