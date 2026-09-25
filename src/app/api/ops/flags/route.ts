import { revalidateTag } from "next/cache";
import { db } from "@/lib/firebase/admin";
import { verifyCaller } from "@/lib/guard/identity";
import { checkOrigin } from "@/lib/guard/origin";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";
import { flagsSchema } from "@/lib/ops/schema";
import { setSystemFlags } from "@/lib/ops/service";
import { FLAGS_TAG } from "@/lib/stats/read";

export const runtime = "nodejs";

async function requireOps(req: Request) {
  const caller = await verifyCaller(req, { accountsSkipAppCheck: true });
  if (!caller.isOps) throw new Refusal(403, "ops-required");
  return caller;
}

export async function GET(req: Request) {
  try {
    await requireOps(req);
    const snapshot = await db.doc("system/flags").get();
    return Response.json({ ratiosHidden: snapshot.get("ratiosHidden") === true, hiddenSubjects: snapshot.get("hiddenSubjects") ?? [] });
  } catch (error) {
    return refusalResponse(error);
  }
}

export async function PATCH(req: Request) {
  try {
    checkOrigin(req);
    const caller = await requireOps(req);
    const body = flagsSchema.safeParse(await req.json());
    if (!body.success) throw new Refusal(400, "invalid-body");
    await setSystemFlags(body.data, caller.uid);
    // Public pages drop the figures on their next render, not after the cache window.
    revalidateTag(FLAGS_TAG, { expire: 0 });
    return new Response(null, { status: 204 });
  } catch (error) {
    return refusalResponse(error);
  }
}
