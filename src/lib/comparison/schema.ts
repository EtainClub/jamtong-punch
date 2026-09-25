import { z } from "zod";

// Brackets drawn at random from published content, alongside the ones an
// operator publishes. The question is fixed per kind (implementation-design
// 7.5): users pick one of these, never write their own.
export const AUTO_BRACKETS = {
  "auto-statements": { kind: "statement", questions: ["more-problematic", "more-urgent"] },
  "auto-people": { kind: "person", questions: ["more-punch", "more-cheer"] },
} as const;
export type AutoBracketId = keyof typeof AUTO_BRACKETS;
export const QUESTION_IDS = ["more-problematic", "more-urgent", "more-punch", "more-cheer"] as const;

export const comparisonSchema = z.object({
  sessionId: z.uuid(),
  bracket: z.string().regex(/^[a-z0-9-]+$/),
  question: z.enum(QUESTION_IDS).optional(),
  matches: z.array(z.object({
    round: z.number().int().min(1),
    leftId: z.string().min(1),
    rightId: z.string().min(1),
    winner: z.enum(["left", "right"]),
  })).min(1).max(15),
});

export type ComparisonInput = z.infer<typeof comparisonSchema>;
