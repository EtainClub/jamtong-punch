import { verifyCaller } from "@/lib/guard/identity";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";
import { opsHealth } from "@/lib/ops/health";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const caller = await verifyCaller(req, { accountsSkipAppCheck: true });
    if (!caller.isOps) throw new Refusal(403, "ops-required");
    return Response.json(await opsHealth(), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return refusalResponse(error);
  }
}
