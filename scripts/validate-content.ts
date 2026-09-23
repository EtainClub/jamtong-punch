import { validateAllContent } from "../src/lib/content/store";

/**
 * Every CMS write is validated by the server-side content store. This script
 * re-runs the same checks over the whole Firestore state, which catches
 * content that became invalid through a later change elsewhere (a source
 * losing its rights clearance, a rule tightened after publication).
 * It needs Firestore credentials or FIRESTORE_EMULATOR_HOST; without either it
 * says so and exits cleanly so `pnpm check` stays usable offline.
 */
async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.VALIDATE_CONTENT !== "1") {
    console.log("content validation skipped: set FIRESTORE_EMULATOR_HOST, GOOGLE_APPLICATION_CREDENTIALS or VALIDATE_CONTENT=1 to check Firestore content.");
    return;
  }
  const errors = await validateAllContent();
  if (errors.length) {
    console.error(`content validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
    process.exitCode = 1;
    return;
  }
  console.log("content validation passed");
}

void main();
