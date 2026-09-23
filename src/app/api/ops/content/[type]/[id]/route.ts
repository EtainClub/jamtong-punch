import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { anchorPending } from "@/lib/anchor/run";
import { CONTENT_TAG } from "@/lib/archive/read";
import { refreshSourceAvailability } from "@/lib/content/check-sources";
import { ContentError, contentTypeSchema, deleteContent, saveContent } from "@/lib/content/store";
import { verifyCaller } from "@/lib/guard/identity";
import { checkOrigin } from "@/lib/guard/origin";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";

export const runtime = "nodejs";

type Context = { params: Promise<{ type: string; id: string }> };

async function target(req: Request, { params }: Context) {
  checkOrigin(req);
  const caller = await verifyCaller(req);
  if (!caller.isOps) throw new Refusal(403, "ops-required");
  const { type: rawType, id } = await params;
  const type = contentTypeSchema.safeParse(rawType);
  if (!type.success || !/^[a-z0-9-]+$/.test(id)) throw new Refusal(400, "invalid-content-target");
  return { caller, type: type.data, id };
}

// Content validation messages are written for operators and name the failing
// field, so they are returned as the client code instead of a generic refusal.
function contentRefusal(error: unknown) {
  if (error instanceof ContentError) return refusalResponse(new Refusal(error.status, error.message, error.message));
  return refusalResponse(error);
}

export async function PUT(req: Request, context: Context) {
  try {
    const { caller, type, id } = await target(req, context);
    const body = await req.json() as { data?: unknown };
    const item = await saveContent(type, id, body.data, caller.uid);
    // A new or edited source is checked right away so its status is never blank.
    if (type === "sources") await refreshSourceAvailability(id);
    expireContent();
    anchorAfterResponse(type);
    return Response.json({ item });
  } catch (error) {
    return contentRefusal(error);
  }
}

export async function DELETE(req: Request, context: Context) {
  try {
    const { type, id } = await target(req, context);
    const deleted = await deleteContent(type, id);
    if (deleted) { expireContent(); anchorAfterResponse(type); }
    return deleted ? new Response(null, { status: 204 }) : new Response(null, { status: 404 });
  } catch (error) {
    return contentRefusal(error);
  }
}

// Operators expect a published change to show on the next page load, so the
// content cache is expired outright rather than served stale while refreshing.
function expireContent() {
  revalidateTag(CONTENT_TAG, { expire: 0 });
  revalidatePath("/", "layout");
}

// Statements and evaluations (and sources, whose url is part of their hash)
// may have queued a new anchor version. Send it after responding, so the save
// does not wait on a Steem node; the hourly job retries anything that fails.
function anchorAfterResponse(type: string) {
  if (type !== "statements" && type !== "evaluations" && type !== "sources") return;
  after(async () => {
    try {
      await anchorPending();
    } catch (error) {
      console.error("anchors: send after save failed; the hourly job will retry", error);
    }
  });
}
