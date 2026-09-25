import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/features/archive/components";
import { RESULT_DISCLAIMER, resolveResult } from "@/features/play/result";
import hub from "@/features/play/hub.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ kind: string; question: string; winner: string }> };

// Shared results are personal: previews carry the result, search engines do
// not index them, so they never add up to a public ranking.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kind, question, winner } = await params;
  const result = await resolveResult(kind, question, winner);
  if (!result) return {};
  const title = `월드컵 · ${result.question} 1위: ${result.kind === "people" ? result.title : result.subtitle}`;
  return { title, description: RESULT_DISCLAIMER, robots: { index: false, follow: false }, openGraph: { title: `${title} · 임통`, description: RESULT_DISCLAIMER, type: "article", siteName: "임통", locale: "ko_KR" } };
}

export default async function WorldCupResultPage({ params }: Props) {
  const { kind, question, winner } = await params;
  const result = await resolveResult(kind, question, winner);
  if (!result) notFound();
  return <>
    <SiteHeader current="play" />
    <main className={hub.shell}>
      <section className={hub.hero}>
        <p className={hub.eyebrow}>{result.kind === "people" ? "인물 월드컵" : "언행 월드컵"} · 공유된 결과</p>
        <h1>{result.question}</h1>
        <div className={hub.resultCard}>
          <span>내가 고른 1위</span>
          <strong>{result.title}</strong>
          <small>{result.subtitle}</small>
          {result.quote && <q>{result.quote}</q>}
          <Link href={result.href}>{result.kind === "people" ? "인물 기록 보기" : "원문과 출처 보기"} →</Link>
        </div>
        <p>{RESULT_DISCLAIMER}</p>
        <Link className={hub.cta} href={result.playHref}>나도 해 보기 →</Link>
      </section>
    </main>
  </>;
}
