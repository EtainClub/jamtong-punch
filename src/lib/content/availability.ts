import type { Source, SourceAvailability } from "@/content/schema";

// What an HTTP status says about whether a source can still be seen.
// YouTube is asked through oEmbed, which needs no key: 404 means the video
// was deleted, 401/403 that it went private or cannot be embedded.
export function classifyStatus(status: number): SourceAvailability["status"] {
  if (status >= 200 && status < 400) return "live";
  if (status === 404 || status === 410) return "unavailable";
  if (status === 401 || status === 403) return "restricted";
  return "unknown";
}

export function probeUrl(source: Pick<Source, "url" | "video">): string {
  if (source.video) return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${source.video.videoId}`)}`;
  return source.url;
}

export async function checkAvailability(source: Pick<Source, "url" | "video">, today: string, fetcher: typeof fetch = fetch): Promise<SourceAvailability> {
  try {
    const response = await fetcher(probeUrl(source), {
      redirect: "follow",
      headers: { "user-agent": "imtong-source-check/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    return { status: classifyStatus(response.status), checkedAt: today, httpStatus: response.status };
  } catch {
    // A timeout or DNS failure says nothing about the source itself.
    return { status: "unknown", checkedAt: today, httpStatus: null };
  }
}
