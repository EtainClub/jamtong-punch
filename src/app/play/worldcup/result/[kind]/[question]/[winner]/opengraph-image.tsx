import { resolveResult } from "@/features/play/result";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";

export const alt = "임통 월드컵 결과";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// No face and no score: the question, the pick, and what it is not.
export default async function Image({ params }: { params: Promise<{ kind: string; question: string; winner: string }> }) {
  const { kind, question, winner } = await params;
  const result = await resolveResult(kind, question, winner);
  if (!result) return ogCard({ eyebrow: "월드컵", title: "찾을 수 없는 결과입니다" });
  return ogCard({
    eyebrow: `${result.kind === "people" ? "인물" : "언행"} 월드컵 · ${result.question}`,
    title: `내가 고른 1위: ${result.title}`,
    subtitle: result.kind === "statements" ? result.subtitle : null,
    footer: "한 사람의 비교 결과 · 지지율이 아닙니다",
  });
}
