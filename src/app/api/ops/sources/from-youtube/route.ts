import { youtubeVideoId } from "@/features/ops/content-form";
import { ContentError, getContent, saveContent } from "@/lib/content/store";
import { fetchYoutubeMeta, sourceIdForVideo } from "@/lib/content/youtube";
import { consumeContribution } from "@/lib/contributors/profile";
import { editorActor } from "@/lib/guard/editor";
import { verifyCaller } from "@/lib/guard/identity";
import { checkOrigin } from "@/lib/guard/origin";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";

export const runtime = "nodejs";

const today = () => new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);

// "Start from a YouTube link": returns the video's source, creating it from
// the watch page (title, channel, date, length, description snapshot) when it
// is not registered yet, plus what was read so the form can prefill a draft.
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const actor = await editorActor(await verifyCaller(req, { accountsSkipAppCheck: true }));
    const { url } = await req.json() as { url?: unknown };
    const videoId = typeof url === "string" ? youtubeVideoId(url) : null;
    if (!videoId) throw new Refusal(400, "invalid-youtube-url", "유튜브 영상 주소가 아닙니다.");

    const id = sourceIdForVideo(videoId);
    const meta = await fetchYoutubeMeta(videoId);
    const existing = await getContent("sources", id);
    if (existing) return Response.json({ source: existing, meta, created: false });

    if (!actor.isOps && !(await consumeContribution(actor.uid))) throw new Refusal(429, "contribution-cap", "오늘 저장할 수 있는 횟수를 모두 썼습니다. 내일 다시 시도해 주세요.");
    const isShort = /youtube\.com\/shorts\//.test(String(url));
    const source = await saveContent("sources", id, {
      id,
      kind: "video",
      title: meta.title ?? `유튜브 영상 ${videoId}`,
      publisher: meta.channel ?? "YouTube",
      url: isShort ? `https://www.youtube.com/shorts/${videoId}` : `https://www.youtube.com/watch?v=${videoId}`,
      archiveUrl: null,
      publishedAt: meta.publishedAt ?? today(),
      description: meta.description,
      capturedAt: today(),
      video: { platform: "youtube", videoId, durationSec: meta.durationSec },
      license: "quotable",
      rightsStatus: "pending",
    }, actor);
    return Response.json({ source, meta, created: true });
  } catch (error) {
    if (error instanceof ContentError) return refusalResponse(new Refusal(error.status, error.message, error.message));
    if (error instanceof Error && error.message.startsWith("youtube lookup failed")) return refusalResponse(new Refusal(502, error.message, "영상 정보를 가져오지 못했습니다. 비공개이거나 삭제된 영상일 수 있습니다."));
    return refusalResponse(error);
  }
}
