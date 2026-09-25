// The version this build was made from (package.json, via next.config env).
export const APP_VERSION: string = process.env.APP_VERSION ?? "0.0.0";

// True when `candidate` is a later x.y.z than `current`. Anything that is not
// a plain version compares as older, so a bad response never prompts a reload.
export function isNewerVersion(candidate: string, current: string): boolean {
  const parse = (value: string) => (/^\d+\.\d+\.\d+$/.test(value) ? value.split(".").map(Number) : null);
  const next = parse(candidate);
  const now = parse(current);
  if (!next || !now) return false;
  for (let index = 0; index < 3; index += 1) {
    if (next[index] !== now[index]) return next[index] > now[index];
  }
  return false;
}
