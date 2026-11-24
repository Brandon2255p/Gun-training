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

export type GunAction = "rack" | "slideBack" | "slideForward" | "magOut" | "magIn" | "open" | "close" | "eject" | "load" | "cock" | "decock";

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
  /** Cartridge diagram: firing-sequence stage 0–4 from this line on */
  stage?: number;
  /** Talk/recap: which bullet appears with this line (default: the line's index) */
  show?: number;
}

export type SceneType = "title" | "talk" | "diagram" | "figure" | "rule" | "term" | "quiz" | "recap";

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
  /** Talk: number the bullets as steps */
  numbered?: boolean;
  /** Diagram: what to draw (default pistol) */
  subject?: "pistol" | "revolver" | "cartridge";
  /** Diagram: label text per part, to match the book's wording */
  names?: Record<string, string>;
  showSafety?: boolean;
  showHammer?: boolean;
  loaded?: boolean;
  inBarrel?: boolean;
  /** Figure: scan image in source/pages and crop box as fractions [x, y, w, h] */
  figure?: { page: string; crop?: [number, number, number, number]; rotate?: number };
  /** Set by prepare.py: the cropped image under public/ */
  figureFile?: string;
  caption?: string;
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
