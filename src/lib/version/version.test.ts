import { describe, expect, test } from "vitest";
import { isNewerVersion } from "./index";

describe("isNewerVersion", () => {
  test("compares each part as a number", () => {
    expect(isNewerVersion("0.2.0", "0.1.9")).toBe(true);
    expect(isNewerVersion("0.10.0", "0.9.0")).toBe(true);
    expect(isNewerVersion("1.0.0", "0.99.99")).toBe(true);
  });

  test("the same or an older version is not newer", () => {
    expect(isNewerVersion("0.1.0", "0.1.0")).toBe(false);
    // During a rollout an old server can still answer; that must not prompt.
    expect(isNewerVersion("0.1.0", "0.2.0")).toBe(false);
  });

  test("anything that is not x.y.z never counts as newer", () => {
    expect(isNewerVersion("", "0.1.0")).toBe(false);
    expect(isNewerVersion("0.2.0-beta", "0.1.0")).toBe(false);
    expect(isNewerVersion("0.2.0", "unknown")).toBe(false);
  });
});
