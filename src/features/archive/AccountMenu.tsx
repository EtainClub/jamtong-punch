"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { accountJsonFetch } from "@/lib/firebase/api";
import { signInWithGoogle, signOutOfGoogle, useFirebaseAuth } from "@/lib/firebase/auth";
import styles from "./archive.module.css";

type Profile = { isOps: boolean; reviewCount: number; rejectedCount: number };

// Anonymous visitors see a sign-in button; Google users get the contribution
// page, operators also the CMS. Badges show work waiting for an operator and
// a contributor's submissions that were sent back. The APIs enforce the same
// roles on every write.
export function AccountMenu() {
  const { user } = useFirebaseAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  // Linking to Google keeps the same User object, so the flag is tracked on its own.
  const signedIn = Boolean(user && !user.isAnonymous);
  useEffect(() => {
    if (!user || !signedIn) return;
    let active = true;
    void accountJsonFetch<Profile>(user, "/api/me/profile").then((result) => { if (active) setProfile(result); }).catch(() => undefined);
    return () => { active = false; };
  }, [user, signedIn]);

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
    <Link href="/contribute">등록하기{profile && profile.rejectedCount > 0 && <span className={styles.badge} title="반려된 등록물">{profile.rejectedCount}</span>}</Link>
    {profile?.isOps && <Link href="/ops/content">운영{profile.reviewCount > 0 && <span className={styles.badge} title="검토 대기">{profile.reviewCount}</span>}</Link>}
    <button onClick={() => void run(async () => { setProfile(null); await signOutOfGoogle(); })} disabled={busy} type="button">로그아웃</button>
  </div>;
}
