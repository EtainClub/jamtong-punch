/**
 * CMS documents are schema- and reference-validated by the protected
 * server-side content store on every write. Production checks validate
 * the published Firestore state before deployment.
 */
console.log("CMS validation runs on save; use pnpm preflight:prod to validate published content.");
