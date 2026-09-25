import type { Names } from "@/features/archive/components";
import type { PersonView, SourceView, StatementView } from "@/lib/archive/read";
import { citationHref, citationLabel, formatDate } from "@/lib/content/format";
import type { Contender } from "./WorldCup";

export const statementContender = (statement: StatementView, names: Names, sources: Record<string, SourceView>): Contender => {
  const citation = statement.citations.find((item) => sources[item.sourceId]);
  const source = citation ? sources[citation.sourceId] : null;
  return {
    id: statement.id,
    title: statement.headline,
    subtitle: `${names[statement.personId] ?? "알 수 없는 인물"} · ${formatDate(statement.occurredAt, statement.datePrecision, { withYear: true, certainty: statement.dateCertainty })}`,
    quote: statement.quote,
    imageUrl: null,
    sourceLabel: citation && source ? `${citationLabel(citation, source)} · ${source.publisher}` : null,
    sourceHref: citation && source ? citationHref(citation, source) : null,
  };
};

export const personContender = (person: PersonView, role: string): Contender => ({
  id: person.id,
  title: person.name,
  subtitle: role,
  quote: null,
  imageUrl: person.image?.rightsStatus === "cleared" ? person.image.path : null,
  sourceLabel: null,
  sourceHref: null,
});

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

// The largest bracket (16, else 8) the pool can fill; null below 8.
export function bracketSize(available: number): 8 | 16 | null {
  return available >= 16 ? 16 : available >= 8 ? 8 : null;
}
