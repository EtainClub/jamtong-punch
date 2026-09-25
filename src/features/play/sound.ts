"use client";

// Synthesized hit sounds: no audio files to download, and nothing plays until
// the player turns sound on (off by default, remembered per browser).
const KEY = "imtong:sound";

export function soundPreference(): boolean {
  try { return localStorage.getItem(KEY) === "on"; } catch { return false; }
}

export function saveSoundPreference(on: boolean) {
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* private mode: not remembered */ }
}

let context: AudioContext | null = null;

// Punches thud low and rise with the combo; cheers ring higher.
export function playHit(kind: "punch" | "cheer", combo: number) {
  if (typeof window === "undefined") return;
  context ??= new AudioContext();
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const base = kind === "punch" ? 110 : 520;
  oscillator.type = kind === "punch" ? "square" : "sine";
  oscillator.frequency.setValueAtTime(base * (1 + Math.min(combo, 30) * 0.03), now);
  oscillator.frequency.exponentialRampToValueAtTime(base * 0.5, now + 0.12);
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.16);
}
