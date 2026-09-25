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
let noise: AudioBuffer | null = null;

function envelope(audio: AudioContext, at: number, peak: number, attack: number, decay: number) {
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  gain.connect(audio.destination);
  return gain;
}

// A punch: a short burst of filtered noise (the slap of the glove) over a
// low thump whose pitch drops fast (the body of the hit). Long combos hit a
// little harder and higher.
function punch(audio: AudioContext, combo: number) {
  const now = audio.currentTime;
  const lift = 1 + Math.min(combo, 30) * 0.015;
  if (!noise) {
    noise = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.12), audio.sampleRate);
    const data = noise.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
  }
  const slap = audio.createBufferSource();
  slap.buffer = noise;
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2400 * lift, now);
  filter.frequency.exponentialRampToValueAtTime(400, now + 0.1);
  slap.connect(filter).connect(envelope(audio, now, 0.5, 0.003, 0.1));
  slap.start(now);

  const body = audio.createOscillator();
  body.type = "sine";
  body.frequency.setValueAtTime(140 * lift, now);
  body.frequency.exponentialRampToValueAtTime(45, now + 0.14);
  body.connect(envelope(audio, now, 0.7, 0.004, 0.16));
  body.start(now);
  body.stop(now + 0.2);
}

// A cheer: two soft bell notes a major third apart, like a heart popping up.
// The pair climbs with the combo so a long run sounds brighter, not louder.
function cheer(audio: AudioContext, combo: number) {
  const now = audio.currentTime;
  const base = 660 * 2 ** ((Math.min(combo, 24) % 12) / 24);
  [[base, 0], [base * 1.26, 0.07]].forEach(([frequency, delay]) => {
    const at = now + delay;
    const tone = audio.createOscillator();
    tone.type = "sine";
    tone.frequency.setValueAtTime(frequency, at);
    const shimmer = audio.createOscillator();
    shimmer.type = "sine";
    shimmer.frequency.setValueAtTime(frequency * 2, at);
    const bright = envelope(audio, at, 0.05, 0.01, 0.35);
    tone.connect(envelope(audio, at, 0.16, 0.015, 0.55));
    shimmer.connect(bright);
    tone.start(at); shimmer.start(at);
    tone.stop(at + 0.6); shimmer.stop(at + 0.4);
  });
}

// "Don't know": a soft upward whoosh, the card flicked away without a verdict.
function skip(audio: AudioContext) {
  const now = audio.currentTime;
  const length = Math.floor(audio.sampleRate * 0.3);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
  const air = audio.createBufferSource();
  air.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(400, now);
  filter.frequency.exponentialRampToValueAtTime(2600, now + 0.25);
  air.connect(filter).connect(envelope(audio, now, 0.12, 0.06, 0.22));
  air.start(now);
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

export function playHit(kind: "punch" | "cheer", combo: number) {
  const ctx = audio();
  if (!ctx) return;
  if (kind === "punch") punch(ctx, combo);
  else cheer(ctx, combo);
}

// Swipe decks sound like the reflex game for punch and cheer, and whoosh for
// "don't know".
export function playStance(stance: "punch" | "cheer" | "unknown") {
  const ctx = audio();
  if (!ctx) return;
  if (stance === "unknown") skip(ctx);
  else if (stance === "punch") punch(ctx, 0);
  else cheer(ctx, 0);
}
