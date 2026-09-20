import { Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { bracketSchema, recordSchema, sourceSchema, subjectSchema, type Bracket, type RecordContent, type Source, type Subject } from "@/content/schema";
import type { Kind } from "@/lib/domain";
import { db } from "@/lib/firebase/admin";

export const contentTypeSchema = z.enum(["subjects", "sources", "records", "brackets"]);
export type ContentType = z.infer<typeof contentTypeSchema>;
export type ContentValue = Subject | Source | RecordContent | Bracket;

const schemas = {
  subjects: subjectSchema,
  sources: sourceSchema,
  records: recordSchema,
  brackets: bracketSchema,
} as const;

const collections = {
  subjects: "contentSubjects",
  sources: "contentSources",
  records: "contentRecords",
  brackets: "contentBrackets",
} as const;

function parse(type: ContentType, value: unknown): ContentValue {
  return schemas[type].parse(value) as ContentValue;
}

function collection(type: ContentType) {
  return db.collection(collections[type]);
}

export async function listContent(type: ContentType): Promise<ContentValue[]> {
  const snapshots = await collection(type).get();
  return snapshots.docs.map((snapshot) => parse(type, snapshot.data())).sort((left, right) => left.id.localeCompare(right.id));
}

export async function getContent(type: ContentType, id: string): Promise<ContentValue | null> {
  const snapshot = await collection(type).doc(id).get();
  return snapshot.exists ? parse(type, snapshot.data()) : null;
}

async function validateReferences(type: ContentType, value: ContentValue) {
  if (type === "records") {
    const record = value as RecordContent;
    const [subjects, sources] = await Promise.all([listContent("subjects"), Promise.all(record.sourceIds.map((id) => getContent("sources", id)))]);
    const subject = (subjects as Subject[]).find((item) => item.slug === record.subject);
    if (!subject) throw new Error(`unknown subject: ${record.subject}`);
    if (sources.some((source) => !source)) throw new Error("unknown record source");
    if (record.assertionType === "FACT" && (sources as Array<Source | null>).every((source) => source?.license === "link-only")) throw new Error("FACT record needs a usable source");
  }
  if (type === "brackets") {
    for (const item of (value as Bracket).items) {
      const found = item.type === "record" ? await getContent("records", item.id) : await getContent("subjects", item.id);
      if (!found) throw new Error(`unknown bracket item: ${item.id}`);
      if (item.type === "policy" && (found as Subject).kind !== "policy") throw new Error(`bracket policy is not a policy: ${item.id}`);
    }
  }
  if (type === "subjects" && (value as Subject).status === "published" && (value as Subject).image.rightsStatus !== "cleared") {
    throw new Error("published subject needs cleared image rights");
  }
}

export async function saveContent(type: ContentType, id: string, data: unknown, actorUid: string) {
  const value = parse(type, data) as ContentValue;
  if (value.id !== id) throw new Error("content id mismatch");
  await validateReferences(type, value);
  const ref = collection(type).doc(id);
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(ref);
    const now = Timestamp.now();
    transaction.set(ref, {
      ...value,
      createdAt: current.get("createdAt") ?? now,
      createdBy: current.get("createdBy") ?? actorUid,
      updatedAt: now,
      updatedBy: actorUid,
    });
  });
  revalidatePath("/");
  return value;
}

async function assertNoDependents(type: ContentType, value: ContentValue) {
  if (type === "sources") {
    const records = await listContent("records") as RecordContent[];
    if (records.some((record) => record.sourceIds.includes(value.id))) throw new Error("source is used by a record");
  }
  if (type === "subjects") {
    const [records, brackets] = await Promise.all([listContent("records"), listContent("brackets")]);
    if ((records as RecordContent[]).some((record) => record.subject === (value as Subject).slug)) throw new Error("subject is used by a record");
    if ((brackets as Bracket[]).some((bracket) => bracket.items.some((item) => item.type === "policy" && item.id === value.id))) throw new Error("subject is used by a bracket");
  }
  if (type === "records") {
    const brackets = await listContent("brackets") as Bracket[];
    if (brackets.some((bracket) => bracket.items.some((item) => item.type === "record" && item.id === value.id))) throw new Error("record is used by a bracket");
  }
}

export async function deleteContent(type: ContentType, id: string) {
  const ref = collection(type).doc(id);
  const current = await ref.get();
  if (!current.exists) return false;
  await assertNoDependents(type, parse(type, current.data()));
  await ref.delete();
  revalidatePath("/");
  return true;
}

export async function listPublishedSubjects() {
  return (await listContent("subjects") as Subject[]).filter((subject) => subject.status === "published");
}

export async function requirePublishedSubjects(entries: { kind: Kind; slug: string }[]) {
  const subjects = await listPublishedSubjects();
  const byKey = new Map(subjects.map((subject) => [`${subject.kind}:${subject.slug}`, subject]));
  return entries.map((entry) => {
    const subject = byKey.get(`${entry.kind}:${entry.slug}`);
    if (!subject) throw new Error(`unknown or unpublished subject: ${entry.kind}:${entry.slug}`);
    return subject;
  });
}

export async function requirePublishedSubjectId(id: string) {
  const subject = await getContent("subjects", id) as Subject | null;
  if (!subject || subject.status !== "published") throw new Error(`unknown or unpublished subject: ${id}`);
  return subject;
}

export async function requirePublishedRecord(id: string) {
  const record = await getContent("records", id) as RecordContent | null;
  if (!record || record.status !== "published") throw new Error(`unknown or unpublished record: ${id}`);
  return record;
}

export async function requirePublishedBracket(id: string) {
  const bracket = await getContent("brackets", id) as Bracket | null;
  if (!bracket || bracket.status !== "published") throw new Error(`unknown or unpublished bracket: ${id}`);
  return bracket;
}
