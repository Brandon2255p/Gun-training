import React from "react";
import { Callouts, GlowFilter, mix, painter } from "./Callouts";
import { theme } from "./theme";

export const CARTRIDGE_PARTS: Record<string, { label: string; anchor: [number, number]; at: [number, number] }> = {
  bullet: { label: "Bullet", anchor: [720, 300], at: [760, 140] },
  case: { label: "Case", anchor: [450, 244], at: [450, 120] },
  powder: { label: "Powder", anchor: [420, 380], at: [420, 560] },
  primer: { label: "Primer", anchor: [272, 340], at: [180, 560] },
  primerPocket: { label: "Primer pocket", anchor: [276, 362], at: [150, 470] },
  flashHole: { label: "Flash hole", anchor: [292, 340], at: [300, 620] },
  rim: { label: "Rim", anchor: [268, 236], at: [180, 140] },
  firingPin: { label: "Firing pin", anchor: [180, 340], at: [120, 250] },
  barrel: { label: "Barrel", anchor: [700, 228], at: [880, 140] },
};

export interface CartridgeState {
  /** 0 assembled · 1 firing pin strikes the primer · 2 primer flash through the flash hole ·
   *  3 powder burns, gas builds · 4 bullet driven out of the case and down the barrel */
  stage: number;
  /** Draw the chamber and barrel around it */
  inBarrel: boolean;
  highlight: string[];
  glow: number;
}

// Deterministic powder granules
const GRANULES = Array.from({ length: 70 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 127.1 + n * 311.7) * 43758.5453) % 1 + 1) % 1;
  return { x: 306 + r(1) * 226, y: 262 + r(2) * 156, s: 5 + r(3) * 5 };
});

/** A centrefire handgun cartridge in cross-section, with the firing sequence. */
export const Cartridge: React.FC<{ state: CartridgeState; width: number; fontFamily?: string; names?: Record<string, string> }> = ({
  state,
  width,
  fontFamily,
  names = {},
}) => {
  const { stage, highlight, glow } = state;
  const p = painter(highlight, glow);
  const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
  const pin = clamp01(stage) * 20;
  const flash = clamp01(stage - 1.2) * (1 - clamp01(stage - 3.2));
  const burn = clamp01(stage - 2);
  const fly = clamp01(stage - 3) * 330;
  const copper = "#b8733a";
  const callouts = highlight
    .filter((h) => h in CARTRIDGE_PARTS)
    .map((h) => {
      const part = CARTRIDGE_PARTS[h];
      const dx = h === "bullet" ? fly : 0;
      return { label: names[h] ?? part.label, ax: part.anchor[0] + dx, ay: part.anchor[1], lx: part.at[0], ly: part.at[1] };
    });
  return (
    <svg viewBox="0 0 1000 680" width={width} height={(width * 680) / 1000} style={{ overflow: "visible" }}>
      <defs>
        <GlowFilter />
        <radialGradient id="gas">
          <stop offset="0%" stopColor="#ffd27a" />
          <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* chamber and barrel */}
      {state.inBarrel && (
        <g filter={p.glow("barrel")}>
          <rect x={250} y={204} width={740} height={22} fill={p.fill("barrel", theme.steel)} stroke={p.stroke("barrel")} strokeWidth={p.width("barrel") - 1} />
          <rect x={250} y={454} width={740} height={22} fill={p.fill("barrel", theme.steel)} stroke={p.stroke("barrel")} strokeWidth={p.width("barrel") - 1} />
        </g>
      )}

      {/* firing pin */}
      <g transform={`translate(${pin} 0)`} filter={p.glow("firingPin")}>
        <path d="M 90 328 H 236 L 252 340 L 236 352 H 90 Z" fill={p.fill("firingPin", theme.steelLight)} stroke={p.stroke("firingPin")} strokeWidth={p.width("firingPin")} strokeLinejoin="round" />
      </g>

      {/* bullet (behind the case mouth while seated) */}
      <g transform={`translate(${fly} 0)`} filter={p.glow("bullet")}>
        <path d="M 540 254 H 670 Q 790 272 806 340 Q 790 408 670 426 H 540 Z" fill={p.fill("bullet", copper)} stroke={p.stroke("bullet")} strokeWidth={p.width("bullet")} strokeLinejoin="round" />
        <path d="M 560 270 H 660 Q 760 290 770 340" fill="none" stroke="#e0a36b" strokeWidth={6} strokeLinecap="round" opacity={0.6} />
      </g>

      {/* case, cut away */}
      <g filter={p.glow("case")}>
        <path
          d="M 258 222 H 282 V 238 H 600 V 442 H 282 V 458 H 258 Z M 300 256 V 424 H 586 V 256 Z"
          fillRule="evenodd"
          fill={p.fill("case", theme.brass)}
          stroke={p.stroke("case")}
          strokeWidth={p.width("case")}
          strokeLinejoin="round"
        />
        <rect x={300} y={256} width={286} height={168} fill={mix("#1a1410", "#ff9a3a", 0.5 * burn)} />
      </g>
      {/* rim marker */}
      {p.on("rim") && <rect x={254} y={218} width={32} height={244} rx={6} fill="none" stroke={theme.accent} strokeWidth={5} opacity={glow} />}

      {/* powder */}
      <g filter={p.glow("powder")} opacity={1 - 0.8 * clamp01(stage - 3)}>
        {GRANULES.map((g, i) => (
          <rect key={i} x={g.x} y={g.y} width={g.s} height={g.s * 0.7} rx={2} fill={mix(p.fill("powder", "#4a4f57"), theme.accent, burn)} />
        ))}
      </g>
      {burn > 0 && <ellipse cx={440 + fly * 0.5} cy={340} rx={150 + fly * 0.4} ry={80} fill="url(#gas)" opacity={burn * (1 - clamp01(stage - 3.6))} />}

      {/* primer pocket, flash hole, primer */}
      <g filter={p.glow("primerPocket")}>
        <rect x={258} y={312} width={30} height={56} fill="none" stroke={p.on("primerPocket") ? theme.accent : theme.outline} strokeWidth={p.width("primerPocket")} />
      </g>
      <g filter={p.glow("flashHole")}>
        <rect x={286} y={334} width={16} height={12} fill={p.on("flashHole") ? theme.accent : "#1a1410"} />
      </g>
      <g filter={p.glow("primer")}>
        <rect x={260} y={316} width={24} height={48} rx={4} fill={p.fill("primer", "#c7c9cc")} stroke={p.stroke("primer")} strokeWidth={p.width("primer") - 1} />
        {stage >= 1 && <circle cx={262} cy={340} r={5} fill={theme.outline} />}
      </g>
      {flash > 0 && <circle cx={300} cy={340} r={20 + 50 * flash} fill="url(#gas)" opacity={flash} />}

      <Callouts items={callouts} opacity={glow} fontFamily={fontFamily} />
    </svg>
  );
};
