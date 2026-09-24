import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";

export const alt = "임통 — 인물 아카이브";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({ eyebrow: "인물 아카이브", title: "사람의 말과 관계를 기록으로 봅니다", quote: "누가 어떤 말을 해왔는지, 다른 사람들은 그를 어떻게 평가했는지, 누구를 언급해 왔는지." });
}
