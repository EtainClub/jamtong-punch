import { describe, expect, test } from "vitest";
import { checkAvailability, classifyStatus, probeUrl } from "./availability";

describe("classifyStatus", () => {
  test("separates deleted, restricted and unknown", () => {
    expect([200, 301, 404, 410, 401, 403, 429, 500].map(classifyStatus)).toEqual(["live", "live", "unavailable", "unavailable", "restricted", "restricted", "unknown", "unknown"]);
  });
});

describe("checkAvailability", () => {
  const video = { url: "https://youtube.com/shorts/HvE8UFhy0IA", video: { platform: "youtube" as const, videoId: "HvE8UFhy0IA", durationSec: null } };

  test("asks YouTube through oEmbed", () => {
    expect(probeUrl(video)).toBe("https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DHvE8UFhy0IA");
  });

  test("records a deleted video", async () => {
    const result = await checkAvailability(video, "2026-09-24", async () => new Response("", { status: 404 }));
    expect(result).toEqual({ status: "unavailable", checkedAt: "2026-09-24", httpStatus: 404 });
  });

  test("does not call a network failure a deletion", async () => {
    const result = await checkAvailability(video, "2026-09-24", async () => { throw new Error("offline"); });
    expect(result.status).toBe("unknown");
  });
});
