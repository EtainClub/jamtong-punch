import type { MetadataRoute } from "next";
import { publishedIndex } from "@/lib/archive/read";
import { SITE_URL } from "@/lib/site";

// Rendered per request from the cached index, so new publications appear
// within the content cache window.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const index = await publishedIndex();
  const entry = (path: string, updatedAt: string | null = null): MetadataRoute.Sitemap[number] => ({ url: `${SITE_URL}${path}`, ...(updatedAt ? { lastModified: updatedAt } : {}) });
  return [
    entry("/"),
    entry("/people"),
    entry("/topics"),
    entry("/about"),
    ...index.people.map((item) => entry(`/people/${item.id}`, item.updatedAt)),
    ...index.statements.map((item) => entry(`/statements/${item.id}`, item.updatedAt)),
    ...index.evaluations.map((item) => entry(`/evaluations/${item.id}`, item.updatedAt)),
    ...index.events.map((item) => entry(`/events/${item.id}`, item.updatedAt)),
    ...index.topics.map((item) => entry(`/topics/${item.id}`, item.updatedAt)),
  ];
}
