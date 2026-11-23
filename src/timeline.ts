import type { Episode, Line, Scene } from "./types";

/** Frames of quiet before a scene's first line. */
export const LEAD_IN = 12;
/** Frames between lines. */
export const GAP = 9;
/** Frames after a scene's last line. */
export const TAIL = 18;
/** Seconds the quiz waits for you to answer. */
export const THINK_SECONDS = 5;
/** Frames each scene overlaps the next for the crossfade. */
export const FADE = 10;

export interface PlacedLine extends Line {
  /** Frame within the scene at which the voice starts */
  from: number;
  frames: number;
}

export interface PlacedScene {
  scene: Scene;
  from: number;
  frames: number;
  lines: PlacedLine[];
  reveal: PlacedLine[];
  /** Quiz: frame within the scene at which the thinking pause starts and the answer shows */
  thinkFrom: number;
  revealFrom: number;
}

function place(lines: Line[], start: number, fps: number): [PlacedLine[], number] {
  let t = start;
  const out = lines.map((l) => {
    const frames = Math.ceil(l.duration * fps);
    const p = { ...l, from: t, frames };
    t += frames + GAP;
    return p;
  });
  return [out, t];
}

export function layout(episode: Episode, fps: number): { scenes: PlacedScene[]; total: number } {
  let at = 0;
  const scenes = episode.scenes.map((scene) => {
    const [lines, afterLines] = place(scene.lines, LEAD_IN, fps);
    let thinkFrom = afterLines;
    let revealFrom = afterLines;
    let end = afterLines;
    if (scene.type === "quiz") {
      thinkFrom = afterLines;
      revealFrom = thinkFrom + THINK_SECONDS * fps;
      end = revealFrom + 6;
    }
    const [reveal, afterReveal] = place(scene.reveal ?? [], end, fps);
    const frames = Math.max(afterReveal, end) + TAIL + (scene.type === "recap" ? fps : 0);
    const placed: PlacedScene = { scene, from: at, frames, lines, reveal, thinkFrom, revealFrom };
    at += frames - FADE;
    return placed;
  });
  return { scenes, total: at + FADE };
}

/** The line being spoken (or most recently spoken) at `frame`. */
export function currentLine(lines: PlacedLine[], frame: number): PlacedLine | undefined {
  let cur: PlacedLine | undefined;
  for (const l of lines) if (frame >= l.from - 4) cur = l;
  return cur;
}
