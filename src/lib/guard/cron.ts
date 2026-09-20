import { OAuth2Client } from "google-auth-library";
import { Refusal } from "@/lib/guard/refusal";

const client = new OAuth2Client();

export async function verifyCron(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new Refusal(401, "cron-auth-missing");
  const audience = process.env.CRON_AUDIENCE;
  const serviceAccount = process.env.CRON_SERVICE_ACCOUNT;
  if (!audience || !serviceAccount) throw new Error("cron environment is not configured");
  const ticket = await client.verifyIdToken({ idToken: token, audience });
  if (ticket.getPayload()?.email !== serviceAccount) throw new Refusal(403, "cron-wrong-caller");
}
