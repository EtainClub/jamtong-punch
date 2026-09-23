import { unstable_cache } from "next/cache";
import type { Evaluation, Event, Person, Relationship, Source, SourceAvailability, Statement, Topic } from "@/content/schema";
import type { AnchorVersion } from "@/lib/anchor/versions";
import { authored } from "@/lib/content/store";
import { db } from "@/lib/firebase/admin";

// Public reads of published content. Everything here is cached under the
// "content" tag, which the ops content API expires on every write, so
// Firestore reads scale with publishing, not with traffic.

export const CONTENT_TAG = "content";
const CACHE = { tags: [CONTENT_TAG], revalidate: 3600 };

export type PersonCounts = { statements: number; evaluationsReceived: number; evaluationsGiven: number; relations: number };
export type PersonView = Person & { counts: PersonCounts };
export type StatementView = Statement & { mentionedPersonIds: string[] };
export type TopicView = Topic & { counts: { statements: number; evaluations: number; events: number; people: number } };
export type Page<T> = { items: T[]; hasMore: boolean };
export type SourceView = Source & { availability: SourceAvailability | null };

const ZERO_PERSON_COUNTS: PersonCounts = { statements: 0, evaluationsReceived: 0, evaluationsGiven: 0, relations: 0 };

type Snapshot = FirebaseFirestore.DocumentSnapshot;
const person = (snapshot: Snapshot): PersonView => ({ ...authored("people", snapshot.data()!), counts: snapshot.get("counts") ?? ZERO_PERSON_COUNTS });
const statement = (snapshot: Snapshot): StatementView => ({ ...authored("statements", snapshot.data()!), mentionedPersonIds: snapshot.get("mentionedPersonIds") ?? [] });
const evaluation = (snapshot: Snapshot): Evaluation => authored("evaluations", snapshot.data()!);
const event = (snapshot: Snapshot): Event => authored("events", snapshot.data()!);
const topic = (snapshot: Snapshot): TopicView => ({ ...authored("topics", snapshot.data()!), counts: snapshot.get("counts") ?? { statements: 0, evaluations: 0, events: 0, people: 0 } });
const published = (collection: string) => db.collection(collection).where("status", "==", "published");

async function page<T>(query: FirebaseFirestore.Query, limit: number, map: (snapshot: Snapshot) => T): Promise<Page<T>> {
  const snapshots = await query.limit(limit + 1).get();
  return { items: snapshots.docs.slice(0, limit).map(map), hasMore: snapshots.size > limit };
}

export const listPeople = unstable_cache(async () => {
  const snapshots = await published("people").get();
  return snapshots.docs.map(person).sort((left, right) => left.name.localeCompare(right.name, "ko"));
}, ["archive", "people"], CACHE);

export const getPerson = unstable_cache(async (id: string) => {
  const snapshot = await db.doc(`people/${id}`).get();
  return snapshot.exists && snapshot.get("status") === "published" ? person(snapshot) : null;
}, ["archive", "person"], CACHE);

export const personStatements = unstable_cache(async (personId: string, limit: number, topicId: string | null) => {
  let query = published("statements").where("personId", "==", personId);
  if (topicId) query = query.where("topicIds", "array-contains", topicId);
  return page(query.orderBy("occurredAt", "desc"), limit, statement);
}, ["archive", "person-statements"], CACHE);

export const personTopicIds = unstable_cache(async (personId: string) => {
  const snapshots = await published("statements").where("personId", "==", personId).select("topicIds").get();
  return [...new Set(snapshots.docs.flatMap((snapshot) => (snapshot.get("topicIds") ?? []) as string[]))];
}, ["archive", "person-topics"], CACHE);

export const personEvaluations = unstable_cache(async (personId: string, limit: number) =>
  page(published("evaluations").where("targetPersonId", "==", personId).orderBy("occurredAt", "desc"), limit, evaluation),
["archive", "person-evaluations"], CACHE);

export const personRelations = unstable_cache(async (personId: string): Promise<Relationship[]> => {
  const snapshots = await db.collection("relationships").where("personIds", "array-contains", personId).orderBy("weight", "desc").limit(50).get();
  return snapshots.docs.map((snapshot) => {
    const value = snapshot.data();
    delete value.computedAt;
    return value as Relationship;
  });
}, ["archive", "person-relations"], CACHE);

export const getEvent = unstable_cache(async (id: string) => {
  const snapshot = await db.doc(`events/${id}`).get();
  return snapshot.exists && snapshot.get("status") === "published" ? event(snapshot) : null;
}, ["archive", "event"], CACHE);

export const eventStatements = unstable_cache(async (eventId: string) =>
  (await published("statements").where("eventId", "==", eventId).orderBy("occurredAt", "desc").limit(100).get()).docs.map(statement),
["archive", "event-statements"], CACHE);

export const eventEvaluations = unstable_cache(async (eventId: string) =>
  (await published("evaluations").where("eventIds", "array-contains", eventId).orderBy("occurredAt", "desc").limit(100).get()).docs.map(evaluation),
["archive", "event-evaluations"], CACHE);

export const listTopics = unstable_cache(async () => {
  const snapshots = await published("topics").get();
  return snapshots.docs.map(topic).sort((left, right) => right.counts.statements - left.counts.statements || left.name.localeCompare(right.name, "ko"));
}, ["archive", "topics"], CACHE);

export const topicStatements = unstable_cache(async (topicId: string, limit: number) =>
  page(published("statements").where("topicIds", "array-contains", topicId).orderBy("occurredAt", "desc"), limit, statement),
["archive", "topic-statements"], CACHE);

export const topicEvaluations = unstable_cache(async (topicId: string) =>
  (await published("evaluations").where("topicIds", "array-contains", topicId).orderBy("occurredAt", "desc").limit(50).get()).docs.map(evaluation),
["archive", "topic-evaluations"], CACHE);

export const topicEvents = unstable_cache(async (topicId: string) =>
  (await published("events").where("topicIds", "array-contains", topicId).orderBy("occurredAt", "desc").limit(50).get()).docs.map(event),
["archive", "topic-events"], CACHE);

export const recentStatements = unstable_cache(async (limit: number) =>
  (await published("statements").orderBy("occurredAt", "desc").limit(limit).get()).docs.map(statement),
["archive", "recent-statements"], CACHE);

export const recentEvaluations = unstable_cache(async (limit: number) =>
  (await published("evaluations").orderBy("occurredAt", "desc").limit(limit).get()).docs.map(evaluation),
["archive", "recent-evaluations"], CACHE);

// Sources are looked up in one batch per page and returned as a plain object
// (the cache serializes results as JSON, so a Map would not survive).
export const getSources = unstable_cache(async (ids: string[]): Promise<Record<string, SourceView>> => {
  const unique = [...new Set(ids)].sort();
  if (!unique.length) return {};
  const snapshots = await db.getAll(...unique.map((id) => db.doc(`sources/${id}`)));
  return Object.fromEntries(snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => [snapshot.id, { ...authored("sources", snapshot.data()!), availability: snapshot.get("availability") ?? null }]));
}, ["archive", "sources"], CACHE);

export function sourceIdsOf(items: Array<Statement | Evaluation | Event>): string[] {
  return items.flatMap((item) => ("citation" in item ? [item.citation.sourceId] : item.citations.map((citation) => citation.sourceId)));
}

export const getRelationship = unstable_cache(async (pairId: string): Promise<Relationship | null> => {
  const snapshot = await db.doc(`relationships/${pairId}`).get();
  if (!snapshot.exists) return null;
  const value = snapshot.data()!;
  delete value.computedAt;
  return value as Relationship;
}, ["archive", "relationship"], CACHE);

// Evidence items of one relationship, resolved to their full cards. Only
// published items are returned, so a stale evidence entry can never surface
// something that was taken down.
export const getEvidence = unstable_cache(async (statementIds: string[], evaluationIds: string[]) => {
  const [statements, evaluations] = await Promise.all([
    statementIds.length ? db.getAll(...statementIds.map((id) => db.doc(`statements/${id}`))) : Promise.resolve([]),
    evaluationIds.length ? db.getAll(...evaluationIds.map((id) => db.doc(`evaluations/${id}`))) : Promise.resolve([]),
  ]);
  const isPublic = (snapshot: Snapshot) => snapshot.exists && snapshot.get("status") === "published";
  return {
    statements: statements.filter(isPublic).map(statement),
    evaluations: evaluations.filter(isPublic).map(evaluation),
  };
}, ["archive", "evidence"], CACHE);

export const getAnchorVersions = unstable_cache(async (type: "statement" | "evaluation", id: string) => {
  const snapshot = await db.doc(`anchors/${type}_${id}`).get();
  return (snapshot.get("versions") ?? []) as AnchorVersion[];
}, ["archive", "anchor"], CACHE);

export const getPublishedRecord = unstable_cache(async (type: "statement" | "evaluation", id: string) => {
  const snapshot = await db.doc(`${type === "statement" ? "statements" : "evaluations"}/${id}`).get();
  if (!snapshot.exists || snapshot.get("status") !== "published") return null;
  return type === "statement" ? { type, value: statement(snapshot) } : { type, value: evaluation(snapshot) };
}, ["archive", "published-record"], CACHE);
