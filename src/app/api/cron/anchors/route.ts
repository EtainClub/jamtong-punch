import { anchorPending } from "@/lib/anchor/run";
import { verifyCron } from "@/lib/guard/cron";
import { refusalResponse } from "@/lib/guard/refusal";

export const runtime = "nodejs";
export const maxDuration = 120;

// Retry path only. The normal path is the ops save itself (see ops content route).
export async function POST(req: Request) {
  try {
    await verifyCron(req);
    return Response.json(await anchorPending());
  } catch (error) {
    return refusalResponse(error);
  }
}
