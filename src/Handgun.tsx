import React from "react";
import { theme } from "./theme";

/** Parts that can be highlighted and labelled. */
export const PARTS = {
  slide: { label: "Slide", anchor: [330, 150], at: [300, 60] },
  frame: { label: "Frame", anchor: [700, 272], at: [760, 400] },
  barrel: { label: "Barrel", anchor: [760, 196], at: [800, 60] },
  muzzle: { label: "Muzzle", anchor: [905, 196], at: [930, 330] },
  chamber: { label: "Chamber", anchor: [560, 196], at: [560, 60] },
  ejectionPort: { label: "Ejection port", anchor: [610, 182], at: [560, 60] },
  frontSight: { label: "Front sight", anchor: [866, 132], at: [950, 60] },
  rearSight: { label: "Rear sight", anchor: [200, 130], at: [80, 60] },
  trigger: { label: "Trigger", anchor: [472, 340], at: [540, 500] },
  triggerGuard: { label: "Trigger guard", anchor: [540, 388], at: [640, 500] },
  grip: { label: "Grip", anchor: [255, 430], at: [70, 440] },
  magazine: { label: "Magazine", anchor: [250, 560], at: [560, 620] },
  magRelease: { label: "Magazine release", anchor: [405, 316], at: [470, 560] },
  slideStop: { label: "Slide stop", anchor: [475, 246], at: [430, 400] },
  safety: { label: "Safety", anchor: [222, 268], at: [60, 300] },
} as const;

export type Part = keyof typeof PARTS;

export interface GunState {
  /** 0 forward, 1 fully back */
  slideBack: number;
  /** 0 seated, 1 out of the gun */
  magOut: number;
  highlight: string[];
  /** 0..1 for how strongly the highlight shows (fade in) */
  glow: number;
  /** Draw a manual safety lever */
  showSafety?: boolean;
  /** Show cartridges in the magazine */
  loaded?: boolean;
}

const SLIDE_TRAVEL = 120;
const MAG_TRAVEL = 230;
const GRIP_ANGLE = 7.7;

/**
 * A generic, unbranded semi-automatic pistol, side view, muzzle to the right.
 * Each part is its own shape so it can be highlighted, and the slide and magazine move.
 */
export const Handgun: React.FC<{ state: GunState; width: number; labels?: boolean; fontFamily?: string }> = ({
  state,
  width,
  labels = true,
  fontFamily,
}) => {
  const { slideBack, magOut, highlight, glow } = state;
  const any = highlight.length > 0 && glow > 0;
  const on = (p: Part) => highlight.includes(p);
  // Highlighted parts blend toward orange; the rest fade toward the background (colour, not
  // opacity, so overlapping parts don't show through each other).
  const hl = (p: Part, base: string) => (on(p) ? mix(base, theme.accent, 0.55 * glow) : any ? mix(base, theme.bg, 0.5 * glow) : base);
  const stroke = (p: Part) => (on(p) ? theme.accent : theme.outline);
  const sw = (p: Part) => (on(p) ? 6 : 4);
  const sx = -SLIDE_TRAVEL * slideBack;

  return (
    <svg viewBox="0 0 1000 680" width={width} height={(width * 680) / 1000} style={{ overflow: "visible" }}>
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id="stipple" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="2" fill="#000" opacity="0.28" />
          <circle cx="10" cy="10" r="2" fill="#000" opacity="0.28" />
        </pattern>
        <mask id="port">
          <rect x="0" y="0" width="1000" height="680" fill="white" />
          <rect x={540} y={160} width={130} height={46} rx={6} fill="black" />
        </mask>
      </defs>

      {/* magazine: drawn behind the grip so the grip hides it while it's seated */}
      <g transform={`translate(292 262) rotate(${GRIP_ANGLE}) translate(0 ${MAG_TRAVEL * magOut})`}>
        <g filter={on("magazine") ? "url(#glow)" : undefined}>
          <rect x={-62} y={0} width={124} height={300} rx={8} fill={hl("magazine", theme.steel)} stroke={stroke("magazine")} strokeWidth={sw("magazine")} />
          <rect x={-74} y={296} width={148} height={26} rx={8} fill={hl("magazine", theme.polymer)} stroke={stroke("magazine")} strokeWidth={sw("magazine")} />
          {state.loaded !== false && (
            <g>
              <path d="M -50 6 Q -54 -22 -20 -30 L 40 -30 Q 52 -18 40 6 Z" fill={hl("magazine", theme.brass)} stroke={theme.outline} strokeWidth={3} />
              <rect x={-50} y={6} width={100} height={20} rx={4} fill={hl("magazine", theme.brass)} stroke={theme.outline} strokeWidth={3} />
            </g>
          )}
          <path d="M -40 60 V 270 M 40 60 V 270" stroke={theme.steelDark} strokeWidth={4} opacity={0.6} />
        </g>
      </g>

      {/* barrel: fixed; seen through the ejection port and at the muzzle when the slide is back */}
      <g filter={on("barrel") || on("chamber") ? "url(#glow)" : undefined}>
        <rect x={520} y={168} width={386} height={48} rx={6} fill={hl("barrel", theme.steelLight)} stroke={stroke("barrel")} strokeWidth={sw("barrel")} />
        <rect x={520} y={166} width={60} height={52} rx={6} fill={hl("chamber", theme.brass)} stroke={stroke("chamber")} strokeWidth={sw("chamber")} />
        <ellipse cx={524} cy={192} rx={6} ry={16} fill={theme.outline} />
      </g>

      {/* frame: dust cover, grip, trigger guard */}
      <g>
        <g filter={on("frame") ? "url(#glow)" : undefined}>
          <path d="M 190 244 H 884 V 282 Q 884 300 864 300 H 580 L 410 300 Z" fill={hl("frame", theme.polymer)} stroke={stroke("frame")} strokeWidth={sw("frame")} strokeLinejoin="round" />
          <path d="M 640 286 H 860" stroke={hl("frame", theme.polymerLight)} strokeWidth={5} strokeLinecap="round" />
        </g>
        <g filter={on("triggerGuard") ? "url(#glow)" : undefined}>
          <path d="M 578 296 Q 586 392 518 394 H 440 Q 404 392 400 352" fill="none" stroke={hl("triggerGuard", theme.polymer)} strokeWidth={22} strokeLinecap="round" />
          <path d="M 578 296 Q 586 392 518 394 H 440 Q 404 392 400 352" fill="none" stroke={stroke("triggerGuard")} strokeWidth={on("triggerGuard") ? 3 : 2} opacity={0.6} />
        </g>
        <g filter={on("grip") ? "url(#glow)" : undefined}>
          <path
            d="M 186 246 L 404 246 L 404 330 L 354 582 Q 352 590 342 590 L 160 590 Q 150 590 150 580 L 196 284 Q 168 276 160 262 Q 168 248 186 246 Z"
            fill={hl("grip", theme.polymer)}
            stroke={stroke("grip")}
            strokeWidth={sw("grip")}
            strokeLinejoin="round"
          />
          <path d="M 222 330 L 372 330 L 336 560 L 186 560 Z" fill="url(#stipple)" />
        </g>
      </g>

      {/* magazine x-ray outline while it's seated and highlighted */}
      {on("magazine") && magOut < 0.5 && (
        <g transform={`translate(292 262) rotate(${GRIP_ANGLE}) translate(0 ${MAG_TRAVEL * magOut})`} opacity={glow}>
          <rect x={-62} y={0} width={124} height={300} rx={8} fill="none" stroke={theme.accent} strokeWidth={5} strokeDasharray="14 10" />
        </g>
      )}

      {/* trigger, magazine release, slide stop, safety */}
      <g filter={on("trigger") ? "url(#glow)" : undefined}>
        <path d="M 478 300 Q 456 334 470 372" fill="none" stroke={on("trigger") ? theme.accent : hl("trigger", theme.steelDark)} strokeWidth={16} strokeLinecap="round" />
      </g>
      <g filter={on("magRelease") ? "url(#glow)" : undefined}>
        <rect x={392} y={302} width={26} height={30} rx={6} fill={hl("magRelease", theme.steelDark)} stroke={stroke("magRelease")} strokeWidth={sw("magRelease")} />
      </g>
      {state.showSafety && (
        <g filter={on("safety") ? "url(#glow)" : undefined}>
          <rect x={204} y={256} width={40} height={22} rx={8} fill={hl("safety", theme.steel)} stroke={stroke("safety")} strokeWidth={sw("safety")} />
        </g>
      )}

      {/* slide */}
      <g transform={`translate(${sx} 0)`}>
        <g mask="url(#port)" filter={on("slide") ? "url(#glow)" : undefined}>
          <path
            d="M 170 160 Q 170 142 190 142 H 884 Q 904 142 904 162 V 246 H 170 Z"
            fill={hl("slide", theme.steel)}
            stroke={stroke("slide")}
            strokeWidth={sw("slide")}
            strokeLinejoin="round"
          />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path key={i} d={`M ${200 + i * 14} 156 L ${192 + i * 14} 236`} stroke={hl("slide", theme.steelDark)} strokeWidth={5} strokeLinecap="round" />
          ))}
          <path d="M 300 226 H 880" stroke={hl("slide", theme.steelLight)} strokeWidth={3} opacity={0.5} />
        </g>
        <rect x={540} y={160} width={130} height={46} rx={6} fill="none" stroke={stroke("ejectionPort")} strokeWidth={on("ejectionPort") ? 7 : 3} />
        <g filter={on("frontSight") ? "url(#glow)" : undefined}>
          <rect x={856} y={126} width={20} height={18} rx={3} fill={hl("frontSight", theme.steelDark)} stroke={stroke("frontSight")} strokeWidth={sw("frontSight")} />
        </g>
        <g filter={on("rearSight") ? "url(#glow)" : undefined}>
          <path d="M 184 144 V 124 H 196 V 134 H 208 V 124 H 220 V 144 Z" fill={hl("rearSight", theme.steelDark)} stroke={stroke("rearSight")} strokeWidth={sw("rearSight")} strokeLinejoin="round" />
        </g>
      </g>
      <g filter={on("slideStop") ? "url(#glow)" : undefined}>
        <rect x={430} y={236} width={92} height={18} rx={8} fill={hl("slideStop", theme.steelDark)} stroke={stroke("slideStop")} strokeWidth={sw("slideStop")} />
      </g>

      {/* muzzle marker */}
      {on("muzzle") && <circle cx={906} cy={192} r={30} fill="none" stroke={theme.accent} strokeWidth={6} opacity={glow} filter="url(#glow)" />}

      {/* callouts */}
      {labels &&
        highlight
          .filter((p): p is Part => p in PARTS)
          .map((p) => {
            const part = PARTS[p];
            const moves = p === "slide" || p === "frontSight" || p === "rearSight" || p === "ejectionPort";
            const ax = part.anchor[0] + (moves ? sx : 0);
            const ay = p === "magazine" ? part.anchor[1] + MAG_TRAVEL * magOut * 0.99 : part.anchor[1];
            const axm = p === "magazine" ? ax - MAG_TRAVEL * magOut * 0.134 : ax;
            const [lx, ly] = part.at;
            const w = part.label.length * 17 + 36;
            return (
              <g key={p} opacity={glow}>
                <line x1={axm} y1={ay} x2={lx} y2={ly} stroke={theme.accent} strokeWidth={3} />
                <circle cx={axm} cy={ay} r={8} fill={theme.accent} stroke={theme.bg} strokeWidth={3} />
                <rect x={lx - w / 2} y={ly - 24} width={w} height={48} rx={24} fill={theme.accent} />
                <text x={lx} y={ly + 10} textAnchor="middle" fontSize={28} fontWeight={800} fill={theme.bg} fontFamily={fontFamily}>
                  {part.label}
                </text>
              </g>
            );
          })}
    </svg>
  );
};

/** Blends two #rrggbb colours. */
function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
