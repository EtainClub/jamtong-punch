// Pure helpers for the ops content forms. Kept out of the component so the
// timecode and YouTube parsing can be unit tested.

import { formatTimecode } from "@/lib/content/format";

export { formatTimecode };

export const contentTypes = [
  ["people", "인물"],
  ["statements", "언행"],
  ["evaluations", "평가"],
  ["events", "사건"],
  ["topics", "쟁점"],
  ["sources", "출처"],
  ["brackets", "월드컵"],
] as const;

export type ContentType = (typeof contentTypes)[number][0];
export type Draft = Record<string, unknown> & { id: string };
export type Citation = { sourceId: string; startSec: number | null; endSec: number | null; locator: string | null; transcript: string | null; transcriptOrigin: "manual" | "auto-caption" | "asr" | null; transcriptVerified: boolean };

export function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function generatedId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function slugify(value: string) {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const emptyCitation = (): Citation => ({ sourceId: "", startSec: null, endSec: null, locator: null, transcript: null, transcriptOrigin: null, transcriptVerified: false });

export function emptyDraft(type: ContentType): Draft {
  const base = { status: "draft", corrections: [] };
  switch (type) {
    case "people": return { id: generatedId("person"), name: "", aliases: [], roles: [], summary: "", image: null, playable: false, ...base };
    case "statements": return { id: generatedId("statement"), personId: "", occurredAt: today(), datePrecision: "day", kind: "remark", headline: "", quote: null, context: "", citations: [emptyCitation()], topicIds: [], eventId: null, mentionExclusions: [], assertionType: "FACT", ...base };
    case "evaluations": return { id: generatedId("evaluation"), targetPersonId: "", evaluator: { personId: null, name: "", descriptor: "" }, occurredAt: today(), datePrecision: "day", format: "video", claim: "", quote: null, citation: emptyCitation(), topicIds: [], eventIds: [], respondsTo: null, ...base };
    case "events": return { id: generatedId("event"), title: "", occurredAt: today(), endAt: null, datePrecision: "day", summary: "", participants: [], topicIds: [], citations: [emptyCitation()], ...base };
    case "topics": return { id: generatedId("topic"), name: "", description: "", parentId: null, ...base };
    case "sources": return { id: generatedId("source"), kind: "article", title: "", publisher: "", url: "", archiveUrl: null, publishedAt: today(), description: null, capturedAt: today(), video: null, license: "link-only", rightsStatus: "pending" };
    case "brackets": return { id: generatedId("bracket"), status: "draft", questionId: "more-problematic", statementIds: [] };
  }
}

// Accepts "83", "1:23", "01:02:03", "1h2m3s", or a YouTube URL carrying t=.
// Returns null for an empty value and NaN for something unreadable, so the
// caller can tell "not set" from "typo".
export function parseTimecode(input: string): number | null {
  const value = input.trim();
  if (!value) return null;
  if (/^https?:\/\//.test(value)) {
    const t = new URL(value).searchParams.get("t") ?? new URL(value).searchParams.get("start");
    return t ? parseTimecode(t) : Number.NaN;
  }
  const units = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (units && (units[1] || units[2] || units[3])) return Number(units[1] ?? 0) * 3600 + Number(units[2] ?? 0) * 60 + Number(units[3] ?? 0);
  if (!/^\d+(:\d{1,2}){0,2}$/.test(value)) return Number.NaN;
  const parts = value.split(":").map(Number);
  if (parts.slice(1).some((part) => part >= 60)) return Number.NaN;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function youtubeVideoId(input: string): string | null {
  let url: URL;
  try { url = new URL(input.trim()); } catch { return null; }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  const id = host === "youtu.be" ? url.pathname.slice(1)
    : host === "youtube.com" ? url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/)?.[1] ?? null
    : null;
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

export function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? value : null;
}

export function itemLabel(type: ContentType, item: Draft, names: Map<string, string>): string {
  const text = (key: string) => (typeof item[key] === "string" ? item[key] as string : "");
  switch (type) {
    case "people": return text("name") || item.id;
    case "statements": return `${names.get(text("personId")) ?? "?"} · ${text("headline") || item.id}`;
    case "evaluations": {
      const evaluator = item.evaluator as { name?: string } | undefined;
      return `${evaluator?.name || "?"} → ${names.get(text("targetPersonId")) ?? "?"}`;
    }
    case "events": return text("title") || item.id;
    case "topics": return text("name") || item.id;
    case "sources": return text("title") || text("publisher") || item.id;
    case "brackets": return item.id;
  }
}

// ------------------------------------------------------------- duplicates

// Tracking parameters that do not change what a link points to.
const TRACKING_PARAMS = /^(utm_.*|si|feature|fbclid|gclid|igshid|ref)$/;

export function normalizeUrl(input: string): string {
  const video = youtubeVideoId(input);
  if (video) return `youtube:${video}`;
  let url: URL;
  try { url = new URL(input.trim()); } catch { return input.trim(); }
  for (const key of [...url.searchParams.keys()]) if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, "");
  const query = url.searchParams.toString();
  return `${host}${url.pathname.replace(/\/+$/, "")}${query ? `?${query}` : ""}`;
}

type Segment = { sourceId: string; startSec: number | null; endSec: number | null };

// Two citations of one source overlap unless both give ranges that are apart.
// A citation without a start covers the whole source.
function overlaps(left: Segment, right: Segment): boolean {
  if (left.sourceId !== right.sourceId) return false;
  if (left.startSec === null || right.startSec === null) return true;
  const leftEnd = left.endSec ?? left.startSec;
  const rightEnd = right.endSec ?? right.startSec;
  return left.startSec <= rightEnd && right.startSec <= leftEnd;
}

const segments = (item: Draft): Segment[] => {
  const citations = (item.citations ?? (item.citation ? [item.citation] : [])) as Segment[];
  return citations.filter((citation) => citation.sourceId);
};

const text = (item: Draft, key: string) => (typeof item[key] === "string" ? (item[key] as string).trim() : "");

// Likely duplicates of a draft among what the editor has loaded: the same link,
// the same person's name, or the same speaker citing the same part of a
// source. Only a warning: the same clip can hold two different remarks.
export function findDuplicates(type: ContentType, draft: Draft, refs: Partial<Record<ContentType, Draft[]>>, names: Map<string, string>): string[] {
  const others = (refs[type] ?? []).filter((item) => item.id !== draft.id && item.status !== "archived");
  switch (type) {
    case "sources": {
      const url = text(draft, "url");
      if (!url) return [];
      const key = normalizeUrl(url);
      return others.filter((item) => normalizeUrl(text(item, "url")) === key).map((item) => `같은 주소의 출처가 이미 있습니다: ${itemLabel(type, item, names)} (${item.id})`);
    }
    case "people": {
      const name = text(draft, "name");
      if (!name) return [];
      return others
        .filter((item) => text(item, "name") === name || ((item.aliases ?? []) as string[]).includes(name))
        .map((item) => `같은 이름의 인물이 이미 있습니다: ${text(item, "name")} (${item.id}) — 동명이인이 아니면 기존 인물을 쓰세요`);
    }
    case "statements": {
      const cited = segments(draft);
      const quote = text(draft, "quote");
      return others
        .filter((item) => item.personId === draft.personId)
        .filter((item) => (quote && text(item, "quote") === quote) || segments(item).some((segment) => cited.some((mine) => overlaps(segment, mine))))
        .map((item) => `같은 화자가 같은 출처 구간에서 한 언행이 이미 있습니다: ${itemLabel(type, item, names)} (${item.id})`);
    }
    case "evaluations": {
      const cited = segments(draft);
      const evaluator = (draft.evaluator as { name?: string } | undefined)?.name?.trim();
      return others
        .filter((item) => item.targetPersonId === draft.targetPersonId && (item.evaluator as { name?: string } | undefined)?.name?.trim() === evaluator)
        .filter((item) => segments(item).some((segment) => cited.some((mine) => overlaps(segment, mine))))
        .map((item) => `같은 평가자가 같은 출처 구간에서 한 평가가 이미 있습니다: ${itemLabel(type, item, names)} (${item.id})`);
    }
    default:
      return [];
  }
}
