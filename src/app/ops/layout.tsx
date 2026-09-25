import type { Metadata } from "next";
import type { ReactNode } from "react";
import { OpsNav } from "@/features/ops/OpsNav";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function OpsLayout({ children }: { children: ReactNode }) {
  return <><OpsNav />{children}</>;
}
