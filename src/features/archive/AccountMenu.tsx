"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signInWithGoogle, signOutOfGoogle, useFirebaseAuth } from "@/lib/firebase/auth";
import styles from "./archive.module.css";

// Anonymous visitors see a sign-in button; Google users get the contribution
// page, operators also the CMS. The APIs enforce the same roles on every write.
export function AccountMenu() {
  const { user } = useFirebaseAuth();
  const [isOps, setIsOps] = useState(false);
  const [busy, setBusy] = useState(false);
  const signedIn = Boolean(user && !user.isAnonymous);
  useEffect(() => {
    if (!user || user.isAnonymous) return;
    let active = true;
    void user.getIdTokenResult().then((result) => { if (active) setIsOps(result.claims.ops === true); }).catch(() => undefined);
    return () => { active = false; };
  }, [user, user?.isAnonymous]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try { await action(); }
    catch (error) { if ((error as { code?: string }).code !== "auth/popup-closed-by-user") alert(error instanceof Error ? error.message : "로그인하지 못했습니다."); }
    finally { setBusy(false); }
  }

  if (!signedIn) {
    return <div className={styles.account}>
      <Link href="/contribute">등록하기</Link>
      <button onClick={() => void run(signInWithGoogle)} disabled={busy || !user} type="button">로그인</button>
    </div>;
  }
  return <div className={styles.account}>
    <Link href="/contribute">등록하기</Link>
    {isOps && <Link href="/ops/content">운영</Link>}
    <button onClick={() => void run(async () => { setIsOps(false); await signOutOfGoogle(); })} disabled={busy} type="button">로그아웃</button>
  </div>;
}
