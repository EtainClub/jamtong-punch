import { revalidateTag } from "next/cache";
import { CONTENT_TAG } from "@/lib/archive/read";
import { getContent, saveContent } from "@/lib/content/store";
import { requestWaybackCapture } from "@/lib/content/source-tools";
import { verifyCaller } from "@/lib/guard/identity";
import { checkOrigin } from "@/lib/guard/origin";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";

export const runtime = "nodejs";
export const maxDuration = 120;

type Context = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Context) {
  try {
    checkOrigin(req);
    const caller = await verifyCaller(req);
    if (!caller.isOps) throw new Refusal(403, "ops-required");
    const { id } = await params;
    const source = await getContent("sources", id);
    if (!source) throw new Refusal(404, "unknown-source");
    const archiveUrl = await requestWaybackCapture(source.url);
    const item = await saveContent("sources", id, { ...source, archiveUrl }, caller.uid);
    revalidateTag(CONTENT_TAG, { expire: 0 });
    return Response.json({ item });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("wayback capture failed")) return refusalResponse(new Refusal(502, error.message, "보존본을 만들지 못했습니다. 잠시 뒤 다시 시도하거나 web.archive.org에서 직접 저장해 주세요."));
    return refusalResponse(error);
  }
}
