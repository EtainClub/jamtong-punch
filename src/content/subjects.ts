import type { Subject } from "@/content/schema";
import type { Kind } from "@/lib/domain";

export type PublishedSubject = Subject & { status: "published" };

// Phase 2 content imports its validated git-backed subjects into this registry.
export const subjects: readonly Subject[] = [];
export const publishedSubjects: readonly PublishedSubject[] = subjects.filter((subject): subject is PublishedSubject => subject.status === "published");

const byKey = new Map(publishedSubjects.map((subject) => [`${subject.kind}:${subject.slug}`, subject]));
const byId = new Map(publishedSubjects.map((subject) => [subject.id, subject]));

export function requirePublished(kind: Kind, slug: string): PublishedSubject {
  const subject = byKey.get(`${kind}:${slug}`);
  if (!subject) throw new Error(`unknown or unpublished subject: ${kind}:${slug}`);
  return subject;
}

export function requirePublishedSubjectId(id: string): PublishedSubject {
  const subject = byId.get(id);
  if (!subject) throw new Error(`unknown or unpublished subject: ${id}`);
  return subject;
}
