import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, currentRole, SiteHeader } from "@/features/archive/components";
import styles from "@/features/play/hub.module.css";
import { listPeople } from "@/lib/archive/read";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "펀치 · 응원", robots: { index: false, follow: false } };

export default async function ReflexPickPage() {
  const playable = (await listPeople()).filter((person) => person.playable);
  return <>
    <SiteHeader current="play" />
    <main className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}><Link href="/play">게임</Link> · 펀치 · 응원</p>
        <h1>누구로 할까요?</h1>
        <p>게임 한 판이 끝나면 그 사람에 대한 오늘의 입장 1건이 기록됩니다.</p>
      </section>
      {playable.length ? <ul className={styles.people}>{playable.map((person) => <li key={person.id}>
        <Avatar person={person} size={56} />
        <span className={styles.who}><b>{person.name}</b><small>{currentRole(person)}</small></span>
        <span className={styles.modes}><Link className={styles.punch} href={`/people/${person.id}/play/punch`}>👊 펀치</Link><Link className={styles.cheer} href={`/people/${person.id}/play/cheer`}>👏 응원</Link></span>
      </li>)}</ul> : <p className={styles.empty}>게임에 쓸 수 있는 인물이 아직 없습니다.</p>}
    </main>
  </>;
}
