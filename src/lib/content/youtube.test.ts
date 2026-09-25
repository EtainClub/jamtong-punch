import { describe, expect, test } from "vitest";
import { kstDate, parseWatchPage } from "./youtube";

const page = (player: unknown) => `<html><script>var ytInitialPlayerResponse = ${JSON.stringify(player)};var meta = 1;</script></html>`;

describe("parseWatchPage", () => {
  test("reads title, channel, length, description and the Korean publish date", () => {
    const html = page({
      playabilityStatus: { status: "OK" },
      videoDetails: { title: "김어준 \"긍정 뉴스도 안 먹혀\"", author: "YTN", lengthSeconds: "68", shortDescription: "  설명란 원문  " },
      microformat: { playerMicroformatRenderer: { publishDate: "2026-09-07T09:56:47-07:00" } },
    });
    expect(parseWatchPage(html)).toEqual({ title: "김어준 \"긍정 뉴스도 안 먹혀\"", channel: "YTN", durationSec: 68, description: "설명란 원문", publishedAt: "2026-09-08" });
  });

  test("an unplayable or unreadable page gives nothing", () => {
    expect(parseWatchPage(page({ playabilityStatus: { status: "LOGIN_REQUIRED" }, videoDetails: { title: "x" } }))).toBeNull();
    expect(parseWatchPage("<html>no player</html>")).toBeNull();
  });
});

describe("kstDate", () => {
  test("uses the calendar day in Korea", () => {
    expect(kstDate("2026-09-07T00:56:47-07:00")).toBe("2026-09-07");
    expect(kstDate("2026-09-07T20:00:00Z")).toBe("2026-09-08");
    expect(kstDate("nonsense")).toBeNull();
  });
});
