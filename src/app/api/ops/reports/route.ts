import { verifyCaller } from "@/lib/guard/identity";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";
import { listReports } from "@/lib/report/list";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const caller = await verifyCaller(req, { accountsSkipAppCheck: true });
    if (!caller.isOps) throw new Refusal(403, "ops-required");
    return Response.json({ reports: await listReports() });
  } catch (error) {
    return refusalResponse(error);
  }
}
