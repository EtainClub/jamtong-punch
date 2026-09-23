import type { Citation, Evaluation, Statement } from "@/content/schema";

// The exact bytes whose SHA-256 goes on chain. Server and browser both run
// this, so it must stay pure and deterministic: keys sorted, strings in NFC,
// no dates or ids that are not part of the record itself.
//
// Changing what goes in here changes every hash. Bump ANCHOR_FORMAT when it
// changes, and keep the old rule so old anchors can still be checked.

export const ANCHOR_FORMAT = "imtong-anchor/1";
export const ANCHOR_TYPES = ["statement", "evaluation"] as const;
export type AnchorType = (typeof ANCHOR_TYPES)[number];

type SourceRef = { url: string; videoId: string | null };
export type SourceRefs = Record<string, SourceRef>;

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().flatMap((key) => {
      const entry = (value as Record<string, unknown>)[key];
      return entry === undefined ? [] : [[key, sortDeep(entry)]];
    }));
  }
  return typeof value === "string" ? value.normalize("NFC") : value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

// Citations carry the source's identity (url, video) and the kept transcript,
// not its editable title: renaming a source is not a change to what was said.
function citation(value: Citation, sources: SourceRefs) {
  const source = sources[value.sourceId];
  if (!source) throw new Error(`missing source for anchor: ${value.sourceId}`);
  return { source, startSec: value.startSec, endSec: value.endSec, locator: value.locator, transcript: value.transcript };
}

export function statementPayload(value: Statement, sources: SourceRefs) {
  return {
    schema: ANCHOR_FORMAT,
    type: "statement",
    id: value.id,
    personId: value.personId,
    occurredAt: value.occurredAt,
    datePrecision: value.datePrecision,
    kind: value.kind,
    headline: value.headline,
    quote: value.quote,
    context: value.context,
    assertionType: value.assertionType,
    topicIds: [...value.topicIds].sort(),
    eventId: value.eventId,
    citations: value.citations.map((item) => citation(item, sources)),
    corrections: value.corrections,
  };
}

export function evaluationPayload(value: Evaluation, sources: SourceRefs) {
  return {
    schema: ANCHOR_FORMAT,
    type: "evaluation",
    id: value.id,
    targetPersonId: value.targetPersonId,
    evaluator: value.evaluator,
    occurredAt: value.occurredAt,
    datePrecision: value.datePrecision,
    format: value.format,
    claim: value.claim,
    quote: value.quote,
    citation: citation(value.citation, sources),
    topicIds: [...value.topicIds].sort(),
    eventIds: [...value.eventIds].sort(),
    respondsTo: value.respondsTo,
    corrections: value.corrections,
  };
}

// Web Crypto exists in browsers and in Node 20+, so one function serves both.
export async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function payloadHash(payload: unknown): Promise<string> {
  return sha256Hex(canonicalJson(payload));
}
