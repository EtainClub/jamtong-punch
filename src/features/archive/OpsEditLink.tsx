"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFirebaseAuth } from "@/lib/firebase/auth";
import styles from "./archive.module.css";

// Shown only to operators. The claim check is a convenience for the link; the
// ops content API enforces the same claim on every write.
export function OpsEditLink({ type, id, label }: { type: "people" | "statements" | "evaluations" | "events" | "topics"; id: string; label: string }) {
  const { user } = useFirebaseAuth();
  const [isOps, setIsOps] = useState(false);
  useEffect(() => {
    if (!user) return;
    let active = true;
    void user.getIdTokenResult().then((result) => { if (active) setIsOps(result.claims.ops === true); }).catch(() => undefined);
    return () => { active = false; };
  }, [user]);
  if (!isOps) return null;
  return <Link className={styles.opsEdit} href={`/ops/content?type=${type}&id=${encodeURIComponent(id)}`}>✎ {label} 수정</Link>;
}
