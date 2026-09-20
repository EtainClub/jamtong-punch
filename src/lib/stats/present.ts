import type { Stance } from "@/lib/domain";

export function present(windows: Record<Stance, number>) {
  const voters = windows.punch + windows.cheer;
  const reached = voters + windows.unknown;
  return {
    n: voters,
    ratio: voters >= 30 ? Math.round((windows.punch / voters) * 100) : null,
    awareness: reached >= 30 ? Math.round((voters / reached) * 100) : null,
  };
}
