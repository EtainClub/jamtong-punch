// Version history of one record on chain. Each version points to the previous
// hash, so a correction is a new link in a chain rather than an overwrite, and
// taking a record down leaves a "retract" link instead of silence.

export type AnchorOp = "publish" | "update" | "retract";

export type AnchorVersion = {
  v: number;
  op: AnchorOp;
  hash: string | null;
  prev: string | null;
  queuedAt: string;
  txId: string | null;
  blockNum: number | null;
  anchoredAt: string | null;
  error: string | null;
};

export function lastHash(versions: AnchorVersion[]): string | null {
  for (let index = versions.length - 1; index >= 0; index -= 1) {
    if (versions[index].hash) return versions[index].hash;
  }
  return null;
}

// What, if anything, must be recorded now. `hash` is the hash of the record
// as it is published, or null when it is not public (draft, archived, deleted).
export function nextVersion(versions: AnchorVersion[], hash: string | null, queuedAt: string): AnchorVersion | null {
  const last = versions.at(-1);
  const live = last !== undefined && last.op !== "retract";
  if (hash === null) {
    if (!live) return null;
    return { v: versions.length + 1, op: "retract", hash: null, prev: lastHash(versions), queuedAt, txId: null, blockNum: null, anchoredAt: null, error: null };
  }
  if (live && last.hash === hash) return null;
  return { v: versions.length + 1, op: live ? "update" : "publish", hash, prev: lastHash(versions), queuedAt, txId: null, blockNum: null, anchoredAt: null, error: null };
}

export function isPending(version: AnchorVersion): boolean {
  return version.txId === null;
}
