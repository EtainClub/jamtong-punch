import { ZodError } from "zod";
import { pendingReviewCount, rejectedCountFor } from "@/lib/content/store";
import { getNickname, setNickname } from "@/lib/contributors/profile";
import { openReportCount } from "@/lib/report/list";
import { requireEditor } from "@/lib/guard/editor";
import { verifyCaller } from "@/lib/guard/identity";
import { checkOrigin } from "@/lib/guard/origin";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const caller = await verifyCaller(req, { accountsSkipAppCheck: true });
    const editor = caller.isContributor || caller.isOps;
    const [nickname, reviewCount, rejectedCount, reportCount] = await Promise.all([
      editor ? getNickname(caller.uid) : null,
      caller.isOps ? pendingReviewCount() : 0,
      editor ? rejectedCountFor(caller.uid) : 0,
      caller.isOps ? openReportCount() : 0,
    ]);
    // The counts drive the header badges: work waiting for an operator, and
    // the caller's own submissions that were sent back.
    return Response.json({ isOps: caller.isOps, isContributor: caller.isContributor, nickname, reviewCount, rejectedCount, reportCount });
  } catch (error) {
    return refusalResponse(error);
  }
}

export async function PUT(req: Request) {
  try {
    checkOrigin(req);
    const caller = await verifyCaller(req, { accountsSkipAppCheck: true });
    requireEditor(caller);
    const body = await req.json() as { nickname?: unknown };
    return Response.json({ nickname: await setNickname(caller.uid, String(body.nickname ?? "")) });
  } catch (error) {
    if (error instanceof ZodError) return refusalResponse(new Refusal(400, "invalid-nickname", error.issues[0]?.message ?? "닉네임을 확인해 주세요."));
    return refusalResponse(error);
  }
}
