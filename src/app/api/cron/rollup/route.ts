import { verifyCron } from "@/lib/guard/cron";
import { refusalResponse } from "@/lib/guard/refusal";
import { recordCronRun } from "@/lib/ops/cron-runs";
import { runRollup } from "@/lib/stats/rollup";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await verifyCron(req);
    return Response.json(await recordCronRun("rollup", runRollup));
  } catch (error) {
    return refusalResponse(error);
  }
}
