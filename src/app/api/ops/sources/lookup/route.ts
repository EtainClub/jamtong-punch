import { lookupYoutube } from "@/lib/content/source-tools";
import { verifyCaller } from "@/lib/guard/identity";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const caller = await verifyCaller(req);
    if (!caller.isOps) throw new Refusal(403, "ops-required");
    const videoId = new URL(req.url).searchParams.get("videoId") ?? "";
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Refusal(400, "invalid-video-id");
    return Response.json(await lookupYoutube(videoId));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("youtube lookup failed")) return refusalResponse(new Refusal(502, error.message, "영상 정보를 가져오지 못했습니다. 비공개이거나 삭제된 영상일 수 있습니다."));
    return refusalResponse(error);
  }
}
