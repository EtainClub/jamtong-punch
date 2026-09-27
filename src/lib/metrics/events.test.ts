import { describe, expect, test } from "vitest";
import { classifySource, metricEventSchema } from "./events";

describe("classifySource", () => {
  const ua = "Mozilla/5.0";
  test("a shared link wins over where it was opened", () => {
    expect(classifySource("https://m.search.naver.com/x", "?s=1", "KAKAOTALK 10.0", "im.jamtong.kr")).toBe("share");
  });
  test("reads the app and the referrer", () => {
    expect(classifySource("", "", "Mozilla/5.0 KAKAOTALK 10.8.1", "im.jamtong.kr")).toBe("kakao");
    expect(classifySource("https://www.google.com/", "", ua, "im.jamtong.kr")).toBe("search");
    expect(classifySource("https://m.search.naver.com/search.naver?q=x", "", ua, "im.jamtong.kr")).toBe("search");
    expect(classifySource("https://www.youtube.com/", "", ua, "im.jamtong.kr")).toBe("sns");
    expect(classifySource("https://t.co/abc", "", ua, "im.jamtong.kr")).toBe("sns");
    expect(classifySource("", "", ua, "im.jamtong.kr")).toBe("direct");
    expect(classifySource("https://im.jamtong.kr/people", "", ua, "im.jamtong.kr")).toBe("direct");
    expect(classifySource("https://blog.example.com/", "", ua, "im.jamtong.kr")).toBe("other");
  });
});

describe("metric events", () => {
  test("accept only known shapes", () => {
    expect(metricEventSchema.safeParse({ event: "visit", source: "search", first: true }).success).toBe(true);
    expect(metricEventSchema.safeParse({ event: "visit", source: "search", first: true, uid: "x" }).success).toBe(false);
    expect(metricEventSchema.safeParse({ event: "click" }).success).toBe(false);
  });
});
