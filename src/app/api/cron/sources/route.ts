import { revalidateTag } from "next/cache";
import { CONTENT_TAG } from "@/lib/archive/read";
import { checkSources } from "@/lib/content/check-sources";
import { verifyCron } from "@/lib/guard/cron";
import { refusalResponse } from "@/lib/guard/refusal";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await verifyCron(req);
    const result = await checkSources();
    // A deleted source changes what the public card shows (the kept transcript
    // takes over), so the content cache is expired when anything changed.
    if (result.changed) revalidateTag(CONTENT_TAG, { expire: 0 });
    return Response.json(result);
  } catch (error) {
    return refusalResponse(error);
  }
}
