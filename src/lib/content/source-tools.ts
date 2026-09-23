// Server-side helpers for registering a source. Both call third parties, so
// they run only from ops routes, never while rendering public pages.

const USER_AGENT = "imtong-source-tools/1.0";

export async function lookupYoutube(videoId: string) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`youtube lookup failed: ${response.status}`);
  const data = await response.json() as { title?: string; author_name?: string };
  return { title: data.title ?? null, channel: data.author_name ?? null };
}

// Internet Archive "Save Page Now". The capture finishes asynchronously on
// their side; a successful request answers with the address of the snapshot.
export async function requestWaybackCapture(target: string): Promise<string> {
  const response = await fetch(`https://web.archive.org/save/${target}`, {
    redirect: "manual",
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(90_000),
  });
  const location = response.headers.get("location") ?? response.headers.get("content-location");
  const snapshot = location?.match(/\/web\/(\d{14})\//) ? new URL(location, "https://web.archive.org").toString() : null;
  if (!snapshot) throw new Error(`wayback capture failed: ${response.status}`);
  return snapshot;
}
