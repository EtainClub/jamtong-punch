import Link from "next/link";
import { neighbourOf } from "@/lib/archive/graph";
import { personRelations, type PersonView } from "@/lib/archive/read";
import { Avatar } from "./components";
import { pairHref } from "./RelationsSection";
import styles from "./archive.module.css";

const SHOWN = 5;

// The strongest few connections, under the profile on every tab. The full
// graph and list stay on the 관계 tab.
export async function RelationPreview({ person, people }: { person: PersonView; people: PersonView[] }) {
  const relations = await personRelations(person.id);
  const byId = new Map(people.map((item) => [item.id, item]));
  const rows = relations.flatMap((relation) => {
    const other = byId.get(neighbourOf(relation, person.id));
    return other ? [{ relation, other }] : [];
  }).slice(0, SHOWN);
  if (!rows.length) return null;
  return <section className={styles.relationPreview} aria-labelledby="relation-preview-title">
    <div className={styles.relationPreviewHead}><h2 id="relation-preview-title">발언으로 이어진 사람</h2><Link href={`/people/${person.id}?tab=relations`}>관계도 보기 →</Link></div>
    <ul>{rows.map(({ relation, other }) => <li key={relation.pairId}><Link href={pairHref(person.id, other.id)} title={`언급 ${relation.counts.mentions} · 평가 ${relation.counts.evaluations}`}><Avatar person={other} size={28} />{other.name}<b>{relation.weight}</b></Link></li>)}</ul>
  </section>;
}
