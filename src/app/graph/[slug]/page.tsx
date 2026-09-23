import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/features/archive/components";
import { RelationsSection } from "@/features/archive/RelationsSection";
import styles from "@/features/archive/archive.module.css";
import { getPerson, listPeople } from "@/lib/archive/read";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const person = await getPerson((await params).slug);
  return person ? { title: `${person.name}의 관계도`, description: `${person.name}이 언급하거나 평가한 사람, ${person.name}을 언급하거나 평가한 사람.` } : {};
}

// Stays inside the graph as the reader moves from person to person, so the
// network can be walked without dropping back to profile pages.
export default async function GraphPage({ params }: Props) {
  const { slug } = await params;
  const [person, people] = await Promise.all([getPerson(slug), listPeople()]);
  if (!person) notFound();
  return <>
    <SiteHeader current="people" />
    <main className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>관계도</p>
        <h1><Link href={`/people/${person.id}`}>{person.name}</Link></h1>
        <p>발언으로 이어진 인물 {person.counts.relations}명. 운영자가 아니라 공개 발언이 이 선들을 만들었습니다.</p>
      </section>
      <RelationsSection person={person} people={people} mode="full" />
    </main>
  </>;
}
