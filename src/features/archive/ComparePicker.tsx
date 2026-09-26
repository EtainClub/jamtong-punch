"use client";

import { useRouter } from "next/navigation";
import styles from "./archive.module.css";

type Choice = { id: string; name: string; count: number };

// A column head that swaps which speaker the column shows. The page is
// server-rendered from ?a=&b=, so a choice just navigates.
export function ComparePicker({ label, value, choices, hrefFor }: { label: string; value: string; choices: Choice[]; hrefFor: Record<string, string> }) {
  const router = useRouter();
  return <select className={styles.comparePicker} aria-label={label} value={value} onChange={(event) => router.replace(hrefFor[event.target.value], { scroll: false })}>
    {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.name} ({choice.count})</option>)}
  </select>;
}
