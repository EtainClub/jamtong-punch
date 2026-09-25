"use client";

import Link from "next/link";
import type { User } from "firebase/auth";
import { useEffect, useState, type ReactNode } from "react";
import { signInWithGoogle, useFirebaseAuth } from "@/lib/firebase/auth";
import styles from "./ops-pages.module.css";

// Renders its children only for an operator. The APIs check the same claim;
// this only spares everyone else a page of refusals.
export function OpsGate({ children }: { children: (user: User) => ReactNode }) {
  const { user, ready } = useFirebaseAuth();
  const [isOps, setIsOps] = useState<boolean | null>(null);
  const signedIn = Boolean(user && !user.isAnonymous);
  useEffect(() => {
    if (!user || !signedIn) return;
    let active = true;
    void user.getIdTokenResult().then((result) => { if (active) setIsOps(result.claims.ops === true); });
    return () => { active = false; };
  }, [user, signedIn]);

  if (!ready) return <p className={styles.note}>계정을 확인하고 있습니다…</p>;
  if (!user || !signedIn) return <p className={styles.note}>운영자 계정으로 <button className={styles.inline} onClick={() => void signInWithGoogle()} type="button">로그인</button>하세요.</p>;
  if (isOps === null) return <p className={styles.note}>권한을 확인하고 있습니다…</p>;
  if (!isOps) return <p className={styles.note}>운영자 권한이 없습니다. <Link href="/">홈으로</Link></p>;
  return <>{children(user)}</>;
}
