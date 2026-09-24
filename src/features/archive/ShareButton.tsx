"use client";

import { useState } from "react";
import { SITE_URL } from "@/lib/site";
import styles from "./archive.module.css";

// Opens the phone's share sheet where there is one, otherwise copies the
// link. Always the canonical domain, whichever host the page was opened on.
export function ShareButton({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = `${SITE_URL}${path}`;
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; }
      catch (error) { if ((error as DOMException).name === "AbortError") return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("이 링크를 복사하세요", url);
    }
  }
  return <button className={styles.shareButton} onClick={() => void share()} type="button">{copied ? "링크 복사됨" : "공유"}</button>;
}
