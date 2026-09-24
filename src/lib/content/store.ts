import { Timestamp } from "firebase-admin/firestore";
import { z, ZodError } from "zod";
import {
  bracketSchema, eventSchema, evaluationSchema, personSchema, sourceSchema, statementSchema, topicSchema,
  type Bracket, type Citation, type Evaluation, type Event, type Person, type Source, type Statement, type Topic,
} from "@/content/schema";
import {
  buildRelationship, citationSourceIds, evaluationEvidence, evaluationPairs, labelWordsIn, memberIds, mentionedPersonIds,
  mentionEvidence, pairMembers, personSourceIds, searchTokens, statementPairs, type NameEntry,
} from "@/lib/content/derive";
import type { Kind } from "@/lib/domain";
import { db } from "@/lib/firebase/admin";
import type { AnchorType, SourceRefs } from "@/lib/anchor/canonical";
import { queueAnchor } from "@/lib/anchor/queue";

export const contentTypeSchema = z.enum(["people", "sources", "statements", "evaluations", "events", "topics", "brackets"]);
export type ContentType = z.infer<typeof contentTypeSchema>;
export type ContentMap = {
  people: Person;
  sources: Source;
  statements: Statement;
  evaluations: Evaluation;
  events: Event;
  topics: Topic;
  brackets: Bracket;
};
export type ContentValue = ContentMap[ContentType];
// Authored value plus the fields the store derives from it.
type Derived = ContentValue & { mentionedPersonIds?: string[] };

export class ContentError extends Error {
  constructor(public readonly status: 400 | 403 | 409 | 429, message: string) {
    super(message);
  }
}

const schemas = {
  people: personSchema,
  sources: sourceSchema,
  statements: statementSchema,
  evaluations: evaluationSchema,
  events: eventSchema,
  topics: topicSchema,
  brackets: bracketSchema,
} as const;

const META_FIELDS = ["createdAt", "createdBy", "updatedAt", "updatedBy", "contributor", "rejection", "firstPublishedAt"];
// What signed-in contributors may submit. Events and brackets stay with operators.
const CONTRIBUTABLE = new Set<ContentType>(["people", "statements", "evaluations", "sources", "topics"]);
export const DERIVED_FIELDS: Record<ContentType, string[]> = {
  people: ["counts", "searchTokens", "sourceIds"],
  sources: ["availability"],
  statements: ["sourceIds", "mentionedPersonIds"],
  evaluations: ["sourceIds"],
  events: ["memberIds", "sourceIds"],
  topics: ["counts"],
  brackets: [],
};

const EMPTY_PERSON_COUNTS = { statements: 0, evaluationsReceived: 0, evaluationsGiven: 0, relations: 0 };
const EMPTY_TOPIC_COUNTS = { statements: 0, evaluations: 0, events: 0, people: 0 };

function collection(type: ContentType) {
  return db.collection(type);
}

function parse<T extends ContentType>(type: T, value: unknown): ContentMap[T] {
  try {
    return schemas[type].parse(value) as ContentMap[T];
  } catch (error) {
    if (error instanceof ZodError) throw new ContentError(400, error.issues.map((issue) => `${issue.path.join(".") || type}: ${issue.message}`).join("; "));
    throw error;
  }
}

// Parses a stored document back into its authored shape, dropping metadata
// and derived fields so it validates against the strict schema.
export function authored<T extends ContentType>(type: T, data: FirebaseFirestore.DocumentData): ContentMap[T] {
  const value = { ...data };
  for (const field of [...META_FIELDS, ...DERIVED_FIELDS[type]]) delete value[field];
  return parse(type, value);
}

export async function listContent<T extends ContentType>(type: T): Promise<ContentMap[T][]> {
  const snapshots = await collection(type).get();
  return snapshots.docs.map((snapshot) => authored(type, snapshot.data())).sort((left, right) => left.id.localeCompare(right.id));
}

// An operator's reason for sending a submission back. Kept through later
// edits so the next review sees it; cleared on publication.
export type Rejection = { note: string; by: string; at: string };
export type EditorItem<T extends ContentType> = ContentMap[T] & { rejection?: Rejection };

function editorItem<T extends ContentType>(type: T, snapshot: FirebaseFirestore.DocumentSnapshot): EditorItem<T> {
  const rejection = snapshot.get("rejection") as { note: string; by: string; at: Timestamp } | undefined;
  const value = authored(type, snapshot.data()!);
  return rejection ? { ...value, rejection: { note: rejection.note, by: rejection.by, at: rejection.at.toDate().toISOString() } } : value;
}

// What the content editor lists for a caller. Operators see everything;
// contributors see what is public (to reference it) plus their own work.
export async function listContentFor<T extends ContentType>(type: T, caller: { uid: string; isOps: boolean }): Promise<EditorItem<T>[]> {
  const snapshots = caller.isOps || type === "sources"
    ? (await collection(type).get()).docs
    : (await Promise.all([
      collection(type).where("status", "==", "published").get(),
      collection(type).where("createdBy", "==", caller.uid).get(),
    ])).flatMap((result) => result.docs);
  const byId = new Map(snapshots.map((snapshot) => [snapshot.id, editorItem(type, snapshot)]));
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

// Header badges: submissions waiting for an operator, or a contributor's own
// submissions that were sent back.
export async function pendingReviewCount(): Promise<number> {
  const counts = await Promise.all([...CONTRIBUTABLE].map((type) => collection(type).where("status", "==", "review").count().get()));
  return counts.reduce((sum, result) => sum + result.data().count, 0);
}

export async function rejectedCountFor(uid: string): Promise<number> {
  const results = await Promise.all([...CONTRIBUTABLE].map((type) => collection(type).where("createdBy", "==", uid).select("status").get()));
  return results.flatMap((result) => result.docs).filter((snapshot) => snapshot.get("status") === "rejected").length;
}

export async function getContent<T extends ContentType>(type: T, id: string): Promise<ContentMap[T] | null> {
  const snapshot = await collection(type).doc(id).get();
  return snapshot.exists ? authored(type, snapshot.data()!) : null;
}

async function getMany<T extends ContentType>(type: T, ids: Iterable<string>): Promise<Map<string, ContentMap[T]>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const snapshots = await db.getAll(...unique.map((id) => collection(type).doc(id)));
  return new Map(snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => [snapshot.id, authored(type, snapshot.data()!)]));
}

// Names that can be detected in quotes. Archived people are gone from the
// archive, so they are not matched; drafts are, so publishing them later only
// needs the relationship recomputation, not a rescan.
async function nameIndex(): Promise<NameEntry[]> {
  const snapshots = await collection("people").select("name", "aliases", "status").get();
  return snapshots.docs
    .filter((snapshot) => snapshot.get("status") !== "archived")
    .map((snapshot) => ({ id: snapshot.id, name: String(snapshot.get("name")), aliases: (snapshot.get("aliases") ?? []) as string[] }));
}

// ---------------------------------------------------------------- validation

async function requireRefs(type: ContentType, ids: Iterable<string>, owner: { status: string }) {
  const unique = [...new Set(ids)];
  const found = await getMany(type, unique);
  for (const id of unique) {
    const item = found.get(id) as { status?: string } | undefined;
    if (!item) throw new ContentError(400, `unknown ${type}: ${id}`);
    // Sources have no publication state; everything else must already be public
    // before a public card may point at it.
    if (owner.status === "published" && item.status !== undefined && item.status !== "published") {
      throw new ContentError(400, `published content cannot reference unpublished ${type}: ${id}`);
    }
  }
  return found;
}

async function validateCitations(citations: Citation[]) {
  const sources = await requireRefs("sources", citations.map((citation) => citation.sourceId), { status: "draft" }) as Map<string, Source>;
  for (const citation of citations) {
    if (citation.startSec === null) continue;
    const source = sources.get(citation.sourceId)!;
    if (source.kind !== "video" && source.kind !== "broadcast") throw new ContentError(400, `segment on a non-video source: ${source.id}`);
    if (source.video?.durationSec && citation.endSec! > source.video.durationSec) throw new ContentError(400, `segment exceeds video length: ${source.id}`);
  }
  return sources;
}

function rejectLabels(field: string, text: string | null) {
  const words = text ? labelWordsIn(text) : [];
  if (words.length) throw new ContentError(400, `${field} must not classify people (${words.join(", ")})`);
}

// People and statements share the participation ledger's subjectId namespace.
async function rejectSubjectIdCollision(type: "people" | "statements", id: string) {
  const other = type === "people" ? "statements" : "people";
  if ((await collection(other).doc(id).get()).exists) throw new ContentError(400, `id already used by ${other}: ${id}`);
}

async function validate(type: ContentType, value: ContentValue) {
  switch (type) {
    case "sources": {
      const source = value as Source;
      if (source.video && source.kind !== "video" && source.kind !== "broadcast") throw new ContentError(400, "video metadata needs a video or broadcast source");
      return;
    }
    case "people": {
      const person = value as Person;
      rejectLabels("summary", person.summary);
      for (const role of person.roles) { rejectLabels("role title", role.title); rejectLabels("role org", role.org); }
      if (person.status === "published" && person.image && person.image.rightsStatus !== "cleared") throw new ContentError(400, "published person needs cleared image rights or no image");
      if (person.playable && person.image?.rightsStatus !== "cleared") throw new ContentError(400, "playable person needs a cleared image");
      await rejectSubjectIdCollision("people", person.id);
      await validateCitations(person.roles.map((role) => role.citation));
      return;
    }
    case "statements": {
      const statement = value as Statement;
      await rejectSubjectIdCollision("statements", statement.id);
      await requireRefs("people", [statement.personId], statement);
      await requireRefs("topics", statement.topicIds, statement);
      if (statement.eventId) await requireRefs("events", [statement.eventId], statement);
      const sources = await validateCitations(statement.citations);
      if (statement.assertionType === "FACT" && [...sources.values()].every((source) => source.license === "link-only")) {
        throw new ContentError(400, "FACT statement needs a usable source");
      }
      return;
    }
    case "evaluations": {
      const evaluation = value as Evaluation;
      await requireRefs("people", [evaluation.targetPersonId, ...(evaluation.evaluator.personId ? [evaluation.evaluator.personId] : [])], evaluation);
      await requireRefs("topics", evaluation.topicIds, evaluation);
      await requireRefs("events", evaluation.eventIds, evaluation);
      if (evaluation.respondsTo) {
        if (evaluation.respondsTo === evaluation.id) throw new ContentError(400, "an evaluation cannot respond to itself");
        await requireRefs("evaluations", [evaluation.respondsTo], evaluation);
      }
      await validateCitations([evaluation.citation]);
      return;
    }
    case "events": {
      const event = value as Event;
      rejectLabels("event title", event.title);
      await requireRefs("people", memberIds(event), event);
      await requireRefs("topics", event.topicIds, event);
      await validateCitations(event.citations);
      return;
    }
    case "topics": {
      const topic = value as Topic;
      if (!topic.parentId) return;
      const parent = (await requireRefs("topics", [topic.parentId], topic)).get(topic.parentId) as Topic;
      if (parent.parentId) throw new ContentError(400, "topics nest only one level");
      if (!(await collection("topics").where("parentId", "==", topic.id).limit(1).get()).empty) throw new ContentError(400, "a topic with children cannot have a parent");
      return;
    }
    case "brackets": {
      const bracket = value as Bracket;
      await requireRefs("statements", bracket.statementIds, bracket);
      return;
    }
  }
}

// ---------------------------------------------------------------- dependents

type Dependent = { type: ContentType; id: string; status: string };

async function findWhere(type: ContentType, field: string, op: "==" | "array-contains", value: string): Promise<Dependent[]> {
  const snapshots = await collection(type).where(field, op, value).select("status").get();
  return snapshots.docs.map((snapshot) => ({ type, id: snapshot.id, status: String(snapshot.get("status") ?? "published") }));
}

// Detected mentions are not dependents: they follow the people registry and
// disappear on the next rescan when a person is removed.
async function dependentsOf(type: ContentType, id: string): Promise<Dependent[]> {
  const lookups: Array<Promise<Dependent[]>> = [];
  if (type === "sources") for (const other of ["people", "statements", "evaluations", "events"] as const) lookups.push(findWhere(other, "sourceIds", "array-contains", id));
  if (type === "people") lookups.push(
    findWhere("statements", "personId", "==", id),
    findWhere("evaluations", "targetPersonId", "==", id),
    findWhere("evaluations", "evaluator.personId", "==", id),
    findWhere("events", "memberIds", "array-contains", id),
  );
  if (type === "topics") {
    for (const other of ["statements", "evaluations", "events"] as const) lookups.push(findWhere(other, "topicIds", "array-contains", id));
    lookups.push(findWhere("topics", "parentId", "==", id));
  }
  if (type === "events") lookups.push(findWhere("statements", "eventId", "==", id), findWhere("evaluations", "eventIds", "array-contains", id));
  if (type === "statements") lookups.push(findWhere("brackets", "statementIds", "array-contains", id));
  if (type === "evaluations") lookups.push(findWhere("evaluations", "respondsTo", "==", id));
  return (await Promise.all(lookups)).flat().filter((item) => !(item.type === type && item.id === id));
}

function describe(dependents: Dependent[]) {
  return dependents.slice(0, 5).map((item) => `${item.type}/${item.id}`).join(", ") + (dependents.length > 5 ? ` 외 ${dependents.length - 5}건` : "");
}

// ---------------------------------------------------------------- derivation

async function derivedFields(type: ContentType, value: ContentValue): Promise<Record<string, unknown>> {
  switch (type) {
    case "people": return { searchTokens: searchTokens((value as Person).name, (value as Person).aliases), sourceIds: personSourceIds(value as Person) };
    case "statements": return { sourceIds: citationSourceIds((value as Statement).citations), mentionedPersonIds: mentionedPersonIds(value as Statement, await nameIndex()) };
    case "evaluations": return { sourceIds: citationSourceIds([(value as Evaluation).citation]) };
    case "events": return { memberIds: memberIds(value as Event), sourceIds: citationSourceIds((value as Event).citations) };
    default: return {};
  }
}

function pairsOf(type: ContentType, value: Derived | null): string[] {
  if (!value) return [];
  if (type === "statements") return statementPairs({ personId: (value as Statement).personId, mentionedPersonIds: value.mentionedPersonIds ?? [] });
  if (type === "evaluations") return evaluationPairs(value as Evaluation);
  return [];
}

function peopleOf(type: ContentType, value: Derived | null): string[] {
  if (!value) return [];
  if (type === "statements") return [(value as Statement).personId, ...(value.mentionedPersonIds ?? [])];
  if (type === "evaluations") return [(value as Evaluation).targetPersonId, ...((value as Evaluation).evaluator.personId ? [(value as Evaluation).evaluator.personId!] : [])];
  return [];
}

function topicsOf(type: ContentType, value: ContentValue | null): string[] {
  if (!value) return [];
  if (type === "statements" || type === "evaluations" || type === "events") return (value as Statement | Evaluation | Event).topicIds;
  return [];
}

async function publishedWhere<T extends "statements" | "evaluations">(type: T, field: string, op: "==" | "array-contains", value: string) {
  const snapshots = await collection(type).where(field, op, value).get();
  return snapshots.docs
    .map((snapshot) => ({ value: authored(type, snapshot.data()), mentioned: (snapshot.get("mentionedPersonIds") ?? []) as string[] }))
    .filter((item) => item.value.status === "published");
}

// A relationship is recomputed from its sources in full. Incremental updates
// would be cheaper, but content writes are rare and an increment that is wrong
// once stays wrong forever. Only what the two people said counts: a quote of
// one naming the other, or one's published evaluation of the other.
export async function recomputeRelationship(id: string) {
  const [left, right] = pairMembers(id);
  const ref = db.collection("relationships").doc(id);
  const people = await getMany("people", [left, right]);
  if ([left, right].some((person) => people.get(person)?.status !== "published")) {
    await ref.delete();
    return;
  }
  const [byLeft, byRight, toRight, toLeft] = await Promise.all([
    publishedWhere("statements", "personId", "==", left),
    publishedWhere("statements", "personId", "==", right),
    publishedWhere("evaluations", "targetPersonId", "==", right),
    publishedWhere("evaluations", "targetPersonId", "==", left),
  ]);
  const relationship = buildRelationship(id, [
    ...byLeft.filter((item) => item.mentioned.includes(right)).map((item) => mentionEvidence(item.value)),
    ...byRight.filter((item) => item.mentioned.includes(left)).map((item) => mentionEvidence(item.value)),
    ...toRight.filter((item) => item.value.evaluator.personId === left).map((item) => evaluationEvidence(item.value)),
    ...toLeft.filter((item) => item.value.evaluator.personId === right).map((item) => evaluationEvidence(item.value)),
  ]);
  if (relationship) await ref.set({ ...relationship, computedAt: Timestamp.now() });
  else await ref.delete();
}

async function countPublished(type: "statements" | "evaluations" | "events", field: string, op: "==" | "array-contains", value: string) {
  const snapshots = await collection(type).where(field, op, value).select("status", "personId").get();
  return snapshots.docs.filter((snapshot) => snapshot.get("status") === "published");
}

async function recomputePersonCounts(personId: string) {
  const ref = collection("people").doc(personId);
  if (!(await ref.get()).exists) return;
  const [statements, received, given, relations] = await Promise.all([
    countPublished("statements", "personId", "==", personId),
    countPublished("evaluations", "targetPersonId", "==", personId),
    countPublished("evaluations", "evaluator.personId", "==", personId),
    db.collection("relationships").where("personIds", "array-contains", personId).count().get(),
  ]);
  await ref.update({ counts: { statements: statements.length, evaluationsReceived: received.length, evaluationsGiven: given.length, relations: relations.data().count } });
}

async function recomputeTopicCounts(topicId: string) {
  const ref = collection("topics").doc(topicId);
  if (!(await ref.get()).exists) return;
  const [statements, evaluations, events] = await Promise.all([
    countPublished("statements", "topicIds", "array-contains", topicId),
    countPublished("evaluations", "topicIds", "array-contains", topicId),
    countPublished("events", "topicIds", "array-contains", topicId),
  ]);
  const people = new Set(statements.map((snapshot) => String(snapshot.get("personId"))));
  await ref.update({ counts: { statements: statements.length, evaluations: evaluations.length, events: events.length, people: people.size } });
}

async function recomputeAll(pairs: Set<string>, people: Set<string>, topics: Set<string>) {
  for (const id of pairs) await recomputeRelationship(id);
  for (const id of pairs) for (const person of pairMembers(id)) people.add(person);
  await Promise.all([...[...people].map(recomputePersonCounts), ...[...topics].map(recomputeTopicCounts)]);
}

// Re-detects mentions in every statement against the current people registry.
// Runs when a name, an alias or a publication state changes, so a person added
// today is linked to everything that was ever said about them.
async function rescanMentions(): Promise<Set<string>> {
  const [names, snapshots] = await Promise.all([nameIndex(), collection("statements").get()]);
  const pairs = new Set<string>();
  const writes: Array<[FirebaseFirestore.DocumentReference, string[]]> = [];
  for (const snapshot of snapshots.docs) {
    const statement = authored("statements", snapshot.data());
    const before = (snapshot.get("mentionedPersonIds") ?? []) as string[];
    const after = mentionedPersonIds(statement, names);
    if (before.join() === after.join()) continue;
    writes.push([snapshot.ref, after]);
    for (const id of [...statementPairs({ personId: statement.personId, mentionedPersonIds: before }), ...statementPairs({ personId: statement.personId, mentionedPersonIds: after })]) pairs.add(id);
  }
  for (let offset = 0; offset < writes.length; offset += 400) {
    const batch = db.batch();
    for (const [ref, mentioned] of writes.slice(offset, offset + 400)) batch.update(ref, { mentionedPersonIds: mentioned });
    await batch.commit();
  }
  return pairs;
}

async function relationshipsOf(personId: string): Promise<string[]> {
  const snapshots = await db.collection("relationships").where("personIds", "array-contains", personId).select().get();
  return snapshots.docs.map((snapshot) => snapshot.id);
}

async function refreshPerson(before: Person | null, after: Person | null) {
  const id = (after ?? before)!.id;
  const renamed = !before || !after || before.name !== after.name || before.aliases.join() !== after.aliases.join()
    || (before.status === "archived") !== (after.status === "archived");
  const pairs = renamed ? await rescanMentions() : new Set<string>();
  // Publication state decides whether this person's edges are shown at all, so
  // every pair they could be part of is recomputed.
  if (!before || !after || before.status !== after.status) {
    const [existing, spoken, evaluations] = await Promise.all([
      relationshipsOf(id),
      collection("statements").where("personId", "==", id).select("mentionedPersonIds").get(),
      Promise.all([collection("evaluations").where("targetPersonId", "==", id).get(), collection("evaluations").where("evaluator.personId", "==", id).get()]),
    ]);
    const mentionedBy = await collection("statements").where("mentionedPersonIds", "array-contains", id).select("personId").get();
    for (const pair of existing) pairs.add(pair);
    for (const snapshot of spoken.docs) for (const pair of statementPairs({ personId: id, mentionedPersonIds: (snapshot.get("mentionedPersonIds") ?? []) as string[] })) pairs.add(pair);
    for (const snapshot of mentionedBy.docs) for (const pair of statementPairs({ personId: String(snapshot.get("personId")), mentionedPersonIds: [id] })) pairs.add(pair);
    for (const snapshot of evaluations.flatMap((result) => result.docs)) for (const pair of evaluationPairs(authored("evaluations", snapshot.data()))) pairs.add(pair);
  }
  await recomputeAll(pairs, new Set([id]), new Set());
}

async function refreshDerived(type: ContentType, before: Derived | null, after: Derived | null) {
  if (type === "people") return refreshPerson(before as Person | null, after as Person | null);
  const topics = new Set([...topicsOf(type, before), ...topicsOf(type, after)]);
  if (type === "topics" && after) topics.add(after.id);
  await recomputeAll(
    new Set([...pairsOf(type, before), ...pairsOf(type, after)]),
    new Set([...peopleOf(type, before), ...peopleOf(type, after)]),
    topics,
  );
}

// ---------------------------------------------------------------- writes

const ANCHORED: Partial<Record<ContentType, AnchorType>> = { statements: "statement", evaluations: "evaluation" };

async function sourceRefs(ids: string[]): Promise<SourceRefs> {
  const sources = await getMany("sources", ids);
  return Object.fromEntries([...sources].map(([id, source]) => [id, { url: source.url, videoId: source.video?.videoId ?? null }]));
}

function citedSourceIds(value: Statement | Evaluation): string[] {
  return "citation" in value ? [value.citation.sourceId] : value.citations.map((item) => item.sourceId);
}

// Statements and evaluations are anchored on chain (lib/anchor). A source's
// url is part of their hash, so editing a source re-queues what cites it.
async function refreshAnchors(type: ContentType, id: string, value: ContentValue | null) {
  const anchorType = ANCHORED[type];
  if (anchorType) {
    const record = value as Statement | Evaluation | null;
    await queueAnchor(anchorType, id, record, record ? await sourceRefs(citedSourceIds(record)) : {});
    return;
  }
  if (type !== "sources") return;
  for (const [citing, citingAnchor] of [["statements", "statement"], ["evaluations", "evaluation"]] as const) {
    const snapshots = await collection(citing).where("sourceIds", "array-contains", id).get();
    for (const snapshot of snapshots.docs) {
      const record = authored(citing, snapshot.data());
      await queueAnchor(citingAnchor, record.id, record, await sourceRefs(citedSourceIds(record)));
    }
  }
}

async function readStored(type: ContentType, id: string): Promise<Derived | null> {
  const snapshot = await collection(type).doc(id).get();
  if (!snapshot.exists) return null;
  return { ...authored(type, snapshot.data()!), ...(type === "statements" ? { mentionedPersonIds: (snapshot.get("mentionedPersonIds") ?? []) as string[] } : {}) };
}

// Who is writing. A plain uid means an operator (server scripts, tests, the
// ops API); contributors are signed-in users whose writes are restricted.
export type Actor = { uid: string; isOps: boolean; nickname?: string | null };

// Contributors may set only these statuses, and may edit their own work while
// it is in one of them or was sent back to them.
const CONTRIBUTOR_STATUSES = new Set(["draft", "review"]);
const CONTRIBUTOR_EDITABLE = new Set([...CONTRIBUTOR_STATUSES, "rejected"]);

function toActor(actor: string | Actor): Actor {
  return typeof actor === "string" ? { uid: actor, isOps: true } : actor;
}

function assertContributorType(type: ContentType) {
  if (!CONTRIBUTABLE.has(type)) throw new ContentError(403, `contributors cannot edit ${type}`);
}

// Contributors submit; operators publish. Publishing puts a hash on chain for
// good, so nothing reaches the public or the chain without an operator.
function assertContributorValue(type: ContentType, value: ContentValue) {
  assertContributorType(type);
  const status = (value as { status?: string }).status;
  if (status !== undefined && !CONTRIBUTOR_STATUSES.has(status)) throw new ContentError(403, "contributors can only save drafts or submit for review");
  if (type === "people" && ((value as Person).image || (value as Person).playable)) throw new ContentError(403, "only operators add photos or make a person playable");
}

function assertContributorOwns(current: FirebaseFirestore.DocumentSnapshot, actor: Actor) {
  if (actor.isOps || !current.exists) return;
  if (current.get("createdBy") !== actor.uid) throw new ContentError(403, "contributors can only edit their own submissions");
  const status = current.get("status");
  if (status !== undefined && !CONTRIBUTOR_EDITABLE.has(status)) throw new ContentError(403, "only operators can change published or archived content");
}

export async function saveContent(type: ContentType, id: string, data: unknown, actorOrUid: string | Actor) {
  const actor = toActor(actorOrUid);
  if (!actor.isOps) assertContributorType(type);
  const value = parse(type, data);
  if (value.id !== id) throw new ContentError(400, "content id mismatch");
  if (!actor.isOps) {
    assertContributorValue(type, value);
    // Checked again inside the write transaction; this gives the clear refusal first.
    assertContributorOwns(await collection(type).doc(id).get(), actor);
  }
  await validate(type, value);
  const before = await readStored(type, id);
  const status = (value as { status?: string }).status;
  if (status === "rejected" && (before as { status?: string } | null)?.status !== "rejected") throw new ContentError(400, "반려는 사유와 함께 '반려' 버튼으로 합니다.");
  if (before && (before as { status?: string }).status === "published" && status !== "published") {
    const published = (await dependentsOf(type, id)).filter((item) => item.status === "published");
    if (published.length) throw new ContentError(409, `published content still references it: ${describe(published)}`);
  }
  if (!actor.isOps && type === "sources" && before) {
    // A source's url is part of every citing record's hash: once public
    // content cites it, only an operator may change it.
    const published = (await dependentsOf(type, id)).filter((item) => item.status === "published");
    if (published.length) throw new ContentError(409, `published content cites this source: ${describe(published)}`);
  }
  const derived = await derivedFields(type, value);
  const ref = collection(type).doc(id);
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(ref);
    assertContributorOwns(current, actor);
    const now = Timestamp.now();
    // The contributor who first submitted it stays credited through later
    // operator edits and approval.
    const contributor = current.get("contributor") ?? (actor.isOps ? null : { uid: actor.uid, nickname: actor.nickname ?? "이름 없음" });
    transaction.set(ref, {
      ...value,
      ...derived,
      ...(type === "people" ? { counts: current.get("counts") ?? EMPTY_PERSON_COUNTS } : {}),
      ...(type === "topics" ? { counts: current.get("counts") ?? EMPTY_TOPIC_COUNTS } : {}),
      ...(type === "sources" && current.get("availability") ? { availability: current.get("availability") } : {}),
      ...(contributor ? { contributor } : {}),
      ...(status !== "published" && current.get("rejection") ? { rejection: current.get("rejection") } : {}),
      // When it first became public; the home page lists new records by it.
      ...(current.get("firstPublishedAt") || status === "published" ? { firstPublishedAt: current.get("firstPublishedAt") ?? now } : {}),
      createdAt: current.get("createdAt") ?? now,
      createdBy: current.get("createdBy") ?? actor.uid,
      updatedAt: now,
      updatedBy: actor.uid,
    });
  });
  await refreshDerived(type, before, { ...value, ...derived } as Derived);
  await refreshAnchors(type, id, value);
  return value;
}

export const REJECTION_NOTE_MAX = 500;

// Operators send a submission back with a note instead of publishing it.
// Only unpublished work can be rejected; public records are archived instead.
export async function rejectContent(type: ContentType, id: string, note: string, actor: Actor) {
  if (!actor.isOps) throw new ContentError(403, "only operators reject submissions");
  const trimmed = note.trim();
  if (!trimmed || trimmed.length > REJECTION_NOTE_MAX) throw new ContentError(400, `반려 사유를 1~${REJECTION_NOTE_MAX}자로 적어 주세요.`);
  const before = await readStored(type, id);
  if (!before) throw new ContentError(400, "content not found");
  const ref = collection(type).doc(id);
  await db.runTransaction(async (transaction) => {
    const status = (await transaction.get(ref)).get("status");
    if (status !== "draft" && status !== "review" && status !== "rejected") throw new ContentError(409, "공개했거나 보관한 기록은 반려할 수 없습니다. 보관으로 내리세요.");
    const now = Timestamp.now();
    transaction.update(ref, { status: "rejected", rejection: { note: trimmed, by: actor.uid, at: now }, updatedAt: now, updatedBy: actor.uid });
  });
  await refreshDerived(type, before, { ...before, status: "rejected" } as Derived);
}

export async function deleteContent(type: ContentType, id: string, actorOrUid: string | Actor = { uid: "system", isOps: true }) {
  const actor = toActor(actorOrUid);
  const before = await readStored(type, id);
  if (!before) return false;
  if (!actor.isOps) {
    assertContributorType(type);
    assertContributorOwns(await collection(type).doc(id).get(), actor);
  }
  const dependents = await dependentsOf(type, id);
  if (dependents.length) throw new ContentError(409, `content is used by ${describe(dependents)}`);
  await collection(type).doc(id).delete();
  await refreshDerived(type, before, null);
  await refreshAnchors(type, id, null);
  return true;
}

// Recovers derived documents after a crash between a content write and its
// derivation, or after a derivation rule changes.
export async function rebuildDerivedContent() {
  await rescanMentions();
  const [statements, evaluations, people, topics, existing] = await Promise.all([
    collection("statements").select("personId", "mentionedPersonIds").get(),
    listContent("evaluations"), listContent("people"), listContent("topics"),
    db.collection("relationships").select().get(),
  ]);
  const pairs = new Set([
    ...existing.docs.map((snapshot) => snapshot.id),
    ...statements.docs.flatMap((snapshot) => statementPairs({ personId: String(snapshot.get("personId")), mentionedPersonIds: (snapshot.get("mentionedPersonIds") ?? []) as string[] })),
    ...evaluations.flatMap(evaluationPairs),
  ]);
  for (const id of pairs) await recomputeRelationship(id);
  for (const person of people) await recomputePersonCounts(person.id);
  for (const topic of topics) await recomputeTopicCounts(topic.id);
  return { relationships: pairs.size, people: people.length, topics: topics.length };
}

export async function validateAllContent(): Promise<string[]> {
  const errors: string[] = [];
  for (const type of contentTypeSchema.options) {
    const snapshots = await collection(type).get();
    for (const snapshot of snapshots.docs) {
      try {
        await validate(type, authored(type, snapshot.data()));
      } catch (error) {
        errors.push(`${type}/${snapshot.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  return errors;
}

// ---------------------------------------------------------------- participation lookups

export async function requirePublishedPerson(id: string) {
  const person = await getContent("people", id);
  if (!person || person.status !== "published") throw new Error(`unknown or unpublished person: ${id}`);
  return person;
}

export async function requirePublishedStatement(id: string) {
  const statement = await getContent("statements", id);
  if (!statement || statement.status !== "published") throw new Error(`unknown or unpublished statement: ${id}`);
  return statement;
}

// Participation targets: a person must also be playable; a statement only
// needs to be public.
export async function requirePublishedTargets(entries: { kind: Kind; slug: string }[]) {
  const people = await getMany("people", entries.filter((entry) => entry.kind === "person").map((entry) => entry.slug));
  const statements = await getMany("statements", entries.filter((entry) => entry.kind === "statement").map((entry) => entry.slug));
  return entries.map((entry) => {
    const target = entry.kind === "person" ? people.get(entry.slug) : statements.get(entry.slug);
    if (!target || target.status !== "published") throw new Error(`unknown or unpublished ${entry.kind}: ${entry.slug}`);
    if (entry.kind === "person" && !(target as Person).playable) throw new Error(`person is not playable: ${entry.slug}`);
    return { id: target.id, kind: entry.kind };
  });
}

export async function requirePublishedBracket(id: string) {
  const bracket = await getContent("brackets", id);
  if (!bracket || bracket.status !== "published") throw new Error(`unknown or unpublished bracket: ${id}`);
  return bracket;
}
