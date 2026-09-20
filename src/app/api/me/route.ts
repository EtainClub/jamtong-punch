import { Refusal, refusalResponse } from "@/lib/guard/refusal";
import { verifyCaller } from "@/lib/guard/identity";
import { checkOrigin } from "@/lib/guard/origin";
import { deleteUserData } from "@/lib/account/delete";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
  try {
    checkOrigin(req);
    const scope = new URL(req.url).searchParams.get("scope");
    if (scope !== "stances" && scope !== "account") throw new Refusal(400, "invalid-delete-scope");
    const { uid } = await verifyCaller(req);
    return Response.json(await deleteUserData(uid, scope));
  } catch (error) {
    return refusalResponse(error);
  }
}
