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
