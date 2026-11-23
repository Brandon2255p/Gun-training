import React from "react";
import { theme } from "./theme";

// Rhubarb Lip Sync's mouth shapes: A–F basic, G/H extended, X rest.
export type MouthShape = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "X";

export interface InstructorPose {
  mouth: MouthShape;
  blink: number;
  lookX: number;
  lookY: number;
  /** Viewer's-left arm: 0 hangs down, positive swings it out to point left (degrees) */
  leftArm: number;
  /** Viewer's-right arm: 0 hangs down, negative raises it (wave) */
  rightArm: number;
  bounce: number;
  squash: number;
  brow: number;
}

export const restPose: InstructorPose = {
  mouth: "X",
  blink: 0,
  lookX: 0,
  lookY: 0,
  leftArm: 0,
  rightArm: 0,
  bounce: 0,
  squash: 0,
  brow: 0,
};

const ln = { stroke: theme.outline, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const Teeth: React.FC<{ width: number; top: number }> = ({ width, top }) => (
  <path
    d={`M ${-width} ${top} Q 0 ${top - 4} ${width} ${top} L ${width - 1} ${top + 7} Q 0 ${top + 4} ${-width + 1} ${top + 7} Z`}
    fill={theme.white}
  />
);

const Mouth: React.FC<{ shape: MouthShape }> = ({ shape }) => {
  const dark = "#3a1d1d";
  switch (shape) {
    case "X":
      return <path d="M -24 -2 Q 0 12 24 -2" fill="none" strokeWidth={6} {...ln} />;
    case "A":
      return <path d="M -22 2 Q 0 6 22 2" fill="none" strokeWidth={8} {...ln} />;
    case "B":
      return (
        <g>
          <path d="M -26 -5 Q 0 -9 26 -5 Q 22 10 0 12 Q -22 10 -26 -5 Z" fill={dark} strokeWidth={5} {...ln} />
          <Teeth width={20} top={-6} />
        </g>
      );
    case "C":
      return (
        <g>
          <path d="M -28 -7 Q 0 -12 28 -7 Q 22 24 0 26 Q -22 24 -28 -7 Z" fill={dark} strokeWidth={5} {...ln} />
          <ellipse cx={0} cy={17} rx={12} ry={6} fill={theme.tongue} />
          <Teeth width={22} top={-8} />
        </g>
      );
    case "D":
      return (
        <g>
          <path d="M -31 -9 Q 0 -15 31 -9 Q 26 38 0 40 Q -26 38 -31 -9 Z" fill={dark} strokeWidth={5} {...ln} />
          <ellipse cx={0} cy={29} rx={15} ry={8} fill={theme.tongue} />
          <Teeth width={24} top={-10} />
        </g>
      );
    case "E":
      return (
        <g>
          <ellipse cx={0} cy={4} rx={17} ry={16} fill={dark} strokeWidth={5} {...ln} />
          <ellipse cx={0} cy={12} rx={9} ry={4} fill={theme.tongue} />
        </g>
      );
    case "F":
      return <ellipse cx={0} cy={2} rx={10} ry={12} fill={dark} strokeWidth={6} {...ln} />;
    case "G":
      return (
        <g>
          <path d="M -22 -4 Q 0 -7 22 -4 Q 19 9 0 10 Q -19 9 -22 -4 Z" fill={dark} strokeWidth={5} {...ln} />
          <path d="M -15 -5 L 15 -5 L 14 4 L -14 4 Z" fill={theme.white} />
        </g>
      );
    case "H":
      return (
        <g>
          <path d="M -26 -7 Q 0 -12 26 -7 Q 21 21 0 23 Q -21 21 -26 -7 Z" fill={dark} strokeWidth={5} {...ln} />
          <ellipse cx={0} cy={4} rx={10} ry={7} fill={theme.tongue} />
        </g>
      );
  }
};

const Eye: React.FC<{ cx: number; cy: number; pose: InstructorPose }> = ({ cx, cy, pose }) => {
  const open = 1 - 0.92 * Math.min(1, Math.max(0, pose.blink));
  const px = cx + pose.lookX * 7;
  const py = cy + pose.lookY * 6;
  return (
    <g transform={`translate(${cx} ${cy}) scale(1 ${open}) translate(${-cx} ${-cy})`}>
      <ellipse cx={cx} cy={cy} rx={19} ry={22} fill={theme.white} stroke={theme.outline} strokeWidth={4} />
      <circle cx={px} cy={py} r={10} fill={theme.outline} />
      <circle cx={px - 3} cy={py - 4} r={3.5} fill={theme.white} />
    </g>
  );
};

const Arm: React.FC<{ x: number; angle: number; side: -1 | 1 }> = ({ x, angle, side }) => (
  <g transform={`rotate(${angle} ${x} 352)`}>
    <path d={`M ${x} 352 Q ${x + side * 18} 410 ${x + side * 8} 468`} fill="none" stroke={theme.shirtDark} strokeWidth={44} strokeLinecap="round" />
    <path d={`M ${x} 352 Q ${x + side * 18} 410 ${x + side * 8} 468`} fill="none" stroke={theme.shirt} strokeWidth={34} strokeLinecap="round" />
    <circle cx={x + side * 8} cy={480} r={22} fill={theme.skin} stroke={theme.outline} strokeWidth={4} />
  </g>
);

/**
 * The range instructor: cap, safety glasses and ear protection, as they'd wear on the range.
 * Pure SVG driven by a pose, so every frame renders the same everywhere.
 */
export const Instructor: React.FC<{ pose: InstructorPose; size: number; style?: React.CSSProperties }> = ({ pose, size, style }) => {
  const { squash, bounce, brow } = pose;
  return (
    <svg viewBox="0 0 400 520" width={size} height={(size * 520) / 400} style={{ overflow: "visible", ...style }}>
      <g transform={`translate(0 ${bounce}) translate(200 520) scale(${1 + squash} ${1 - squash}) translate(-200 -520)`}>
        {/* arms behind the body */}
        <Arm x={118} angle={pose.leftArm} side={-1} />
        <Arm x={282} angle={pose.rightArm} side={1} />

        {/* torso: polo shirt */}
        <path d="M 96 520 L 104 380 Q 110 326 170 318 L 230 318 Q 290 326 296 380 L 304 520 Z" fill={theme.shirt} strokeWidth={5} {...ln} />
        <path d="M 172 318 L 200 356 L 228 318" fill={theme.ink} strokeWidth={4} {...ln} />
        <path d="M 200 356 V 410" stroke={theme.shirtDark} strokeWidth={4} />
        <circle cx={200} cy={376} r={4} fill={theme.ink} />
        <circle cx={200} cy={396} r={4} fill={theme.ink} />
        {/* badge */}
        <rect x={234} y={392} width={46} height={30} rx={5} fill={theme.accent} stroke={theme.outline} strokeWidth={3} />
        <path d="M 242 403 H 272 M 242 412 H 264" stroke={theme.outline} strokeWidth={3} strokeLinecap="round" />

        {/* neck */}
        <rect x={176} y={292} width={48} height={34} rx={10} fill={theme.skinShade} />

        {/* head */}
        <ellipse cx={200} cy={210} rx={104} ry={110} fill={theme.skin} strokeWidth={5} {...ln} />

        {/* ear protection: band over the cap, cups over the ears */}
        <path d="M 92 214 Q 86 70 200 64 Q 314 70 308 214" fill="none" stroke={theme.steelDark} strokeWidth={14} strokeLinecap="round" />
        <rect x={70} y={170} width={44} height={86} rx={20} fill={theme.accent} strokeWidth={5} {...ln} />
        <rect x={286} y={170} width={44} height={86} rx={20} fill={theme.accent} strokeWidth={5} {...ln} />
        <rect x={80} y={190} width={10} height={46} rx={5} fill={theme.accentDark} />
        <rect x={310} y={190} width={10} height={46} rx={5} fill={theme.accentDark} />

        {/* cap */}
        <path d="M 104 150 Q 104 82 200 80 Q 296 82 296 150 Z" fill={theme.shirtDark} strokeWidth={5} {...ln} />
        <path d="M 200 82 V 148" stroke={theme.shirt} strokeWidth={4} />
        <ellipse cx={200} cy={152} rx={118} ry={20} fill={theme.shirt} strokeWidth={5} {...ln} />
        <circle cx={200} cy={82} r={7} fill={theme.shirt} stroke={theme.outline} strokeWidth={3} />

        {/* brows */}
        <path d={`M 134 ${186 - brow} Q 156 ${177 - brow} 178 ${186 - brow}`} fill="none" strokeWidth={6} {...ln} />
        <path d={`M 222 ${186 - brow} Q 244 ${177 - brow} 266 ${186 - brow}`} fill="none" strokeWidth={6} {...ln} />

        {/* eyes behind safety glasses */}
        <Eye cx={157} cy={218} pose={pose} />
        <Eye cx={243} cy={218} pose={pose} />
        <rect x={124} y={194} width={68} height={50} rx={18} fill="#bfe3ff" opacity={0.22} />
        <rect x={208} y={194} width={68} height={50} rx={18} fill="#bfe3ff" opacity={0.22} />
        <rect x={124} y={194} width={68} height={50} rx={18} fill="none" stroke={theme.outline} strokeWidth={5} />
        <rect x={208} y={194} width={68} height={50} rx={18} fill="none" stroke={theme.outline} strokeWidth={5} />
        <path d="M 192 212 Q 200 206 208 212" fill="none" strokeWidth={5} {...ln} />
        <path d="M 136 200 L 150 200" stroke={theme.white} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
        <path d="M 220 200 L 234 200" stroke={theme.white} strokeWidth={4} strokeLinecap="round" opacity={0.6} />

        {/* nose, cheeks */}
        <path d="M 200 238 Q 192 256 200 260" fill="none" stroke={theme.skinShade} strokeWidth={5} strokeLinecap="round" />
        <ellipse cx={128} cy={262} rx={15} ry={9} fill={theme.blush} opacity={0.35} />
        <ellipse cx={272} cy={262} rx={15} ry={9} fill={theme.blush} opacity={0.35} />

        <g transform="translate(200 280)">
          <Mouth shape={pose.mouth} />
        </g>
      </g>
    </svg>
  );
};
