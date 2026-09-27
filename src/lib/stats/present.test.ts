import { describe, expect, test } from "vitest";
import { MIN_PARTICIPANTS, present } from "./present";

describe("present", () => {
  test("masks small samples while preserving awareness", () => {
    expect(MIN_PARTICIPANTS).toBe(10);
    expect(present({ punch: 6, cheer: 3, unknown: 1 })).toEqual({ n: 9, ratio: null, awareness: 90 });
  });

  test("shows the ratio from the threshold on", () => {
    expect(present({ punch: 7, cheer: 3, unknown: 0 })).toEqual({ n: 10, ratio: 70, awareness: 100 });
  });

  test("excludes unknown from the ratio denominator", () => {
    expect(present({ punch: 30, cheer: 10, unknown: 10 })).toEqual({ n: 40, ratio: 75, awareness: 80 });
  });
});
