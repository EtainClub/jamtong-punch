import type { RecordContent } from "@/content/schema";

export type PublishedRecord = RecordContent & { status: "published" };

// Phase 2 content imports validated record files into this registry.
export const records: readonly RecordContent[] = [];
const byId = new Map(records.map((record) => [record.id, record]));

export function requirePublishedRecord(id: string): PublishedRecord {
  const record = byId.get(id);
  if (!record || record.status !== "published") throw new Error(`unknown or unpublished record: ${id}`);
  return record as PublishedRecord;
}
