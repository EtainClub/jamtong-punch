import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/features/archive/components";
import { ReflexGame } from "@/features/play/ReflexGame";
import styles from "@/features/play/play.module.css";
import { getPerson, getSources, personStatements } from "@/lib/archive/read";
import { citationHref, citationLabel } from "@/lib/content/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; mode: string }> };
const MODES = ["punch", "cheer"] as const;
type Mode = (typeof MODES)[number];

// The game screen is personal: kept out of search and never shared.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, mode } = await params;
  const person = await getPerson(slug);
  return { title: person ? `${person.name} ${mode === "cheer" ? "응원" : "펀치"}` : "게임", robots: { index: false, follow: false } };
}

export default async function ReflexPage({ params }: Props) {
  const { slug, mode } = await params;
  if (!MODES.includes(mode as Mode)) notFound();
  const person = await getPerson(slug);
  if (!person || !person.playable || person.image?.rightsStatus !== "cleared" || !person.image.path) notFound();

  // "Why this person": their latest statement with its source, above the face.
  const latest = (await personStatements(person.id, 1, null)).items[0] ?? null;
  const sources = latest ? await getSources(latest.citations.map((citation) => citation.sourceId)) : {};
  const citation = latest?.citations.find((item) => sources[item.sourceId]);
  const header = latest && citation ? {
    statementId: latest.id,
    headline: latest.headline,
    quote: latest.quote,
    sourceLabel: `${citationLabel(citation, sources[citation.sourceId])} · ${sources[citation.sourceId].publisher}`,
    sourceHref: citationHref(citation, sources[citation.sourceId]),
  } : null;

  return <>
    <SiteHeader />
    <main className={styles.shell}>
      <ReflexGame person={{ id: person.id, name: person.name, imageUrl: person.image.path }} mode={mode as Mode} header={header} backHref={`/people/${person.id}`} />
    </main>
  </>;
}
