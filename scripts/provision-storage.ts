import { execFileSync } from "node:child_process";

async function main() {
  const projectId = process.env.PROJECT_ID ?? "jamtong-punch";
  const location = process.env.STORAGE_LOCATION ?? "asia-northeast3";
  const endpoint = `https://firebasestorage.googleapis.com/v1alpha/projects/${projectId}/defaultBucket`;
  const token = execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8" }).trim();

  const existing = await fetch(endpoint, { headers: { authorization: `Bearer ${token}` } });
  if (existing.ok) {
    const bucket = await existing.json() as { bucket?: { name?: string } };
    console.log(`default Firebase Storage bucket already exists: ${bucket.bucket?.name ?? "configured"}`);
    return;
  }
  if (existing.status !== 404) throw new Error(`could not inspect default bucket: ${existing.status}`);

  const created = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ location }),
  });
  if (!created.ok) throw new Error(`default bucket creation failed: ${created.status} ${await created.text()}`);
  const bucket = await created.json() as { bucket?: { name?: string }; location?: string };
  console.log(`created default Firebase Storage bucket ${bucket.bucket?.name ?? ""} in ${bucket.location ?? location}`);
}

void main();
