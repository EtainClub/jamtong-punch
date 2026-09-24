import type { Citation, Source } from "@/content/schema";

export function formatTimecode(seconds: number | null): string {
  if (seconds === null) return "";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`;
}

type Precision = "day" | "month" | "year";

type Certainty = "confirmed" | "estimated";

function marked(label: string, certainty: Certainty | undefined) {
  return certainty === "estimated" ? `${label} (추정)` : label;
}

// A date is shown only as precisely as it is known: a statement dated to a
// month must not appear to have happened on the first of that month, and an
// inferred date is always labelled as an estimate.
export function formatDate(date: string, precision: Precision, options: { withYear?: boolean; certainty?: Certainty } = {}): string {
  const [year, month, day] = date.split("-").map(Number);
  const withYear = options.withYear ?? true;
  if (precision === "year") return marked(`${year}년`, options.certainty);
  if (precision === "month") return marked(withYear ? `${year}년 ${month}월` : `${month}월`, options.certainty);
  return marked(withYear ? `${year}년 ${month}월 ${day}일` : `${month}월 ${day}일`, options.certainty);
}

export function formatShortDate(date: string, precision: Precision = "day", certainty?: Certainty): string {
  const [year, month, day] = date.split("-");
  if (precision === "year") return marked(year, certainty);
  if (precision === "month") return marked(`${year}.${month}`, certainty);
  return marked(`${year}.${month}.${day}`, certainty);
}

export function citationHref(citation: Citation, source: Source): string {
  if (source.video && citation.startSec !== null) return `https://www.youtube.com/watch?v=${source.video.videoId}&t=${citation.startSec}s`;
  return source.url;
}

export function citationLabel(citation: Citation, source: Source): string {
  const medium = source.kind === "broadcast" ? "방송" : "영상";
  if (citation.startSec !== null) return `▶ ${medium} ${formatTimecode(citation.startSec)}–${formatTimecode(citation.endSec)}`;
  if (source.kind === "video" || source.kind === "broadcast") return `▶ ${medium}`;
  return citation.locator ? `원문 · ${citation.locator}` : "원문";
}

export function youtubeThumbnail(source: Source): string | null {
  return source.video ? `https://i.ytimg.com/vi/${source.video.videoId}/mqdefault.jpg` : null;
}

export const statementKindLabels: Record<string, string> = {
  remark: "발언", interview: "인터뷰", speech: "연설", sns: "SNS", hearing: "국회·청문", action: "행동", decision: "결정", policy: "정책",
};

export const evaluationFormatLabels: Record<string, string> = {
  video: "영상", broadcast: "방송", interview: "인터뷰", column: "칼럼", sns: "SNS", book: "책",
};

export const participantRoleLabels: Record<string, string> = {
  principal: "당사자", participant: "참여", commenter: "발언",
};
