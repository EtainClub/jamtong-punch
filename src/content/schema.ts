import { z } from "zod";

// Authored content. Every object is strict: a field that is not in the schema
// (a relationship "label", a stance "sentiment") is rejected, not stripped.
// Derived fields (counts, mentionedPersonIds, sourceIds, searchTokens) are written
// by the content store and are never accepted from the CMS.

const id = z.string().regex(/^[a-z0-9-]+$/);
const date = z.iso.date();
const status = z.enum(["draft", "published", "archived"]);
const datePrecision = z.enum(["day", "month", "year"]);
const corrections = z.array(z.object({ at: date, note: z.string().min(1) }).strict()).default([]);

export const citationSchema = z.object({
  sourceId: id,
  startSec: z.number().int().min(0).nullable().default(null),
  endSec: z.number().int().min(1).nullable().default(null),
  locator: z.string().min(1).nullable().default(null),
}).strict().refine((value) => (value.startSec === null) === (value.endSec === null), "citation segment needs both start and end")
  .refine((value) => value.startSec === null || value.endSec! > value.startSec, "citation segment end must be after start");

export const sourceSchema = z.object({
  id,
  kind: z.enum(["article", "video", "broadcast", "sns", "document", "transcript"]),
  title: z.string().min(1),
  publisher: z.string().min(1),
  url: z.url(),
  archiveUrl: z.url().nullable().default(null),
  publishedAt: date,
  video: z.object({
    platform: z.literal("youtube"),
    videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    durationSec: z.number().int().min(1).nullable().default(null),
  }).strict().nullable().default(null),
  license: z.enum(["public", "quotable", "link-only"]),
  rightsStatus: z.enum(["pending", "cleared", "flagged"]),
}).strict();

export const personSchema = z.object({
  id,
  name: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
  roles: z.array(z.object({
    title: z.string().min(1),
    org: z.string().min(1).nullable().default(null),
    from: date.nullable().default(null),
    to: date.nullable().default(null),
    citation: citationSchema,
  }).strict()).default([]),
  summary: z.string().min(1),
  image: z.object({
    path: z.string().min(1),
    sourceUrl: z.url(),
    license: z.enum(["cleared", "public", "link-only"]),
    rightsStatus: z.enum(["pending", "cleared", "replace-requested"]),
  }).strict().nullable().default(null),
  playable: z.boolean().default(false),
  status,
  corrections,
}).strict();

export const QUOTE_REQUIRED_KINDS = ["remark", "interview", "speech", "sns", "hearing"] as const;

export const statementSchema = z.object({
  id,
  personId: id,
  occurredAt: date,
  datePrecision,
  kind: z.enum([...QUOTE_REQUIRED_KINDS, "action", "decision", "policy"]),
  headline: z.string().min(1),
  quote: z.string().min(1).nullable().default(null),
  context: z.string().min(1),
  citations: z.array(citationSchema).min(1),
  topicIds: z.array(id).default([]),
  eventId: id.nullable().default(null),
  // People named in the quote are detected automatically. Operators can only
  // exclude a false match (a homonym, a common word), never add one.
  mentionExclusions: z.array(id).default([]),
  assertionType: z.enum(["FACT", "CLAIM", "INTERPRETATION"]),
  status,
  corrections,
}).strict().refine((value) => value.quote !== null || !(QUOTE_REQUIRED_KINDS as readonly string[]).includes(value.kind), "statement of this kind needs a quote");

export const SEGMENT_REQUIRED_FORMATS = ["video", "broadcast"] as const;

export const evaluationSchema = z.object({
  id,
  targetPersonId: id,
  evaluator: z.object({
    personId: id.nullable().default(null),
    name: z.string().min(1),
    descriptor: z.string().min(1),
  }).strict(),
  occurredAt: date,
  datePrecision,
  format: z.enum([...SEGMENT_REQUIRED_FORMATS, "interview", "column", "sns", "book"]),
  claim: z.string().min(1),
  quote: z.string().min(1).nullable().default(null),
  citation: citationSchema,
  topicIds: z.array(id).default([]),
  eventIds: z.array(id).default([]),
  respondsTo: id.nullable().default(null),
  status,
  corrections,
}).strict()
  .refine((value) => value.evaluator.personId !== value.targetPersonId, "self evaluation belongs in statements")
  .refine((value) => value.citation.startSec !== null || !(SEGMENT_REQUIRED_FORMATS as readonly string[]).includes(value.format), "video evaluation needs a segment");

// Events group records and show who was involved. They do not connect people:
// relationships come only from what people said (statements, evaluations).
export const eventSchema = z.object({
  id,
  title: z.string().min(1),
  occurredAt: date,
  endAt: date.nullable().default(null),
  datePrecision,
  summary: z.string().min(1),
  participants: z.array(z.object({
    personId: id,
    role: z.enum(["principal", "participant", "commenter"]),
    note: z.string().min(1).nullable().default(null),
  }).strict()).min(1),
  topicIds: z.array(id).default([]),
  citations: z.array(citationSchema).min(1),
  status,
  corrections,
}).strict()
  .refine((value) => new Set(value.participants.map((item) => item.personId)).size === value.participants.length, "duplicate event participant")
  .refine((value) => value.endAt === null || value.endAt >= value.occurredAt, "event ends before it starts");

export const topicSchema = z.object({
  id,
  name: z.string().min(1),
  description: z.string().min(1),
  parentId: id.nullable().default(null),
  status,
  corrections,
}).strict().refine((value) => value.parentId !== value.id, "topic cannot be its own parent");

export const bracketSchema = z.object({
  id,
  status,
  questionId: z.enum(["more-problematic", "more-urgent"]),
  statementIds: z.array(id).refine((items) => items.length === 8 || items.length === 16, "bracket needs 8 or 16 statements")
    .refine((items) => new Set(items).size === items.length, "duplicate bracket statement"),
}).strict();

export type Citation = z.infer<typeof citationSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Person = z.infer<typeof personSchema>;
export type Statement = z.infer<typeof statementSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type Bracket = z.infer<typeof bracketSchema>;

export type RelationshipEvidence = {
  type: "mention" | "evaluation";
  id: string;
  at: string;
  from: string | null;
  headline: string;
};

export type Relationship = {
  pairId: string;
  personIds: [string, string];
  weight: number;
  counts: { mentions: number; evaluations: number };
  firstAt: string;
  lastAt: string;
  evidence: RelationshipEvidence[];
};
