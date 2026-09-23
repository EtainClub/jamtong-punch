"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./archive.module.css";

type Entry = { id: string; name: string; aliases: string[]; role: string };

export function PeopleSearch({ people }: { people: Entry[] }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko-KR");
    if (!normalized) return [];
    return people.filter((person) => [person.name, ...person.aliases].some((name) => name.toLocaleLowerCase("ko-KR").includes(normalized))).slice(0, 8);
  }, [people, query]);
  return <div role="search">
    <label className={styles.search}><span aria-hidden="true">⌕</span><span className="srOnly">인물 검색</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="인물 검색" /></label>
    {query.trim() && <ul className={styles.searchResults} aria-live="polite">
      {results.length ? results.map((person) => <li key={person.id}><Link href={`/people/${person.id}`}><strong>{person.name}</strong><span className={styles.muted}>{person.role}</span></Link></li>) : <li className={styles.note}>찾는 인물이 아직 없습니다.</li>}
    </ul>}
  </div>;
}
