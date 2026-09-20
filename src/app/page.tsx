import { HomeDirectory } from "@/features/directory/HomeDirectory";
import { listPublishedSubjects } from "@/lib/content/store";
import { getPublicStatsIndex } from "@/lib/stats/read";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [subjects, index] = await Promise.all([listPublishedSubjects(), getPublicStatsIndex()]);
  const stats = (index?.s ?? {}) as Record<string, { d30?: { punch?: number; cheer?: number } }>;
  return <HomeDirectory initialSubjects={subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    category: subject.category,
    kind: subject.kind,
    punch: Number(stats[subject.id]?.d30?.punch ?? 0),
    cheer: Number(stats[subject.id]?.d30?.cheer ?? 0),
    imageUrl: subject.image.path.startsWith("/") ? subject.image.path : `/${subject.image.path}`,
  }))} />;
}
