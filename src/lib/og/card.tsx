import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// Satori needs the font bytes and cannot read woff2. Google Fonts serves a
// TrueType subset of just the characters asked for when the request has no
// browser user agent, which keeps each image's font a few kilobytes.
async function koreanFont(text: string, weight: 400 | 800): Promise<ArrayBuffer> {
  const chars = [...new Set(text)].join("");
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(chars)}`)).text();
  const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error(`og: no TrueType font in Google Fonts response for weight ${weight}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`og: font download failed with ${response.status}`);
  return response.arrayBuffer();
}

export function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

type Card = {
  eyebrow: string;
  title: string;
  quote?: string | null;
  // A plain line under the title (a person's role), not a quotation.
  subtitle?: string | null;
  footer?: string | null;
  // "그 후 실제로는": what official data showed afterwards, as one line.
  outcome?: { asOf: string; text: string } | null;
};

// One layout for every shared page: what it is, the headline, an optional
// quote, and the site. Colors are globals.css tokens (eggshell, ink, burgundy, graphite, smoke).
// No faces: shared images carry records and numbers only (implementation-design 4장·11장).
export async function ogCard({ eyebrow, title, quote, subtitle, footer, outcome }: Card): Promise<ImageResponse> {
  const heading = clip(title, 54);
  const body = quote ? `“${clip(quote, outcome ? 70 : 110)}”` : null;
  const line = subtitle ? clip(subtitle, 60) : null;
  const after = outcome ? { label: `그 후 실제로는 · ${outcome.asOf} 기준`, text: clip(outcome.text, 64) } : null;
  const bold = [SITE_NAME, eyebrow, heading, after?.label ?? ""].join("");
  // With a result on the card the site line shortens so the footer fits.
  const site = after ? "im.jamtong.kr" : "im.jamtong.kr · 원자료로 끝나는 인물 아카이브";
  const foot = footer ? clip(footer, after ? 48 : 40) : "";
  const regular = [body ?? "", line ?? "", foot, after?.text ?? "", site].join("");
  const [boldFont, regularFont] = await Promise.all([koreanFont(bold, 800), koreanFont(regular, 400)]);
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", flexDirection: "column", justifyContent: "space-between", background: "#fdfcfc", padding: "64px 72px", color: "#000000", fontFamily: "Noto Sans KR" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", borderRadius: 12, background: "#000000", padding: "6px 18px", color: "#fff", fontSize: 30, fontWeight: 800 }}>{SITE_NAME}</div>
        <div style={{ display: "flex", color: "#8a2233", fontSize: 30, fontWeight: 800 }}>{eyebrow}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 48 }}>

        <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: after ? (heading.length > 30 ? 46 : 56) : heading.length > 30 ? 56 : 68, fontWeight: 800, lineHeight: 1.25, letterSpacing: -1.5, wordBreak: "keep-all" }}>{heading}</div>
          {line && <div style={{ display: "flex", color: "#44403b", fontSize: 34, wordBreak: "keep-all" }}>{line}</div>}
          {body && <div style={{ display: "flex", borderLeft: "6px solid #8a2233", paddingLeft: 24, color: "#44403b", fontSize: after ? 28 : 32, lineHeight: 1.5, wordBreak: "keep-all" }}>{body}</div>}
          {after && <div style={{ display: "flex", flexDirection: "column", gap: 6, borderRadius: 16, background: "#e3e9f4", padding: "16px 24px" }}>
            <div style={{ display: "flex", color: "#16366b", fontSize: 24, fontWeight: 800 }}>{after.label}</div>
            <div style={{ display: "flex", color: "#000000", fontSize: 28, lineHeight: 1.4, wordBreak: "keep-all" }}>{after.text}</div>
          </div>}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 24, color: "#777169", fontSize: 26 }}>
        <span>{foot}</span>
        <span>{site}</span>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [
        { name: "Noto Sans KR", data: boldFont, weight: 800, style: "normal" },
        { name: "Noto Sans KR", data: regularFont, weight: 400, style: "normal" },
      ],
    },
  );
}
