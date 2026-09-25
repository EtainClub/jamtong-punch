"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_VERSION, isNewerVersion } from "@/lib/version";
import styles from "./version.module.css";

const CHECK_EVERY_MS = 10 * 60_000;

// Shows the running version in a corner and, when the server answers with a
// newer one, asks the reader to reload. A page opened before a deploy keeps
// its old code until then, so this is the only way to reach them.
export function VersionNotice() {
  const [latest, setLatest] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    async function check() {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        const { version } = await response.json() as { version?: string };
        if (active && version && isNewerVersion(version, APP_VERSION)) setLatest(version);
      } catch {
        // Offline or mid-deploy: try again at the next check.
      }
    }
    const first = window.setTimeout(() => void check(), 5_000);
    const interval = window.setInterval(() => void check(), CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      active = false;
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  return <>
    <footer className={styles.footer}><Link href="/about">소개 · 개인정보처리방침</Link><span>임통 v{APP_VERSION}</span></footer>
    {latest && !dismissed && <div className={styles.banner} role="status">
      <p><b>새 버전 v{latest}이 나왔습니다.</b> 지금 화면은 v{APP_VERSION}입니다. 새로고침하면 최신 버전으로 바뀝니다.</p>
      <div>
        <button className={styles.reload} onClick={() => window.location.reload()} type="button">새로고침</button>
        <button className={styles.later} onClick={() => setDismissed(true)} type="button">나중에</button>
      </div>
    </div>}
  </>;
}
