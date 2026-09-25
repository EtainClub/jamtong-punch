"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./ops-pages.module.css";

const LINKS = [["/ops/status", "상태"], ["/ops/content", "콘텐츠"], ["/ops/reports", "신고"], ["/ops/settings", "설정"]] as const;

export function OpsNav() {
  const path = usePathname();
  return <nav className={styles.nav} aria-label="운영 메뉴">
    <Link className={styles.home} href="/">← 임통</Link>
    {LINKS.map(([href, label]) => <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined}>{label}</Link>)}
  </nav>;
}
