import { z } from "zod";

export const reportStatusSchema = z.object({ status: z.enum(["open", "reviewing", "resolved", "dismissed"]) });
export const exclusionSchema = z.object({
  uid: z.string().min(1),
  subjectId: z.string().regex(/^[a-z0-9-]+$/),
  date: z.iso.date(),
  excluded: z.boolean(),
});
export const flagsSchema = z.object({
  ratiosHidden: z.boolean().optional(),
  hiddenSubjects: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(1_000).optional(),
}).refine((value) => value.ratiosHidden !== undefined || value.hiddenSubjects !== undefined, "at least one flag is required");
