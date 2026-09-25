import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

// Browsers offer "install app" (not just "create shortcut") only when the site
// has a manifest with a name, a start URL, standalone display and 192/512 icons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE_NAME} — 인물 아카이브`,
    short_name: SITE_NAME,
    description: "누가 어떤 말을 해왔는지, 다른 사람들은 그를 어떻게 평가했는지, 누구를 언급해 왔는지. 모든 기록이 원자료로 끝나는 인물 아카이브.",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fdfcfc",
    theme_color: "#fdfcfc",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
