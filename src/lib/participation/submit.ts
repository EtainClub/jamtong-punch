import { Timestamp } from "firebase-admin/firestore";
import { requirePublishedSubjects } from "@/lib/content/store";
import { kstDate } from "@/lib/date/kst";
import { detectAnomaly } from "@/lib/guard/anomaly";
import { db } from "@/lib/firebase/admin";
import type { PreviousStance, StateEntry } from "@/lib/domain";
import type { ParticipationInput, ParticipationResult } from "@/lib/participation/schema";

const DAY_CAP = 60;
const SESSION_CAP = 20;
const SUBJECT_CAP = 3;
const STATE_MAP_CAP = 1_000;
const SHARD_COUNT = 16;

function shardFor(subjectId: string): number {
  let hash = 0;
  for (const character of subjectId) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return (hash >>> 0) % SHARD_COUNT;
}

function trimStateMap(map: Record<string, StateEntry>): Record<string, StateEntry> {
  const entries = Object.entries(map).sort(([, left], [, right]) => left.d.localeCompare(right.d));
  return Object.fromEntries(entries.slice(-STATE_MAP_CAP));
}

export async function submitParticipation(uid: string, input: ParticipationInput): Promise<ParticipationResult> {
  const subjects = await requirePublishedSubjects(input.stances);
  if (new Set(subjects.map((subject) => subject.id)).size !== subjects.length) throw new Error("duplicate-subject");
  if (input.game !== "swipe" && input.stances.length !== 1) throw new Error("invalid-game-size");

  const date = kstDate();
  const anomaly = detectAnomaly(input);
  return db.runTransaction(async (tx) => {
    const sessionRef = db.doc(`users/${uid}/sessions/${input.sessionId}`);
    const dailyRef = db.doc(`users/${uid}/daily/${date}`);
    const stateRef = db.doc(`users/${uid}/state/subjects`);
    const [session, daily, state] = await tx.getAll(sessionRef, dailyRef, stateRef);
    if (session.exists) return session.get("result") as ParticipationResult;

    const day = daily.data() ?? {};
    const map = (state.get("m") ?? {}) as Record<string, StateEntry>;
    const touchedToday = subjects.filter((subject) => map[subject.id]?.d === date);
    const existing = touchedToday.length
      ? await tx.getAll(...touchedToday.map((subject) => db.doc(`users/${uid}/stances/${subject.id}_${date}`)))
      : [];
    const existingById = new Map(existing.map((snapshot) => [snapshot.get("subjectId") as string, snapshot]));

    let stancesToday = Number(day.stances ?? 0);
    let sessionsToday = Number(day.sessions ?? 0);
    const perSubject = { ...(day.perSubject ?? {}) } as Record<string, number>;
    const result: ParticipationResult = { accepted: [], replaced: [], capped: [], date };
    const nextMap = { ...map };
    const now = Timestamp.now();

    for (let index = 0; index < input.stances.length; index += 1) {
      const stanceInput = input.stances[index];
      const subject = subjects[index];
      const previousState = map[subject.id];
      const isReplacement = previousState?.d === date;
      const changes = Number(perSubject[subject.id] ?? 0);
      if (sessionsToday >= SESSION_CAP || changes >= SUBJECT_CAP || (!isReplacement && stancesToday >= DAY_CAP)) {
        result.capped.push(subject.id);
        continue;
      }

      const current = existingById.get(subject.id);
      const inheritedPrevious = current?.get("rolledUpAt") == null && current?.exists
        ? current.get("prev") as PreviousStance | null
        : previousState ? {
            stance: previousState.s,
            date: previousState.d,
            ...(previousState.d === date && current?.get("game") ? { game: current.get("game") } : {}),
          } : null;
      const stanceRef = db.doc(`users/${uid}/stances/${subject.id}_${date}`);
      tx.set(stanceRef, {
        subjectId: subject.id,
        kind: subject.kind,
        shard: shardFor(subject.id),
        date,
        stance: stanceInput.stance,
        game: input.game,
        prev: inheritedPrevious,
        recordId: stanceInput.recordId,
        sessionId: input.sessionId,
        score: stanceInput.score,
        excluded: anomaly !== null,
        createdAt: current?.get("createdAt") ?? now,
        updatedAt: now,
        rolledUpAt: null,
      });
      if (!anomaly) nextMap[subject.id] = { s: stanceInput.stance, d: date };
      perSubject[subject.id] = changes + 1;
      if (isReplacement) result.replaced.push(subject.id);
      else {
        result.accepted.push(subject.id);
        stancesToday += 1;
      }
    }

    sessionsToday += 1;
    tx.set(dailyRef, {
      stances: stancesToday,
      sessions: sessionsToday,
      perSubject,
      expiresAt: Timestamp.fromMillis(now.toMillis() + 30 * 86_400_000),
    }, { merge: true });
    tx.set(stateRef, { m: trimStateMap(nextMap), updatedAt: now }, { merge: true });
    tx.create(sessionRef, {
      game: input.game,
      subjectIds: [...result.accepted, ...result.replaced],
      startedAt: Timestamp.fromDate(new Date(input.startedAt)),
      receivedAt: now,
      result,
      expiresAt: Timestamp.fromMillis(now.toMillis() + 30 * 86_400_000),
    });
    return result;
  });
}
