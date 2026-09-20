import { auth } from "../src/lib/firebase/admin";

const uid = process.argv[2];
if (!uid) throw new Error("usage: pnpm grant-ops <uid>");

await auth.setCustomUserClaims(uid, { ops: true });
console.log(`granted ops claim to ${uid}; refresh the user's ID token before testing`);
