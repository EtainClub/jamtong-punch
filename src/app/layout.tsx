import type { Metadata } from "next";
import type { ReactNode } from "react";
import { VersionNotice } from "@/features/version/VersionNotice";
import { FirebaseAuthProvider } from "@/lib/firebase/auth";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const description = "누가 어떤 말을 해왔는지, 다른 사람들은 그를 어떻게 평가했는지, 누구를 언급해 왔는지. 모든 기록이 원자료로 끝나는 인물 아카이브.";

// Pages set a title and description; links shared in messengers get the site
// name, a large card and the per-page Open Graph image next to them.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — 인물 아카이브`, template: `%s · ${SITE_NAME}` },
  description,
  openGraph: { siteName: SITE_NAME, locale: "ko_KR", type: "website", description },
  twitter: { card: "summary_large_image" },
  // iOS has no install prompt; "홈 화면에 추가" opens full screen with this.
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ko"><body><FirebaseAuthProvider>{children}</FirebaseAuthProvider><VersionNotice /></body></html>;
}
