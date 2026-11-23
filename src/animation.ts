import { interpolate } from "remotion";
import type { InstructorPose, MouthShape } from "./Instructor";
import { restPose } from "./Instructor";
import type { MouthCue } from "./types";

export function mouthAt(cues: MouthCue[], seconds: number): MouthShape {
  if (seconds < 0) return "X";
  const cue = cues.find((c) => seconds >= c.start && seconds < c.end);
  return cue ? cue.value : "X";
}

export function blinkAt(frame: number, fps: number, seed = 0): number {
  const period = Math.round(fps * 3.4);
  const t = (frame + seed * 17) % period;
  return interpolate(t, [0, 3, 6], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

/** A voiced line placed on the scene's timeline. */
export interface Timed {
  from: number;
  cues: MouthCue[];
}

interface PoseOptions {
  frame: number;
  fps: number;
  lines: Timed[];
  wave?: boolean;
  /** Points the left arm at something on the left of the screen */
  point?: boolean;
  lookX?: number;
  lookY?: number;
  seed?: number;
}

/** Talking, blinking and a little bob; busier while speaking. */
export function poseAt({ frame, fps, lines, wave, point, lookX = 0, lookY = 0, seed = 0 }: PoseOptions): InstructorPose {
  let mouth: MouthShape = "X";
  for (const l of lines) {
    const m = mouthAt(l.cues, (frame - l.from) / fps);
    if (m !== "X") {
      mouth = m;
      break;
    }
  }
  const talking = mouth !== "X";
  const t = frame / fps;
  const bob = Math.sin(t * Math.PI * (talking ? 2.2 : 1.0));
  const open = mouth === "C" || mouth === "D" || mouth === "H";
  const waveFor = wave ? interpolate(frame, [0, fps * 2.2, fps * 2.6], [1, 1, 0], { extrapolateRight: "clamp" }) : 0;
  return {
    ...restPose,
    mouth,
    blink: blinkAt(frame, fps, seed),
    lookX,
    lookY,
    bounce: bob * (talking ? 6 : 2.5),
    squash: (talking ? 0.02 : 0.008) * bob + (open ? 0.012 : 0),
    brow: talking ? 3 + Math.max(0, bob) * 4 : 0,
    rightArm: waveFor > 0 ? (-130 + Math.sin(t * Math.PI * 4) * 16) * waveFor : talking ? -8 + bob * 8 : 0,
    leftArm: point ? 78 + Math.sin(t * Math.PI * 0.8) * 4 : talking ? 6 - bob * 6 : 0,
  };
}
