import { Refusal } from "@/lib/guard/refusal";

export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const expected = process.env.NEXT_PUBLIC_SITE_URL;
  if (!expected && process.env.NODE_ENV !== "production" && origin === "http://localhost:3000") return;
  if (!expected || origin !== expected) throw new Refusal(403, "origin-mismatch");
}
