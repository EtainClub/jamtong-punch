import { describe, expect, test } from "vitest";
import { findDuplicates, formatTimecode, normalizeUrl, parseTimecode, youtubeVideoId } from "./content-form";

describe("timecodes", () => {
  test("reads the forms operators paste", () => {
    expect(parseTimecode("83")).toBe(83);
    expect(parseTimecode("17:32")).toBe(1052);
    expect(parseTimecode("1:02:03")).toBe(3723);
    expect(parseTimecode("1h2m3s")).toBe(3723);
    expect(parseTimecode("https://youtu.be/dQw4w9WgXcQ?t=1052")).toBe(1052);
    expect(parseTimecode("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=17m32s")).toBe(1052);
  });

  test("tells an empty value from a typo", () => {
    expect(parseTimecode("  ")).toBeNull();
    expect(parseTimecode("17:75")).toBeNaN();
    expect(parseTimecode("abc")).toBeNaN();
  });

  test("round trips through the display format", () => {
    expect(formatTimecode(1052)).toBe("17:32");
    expect(formatTimecode(3723)).toBe("1:02:03");
    expect(parseTimecode(formatTimecode(3723))).toBe(3723);
  });
});

describe("youtubeVideoId", () => {
  test("extracts ids from the common URL shapes", () => {
    expect(youtubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toBe("dQw4w9WgXcQ");
    expect(youtubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeVideoId("https://m.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeVideoId("https://www.youtube.com/live/dQw4w9WgXcQ?si=x")).toBe("dQw4w9WgXcQ");
  });

  test("rejects anything else", () => {
    expect(youtubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(youtubeVideoId("not a url")).toBeNull();
  });
});

describe("duplicates", () => {
  const names = new Map([["kim", "김어준"]]);
  const cite = (sourceId: string, startSec: number | null, endSec: number | null) => ({ sourceId, startSec, endSec });

  test("normalizes links that point to the same thing", () => {
    expect(normalizeUrl("https://youtube.com/shorts/3ee4bvV6ITw?si=abc")).toBe(normalizeUrl("https://www.youtube.com/watch?v=3ee4bvV6ITw"));
    expect(normalizeUrl("https://www.news.com/a/1/?utm_source=x&b=2&a=1")).toBe(normalizeUrl("https://news.com/a/1?a=1&b=2"));
    expect(normalizeUrl("https://news.com/a/1?id=1")).not.toBe(normalizeUrl("https://news.com/a/1?id=2"));
  });

  test("flags a source with the same link", () => {
    const refs = { sources: [{ id: "yt-a", url: "https://youtu.be/3ee4bvV6ITw", title: "영상" }] };
    expect(findDuplicates("sources", { id: "new", url: "https://youtube.com/shorts/3ee4bvV6ITw" }, refs, names)).toHaveLength(1);
    expect(findDuplicates("sources", { id: "yt-a", url: "https://youtu.be/3ee4bvV6ITw" }, refs, names)).toHaveLength(0);
  });

  test("flags the same speaker citing an overlapping segment, not a separate one", () => {
    const existing = { id: "s1", personId: "kim", headline: "기존", quote: "원문", status: "published", citations: [cite("src", 10, 40)] };
    const refs = { statements: [existing] };
    const draft = (citations: unknown[], personId = "kim") => ({ id: "s2", personId, quote: "다른 말", citations });
    expect(findDuplicates("statements", draft([cite("src", 30, 60)]), refs, names)).toHaveLength(1);
    expect(findDuplicates("statements", draft([cite("src", 41, 60)]), refs, names)).toHaveLength(0);
    expect(findDuplicates("statements", draft([cite("src", null, null)]), refs, names)).toHaveLength(1);
    expect(findDuplicates("statements", draft([cite("src", 30, 60)], "other"), refs, names)).toHaveLength(0);
    expect(findDuplicates("statements", { ...draft([cite("other", 0, 5)]), quote: "원문" }, refs, names)).toHaveLength(1);
  });

  test("flags a person with the same name or alias", () => {
    const refs = { people: [{ id: "kim", name: "김어준", aliases: ["총수"] }] };
    expect(findDuplicates("people", { id: "new", name: "총수" }, refs, names)).toHaveLength(1);
    expect(findDuplicates("people", { id: "new", name: "김어진" }, refs, names)).toHaveLength(0);
  });
});
