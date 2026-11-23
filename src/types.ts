import type { MouthShape } from "./Instructor";

/** A mouth shape held from `start` to `end` seconds into a line (written by scripts/prepare.py). */
export interface MouthCue {
  start: number;
  end: number;
  value: MouthShape;
}

/** When one word of a line is spoken, in seconds. */
export interface WordTiming {
  text: string;
  start: number;
  end: number;
}

export type GunAction = "rack" | "slideBack" | "slideForward" | "magOut" | "magIn";

/** A voiced line. Optional fields cue the visuals when the line starts. */
export interface Line {
  id: string;
  text: string;
  duration: number;
  cues: MouthCue[];
  words: WordTiming[];
  /** Diagram: parts to highlight from this line on ([] clears) */
  highlight?: string[];
  /** Diagram: something the pistol does as this line starts */
  action?: GunAction;
  /** Talk/recap: which bullet appears with this line (default: the line's index) */
  show?: number;
}

export type SceneType = "title" | "talk" | "diagram" | "rule" | "term" | "quiz" | "recap";

export interface Scene {
  type: SceneType;
  heading?: string;
  bullets?: string[];
  points?: string[];
  rule?: { number?: number; text: string };
  term?: string;
  definition?: string;
  question?: string;
  options?: string[];
  answer?: number;
  /** e.g. "Handling book, p. 14" — shown on screen so every fact can be checked */
  source?: string;
  lines: Line[];
  reveal: Line[];
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  subtitle?: string;
  sources: string[];
  scenes: Scene[];
}
