import type { Metadata } from "next";
import { currentRole, nameMap, SiteHeader } from "@/features/archive/components";
import { SwipeDeck, type SwipeCard } from "@/features/play/SwipeDeck";
import styles from "@/features/play/play.module.css";
import { getSources, listPeople, personStatements, recentlyPublished, type SourceView, type StatementView } from "@/lib/archive/read";
import { citationHref, citationLabel, formatDate } from "@/lib/content/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "훑어보기", robots: { index: false, follow: false } };

const MAX_CARDS = 25;

function source(statement: StatementView | null, sources: Record<string, SourceView>) {
  const citation = statement?.citations.find((item) => sources[item.sourceId]);
  if (!citation) return { sourceLabel: null, sourceHref: null };
  const found = sources[citation.sourceId];
  return { sourceLabel: `${citationLabel(citation, found)} · ${found.publisher}`, sourceHref: citationHref(citation, found) };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

// Cards carry enough to take a stance from the card alone: who, what they
// said, and the source (implementation-design 7.4). Playable people and
// recently published statements, shuffled per visit.
export default async function SwipePage() {
  const [people, recent] = await Promise.all([listPeople(), recentlyPublished(MAX_CARDS)]);
  const playable = people.filter((person) => person.playable);
  const latest = await Promise.all(playable.map(async (person) => (await personStatements(person.id, 1, null)).items[0] ?? null));
  const statements = recent.flatMap((item) => (item.kind === "statement" ? [item.value] : []));
  const sources = await getSources([...latest, ...statements].flatMap((statement) => statement?.citations.map((citation) => citation.sourceId) ?? []));
  const names = nameMap(people);
  const photos = new Map(people.map((person) => [person.id, person.image?.rightsStatus === "cleared" ? person.image.path : null]));

  const cards: SwipeCard[] = [
    ...playable.map((person, index): SwipeCard => ({
      kind: "person", id: person.id, name: person.name, subtitle: currentRole(person), imageUrl: photos.get(person.id) ?? null,
      line: latest[index]?.headline ?? person.summary, quote: null, href: `/people/${person.id}`, ...source(latest[index], sources),
    })),
    ...statements.map((statement): SwipeCard => ({
      kind: "statement", id: statement.id, name: names[statement.personId] ?? "알 수 없는 인물",
      subtitle: formatDate(statement.occurredAt, statement.datePrecision, { withYear: true, certainty: statement.dateCertainty }),
      imageUrl: photos.get(statement.personId) ?? null, line: statement.headline, quote: statement.quote, href: `/statements/${statement.id}`, ...source(statement, sources),
    })),
  ];

  return <>
    <SiteHeader />
    <main className={styles.shell}>
      <SwipeDeck cards={shuffle(cards).slice(0, MAX_CARDS)} />
    </main>
  </>;
}
