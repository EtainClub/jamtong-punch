import { verifyCaller } from "@/lib/guard/identity";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";
import { readMetrics } from "@/lib/metrics/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const caller = await verifyCaller(req, { accountsSkipAppCheck: true });
    if (!caller.isOps) throw new Refusal(403, "ops-required");
    return Response.json({ days: await readMetrics(28) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return refusalResponse(error);
  }
}
