import type { Stance } from "@/lib/domain";

// Below this many participants a ratio swings on one or two choices, so only
// the count is shown. Operator decision 2026-09-27: 10 (was 30).
export const MIN_PARTICIPANTS = 10;

export function present(windows: Record<Stance, number>) {
  const voters = windows.punch + windows.cheer;
  const reached = voters + windows.unknown;
  return {
    n: voters,
    ratio: voters >= MIN_PARTICIPANTS ? Math.round((windows.punch / voters) * 100) : null,
    awareness: reached >= MIN_PARTICIPANTS ? Math.round((voters / reached) * 100) : null,
  };
}
