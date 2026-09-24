import { verifyCaller } from "@/lib/guard/identity";
import { checkOrigin } from "@/lib/guard/origin";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";
import { exclusionSchema } from "@/lib/ops/schema";
import { setStanceExclusion } from "@/lib/ops/service";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  try {
    checkOrigin(req);
    const caller = await verifyCaller(req, { accountsSkipAppCheck: true });
    if (!caller.isOps) throw new Refusal(403, "ops-required");
    const body = exclusionSchema.safeParse(await req.json());
    if (!body.success) throw new Refusal(400, "invalid-body");
    if (!await setStanceExclusion(body.data, caller.uid)) throw new Refusal(404, "stance-not-found");
    return new Response(null, { status: 204 });
  } catch (error) {
    return refusalResponse(error);
  }
}
