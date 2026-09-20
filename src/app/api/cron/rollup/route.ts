import { verifyCron } from "@/lib/guard/cron";
import { refusalResponse } from "@/lib/guard/refusal";
import { runRollup } from "@/lib/stats/rollup";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await verifyCron(req);
    return Response.json(await runRollup());
  } catch (error) {
    return refusalResponse(error);
  }
}
