import { checkOrigin } from "@/lib/guard/origin";
import { verifyCaller } from "@/lib/guard/identity";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";
import { comparisonSchema } from "@/lib/comparison/schema";
import { submitComparison } from "@/lib/comparison/submit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { uid } = await verifyCaller(req);
    const parsed = comparisonSchema.safeParse(await req.json());
    if (!parsed.success) throw new Refusal(400, "invalid-body");
    return Response.json(await submitComparison(uid, parsed.data));
  } catch (error) {
    if (error instanceof Error && /bracket|unknown or unpublished|not playable/.test(error.message)) return refusalResponse(new Refusal(400, "invalid-comparison"));
    return refusalResponse(error);
  }
}
