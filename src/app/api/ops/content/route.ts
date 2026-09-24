import { verifyCaller } from "@/lib/guard/identity";
import { requireEditor } from "@/lib/guard/editor";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";
import { contentTypeSchema, listContentFor } from "@/lib/content/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const caller = await verifyCaller(req);
    requireEditor(caller);
    const type = contentTypeSchema.safeParse(new URL(req.url).searchParams.get("type"));
    if (!type.success) throw new Refusal(400, "invalid-content-type");
    return Response.json({ items: await listContentFor(type.data, caller), role: caller.isOps ? "ops" : "contributor" });
  } catch (error) {
    return refusalResponse(error);
  }
}
