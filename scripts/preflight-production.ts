import { existsSync, readFileSync } from "node:fs";
import { db } from "../src/lib/firebase/admin";

const envFile = process.env.ENV_FILE ?? ".env.local";

function parseEnv(path: string): Map<string, string> {
  if (!existsSync(path)) return new Map();
  return new Map(readFileSync(path, "utf8").split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    return match ? [[match[1], match[2]]] : [];
  }));
}

const fromFile = parseEnv(envFile);
const valueOf = (name: string) => process.env[name] ?? fromFile.get(name) ?? "";
const missing: string[] = [];

const clientVariables = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APPCHECK_SITE_KEY",
] as const;

const appHosting = readFileSync("apphosting.yaml", "utf8");
function appHostingSetting(name: string): string | null {
  const match = appHosting.match(new RegExp(`- variable: ${name}\\n\\s+(?:value|secret):\\s*(.+)`));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, "") ?? null;
}

const deployedValue = (name: string) => valueOf(name).trim() || appHostingSetting(name) || "";
for (const name of [...clientVariables, "CRON_AUDIENCE", "CRON_SERVICE_ACCOUNT", "IP_HASH_PEPPER"]) {
  const setting = appHostingSetting(name);
  if (!setting || setting.startsWith("<")) missing.push(`apphosting.yaml:${name}`);
}

for (const name of [...clientVariables, "CRON_AUDIENCE", "CRON_SERVICE_ACCOUNT"]) {
  if (!deployedValue(name).trim()) missing.push(name);
}

const siteUrl = deployedValue("NEXT_PUBLIC_SITE_URL");
const expectedAudience = `${siteUrl.replace(/\/$/, "")}/api/cron`;
try {
  if (!siteUrl.startsWith("https://") || new URL(siteUrl).hostname === "localhost") {
    missing.push("NEXT_PUBLIC_SITE_URL (must be a production https URL)");
  }
} catch {
  missing.push("NEXT_PUBLIC_SITE_URL (must be a production https URL)");
}
if (deployedValue("CRON_AUDIENCE") !== expectedAudience) {
  missing.push("CRON_AUDIENCE (must equal NEXT_PUBLIC_SITE_URL + /api/cron)");
}

async function main() {
  const [subjects, sources, records, brackets] = await Promise.all([
    db.collection("contentSubjects").where("status", "==", "published").get(),
    db.collection("contentSources").get(),
    db.collection("contentRecords").where("status", "==", "published").get(),
    db.collection("contentBrackets").where("status", "==", "published").get(),
  ]);
  const bootstrap = process.env.CMS_BOOTSTRAP === "1";
  if (!bootstrap) {
    if (subjects.empty) missing.push("published content (at least one cleared subject)");
    if (sources.empty) missing.push("published content sources");
    if (records.empty) missing.push("published content records");
    if (brackets.empty) missing.push("published content brackets");
  }
  if (missing.length) {
    console.error(`Production preflight blocked (${envFile}):\n${missing.map((item) => `- ${item}`).join("\n")}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Production preflight passed${bootstrap ? " (CMS bootstrap; public content is intentionally empty)" : ""}: ${subjects.size} subjects, ${records.size} records, ${brackets.size} brackets.`);
}

void main();
