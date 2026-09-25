import type { Metadata } from "next";
import { SiteHeader } from "@/features/archive/components";
import { OpsContentManager } from "@/features/ops/OpsContentManager";

export const metadata: Metadata = { title: "등록하기", robots: { index: false } };

// Contributors are site visitors, so the page keeps the site's header (logo
// home, sections) and, on phones, the bottom tab bar.
export default function ContributePage() {
  return <>
    <SiteHeader />
    <OpsContentManager mode="contributor" />
  </>;
}
