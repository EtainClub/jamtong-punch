import type { Game } from "@/lib/domain";

type AnomalyInput = {
  game: Game;
  startedAt: string;
  stances: Array<{ score: number | null; dwellMs?: number }>;
};

const MIN_SESSION_MS: Record<Game, number> = { reflex: 8_000, swipe: 3_000, static: 1_000 };

export function detectAnomaly(input: AnomalyInput, now = Date.now()): string | null {
  const elapsed = now - Date.parse(input.startedAt);
  if (!Number.isFinite(elapsed) || elapsed < MIN_SESSION_MS[input.game]) return "too-fast";
  if (input.game === "reflex" && (input.stances[0]?.score ?? 0) > Math.ceil(elapsed / 120)) {
    return "impossible-score";
  }
  if (input.game === "swipe") {
    const average = input.stances.reduce((sum, stance) => sum + (stance.dwellMs ?? 0), 0) / input.stances.length;
    if (average < 200) return "not-read";
  }
  return null;
}
