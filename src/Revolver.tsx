import React from "react";
import { Callouts, GlowFilter, painter } from "./Callouts";
import { theme } from "./theme";

export const REVOLVER_PARTS: Record<string, { label: string; anchor: [number, number]; at: [number, number] }> = {
  barrel: { label: "Barrel", anchor: [700, 200], at: [700, 70] },
  muzzle: { label: "Muzzle", anchor: [902, 200], at: [930, 330] },
  frontSight: { label: "Front sight", anchor: [880, 150], at: [930, 60] },
  rearSight: { label: "Rear sight", anchor: [272, 158], at: [200, 60] },
  frame: { label: "Frame", anchor: [500, 175], at: [470, 60] },
  cylinder: { label: "Cylinder", anchor: [430, 250], at: [640, 330] },
  chambers: { label: "Chambers", anchor: [460, 465], at: [700, 470] },
  cylinderRelease: { label: "Cylinder release", anchor: [322, 226], at: [140, 300] },
  ejectorRod: { label: "Ejector rod", anchor: [680, 247], at: [780, 330] },
  hammer: { label: "Hammer", anchor: [215, 165], at: [80, 160] },
  trigger: { label: "Trigger", anchor: [445, 365], at: [560, 560] },
  triggerGuard: { label: "Trigger guard", anchor: [470, 405], at: [640, 610] },
  grip: { label: "Grip", anchor: [265, 470], at: [80, 470] },
  crane: { label: "Crane", anchor: [500, 360], at: [760, 400] },
};

export interface RevolverState {
  /** 0 closed, 1 cylinder swung out (shown end-on below the gun) */
  open: number;
  /** 0..1 cases pushed out of the chambers */
  eject: number;
  /** 0 hammer down, 1 cocked */
  hammerBack: number;
  /** Cartridges in the chambers */
  loaded: boolean;
  highlight: string[];
  glow: number;
}

/** A generic, unbranded double-action revolver, side view, muzzle to the right. */
export const Revolver: React.FC<{ state: RevolverState; width: number; fontFamily?: string; names?: Record<string, string> }> = ({
  state,
  width,
  fontFamily,
  names = {},
}) => {
  const { open, eject, hammerBack, highlight, glow } = state;
  const p = painter(highlight, glow);
  const wood = "#6b4a2f";
  const cyl = { cx: 460, cy: 500, r: 100 };
  const callouts = highlight
    .filter((h) => h in REVOLVER_PARTS)
    .map((h) => {
      const part = REVOLVER_PARTS[h];
      return { label: names[h] ?? part.label, ax: part.anchor[0], ay: part.anchor[1], lx: part.at[0], ly: part.at[1] };
    });
  return (
    <svg viewBox="0 0 1000 680" width={width} height={(width * 680) / 1000} style={{ overflow: "visible" }}>
      <defs>
        <GlowFilter />
        <pattern id="grain" width="24" height="12" patternUnits="userSpaceOnUse">
          <path d="M 0 6 Q 6 2 12 6 T 24 6" fill="none" stroke="#000" strokeOpacity={0.2} strokeWidth={2} />
        </pattern>
      </defs>

      {/* hammer (behind the frame) */}
      <g transform={`rotate(${-28 * hammerBack} 262 250)`} filter={p.glow("hammer")}>
        <path d="M 250 250 L 226 176 Q 214 150 196 156 Q 190 166 206 176 L 238 252 Z" fill={p.fill("hammer", theme.steelDark)} stroke={p.stroke("hammer")} strokeWidth={p.width("hammer")} strokeLinejoin="round" />
      </g>

      {/* grip */}
      <g filter={p.glow("grip")}>
        <path d="M 232 250 L 346 318 L 336 590 Q 334 604 318 604 L 200 604 Q 184 604 186 588 L 212 330 Q 214 290 232 250 Z" fill={p.fill("grip", wood)} stroke={p.stroke("grip")} strokeWidth={p.width("grip")} strokeLinejoin="round" />
        <path d="M 226 330 L 326 340 L 318 570 L 208 570 Z" fill="url(#grain)" />
      </g>

      {/* barrel with ejector shroud */}
      <g filter={p.glow("barrel")}>
        <rect x={520} y={172} width={382} height={56} rx={6} fill={p.fill("barrel", theme.steel)} stroke={p.stroke("barrel")} strokeWidth={p.width("barrel")} />
        <path d="M 520 228 H 770 Q 780 228 780 240 V 256 H 520 Z" fill={p.fill("barrel", theme.steel)} stroke={p.stroke("barrel")} strokeWidth={p.width("barrel")} strokeLinejoin="round" />
      </g>
      <g filter={p.glow("frontSight")}>
        <path d="M 866 172 L 872 142 H 890 L 892 172 Z" fill={p.fill("frontSight", theme.steelDark)} stroke={p.stroke("frontSight")} strokeWidth={p.width("frontSight")} strokeLinejoin="round" />
      </g>
      {/* ejector rod (hidden under the shroud while closed) */}
      <g filter={p.glow("ejectorRod")} opacity={1 - open}>
        <rect x={530} y={240} width={240} height={14} rx={7} fill={p.fill("ejectorRod", theme.steelLight)} stroke={p.stroke("ejectorRod")} strokeWidth={p.width("ejectorRod") - 1} />
      </g>

      {/* frame */}
      <g filter={p.glow("frame")}>
        <path
          d="M 244 168 Q 250 152 270 152 H 534 V 330 Q 534 336 528 336 H 352 Q 320 330 300 300 L 262 260 Q 240 230 244 168 Z M 340 186 V 318 H 520 V 186 Z"
          fillRule="evenodd"
          fill={p.fill("frame", theme.steel)}
          stroke={p.stroke("frame")}
          strokeWidth={p.width("frame")}
          strokeLinejoin="round"
        />
      </g>
      <g filter={p.glow("rearSight")}>
        <path d="M 256 152 V 140 H 266 V 148 H 278 V 140 H 288 V 152 Z" fill={p.fill("rearSight", theme.steelDark)} stroke={p.stroke("rearSight")} strokeWidth={p.width("rearSight")} />
      </g>
      <g filter={p.glow("cylinderRelease")}>
        <rect x={304} y={214} width={34} height={24} rx={8} fill={p.fill("cylinderRelease", theme.steelDark)} stroke={p.stroke("cylinderRelease")} strokeWidth={p.width("cylinderRelease")} />
      </g>

      {/* cylinder, side view: slides out of the window as it opens */}
      <g transform={`translate(0 ${70 * open})`} opacity={1 - open} filter={p.glow("cylinder")}>
        <rect x={346} y={190} width={168} height={124} rx={16} fill={p.fill("cylinder", theme.steelLight)} stroke={p.stroke("cylinder")} strokeWidth={p.width("cylinder")} />
        {[0, 1, 2].map((i) => (
          <rect key={i} x={372} y={206 + i * 34} width={118} height={18} rx={9} fill={p.fill("cylinder", theme.steel)} />
        ))}
      </g>

      {/* trigger guard and trigger */}
      <g filter={p.glow("triggerGuard")}>
        <path d="M 524 334 Q 534 410 470 410 H 410 Q 366 408 364 360" fill="none" stroke={p.fill("triggerGuard", theme.steel)} strokeWidth={20} strokeLinecap="round" />
      </g>
      <g filter={p.glow("trigger")}>
        <path d="M 446 334 Q 428 360 444 392" fill="none" stroke={p.on("trigger") ? theme.accent : p.fill("trigger", theme.steelDark)} strokeWidth={15} strokeLinecap="round" />
      </g>

      {/* swung-out cylinder, seen end-on, on its crane */}
      {open > 0 && (
        <g opacity={open} transform={`translate(${cyl.cx} ${cyl.cy}) scale(${0.7 + 0.3 * open}) translate(${-cyl.cx} ${-cyl.cy})`}>
          <g filter={p.glow("crane")}>
            <path d={`M 520 330 Q 540 ${cyl.cy - 60} ${cyl.cx + 40} ${cyl.cy - 70}`} fill="none" stroke={p.fill("crane", theme.steel)} strokeWidth={22} strokeLinecap="round" />
          </g>
          <g filter={p.glow("cylinder") ?? p.glow("chambers")}>
            <circle cx={cyl.cx} cy={cyl.cy} r={cyl.r} fill={p.fill("cylinder", theme.steelLight)} stroke={p.stroke("cylinder")} strokeWidth={p.width("cylinder")} />
            {Array.from({ length: 6 }, (_, i) => {
              const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
              const x = cyl.cx + Math.cos(a) * 58;
              const y = cyl.cy + Math.sin(a) * 58;
              const caseOut = state.loaded ? eject : 1;
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r={27} fill={theme.outline} stroke={p.stroke("chambers")} strokeWidth={p.on("chambers") ? 5 : 2} />
                  {caseOut < 1 && (
                    <g transform={`translate(${x} ${y}) scale(${1 + 0.6 * caseOut}) translate(${-x} ${-y})`} opacity={1 - caseOut}>
                      <circle cx={x} cy={y} r={25} fill={theme.brass} stroke={theme.outline} strokeWidth={2} />
                      <circle cx={x} cy={y} r={8} fill="#b08a3a" stroke={theme.outline} strokeWidth={2} />
                    </g>
                  )}
                </g>
              );
            })}
            <circle cx={cyl.cx} cy={cyl.cy} r={12} fill={p.fill("ejectorRod", theme.steelDark)} stroke={p.stroke("ejectorRod")} strokeWidth={3} />
          </g>
        </g>
      )}

      {/* muzzle marker */}
      {p.on("muzzle") && <circle cx={904} cy={200} r={32} fill="none" stroke={theme.accent} strokeWidth={6} opacity={glow} filter="url(#glow)" />}

      <Callouts items={callouts} opacity={glow} fontFamily={fontFamily} />
    </svg>
  );
};
