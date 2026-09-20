import { verifyCron } from "@/lib/guard/cron";
import { refusalResponse } from "@/lib/guard/refusal";
import { reconcileInvariants, rebuildQueuedSubjects } from "@/lib/stats/reconcile";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await verifyCron(req);
    const invariants = await reconcileInvariants();
    const rebuild = await rebuildQueuedSubjects();
    return Response.json({ invariants, rebuild });
  } catch (error) {
    return refusalResponse(error);
  }
}
