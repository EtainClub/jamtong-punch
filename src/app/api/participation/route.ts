import { z } from "zod";
import { checkOrigin } from "@/lib/guard/origin";
import { verifyCaller } from "@/lib/guard/identity";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";
import { participationSchema } from "@/lib/participation/schema";
import { submitParticipation } from "@/lib/participation/submit";
import { recordSubmissionAbuse } from "@/lib/guard/abuse";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { uid } = await verifyCaller(req);
    const parsed = participationSchema.safeParse(await req.json());
    if (!parsed.success) throw new Refusal(400, "invalid-body");
    const abuse = await recordSubmissionAbuse(req, uid);
    if (!abuse.allowed) throw new Refusal(429, "ip-new-uid-cap");
    return Response.json(await submitParticipation(uid, parsed.data));
  } catch (error) {
    if (error instanceof z.ZodError) return refusalResponse(new Refusal(400, "invalid-body"));
    if (error instanceof Error && ["duplicate-subject", "invalid-game-size", "unknown or unpublished", "is not playable"].some((reason) => error.message.includes(reason))) {
      return refusalResponse(new Refusal(400, "invalid-participation"));
    }
    return refusalResponse(error);
  }
}
