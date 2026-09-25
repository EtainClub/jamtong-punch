import { APP_VERSION } from "@/lib/version";

// The version the answering server was built from. Open pages poll it to find
// out that a newer build has been deployed.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ version: APP_VERSION }, { headers: { "cache-control": "no-store" } });
}
