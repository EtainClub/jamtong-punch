import Link from "next/link";
import { layoutEgoGraph, neighbourOf } from "@/lib/archive/graph";
import { personRelations, type PersonView } from "@/lib/archive/read";
import { formatShortDate } from "@/lib/content/format";
import { Avatar, Empty } from "./components";
import { RelationGraph } from "./RelationGraph";
import styles from "./archive.module.css";

export function pairHref(left: string, right: string) {
  return `/people/${left}/with/${right}`;
}

// The graph and the list show the same relationships. The list is the
// equivalent path for people who cannot use the picture, and holds every
// neighbour when the graph is capped.
export async function RelationsSection({ person, people, mode }: { person: PersonView; people: PersonView[]; mode: "tab" | "full" }) {
  const relations = await personRelations(person.id);
  const byId = new Map(people.map((item) => [item.id, item]));
  const graph = layoutEgoGraph(person.id, relations, (id) => byId.has(id), mode === "full" ? 420 : 360);
  const neighbourHref = (id: string) => (mode === "full" ? `/graph/${id}` : `/people/${id}?tab=relations`);
  const rows = relations.flatMap((relation) => {
    const other = byId.get(neighbourOf(relation, person.id));
    return other ? [{ relation, other }] : [];
  });
  if (!rows.length) return <Empty>발언으로 이어진 인물이 아직 없습니다. 관계는 한 사람이 다른 사람을 언급하거나 평가한 공개 발언에서만 만들어집니다.</Empty>;

  return <>
    <RelationGraph center={person} graph={graph} members={Object.fromEntries(rows.map(({ other }) => [other.id, other]))} neighbourHref={neighbourHref} pairHref={(id) => pairHref(person.id, id)} />
    {mode === "tab" && <p className={styles.fullGraph}><Link className={styles.chip} href={`/graph/${person.id}`}>관계도 크게 보기</Link></p>}
    <ol className={styles.relations} aria-label="관계 목록">{rows.map(({ relation, other }) => <li key={relation.pairId} className={styles.relationRow}>
      <Link href={pairHref(person.id, other.id)}>
        <Avatar person={other} size={44} />
        <div><strong>{other.name}</strong><span>언급 {relation.counts.mentions} · 평가 {relation.counts.evaluations} · {formatShortDate(relation.firstAt, "month")}–{formatShortDate(relation.lastAt, "month")}</span></div>
        <span className={styles.weight} aria-label={`근거 ${relation.weight}건`}>{relation.weight}</span>
      </Link>
      <Link href={neighbourHref(other.id)} aria-label={`${other.name}의 관계도`}>관계도 →</Link>
    </li>)}</ol>
  </>;
}
