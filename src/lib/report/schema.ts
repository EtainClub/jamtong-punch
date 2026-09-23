import { z } from "zod";

export const reportSchema = z.object({
  targetType: z.enum(["person", "statement", "photo"]),
  targetId: z.string().min(1).max(200),
  reason: z.string().min(1).max(80),
  detail: z.string().min(1).max(2_000),
  evidenceUrl: z.url().optional(),
});

export type ReportInput = z.infer<typeof reportSchema>;
