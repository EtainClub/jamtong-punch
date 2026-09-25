import { Timestamp } from "firebase-admin/firestore";
import { afterAll, describe, expect, test, vi } from "vitest";
import { db } from "@/lib/firebase/admin";
import { recordCronRun } from "@/lib/ops/cron-runs";
import { opsHealth } from "@/lib/ops/health";

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

(enabled ? describe : describe.skip)("ops health", () => {
  afterAll(async () => { await db.recursiveDelete(db.doc("system/cronRuns")); });

  test("a job's last run decides whether it is ok, failing, late or never ran", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await recordCronRun("rollup", async () => ({ processed: 3 }));
    await expect(recordCronRun("expire", async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    await recordCronRun("anchors", async () => ({ sent: 0, failed: 2 }), (result) => (result.failed ? `${result.failed} failed` : null));
    await db.doc("system/cronRuns/jobs/sources").set({ lastSucceededAt: Timestamp.fromMillis(Date.now() - 30 * 86_400_000) });

    const jobs = Object.fromEntries((await opsHealth()).jobs.map((job) => [job.job, job]));
    expect(jobs.rollup.state).toBe("ok");
    expect(jobs.expire).toMatchObject({ state: "failing", lastError: "boom" });
    expect(jobs.anchors).toMatchObject({ state: "failing", lastError: "2 failed" });
    expect(jobs.sources.state).toBe("late");
    expect(jobs.reconcile.state).toBe("never");
    // Failures are logged at ERROR: that is what the alert policy watches.
    expect(error.mock.calls.map((call) => String(call[0]))).toEqual(expect.arrayContaining(["cron-failed expire: boom", "cron-failed anchors: 2 failed"]));
    error.mockRestore();
  });
});
