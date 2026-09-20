import { verifyCaller } from "@/lib/guard/identity";
import { checkOrigin } from "@/lib/guard/origin";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";
import { reportStatusSchema } from "@/lib/ops/schema";
import { setReportStatus } from "@/lib/ops/service";

export const runtime = "nodejs";

export async function PATCH(req: Request, context: { params: Promise<{ reportId: string }> }) {
  try {
    checkOrigin(req);
    const caller = await verifyCaller(req);
    if (!caller.isOps) throw new Refusal(403, "ops-required");
    const body = reportStatusSchema.safeParse(await req.json());
    if (!body.success) throw new Refusal(400, "invalid-body");
    const { reportId } = await context.params;
    if (!/^[a-f0-9]{32}$/.test(reportId)) throw new Refusal(400, "invalid-report-id");
    if (!await setReportStatus(reportId, body.data.status, caller.uid)) throw new Refusal(404, "report-not-found");
    return new Response(null, { status: 204 });
  } catch (error) {
    return refusalResponse(error);
  }
}
