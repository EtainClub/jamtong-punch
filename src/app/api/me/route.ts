import { revalidatePath, revalidateTag } from "next/cache";
import { deleteUserData } from "@/lib/account/delete";
import { CONTENT_TAG } from "@/lib/archive/read";
import { verifyCaller } from "@/lib/guard/identity";
import { checkOrigin } from "@/lib/guard/origin";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";

export const runtime = "nodejs";

// scope=stances deletes the caller's stances; scope=account deletes the whole
// account (see /about 개인정보). Already aggregated figures remain as
// anonymous totals and are rebuilt without the deleted stances.
export async function DELETE(req: Request) {
  try {
    checkOrigin(req);
    const scope = new URL(req.url).searchParams.get("scope");
    if (scope !== "stances" && scope !== "account") throw new Refusal(400, "invalid-delete-scope");
    const { uid } = await verifyCaller(req, { accountsSkipAppCheck: true });
    const result = await deleteUserData(uid, scope);
    if (scope === "account") {
      // Public cards may show the contributor's nickname; drop it now.
      revalidateTag(CONTENT_TAG, { expire: 0 });
      revalidatePath("/", "layout");
    }
    return Response.json(result);
  } catch (error) {
    return refusalResponse(error);
  }
}
