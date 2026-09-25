import { anchorPending } from "@/lib/anchor/run";
import { verifyCron } from "@/lib/guard/cron";
import { refusalResponse } from "@/lib/guard/refusal";
import { recordCronRun } from "@/lib/ops/cron-runs";

export const runtime = "nodejs";
export const maxDuration = 120;

// Retry path only. The normal path is the ops save itself (see ops content route).
export async function POST(req: Request) {
  try {
    await verifyCron(req);
    // A send that fails keeps the version queued; the run still counts as a
    // failure so the alert fires instead of retrying silently forever.
    return Response.json(await recordCronRun("anchors", anchorPending, (result) =>
      "skipped" in result && result.skipped === "no-key" ? "STEEM_ANCHOR_POSTING is not configured"
        : result.failed ? `${result.failed} anchor send(s) failed` : null));
  } catch (error) {
    return refusalResponse(error);
  }
}
