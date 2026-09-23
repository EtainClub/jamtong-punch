import { revalidateTag } from "next/cache";
import { CONTENT_TAG } from "@/lib/archive/read";
import { broadcastPending } from "./broadcast";
import { steemSender } from "./steem";

// Sends whatever is queued. Runs right after an ops save (so a record is on
// chain within seconds) and hourly from the scheduler (to retry failures).
export async function anchorPending() {
  const send = steemSender();
  // Without a key nothing is lost: versions stay queued until one is set.
  if (!send) {
    console.error("anchors: STEEM_ANCHOR_POSTING is not configured; pending anchors are kept");
    return { sent: 0, failed: 0, skipped: "no-key" as const };
  }
  const result = await broadcastPending(send);
  // The verify page shows transaction ids, so it must not stay cached as pending.
  if (result.sent) {
    try { revalidateTag(CONTENT_TAG, { expire: 0 }); } catch { /* no cache context outside Next */ }
  }
  return result;
}
