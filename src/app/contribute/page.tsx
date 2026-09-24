import type { Metadata } from "next";
import { OpsContentManager } from "@/features/ops/OpsContentManager";

export const metadata: Metadata = { title: "등록하기 · 임통", robots: { index: false } };

export default function ContributePage() {
  return <OpsContentManager mode="contributor" />;
}
