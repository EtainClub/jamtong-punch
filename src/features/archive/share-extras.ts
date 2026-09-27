import type { Citation, Outcome } from "@/content/schema";
import { getSources, outcomesFor } from "@/lib/archive/read";
import type { ShareExtras } from "./share-text";

// The first citation's publisher and the latest "그 후 실제로는" of a record,
// for its title, search snippet and preview image.
export async function shareExtras(id: string, citations: Citation[]): Promise<ShareExtras> {
  const [outcomes, sources] = await Promise.all([outcomesFor([id]), getSources(citations.slice(0, 1).map((citation) => citation.sourceId))]);
  return { publisher: citations[0] ? sources[citations[0].sourceId]?.publisher ?? null : null, outcome: outcomes[id]?.at(-1) ?? null };
}

// One line for a preview image: the first figures if there are any (the
// numbers are the point), otherwise the summary.
export function outcomeLine(outcome: Outcome): string {
  return outcome.figures.length ? outcome.figures.slice(0, 2).map((figure) => `${figure.label} ${figure.value}`).join(" · ") : outcome.summary;
}
