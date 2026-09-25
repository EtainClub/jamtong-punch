import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";

// The scheduler's jobs and how often each should succeed. A job past twice its
// interval (plus slack) shows as late on /ops/status.
export const CRON_JOBS = {
  rollup: { label: "참여 집계", everyMinutes: 1, lateAfterMinutes: 15 },
  anchors: { label: "블록체인 전송", everyMinutes: 60, lateAfterMinutes: 180 },
  expire: { label: "기간 만료", everyMinutes: 1440, lateAfterMinutes: 1440 + 180 },
  reconcile: { label: "재집계", everyMinutes: 1440, lateAfterMinutes: 1440 + 180 },
  sources: { label: "출처 확인", everyMinutes: 10080, lateAfterMinutes: 10080 + 1440 },
} as const;
export type CronJob = keyof typeof CRON_JOBS;

const runRef = (job: CronJob) => db.doc(`system/cronRuns/jobs/${job}`);

// Runs a job and records its last success or failure. Failures (thrown, or a
// result that reports one) are logged at ERROR, which is what the Cloud
// Monitoring alert watches.
export async function recordCronRun<T>(job: CronJob, run: () => Promise<T>, problemOf: (result: T) => string | null = () => null): Promise<T> {
  const startedAt = Timestamp.now();
  try {
    const result = await run();
    const problem = problemOf(result);
    if (problem) console.error(`cron-failed ${job}: ${problem}`);
    await runRef(job).set({
      lastStartedAt: startedAt,
      lastSucceededAt: Timestamp.now(),
      lastResult: JSON.stringify(result).slice(0, 500),
      ...(problem ? { lastFailedAt: Timestamp.now(), lastError: problem } : {}),
    }, { merge: true });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : String(error);
    console.error(`cron-failed ${job}: ${message}`, error);
    await runRef(job).set({ lastStartedAt: startedAt, lastFailedAt: Timestamp.now(), lastError: message }, { merge: true }).catch(() => undefined);
    throw error;
  }
}
