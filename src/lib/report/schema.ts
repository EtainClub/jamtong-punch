import { z } from "zod";
import { REPORT_REASONS } from "./reasons";

export const reportSchema = z.object({
  targetType: z.enum(["person", "statement", "evaluation", "photo"]),
  targetId: z.string().regex(/^[a-z0-9-]+$/).max(200),
  reason: z.enum(REPORT_REASONS),
  detail: z.string().trim().min(1).max(2_000),
  evidenceUrl: z.url().optional(),
});

export type ReportInput = z.infer<typeof reportSchema>;
