import { z } from "zod";

export const sourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  publisher: z.string().min(1),
  url: z.url(),
  publishedAt: z.iso.date(),
  license: z.enum(["public", "quotable", "link-only"]),
  rightsStatus: z.enum(["pending", "cleared", "flagged"]),
});

export const subjectSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  kind: z.enum(["person", "policy"]),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  image: z.object({
    path: z.string().min(1),
    sourceUrl: z.url(),
    license: z.enum(["cleared", "public", "link-only"]),
    rightsStatus: z.enum(["pending", "cleared", "replace-requested"]),
  }),
  status: z.enum(["draft", "published", "archived"]),
});

export const recordSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  subject: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(["statement", "action", "decision", "policy-event"]),
  occurredAt: z.iso.date(),
  title: z.string().min(1),
  summary: z.string().min(1),
  assertionType: z.enum(["FACT", "CLAIM", "INTERPRETATION"]),
  sourceIds: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1),
  corrections: z.array(z.object({ at: z.iso.date(), note: z.string().min(1) })).default([]),
  status: z.enum(["draft", "published", "archived"]),
});

export const bracketSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  status: z.enum(["draft", "published", "archived"]),
  questionId: z.enum(["more-problematic", "more-urgent"]),
  items: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]+$/), type: z.enum(["record", "policy"]) })).length(8).or(
    z.array(z.object({ id: z.string().regex(/^[a-z0-9-]+$/), type: z.enum(["record", "policy"]) })).length(16),
  ),
});

export type Source = z.infer<typeof sourceSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type RecordContent = z.infer<typeof recordSchema>;
export type Bracket = z.infer<typeof bracketSchema>;
