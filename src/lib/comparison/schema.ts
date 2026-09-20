import { z } from "zod";

export const comparisonSchema = z.object({
  sessionId: z.uuid(),
  bracket: z.string().regex(/^[a-z0-9-]+$/),
  matches: z.array(z.object({
    round: z.number().int().min(1),
    leftId: z.string().min(1),
    rightId: z.string().min(1),
    winner: z.enum(["left", "right"]),
  })).min(1).max(15),
});

export type ComparisonInput = z.infer<typeof comparisonSchema>;
