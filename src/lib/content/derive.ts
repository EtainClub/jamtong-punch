import type { Citation, Evaluation, Event, Person, Relationship, RelationshipEvidence, Statement } from "@/content/schema";

export const EVIDENCE_CAP = 100;

// Labels that classify a person's allegiance. The archive links records; it
// does not sort people into camps. The list cannot be complete, but it stops
// the common slip in a field that is meant to hold only titles and facts.
const LABEL_WORDS = ["친명", "비명", "반명", "친윤", "반윤", "친문", "비문", "친노", "배신", "배신자", "변절", "우호적", "적대적", "아군", "적군"];

export function labelWordsIn(text: string): string[] {
  return LABEL_WORDS.filter((word) => text.includes(word));
}

export function pairId(left: string, right: string): string {
  if (left === right) throw new Error("a relationship needs two people");
  return left < right ? `${left}__${right}` : `${right}__${left}`;
}

export function pairMembers(id: string): [string, string] {
  const [left, right] = id.split("__");
  return [left, right];
}

export function memberIds(event: Pick<Event, "participants">): string[] {
  return event.participants.map((item) => item.personId).sort();
}

export function citationSourceIds(citations: Citation[]): string[] {
  return [...new Set(citations.map((citation) => citation.sourceId))].sort();
}

export function personSourceIds(person: Person): string[] {
  return citationSourceIds(person.roles.map((role) => role.citation));
}

// ---------------------------------------------------------------- mentions

export type NameEntry = Pick<Person, "id" | "name" | "aliases">;

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Korean names take particles directly ("이재명은", "이재명이"), so Hangul terms
// match as substrings. Latin terms (Lee Jae-myung) need word boundaries so
// "Lee" alone does not match "Leeds".
function termPattern(term: string): RegExp {
  const escaped = escapeRegExp(term.trim()).replace(/\s+/g, "\\s+");
  return /[A-Za-z]/.test(term) ? new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, "i") : new RegExp(escaped);
}

// Who a quote names. Relationships are built only from this: an operator
// cannot declare that two people are connected, only record what was said.
export function detectMentions(quote: string | null, speakerId: string, people: NameEntry[]): string[] {
  if (!quote) return [];
  const found = new Set<string>();
  for (const person of people) {
    if (person.id === speakerId) continue;
    const terms = [person.name, ...person.aliases].filter((term) => term.trim().length >= 2);
    if (terms.some((term) => termPattern(term).test(quote))) found.add(person.id);
  }
  return [...found].sort();
}

export function mentionedPersonIds(statement: Pick<Statement, "quote" | "personId" | "mentionExclusions">, people: NameEntry[]): string[] {
  const excluded = new Set(statement.mentionExclusions);
  return detectMentions(statement.quote, statement.personId, people).filter((id) => !excluded.has(id));
}

// ---------------------------------------------------------------- relationships

export function statementPairs(statement: Pick<Statement, "personId"> & { mentionedPersonIds: string[] }): string[] {
  return [...new Set(statement.mentionedPersonIds.filter((id) => id !== statement.personId).map((id) => pairId(statement.personId, id)))];
}

export function evaluationPairs(evaluation: Pick<Evaluation, "evaluator" | "targetPersonId">): string[] {
  const from = evaluation.evaluator.personId;
  return from && from !== evaluation.targetPersonId ? [pairId(from, evaluation.targetPersonId)] : [];
}

export function mentionEvidence(statement: Statement): RelationshipEvidence {
  return { type: "mention", id: statement.id, at: statement.occurredAt, from: statement.personId, headline: statement.headline };
}

export function evaluationEvidence(evaluation: Evaluation): RelationshipEvidence {
  return { type: "evaluation", id: evaluation.id, at: evaluation.occurredAt, from: evaluation.evaluator.personId, headline: evaluation.claim };
}

export function buildRelationship(id: string, evidence: RelationshipEvidence[]): Relationship | null {
  if (!evidence.length) return null;
  const sorted = [...evidence].sort((left, right) => left.at.localeCompare(right.at) || left.id.localeCompare(right.id));
  const counts = { mentions: 0, evaluations: 0 };
  for (const item of sorted) {
    if (item.type === "mention") counts.mentions += 1;
    else counts.evaluations += 1;
  }
  return {
    pairId: id,
    personIds: pairMembers(id),
    weight: sorted.length,
    counts,
    firstAt: sorted[0].at,
    lastAt: sorted.at(-1)!.at,
    evidence: sorted.slice(-EVIDENCE_CAP),
  };
}

// Prefix tokens for `array-contains` search. Korean names are short, so every
// prefix of every word (and of the whole name without spaces) is enough.
export function searchTokens(name: string, aliases: string[]): string[] {
  const tokens = new Set<string>();
  for (const text of [name, ...aliases]) {
    const normalized = text.normalize("NFC").toLocaleLowerCase("ko-KR").trim();
    for (const word of [normalized.replace(/\s+/g, ""), ...normalized.split(/\s+/)]) {
      for (let length = 1; length <= Math.min(word.length, 20); length += 1) tokens.add(word.slice(0, length));
    }
  }
  tokens.delete("");
  return [...tokens].sort();
}
