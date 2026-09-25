import { currentRole } from "@/features/archive/components";
import { getPerson } from "@/lib/archive/read";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";

export const alt = "임통 인물 기록";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const person = await getPerson((await params).slug);
  if (!person) return ogCard({ eyebrow: "인물", title: "찾을 수 없는 인물입니다" });
  const { statements, evaluationsReceived, relations } = person.counts;
  return ogCard({
    eyebrow: "인물",
    title: person.name,
    subtitle: currentRole(person),
    footer: `언행 ${statements} · 시선 ${evaluationsReceived} · 관계 ${relations}`,
  });
}
