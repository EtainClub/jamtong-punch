import { verifyCron } from "@/lib/guard/cron";
import { refusalResponse } from "@/lib/guard/refusal";
import { recordCronRun } from "@/lib/ops/cron-runs";
import { reconcileInvariants, rebuildQueuedSubjects } from "@/lib/stats/reconcile";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await verifyCron(req);
    return Response.json(await recordCronRun("reconcile", async () => {
      const invariants = await reconcileInvariants();
      const rebuild = await rebuildQueuedSubjects();
      return { invariants, rebuild };
    }));
  } catch (error) {
    return refusalResponse(error);
  }
}
