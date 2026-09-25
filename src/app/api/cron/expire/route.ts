import { verifyCron } from "@/lib/guard/cron";
import { refusalResponse } from "@/lib/guard/refusal";
import { recordCronRun } from "@/lib/ops/cron-runs";
import { expireWindows } from "@/lib/stats/expire";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await verifyCron(req);
    return Response.json({ processed: await recordCronRun("expire", expireWindows) });
  } catch (error) {
    return refusalResponse(error);
  }
}
