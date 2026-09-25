import type { AnchorVersion } from "@/lib/anchor/versions";
import { pendingReviewCount } from "@/lib/content/store";
import { db } from "@/lib/firebase/admin";
import { openReportCount } from "@/lib/report/list";
import { CRON_JOBS, type CronJob } from "./cron-runs";

export type JobHealth = {
  job: CronJob;
  label: string;
  everyMinutes: number;
  lastSucceededAt: string | null;
  lastFailedAt: string | null;
  lastError: string | null;
  // No success within the job's window, or the last run failed.
  state: "ok" | "late" | "failing" | "never";
};

export type OpsHealth = {
  checkedAt: string;
  jobs: JobHealth[];
  anchors: { pending: number; failing: number; oldestPendingAt: string | null; lastError: string | null };
  sourcesGone: number;
  reviewPending: number;
  reportsOpen: number;
};

const iso = (value: unknown) => (value && typeof (value as FirebaseFirestore.Timestamp).toDate === "function" ? (value as FirebaseFirestore.Timestamp).toDate().toISOString() : null);

// Everything /ops/status shows, in one read-only pass.
export async function opsHealth(now = Date.now()): Promise<OpsHealth> {
  const jobIds = Object.keys(CRON_JOBS) as CronJob[];
  const [runs, pendingAnchors, gone, reviewPending, reportsOpen] = await Promise.all([
    db.getAll(...jobIds.map((job) => db.doc(`system/cronRuns/jobs/${job}`))),
    db.collection("anchors").where("hasPending", "==", true).get(),
    db.collection("sources").where("availability.status", "in", ["unavailable", "restricted"]).count().get(),
    pendingReviewCount(),
    openReportCount(),
  ]);

  const jobs = jobIds.map((job, index): JobHealth => {
    const run = runs[index];
    const lastSucceededAt = iso(run.get("lastSucceededAt"));
    const lastFailedAt = iso(run.get("lastFailedAt"));
    const late = !lastSucceededAt || now - Date.parse(lastSucceededAt) > CRON_JOBS[job].lateAfterMinutes * 60_000;
    const failing = Boolean(lastFailedAt && (!lastSucceededAt || lastFailedAt >= lastSucceededAt));
    return {
      job,
      label: CRON_JOBS[job].label,
      everyMinutes: CRON_JOBS[job].everyMinutes,
      lastSucceededAt,
      lastFailedAt,
      lastError: failing ? (run.get("lastError") ?? null) : null,
      state: !run.exists ? "never" : failing ? "failing" : late ? "late" : "ok",
    };
  });

  const versions = pendingAnchors.docs.flatMap((snapshot) => (snapshot.get("versions") as AnchorVersion[]).filter((version) => !version.txId));
  const failingVersions = versions.filter((version) => version.error);
  const oldest = versions.map((version) => version.queuedAt).sort()[0] ?? null;
  return {
    checkedAt: new Date(now).toISOString(),
    jobs,
    anchors: { pending: versions.length, failing: failingVersions.length, oldestPendingAt: oldest, lastError: failingVersions.at(-1)?.error ?? null },
    sourcesGone: gone.data().count,
    reviewPending,
    reportsOpen,
  };
}
