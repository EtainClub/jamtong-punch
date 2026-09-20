import { describe, expect, test } from "vitest";
import { detectAnomaly } from "./anomaly";

describe("detectAnomaly", () => {
  test("marks a swipe with implausibly short dwell time", () => {
    expect(detectAnomaly({ game: "swipe", startedAt: new Date(0).toISOString(), stances: [{ score: null, dwellMs: 199 }] }, 3_000)).toBe("not-read");
  });

  test("accepts a plausible static submission", () => {
    expect(detectAnomaly({ game: "static", startedAt: new Date(0).toISOString(), stances: [{ score: null }] }, 1_000)).toBeNull();
  });
});
