import { describe, expect, test } from "vitest";
import { present } from "./present";

describe("present", () => {
  test("masks small samples while preserving awareness", () => {
    expect(present({ punch: 20, cheer: 9, unknown: 1 })).toEqual({ n: 29, ratio: null, awareness: 97 });
  });

  test("excludes unknown from the ratio denominator", () => {
    expect(present({ punch: 30, cheer: 10, unknown: 10 })).toEqual({ n: 40, ratio: 75, awareness: 80 });
  });
});
