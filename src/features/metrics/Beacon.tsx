"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { classifySource, type MetricEvent } from "@/lib/metrics/events";

const VISITED = "imtong.visited";
const TAB = "imtong.tab";
const RECORDS = "imtong.records";
const RECORD_PAGE = /^\/(statements|evaluations)\/[^/]+$/;

function send(event: MetricEvent) {
  void fetch("/api/metrics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(event), keepalive: true }).catch(() => {});
}

// Counts visits by where they came from, and whether a first-time visitor
// went on to a second record. Only "has been here" (this browser) and a
// per-tab counter are kept; storage failures simply skip counting.
export function Beacon() {
  const pathname = usePathname();
  useEffect(() => {
    // Local development shares the production database; only the deployed site counts.
    if (process.env.NODE_ENV !== "production" || pathname.startsWith("/ops")) return;
    try {
      let tab = sessionStorage.getItem(TAB);
      if (!tab) {
        const first = !localStorage.getItem(VISITED);
        localStorage.setItem(VISITED, "1");
        tab = first ? "first" : "return";
        sessionStorage.setItem(TAB, tab);
        send({ event: "visit", source: classifySource(document.referrer, location.search, navigator.userAgent, location.host), first });
      }
      if (tab === "first" && RECORD_PAGE.test(pathname)) {
        const seen = Number(sessionStorage.getItem(RECORDS) ?? "0") + 1;
        sessionStorage.setItem(RECORDS, String(seen));
        if (seen === 2) send({ event: "second_record" });
      }
    } catch {
      // Private mode or blocked storage: no counting.
    }
  }, [pathname]);
  return null;
}
