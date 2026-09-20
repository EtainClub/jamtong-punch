import { verifyCaller } from "@/lib/guard/identity";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";
import { contentTypeSchema, listContent } from "@/lib/content/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const caller = await verifyCaller(req);
    if (!caller.isOps) throw new Refusal(403, "ops-required");
    const type = contentTypeSchema.safeParse(new URL(req.url).searchParams.get("type"));
    if (!type.success) throw new Refusal(400, "invalid-content-type");
    return Response.json({ items: await listContent(type.data) });
  } catch (error) {
    return refusalResponse(error);
  }
}
