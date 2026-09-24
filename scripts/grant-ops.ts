import { auth } from "../src/lib/firebase/admin";

const uid = process.argv[2];
if (!uid) throw new Error("usage: pnpm grant-ops <uid>");

// tsx compiles scripts as CommonJS here, so no top-level await.
auth.setCustomUserClaims(uid, { ops: true })
  .then(() => console.log(`granted ops claim to ${uid}; refresh the user's ID token before testing`))
  .catch((error: unknown) => { console.error(error); process.exit(1); });
