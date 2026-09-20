import { appCheck, auth } from "@/lib/firebase/admin";
import { Refusal } from "@/lib/guard/refusal";

export async function verifyCaller(req: Request) {
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
  return { uid: decoded.uid, isOps: decoded.ops === true };
}
