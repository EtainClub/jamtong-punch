import { getApps, initializeApp } from "firebase-admin/app";
import { getAppCheck } from "firebase-admin/app-check";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// App Hosting, the emulators and the test scripts name the project through the
// environment. A local `next dev` does not, and Admin SDK would then fall back to
// the developer's gcloud default project, silently reading another database.
// Pin it to the app's own project in that case.
const runtimeNamesProject = Boolean(process.env.FIREBASE_CONFIG || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT);
if (!getApps().length) initializeApp(runtimeNamesProject ? undefined : { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });

export const auth = getAuth();
export const db = getFirestore();
export const appCheck = getAppCheck();
export const storage = getStorage();
