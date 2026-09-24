import { Refusal } from "@/lib/guard/refusal";

// The site URL plus any other hosts serving the same app (the default App
// Hosting URL stays reachable after a custom domain is connected).
function allowedOrigins(): string[] {
  return [process.env.NEXT_PUBLIC_SITE_URL, ...(process.env.EXTRA_ALLOWED_ORIGINS ?? "").split(",")]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin));
}

export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const allowed = allowedOrigins();
  if (!allowed.length && process.env.NODE_ENV !== "production" && origin === "http://localhost:3000") return;
  if (!origin || !allowed.includes(origin)) throw new Refusal(403, "origin-mismatch");
}
