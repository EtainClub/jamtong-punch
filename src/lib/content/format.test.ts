import { describe, expect, test } from "vitest";
import { citationSchema } from "@/content/schema";
import { citationHref, formatDate, formatShortDate } from "./format";

describe("formatDate", () => {
  test("never shows more precision than is known", () => {
    expect(formatDate("2024-03-18", "day")).toBe("2024년 3월 18일");
    expect(formatDate("2024-03-01", "month")).toBe("2024년 3월");
    expect(formatDate("2024-01-01", "year")).toBe("2024년");
    expect(formatDate("2024-03-18", "day", { withYear: false })).toBe("3월 18일");
    expect(formatShortDate("2024-03-01", "month")).toBe("2024.03");
  });
});

describe("citationHref", () => {
  test("jumps to the cited second of a YouTube video", () => {
    const source = { id: "s", kind: "video", title: "t", publisher: "p", url: "https://youtu.be/dQw4w9WgXcQ", archiveUrl: null, publishedAt: "2024-01-01", description: null, capturedAt: null, video: { platform: "youtube", videoId: "dQw4w9WgXcQ", durationSec: null }, license: "public", rightsStatus: "cleared" } as const;
    expect(citationHref(citationSchema.parse({ sourceId: "s", startSec: 1052, endSec: 1100 }), source)).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1052s");
    expect(citationHref(citationSchema.parse({ sourceId: "s" }), source)).toBe("https://youtu.be/dQw4w9WgXcQ");
  });
});
