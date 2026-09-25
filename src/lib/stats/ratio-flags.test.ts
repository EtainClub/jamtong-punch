import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/firebase/admin", () => ({ db: {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: () => undefined }));

const { ratioHidden } = await import("./read");

describe("ratioHidden", () => {
  test("the global switch hides every subject", () => {
    expect(ratioHidden({ ratiosHidden: true, hiddenSubjects: [] }, "lee-jaemyung")).toBe(true);
  });

  test("listed subjects are hidden on their own", () => {
    const flags = { ratiosHidden: false, hiddenSubjects: ["lee-jaemyung"] };
    expect(ratioHidden(flags, "lee-jaemyung")).toBe(true);
    expect(ratioHidden(flags, "yoo-simin")).toBe(false);
  });
});
