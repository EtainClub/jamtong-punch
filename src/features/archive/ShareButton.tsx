"use client";

import { useState } from "react";
import { SITE_URL } from "@/lib/site";
import styles from "./archive.module.css";

// Opens the phone's share sheet where there is one, otherwise copies the
// link. Always the canonical domain, whichever host the page was opened on.
// ?s=1 marks a shared link, so the page can greet whoever opens it and visit
// counts can tell shares apart; the page's canonical URL stays without it.
export function ShareButton({ path, title, prominent = false }: { path: string; title: string; prominent?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = `${SITE_URL}${path}${path.includes("?") ? "&" : "?"}s=1`;
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
  return <button className={`${styles.shareButton}${prominent ? ` ${styles.detailShare}` : ""}`} onClick={() => void share()} type="button" aria-live="polite">{prominent && <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7" /></svg>}{copied ? "링크 복사됨" : "공유"}</button>;
}
