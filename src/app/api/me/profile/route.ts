import { ZodError } from "zod";
import { getNickname, setNickname } from "@/lib/contributors/profile";
import { requireEditor } from "@/lib/guard/editor";
import { verifyCaller } from "@/lib/guard/identity";
import { checkOrigin } from "@/lib/guard/origin";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const caller = await verifyCaller(req);
    return Response.json({ isOps: caller.isOps, isContributor: caller.isContributor, nickname: caller.isContributor || caller.isOps ? await getNickname(caller.uid) : null });
  } catch (error) {
    return refusalResponse(error);
  }
}

export async function PUT(req: Request) {
  try {
    checkOrigin(req);
    const caller = await verifyCaller(req);
    requireEditor(caller);
    const body = await req.json() as { nickname?: unknown };
    return Response.json({ nickname: await setNickname(caller.uid, String(body.nickname ?? "")) });
  } catch (error) {
    if (error instanceof ZodError) return refusalResponse(new Refusal(400, "invalid-nickname", error.issues[0]?.message ?? "닉네임을 확인해 주세요."));
    return refusalResponse(error);
  }
}
