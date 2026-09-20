import { existsSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { brackets } from "../src/content/brackets";
import { recordSchema, sourceSchema, subjectSchema, bracketSchema } from "../src/content/schema";
import { records } from "../src/content/records";
import { sources } from "../src/content/sources";
import { subjects } from "../src/content/subjects";

function fail(message: string): never {
  throw new Error(`content validation failed: ${message}`);
}

function unique(values: Iterable<string>, label: string) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) fail(`duplicate ${label}: ${value}`);
    seen.add(value);
  }
  return seen;
}

for (const source of sources) sourceSchema.parse(source);
for (const subject of subjects) subjectSchema.parse(subject);
for (const record of records) recordSchema.parse(record);
for (const bracket of brackets) bracketSchema.parse(bracket);

const sourceIds = unique(sources.map((source) => source.id), "source id");
const subjectsBySlug = new Set(subjects.map((subject) => subject.slug));
unique(subjects.map((subject) => subject.id), "subject id");
const policyIds = new Set(subjects.filter((subject) => subject.kind === "policy").map((subject) => subject.id));
unique(subjects.map((subject) => `${subject.kind}:${subject.slug}`), "subject kind/slug");
const recordIds = unique(records.map((record) => record.id), "record id");
unique(brackets.map((bracket) => bracket.id), "bracket id");

for (const subject of subjects) {
  if (subject.status !== "published") continue;
  if (subject.image.rightsStatus !== "cleared") fail(`published subject has uncleared image: ${subject.id}`);
  const imagePath = resolve(process.cwd(), "public", subject.image.path);
  if (!existsSync(imagePath)) fail(`missing image file: ${subject.image.path}`);
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(extname(imagePath).toLowerCase())) fail(`unsupported image format: ${subject.image.path}`);
  if (statSync(imagePath).size >= 5 * 1024 * 1024) fail(`image exceeds 5 MiB: ${subject.image.path}`);
}

for (const record of records) {
  if (!subjectsBySlug.has(record.subject)) fail(`record references unknown subject: ${record.id} -> ${record.subject}`);
  for (const sourceId of record.sourceIds) if (!sourceIds.has(sourceId)) fail(`record references unknown source: ${record.id} -> ${sourceId}`);
  if (record.assertionType === "FACT" && record.sourceIds.every((id) => sources.find((source) => source.id === id)?.license === "link-only")) {
    fail(`FACT record has only link-only sources: ${record.id}`);
  }
}

for (const bracket of brackets) {
  if (new Set(bracket.items.map((item) => item.id)).size !== bracket.items.length) fail(`duplicate bracket item: ${bracket.id}`);
  for (const item of bracket.items) {
    if (item.type === "record" && !recordIds.has(item.id)) fail(`bracket references unknown record: ${bracket.id} -> ${item.id}`);
    if (item.type === "policy" && !policyIds.has(item.id)) fail(`bracket references unknown policy: ${bracket.id} -> ${item.id}`);
  }
}

console.log(`validated ${subjects.length} subjects, ${records.length} records, ${sources.length} sources, ${brackets.length} brackets`);
