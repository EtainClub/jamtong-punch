import { checkOrigin } from "@/lib/guard/origin";
import { Refusal, refusalResponse } from "@/lib/guard/refusal";
import { metricEventSchema } from "@/lib/metrics/events";
import { recordMetric } from "@/lib/metrics/store";

export const runtime = "nodejs";

// Anonymous visit totals. No account, cookie, IP or id is read or stored; the
// body is one of two fixed shapes.
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const text = await req.text();
    if (text.length > 200) throw new Refusal(400, "invalid-body");
    const parsed = metricEventSchema.safeParse(JSON.parse(text));
    if (!parsed.success) throw new Refusal(400, "invalid-body");
    await recordMetric(parsed.data);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof SyntaxError) return refusalResponse(new Refusal(400, "invalid-body"));
    return refusalResponse(error);
  }
}
