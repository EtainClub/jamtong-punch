import { checkOrigin } from "@/lib/guard/origin";
import { verifyCaller } from "@/lib/guard/identity";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";
import { reportSchema } from "@/lib/report/schema";
import { submitReport } from "@/lib/report/submit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { uid } = await verifyCaller(req, { accountsSkipAppCheck: true });
    const parsed = reportSchema.safeParse(await req.json());
    if (!parsed.success) throw new Refusal(400, "invalid-body");
    return Response.json(await submitReport(uid, parsed.data));
  } catch (error) {
    if (error instanceof Error && /unknown|unpublished/.test(error.message)) return refusalResponse(new Refusal(400, "invalid-report-target"));
    return refusalResponse(error);
  }
}
