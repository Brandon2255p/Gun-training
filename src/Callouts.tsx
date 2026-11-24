import React from "react";
import { theme } from "./theme";

export interface Callout {
  label: string;
  /** Point on the drawing */
  ax: number;
  ay: number;
  /** Where the label sits */
  lx: number;
  ly: number;
}

/** Orange leader lines and pill labels, drawn inside a diagram's SVG. */
export const Callouts: React.FC<{ items: Callout[]; opacity: number; fontFamily?: string }> = ({ items, opacity, fontFamily }) => (
  <>
    {items.map((c, i) => {
      const w = c.label.length * 17 + 36;
      return (
        <g key={i} opacity={opacity}>
          <line x1={c.ax} y1={c.ay} x2={c.lx} y2={c.ly} stroke={theme.accent} strokeWidth={3} />
          <circle cx={c.ax} cy={c.ay} r={8} fill={theme.accent} stroke={theme.bg} strokeWidth={3} />
          <rect x={c.lx - w / 2} y={c.ly - 24} width={w} height={48} rx={24} fill={theme.accent} />
          <text x={c.lx} y={c.ly + 10} textAnchor="middle" fontSize={28} fontWeight={800} fill={theme.bg} fontFamily={fontFamily}>
            {c.label}
          </text>
        </g>
      );
    })}
  </>
);

/** Blends two #rrggbb colours. */
export function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

/** Colour helpers shared by the diagrams: highlighted parts go orange, the rest fade back. */
export function painter(highlight: string[], glow: number) {
  const any = highlight.length > 0 && glow > 0;
  const on = (p: string) => highlight.includes(p);
  return {
    on,
    fill: (p: string, base: string) => (on(p) ? mix(base, theme.accent, 0.55 * glow) : any ? mix(base, theme.bg, 0.5 * glow) : base),
    stroke: (p: string) => (on(p) ? theme.accent : theme.outline),
    width: (p: string) => (on(p) ? 6 : 4),
    glow: (p: string) => (on(p) ? "url(#glow)" : undefined),
  };
}

export const GlowFilter: React.FC = () => (
  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="8" result="b" />
    <feMerge>
      <feMergeNode in="b" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);
