import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { loadFont } from "@remotion/fonts";
import { Instructor } from "./Instructor";
import { Handgun, type GunState } from "./Handgun";
import { poseAt } from "./animation";
import { theme } from "./theme";
import { currentLine, FADE, layout, THINK_SECONDS, type PlacedLine, type PlacedScene } from "./timeline";
import type { Episode as EpisodeData } from "./types";

// Inter, bundled in public/fonts so rendering needs no network
const fontFamily = "Inter";
for (const weight of ["500", "700", "800"]) {
  loadFont({ family: fontFamily, url: staticFile(`fonts/inter-latin-${weight}-normal.woff2`), weight });
}

export type EpisodeProps = { episode: EpisodeData; series: string };

const pad2 = (n: number) => String(n).padStart(2, "0");
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

function usePop(delay: number, damping = 14) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 150 } });
}

const rise = (p: number, px = 30): React.CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * px}px)` });

/* ---------- shared pieces ---------- */

const Voices: React.FC<{ lines: PlacedLine[] }> = ({ lines }) => (
  <>
    {lines.map((l) => (
      <Sequence key={l.id} from={l.from} layout="none">
        <Audio src={staticFile(`generated/voice/${l.id}.wav`)} />
      </Sequence>
    ))}
  </>
);

/** The line being said, each word lighting up as it's spoken. */
const Captions: React.FC<{ lines: PlacedLine[] }> = ({ lines }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line = currentLine(lines, frame);
  if (!line) return null;
  const end = line.from + line.frames + 10;
  const opacity = interpolate(frame, [line.from - 4, line.from, end, end + 6], [0, 1, 1, 0], clamp);
  const words = line.text.split(" ");
  return (
    <div style={{ position: "absolute", left: 120, bottom: 46, width: 1180, opacity }}>
      <div style={{ display: "inline-block", background: "rgba(10,12,16,0.82)", borderRadius: 18, padding: "18px 30px", fontFamily, fontSize: 40, fontWeight: 700, lineHeight: 1.3 }}>
        {words.map((w, i) => {
          const at = line.from + (line.words[i]?.start ?? (i / words.length) * line.duration) * fps - 2;
          const said = frame >= at;
          return (
            <span key={i} style={{ color: said ? theme.ink : theme.muted, opacity: said ? 1 : 0.55 }}>
              {w}{" "}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const Chrome: React.FC<{ episode: EpisodeData; source?: string }> = ({ episode, source }) => (
  <>
    <div style={{ position: "absolute", left: 120, top: 46, fontFamily, fontSize: 26, fontWeight: 700, color: theme.muted, letterSpacing: 2, textTransform: "uppercase" }}>
      <span style={{ color: theme.accent }}>EP {pad2(episode.number)}</span> · {episode.title}
    </div>
    {source && (
      <div style={{ position: "absolute", right: 60, top: 42, fontFamily, fontSize: 24, fontWeight: 600, color: theme.muted, background: theme.panel, padding: "8px 18px", borderRadius: 999, border: `2px solid ${theme.line}` }}>
        📖 {source}
      </div>
    )}
  </>
);

const Backdrop: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at 70% 30%, ${theme.bg2} 0%, ${theme.bg} 70%)` }}>
    {/* range lane lines */}
    <svg width={1920} height={1080} style={{ position: "absolute", opacity: 0.18 }}>
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={960 + (i - 4) * 90} y1={0} x2={960 + (i - 4) * 520} y2={1080} stroke={theme.line} strokeWidth={2} />
      ))}
    </svg>
  </AbsoluteFill>
);

const Presenter: React.FC<{ placed: PlacedScene; size?: number; wave?: boolean; point?: boolean; lookX?: number; lookY?: number; right?: number; seed?: number }> = ({
  placed,
  size = 500,
  wave,
  point,
  lookX = -0.4,
  lookY = 0,
  right = 70,
  seed = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 13, stiffness: 110 } });
  const pose = poseAt({ frame, fps, lines: [...placed.lines, ...placed.reveal], wave, point, lookX, lookY, seed });
  return (
    <div style={{ position: "absolute", right, bottom: -size * 0.12, transform: `translateY(${(1 - enter) * 500}px)` }}>
      <Instructor pose={pose} size={size} />
    </div>
  );
};

/** Which item (bullet/point) should be visible: each line shows `show`, or its own index. */
function shownCount(placed: PlacedScene, frame: number, total: number): number {
  let n = 0;
  placed.lines.forEach((l, i) => {
    if (frame >= l.from - 3) n = Math.max(n, (l.show ?? i) + 1);
  });
  return Math.min(total, n);
}

const Heading: React.FC<{ text?: string; size?: number }> = ({ text, size = 72 }) => {
  const p = usePop(2);
  if (!text) return null;
  return (
    <div style={{ fontFamily, fontSize: size, fontWeight: 800, color: theme.ink, letterSpacing: -1.5, ...rise(p) }}>
      {text}
      <div style={{ width: 120 * p, height: 8, background: theme.accent, borderRadius: 4, marginTop: 14 }} />
    </div>
  );
};

/* ---------- scenes ---------- */

const TitleScene: React.FC<{ placed: PlacedScene; episode: EpisodeData; series: string }> = ({ placed, episode, series }) => {
  const a = usePop(0), b = usePop(6), c = usePop(12), d = usePop(18);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 140, top: 250, width: 1100, fontFamily }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: theme.accent, letterSpacing: 8, textTransform: "uppercase", ...rise(a) }}>{series}</div>
        <div style={{ fontSize: 44, fontWeight: 700, color: theme.muted, marginTop: 30, ...rise(b) }}>Episode {episode.number}</div>
        <div style={{ fontSize: 116, fontWeight: 800, color: theme.ink, lineHeight: 1.02, letterSpacing: -3, marginTop: 10, ...rise(c) }}>{episode.title}</div>
        {episode.subtitle && <div style={{ fontSize: 46, fontWeight: 500, color: theme.muted, marginTop: 28, ...rise(d) }}>{episode.subtitle}</div>}
      </div>
      <Presenter placed={placed} size={560} wave lookX={-0.3} seed={1} />
    </AbsoluteFill>
  );
};

const TalkScene: React.FC<{ placed: PlacedScene }> = ({ placed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bullets = placed.scene.bullets ?? [];
  const n = shownCount(placed, frame, bullets.length);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 140, top: 140, width: 1150 }}>
        <Heading text={placed.scene.heading} />
        <div style={{ marginTop: 60, display: "flex", flexDirection: "column", gap: 30 }}>
          {bullets.slice(0, n).map((b, i) => {
            const at = placed.lines.find((l, j) => (l.show ?? j) === i)?.from ?? 0;
            const p = spring({ frame: frame - at + 3, fps, config: { damping: 14, stiffness: 160 } });
            const current = i === n - 1;
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 26, fontFamily, fontSize: 50, fontWeight: 700, color: current ? theme.ink : theme.muted, ...rise(p, 40) }}>
                <div style={{ width: 22, height: 22, marginTop: 18, borderRadius: 6, background: current ? theme.accent : theme.line, flexShrink: 0 }} />
                <div>{b}</div>
              </div>
            );
          })}
        </div>
      </div>
      <Presenter placed={placed} size={500} lookX={-0.5} seed={2} />
    </AbsoluteFill>
  );
};

/** What the pistol is doing at `frame`, from the lines' highlight and action cues. */
function gunAt(placed: PlacedScene, frame: number, fps: number): GunState {
  let highlight: string[] = [];
  let hlFrom = 0;
  let slideBack = 0;
  let magOut = 0;
  const ease = (k: number, len: number) => Easing.inOut(Easing.cubic)(Math.min(1, Math.max(0, k / len)));
  for (const l of placed.lines) {
    if (frame < l.from - 6) break;
    if (l.highlight) {
      highlight = l.highlight;
      hlFrom = l.from - 6;
    }
    const k = frame - l.from;
    if (k < 0) continue;
    switch (l.action) {
      case "rack":
        slideBack = k < 9 ? ease(k, 9) : k < 18 ? 1 : 1 - ease(k - 18, 7);
        break;
      case "slideBack":
        slideBack = slideBack + (1 - slideBack) * ease(k, 10);
        break;
      case "slideForward":
        slideBack = slideBack * (1 - ease(k, 8));
        break;
      case "magOut":
        magOut = magOut + (1 - magOut) * ease(k, 20);
        break;
      case "magIn":
        magOut = magOut * (1 - ease(k, 16));
        break;
    }
  }
  const glow = spring({ frame: frame - hlFrom, fps, config: { damping: 20 } });
  return { highlight, glow, slideBack, magOut };
}

const DiagramScene: React.FC<{ placed: PlacedScene }> = ({ placed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: { damping: 15, stiffness: 90 } });
  const state = gunAt(placed, frame, fps);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 140, top: 110 }}>
        <Heading text={placed.scene.heading} size={60} />
      </div>
      <div style={{ position: "absolute", left: 150, top: 170, transform: `translateX(${(1 - enter) * -300}px)`, opacity: enter }}>
        <Handgun state={state} width={940} fontFamily={fontFamily} />
      </div>
      <Presenter placed={placed} size={380} point lookX={-1} lookY={-0.2} right={40} seed={3} />
    </AbsoluteFill>
  );
};

const Card: React.FC<{ label: string; children: React.ReactNode; accent?: string }> = ({ label, children, accent = theme.accent }) => {
  const p = usePop(4, 13);
  return (
    <div style={{ background: theme.panel, border: `3px solid ${theme.line}`, borderLeft: `14px solid ${accent}`, borderRadius: 28, padding: "48px 56px", transform: `scale(${0.92 + 0.08 * p})`, opacity: p, fontFamily }}>
      <div style={{ fontSize: 30, fontWeight: 800, color: accent, letterSpacing: 5, textTransform: "uppercase", marginBottom: 22 }}>{label}</div>
      {children}
    </div>
  );
};

const RuleScene: React.FC<{ placed: PlacedScene }> = ({ placed }) => {
  const r = placed.scene.rule!;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 140, top: 220, width: 1150 }}>
        <Card label={r.number ? `Rule ${r.number}` : "Rule"}>
          <div style={{ fontSize: 66, fontWeight: 800, color: theme.ink, lineHeight: 1.15, letterSpacing: -1 }}>{r.text}</div>
        </Card>
      </div>
      <Presenter placed={placed} size={500} lookX={-0.6} seed={4} />
    </AbsoluteFill>
  );
};

const TermScene: React.FC<{ placed: PlacedScene }> = ({ placed }) => {
  const d = usePop(16);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 140, top: 220, width: 1150 }}>
        <Card label="Key term">
          <div style={{ fontSize: 96, fontWeight: 800, color: theme.accentSoft, letterSpacing: -2 }}>{placed.scene.term}</div>
          <div style={{ fontSize: 46, fontWeight: 600, color: theme.ink, lineHeight: 1.3, marginTop: 24, ...rise(d) }}>{placed.scene.definition}</div>
        </Card>
      </div>
      <Presenter placed={placed} size={500} lookX={-0.6} seed={5} />
    </AbsoluteFill>
  );
};

const QuizScene: React.FC<{ placed: PlacedScene }> = ({ placed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = placed.scene;
  const q = usePop(2);
  const revealed = frame >= placed.revealFrom;
  const thinking = frame >= placed.thinkFrom && !revealed;
  const left = Math.ceil((placed.revealFrom - frame) / fps);
  const ring = interpolate(frame, [placed.thinkFrom, placed.revealFrom], [1, 0], clamp);
  const reveal = spring({ frame: frame - placed.revealFrom, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 140, top: 130, width: 1180, fontFamily }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: theme.accent, letterSpacing: 6, textTransform: "uppercase", ...rise(q) }}>Question</div>
        <div style={{ fontSize: 64, fontWeight: 800, color: theme.ink, lineHeight: 1.15, marginTop: 18, letterSpacing: -1, ...rise(q) }}>{s.question}</div>
        <div style={{ marginTop: 50, display: "flex", flexDirection: "column", gap: 22 }}>
          {(s.options ?? []).map((o, i) => {
            const p = spring({ frame: frame - 14 - i * 5, fps, config: { damping: 14 } });
            const right = i === s.answer;
            const border = revealed && right ? theme.good : theme.line;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 26,
                  background: revealed && right ? "rgba(63,191,127,0.14)" : theme.panel,
                  border: `3px solid ${border}`,
                  borderRadius: 22,
                  padding: "22px 30px",
                  fontSize: 44,
                  fontWeight: 700,
                  color: theme.ink,
                  opacity: p * (revealed && !right ? 1 - 0.6 * reveal : 1),
                  transform: `translateX(${(1 - p) * -60}px) scale(${revealed && right ? 1 + 0.03 * reveal : 1})`,
                }}
              >
                <div style={{ width: 62, height: 62, borderRadius: 31, background: revealed && right ? theme.good : theme.line, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 800, flexShrink: 0 }}>
                  {revealed && right ? "✓" : String.fromCharCode(65 + i)}
                </div>
                {o}
              </div>
            );
          })}
        </div>
      </div>
      {thinking && (
        <div style={{ position: "absolute", right: 120, top: 120, fontFamily, textAlign: "center" }}>
          <svg width={180} height={180}>
            <circle cx={90} cy={90} r={76} stroke={theme.line} strokeWidth={14} fill="none" />
            <circle cx={90} cy={90} r={76} stroke={theme.accent} strokeWidth={14} fill="none" strokeDasharray={2 * Math.PI * 76} strokeDashoffset={2 * Math.PI * 76 * (1 - ring)} strokeLinecap="round" transform="rotate(-90 90 90)" />
            <text x={90} y={110} textAnchor="middle" fontSize={64} fontWeight={800} fill={theme.ink} fontFamily={fontFamily}>{Math.min(THINK_SECONDS, left)}</text>
          </svg>
          <div style={{ fontSize: 30, fontWeight: 700, color: theme.muted, marginTop: 8 }}>Pause and think</div>
        </div>
      )}
      <Presenter placed={placed} size={440} lookX={-0.7} lookY={0.1} seed={6} />
    </AbsoluteFill>
  );
};

const RecapScene: React.FC<{ placed: PlacedScene }> = ({ placed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const points = placed.scene.points ?? [];
  const n = shownCount(placed, frame, points.length);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 140, top: 140, width: 1150 }}>
        <Heading text={placed.scene.heading ?? "Recap"} />
        <div style={{ marginTop: 60, display: "flex", flexDirection: "column", gap: 30 }}>
          {points.slice(0, n).map((pt, i) => {
            const at = placed.lines.find((l, j) => (l.show ?? j) === i)?.from ?? 0;
            const p = spring({ frame: frame - at + 3, fps, config: { damping: 12, stiffness: 170 } });
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 26, fontFamily, fontSize: 50, fontWeight: 700, color: theme.ink, ...rise(p, 40) }}>
                <div style={{ width: 58, height: 58, borderRadius: 29, background: theme.good, color: theme.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800, flexShrink: 0, transform: `scale(${p})` }}>✓</div>
                {pt}
              </div>
            );
          })}
        </div>
      </div>
      <Presenter placed={placed} size={500} lookX={-0.4} seed={7} wave={false} />
    </AbsoluteFill>
  );
};

const SceneView: React.FC<{ placed: PlacedScene; episode: EpisodeData; series: string }> = ({ placed, episode, series }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, FADE, placed.frames - FADE, placed.frames], [0, 1, 1, 0], clamp);
  const all = [...placed.lines, ...placed.reveal];
  const body = (() => {
    switch (placed.scene.type) {
      case "title":
        return <TitleScene placed={placed} episode={episode} series={series} />;
      case "talk":
        return <TalkScene placed={placed} />;
      case "diagram":
        return <DiagramScene placed={placed} />;
      case "rule":
        return <RuleScene placed={placed} />;
      case "term":
        return <TermScene placed={placed} />;
      case "quiz":
        return <QuizScene placed={placed} />;
      case "recap":
        return <RecapScene placed={placed} />;
    }
  })();
  return (
    <AbsoluteFill style={{ opacity }}>
      <Voices lines={all} />
      {body}
      {placed.scene.type !== "title" && <Chrome episode={episode} source={placed.scene.source} />}
      <Captions lines={all} />
    </AbsoluteFill>
  );
};

export const Episode: React.FC<EpisodeProps> = ({ episode, series }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const { scenes } = layout(episode, fps);
  const voiced = scenes.flatMap((s) => [...s.lines, ...s.reveal].map((l) => [s.from + l.from, s.from + l.from + l.frames] as const));
  const musicVolume = (f: number) => {
    const speaking = voiced.some(([a, b]) => f >= a - 6 && f <= b + 6);
    const fade = interpolate(f, [0, 20, durationInFrames - 40, durationInFrames], [0, 1, 1, 0], clamp);
    return (speaking ? 0.05 : 0.14) * fade;
  };
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <Backdrop />
      <Audio src={staticFile("generated/music.wav")} volume={musicVolume} loop />
      {scenes.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.frames}>
          <SceneView placed={s} episode={episode} series={series} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
