import { verifyCron } from "@/lib/guard/cron";
import { refusalResponse } from "@/lib/guard/refusal";
import { expireWindows } from "@/lib/stats/expire";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await verifyCron(req);
    return Response.json({ processed: await expireWindows() });
  } catch (error) {
    return refusalResponse(error);
  }
}
