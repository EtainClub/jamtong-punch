import { appCheck, auth } from "@/lib/firebase/admin";
import { Refusal } from "@/lib/guard/refusal";

export type Caller = {
  uid: string;
  isOps: boolean;
  // Signed in with a real account (Google), not the anonymous identity every
  // visitor gets. Contributors may submit content for review.
  isContributor: boolean;
};

export async function verifyCaller(req: Request): Promise<Caller> {
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    const appCheckToken = req.headers.get("x-firebase-appcheck");
    if (!appCheckToken) throw new Refusal(401, "app-check-missing");
    let checked;
    try {
      checked = await appCheck.verifyToken(appCheckToken, { consume: true });
    } catch {
      throw new Refusal(401, "app-check-invalid");
    }
    if (checked.alreadyConsumed) throw new Refusal(401, "app-check-replay");
  }

  const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!bearer) throw new Refusal(401, "auth-missing");
  let decoded;
  try {
    decoded = await auth.verifyIdToken(bearer);
  } catch {
    throw new Refusal(401, "auth-invalid");
  }
  const provider = decoded.firebase?.sign_in_provider;
  return { uid: decoded.uid, isOps: decoded.ops === true, isContributor: provider !== undefined && provider !== "anonymous" && provider !== "custom" };
}
