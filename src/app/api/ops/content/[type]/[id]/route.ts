import { contentTypeSchema, deleteContent, saveContent } from "@/lib/content/store";
import { verifyCaller } from "@/lib/guard/identity";
import { checkOrigin } from "@/lib/guard/origin";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";

export const runtime = "nodejs";

type Context = { params: Promise<{ type: string; id: string }> };

export async function PUT(req: Request, { params }: Context) {
  try {
    checkOrigin(req);
    const caller = await verifyCaller(req);
    if (!caller.isOps) throw new Refusal(403, "ops-required");
    const { type: rawType, id } = await params;
    const type = contentTypeSchema.safeParse(rawType);
    if (!type.success || !/^[a-z0-9-]+$/.test(id)) throw new Refusal(400, "invalid-content-target");
    const body = await req.json() as { data?: unknown };
    return Response.json({ item: await saveContent(type.data, id, body.data, caller.uid) });
  } catch (error) {
    if (error instanceof Error && /(unknown|mismatch|needs|usable)/.test(error.message)) return refusalResponse(new Refusal(400, error.message));
    return refusalResponse(error);
  }
}

export async function DELETE(req: Request, { params }: Context) {
  try {
    checkOrigin(req);
    const caller = await verifyCaller(req);
    if (!caller.isOps) throw new Refusal(403, "ops-required");
    const { type: rawType, id } = await params;
    const type = contentTypeSchema.safeParse(rawType);
    if (!type.success || !/^[a-z0-9-]+$/.test(id)) throw new Refusal(400, "invalid-content-target");
    return (await deleteContent(type.data, id)) ? new Response(null, { status: 204 }) : new Response(null, { status: 404 });
  } catch (error) {
    if (error instanceof Error && /used by/.test(error.message)) return refusalResponse(new Refusal(409, error.message));
    return refusalResponse(error);
  }
}
