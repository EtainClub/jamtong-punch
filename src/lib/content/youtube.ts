// What a YouTube watch page says about a video, for drafting a source. The
// page embeds its player response as JSON; reading it needs no API key.
// Captions are not available this way (YouTube requires a token for them),
// so transcripts are still typed or pulled locally with yt-dlp.

export type YoutubeMeta = {
  videoId: string;
  title: string | null;
  channel: string | null;
  publishedAt: string | null; // KST date, YYYY-MM-DD
  durationSec: number | null;
  description: string | null;
  // Only title and channel were found (the page could not be read).
  partial: boolean;
};

const BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36";

// The calendar day in Korea of an ISO timestamp with any offset.
export function kstDate(iso: string): string | null {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : new Date(time + 9 * 3_600_000).toISOString().slice(0, 10);
}

export function parseWatchPage(html: string): Omit<YoutubeMeta, "videoId" | "partial"> | null {
  const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});(?:var |<\/script>)/s);
  if (!match) return null;
  let player: {
    playabilityStatus?: { status?: string };
    videoDetails?: { title?: string; author?: string; lengthSeconds?: string; shortDescription?: string };
    microformat?: { playerMicroformatRenderer?: { publishDate?: string; uploadDate?: string } };
  };
  try { player = JSON.parse(match[1]); } catch { return null; }
  const details = player.videoDetails;
  if (!details || player.playabilityStatus?.status !== "OK") return null;
  const micro = player.microformat?.playerMicroformatRenderer;
  const published = micro?.publishDate ?? micro?.uploadDate ?? null;
  const length = Number(details.lengthSeconds);
  return {
    title: details.title ?? null,
    channel: details.author ?? null,
    publishedAt: published ? kstDate(published) : null,
    durationSec: Number.isInteger(length) && length > 0 ? length : null,
    description: details.shortDescription?.trim() || null,
  };
}

async function oembed(videoId: string) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`youtube lookup failed: ${response.status}`);
  const data = await response.json() as { title?: string; author_name?: string };
  return { title: data.title ?? null, channel: data.author_name ?? null };
}

// The watch page first; if YouTube will not serve it (bot checks from cloud
// addresses), oEmbed still gives title and channel.
export async function fetchYoutubeMeta(videoId: string): Promise<YoutubeMeta> {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=ko`, {
      headers: { "user-agent": BROWSER, "accept-language": "ko-KR,ko;q=0.9" },
      signal: AbortSignal.timeout(15_000),
    });
    const parsed = response.ok ? parseWatchPage(await response.text()) : null;
    if (parsed) return { videoId, ...parsed, partial: false };
  } catch {
    // fall through to oEmbed
  }
  return { videoId, ...(await oembed(videoId)), publishedAt: null, durationSec: null, description: null, partial: true };
}

// Source ids for videos follow the entry scripts: yt-<videoId>, lowercased,
// underscores as hyphens (content ids allow only [a-z0-9-]).
export function sourceIdForVideo(videoId: string): string {
  return `yt-${videoId.toLowerCase().replace(/_/g, "-")}`;
}
