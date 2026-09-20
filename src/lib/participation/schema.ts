import { z } from "zod";
import { GAMES, KINDS, STANCES } from "@/lib/domain";

export const participationSchema = z.object({
  sessionId: z.uuid(),
  game: z.enum(GAMES),
  startedAt: z.iso.datetime(),
  stances: z.array(z.object({
    kind: z.enum(KINDS),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    stance: z.enum(STANCES),
    recordId: z.string().nullable().default(null),
    score: z.number().int().min(0).max(10_000).nullable().default(null),
    dwellMs: z.number().int().min(0).optional(),
  })).min(1).max(25),
});

export type ParticipationInput = z.infer<typeof participationSchema>;
export type ParticipationResult = { accepted: string[]; replaced: string[]; capped: string[]; date: string };
