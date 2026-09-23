import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, test } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
let environment: RulesTestEnvironment;

(enabled ? describe : describe.skip)("Firestore rules", () => {
  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: "jamtong-punch-rules",
      firestore: { rules: await readFile("firestore.rules", "utf8") },
    });
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users/alice/stances/subject_2026-09-20"), { subjectId: "subject", stance: "punch" });
    });
  });

  afterAll(async () => environment.cleanup());

  test("allows public aggregate reads but never public aggregate writes", async () => {
    const visitor = environment.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(visitor, "subjectStats/subject")));
    await assertFails(setDoc(doc(visitor, "subjectStats/subject"), { windows: {} }));
  });

  test("allows a user to read only their own ledger", async () => {
    const alice = environment.authenticatedContext("alice").firestore();
    const bob = environment.authenticatedContext("bob").firestore();
    await assertSucceeds(getDoc(doc(alice, "users/alice/stances/subject_2026-09-20")));
    await assertFails(getDoc(doc(bob, "users/alice/stances/subject_2026-09-20")));
  });

  test("blocks all direct ledger and report writes", async () => {
    const alice = environment.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(alice, "users/alice/stances/subject_2026-09-20"), { stance: "cheer" }));
    await assertFails(setDoc(doc(alice, "reports/report"), { reporterUid: "alice" }));
  });

  test("blocks direct CMS reads and writes, including an ops custom claim", async () => {
    const operator = environment.authenticatedContext("operator", { ops: true }).firestore();
    await assertFails(getDoc(doc(operator, "people/example")));
    await assertFails(setDoc(doc(operator, "people/example"), { id: "example", status: "published" }));
  });
});
