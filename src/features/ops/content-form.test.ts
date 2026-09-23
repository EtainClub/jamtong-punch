import { describe, expect, test } from "vitest";
import { formatTimecode, parseTimecode, youtubeVideoId } from "./content-form";

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
