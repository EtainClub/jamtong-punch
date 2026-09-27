import { z } from "zod";

// Visit counting without identifying anyone: the browser keeps only "has been
// here before" and a per-tab counter; the server keeps daily totals.
export const SOURCES = ["search", "kakao", "share", "sns", "direct", "other"] as const;
export type Source = (typeof SOURCES)[number];
export const SOURCE_LABELS: Record<Source, string> = { search: "검색", kakao: "카카오톡", share: "공유 링크", sns: "SNS·유튜브", direct: "직접·즐겨찾기", other: "기타" };

export const metricEventSchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("visit"), source: z.enum(SOURCES), first: z.boolean() }).strict(),
  // A first-time visitor opened a second record in the same tab.
  z.object({ event: z.literal("second_record") }).strict(),
]);
export type MetricEvent = z.infer<typeof metricEventSchema>;

const SEARCH = /(^|\.)(google|naver|daum|bing|zum|yahoo|duckduckgo)\./;
const SNS = /(^|\.)(facebook|instagram|threads|x|t|twitter|youtube|band|tiktok)\.(com|net|co|us|me)$/;

// Where a visit came from, read from the landing URL and the referrer only.
// A link shared from 임통 carries ?s=1, which wins over the app it was opened in.
export function classifySource(referrer: string, search: string, userAgent: string, ownHost: string): Source {
  if (new URLSearchParams(search).get("s") === "1") return "share";
  if (/KAKAOTALK/i.test(userAgent)) return "kakao";
  let host = "";
  try { host = referrer ? new URL(referrer).hostname.toLowerCase() : ""; } catch { host = ""; }
  if (!host || host === ownHost) return "direct";
  if (host.includes("kakao")) return "kakao";
  if (SEARCH.test(host)) return "search";
  if (SNS.test(host)) return "sns";
  return "other";
}
