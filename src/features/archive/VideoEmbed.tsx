"use client";

import { useState } from "react";
import styles from "./archive.module.css";

// Click-to-load player. Nothing is requested from YouTube until the reader
// presses play; the privacy-enhanced domain is used once they do. The cited
// segment is what plays: it starts at the quote and stops at its end.
export function VideoEmbed({ videoId, startSec, endSec, vertical, title }: { videoId: string; startSec: number | null; endSec: number | null; vertical: boolean; title: string }) {
  const [playing, setPlaying] = useState(false);
  const params = new URLSearchParams({ autoplay: "1", rel: "0", playsinline: "1" });
  if (startSec !== null) params.set("start", String(startSec));
  if (endSec !== null) params.set("end", String(endSec));
  return <div className={`${styles.video} ${vertical ? styles.videoVertical : ""}`}>
    {playing
      ? <iframe src={`https://www.youtube-nocookie.com/embed/${videoId}?${params}`} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      : <button type="button" className={styles.videoPoster} onClick={() => setPlaying(true)} aria-label={`${title} 재생`} style={{ backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)` }}>
        <span className={styles.videoPlay} aria-hidden="true">▶</span>
      </button>}
  </div>;
}
