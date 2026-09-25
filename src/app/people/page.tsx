import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, currentRole, Empty, SiteHeader } from "@/features/archive/components";
import styles from "@/features/archive/archive.module.css";
import { listPeople } from "@/lib/archive/read";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "인물" };

export default async function PeoplePage() {
  const people = await listPeople();
  return <>
    <SiteHeader current="people" />
    <main className={styles.wideShell}>
      <section className={styles.hero}><h1>인물</h1><p>공개된 인물 {people.length}명. 각 인물의 언행, 그 인물에 대한 다른 사람들의 평가, 발언으로 이어진 관계를 봅니다.</p></section>
      {people.length ? <ul className={styles.peopleGrid}>{people.map((person) => <li key={person.id}>
        <Link className={styles.personTile} href={`/people/${person.id}`} title={currentRole(person)}><Avatar person={person} size={52} /><div><strong>{person.name}</strong><span className={styles.tileRole}>{currentRole(person)}</span><span>기록 {person.counts.statements} · 평가 {person.counts.evaluationsReceived} · 관계 {person.counts.relations}</span></div></Link>
      </li>)}</ul> : <Empty>공개된 인물이 아직 없습니다.</Empty>}
    </main>
  </>;
}
