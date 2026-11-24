import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { loadFont } from "@remotion/fonts";
import { Instructor } from "./Instructor";
import { Handgun } from "./Handgun";
import { Revolver } from "./Revolver";
import { Cartridge } from "./Cartridge";
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
  // If any line says which item it shows, only those lines reveal items; otherwise line i shows item i.
  const explicit = placed.lines.some((l) => l.show !== undefined);
  let n = 0;
  placed.lines.forEach((l, i) => {
    const item = explicit ? l.show : i;
    if (item !== undefined && frame >= l.from - 3) n = Math.max(n, item + 1);
  });
  return Math.min(total, n);
}

/** The frame at which item i first appears. */
function revealFrame(placed: PlacedScene, i: number): number {
  const explicit = placed.lines.some((l) => l.show !== undefined);
  const line = placed.lines.find((l, j) => (explicit ? (l.show ?? -1) >= i : j >= i));
  return line?.from ?? 0;
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
  // Long procedures (more than 7 steps) go in two columns so they fit above the captions.
  const twoCol = bullets.length > 7;
  const size = twoCol ? 30 : bullets.length > 5 ? 38 : 48;
  const start = placed.scene.startAt ?? 1;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 140, top: 140, width: twoCol ? 1240 : 1150 }}>
        <Heading text={placed.scene.heading} />
        <div
          style={
            twoCol
              ? { marginTop: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: `repeat(${Math.ceil(bullets.length / 2)}, auto)`, gridAutoFlow: "column", columnGap: 40, rowGap: 16 }
              : { marginTop: 50, display: "flex", flexDirection: "column", gap: bullets.length > 5 ? 18 : 28 }
          }
        >
          {bullets.slice(0, n).map((b, i) => {
            const at = revealFrame(placed, i);
            const p = spring({ frame: frame - at + 3, fps, config: { damping: 14, stiffness: 160 } });
            const current = i === n - 1;
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 26, fontFamily, fontSize: size, fontWeight: 700, lineHeight: 1.2, color: current ? theme.ink : theme.muted, ...rise(p, 40) }}>
                {placed.scene.numbered ? (
                  <div style={{ width: size + 8, height: size + 8, marginTop: 0, borderRadius: size, background: current ? theme.accent : theme.line, color: current ? theme.bg : theme.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.66, fontWeight: 800, flexShrink: 0 }}>{start + i}</div>
                ) : (
                  <div style={{ width: 22, height: 22, marginTop: 18, borderRadius: 6, background: current ? theme.accent : theme.line, flexShrink: 0 }} />
                )}
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

/** What the diagram is doing at `frame`, from the lines' highlight, action and stage cues. */
function diagramAt(placed: PlacedScene, frame: number, fps: number) {
  const st = placed.scene.start ?? {};
  let highlight: string[] = [];
  let hlFrom = 0;
  let slideBack = st.slideBack ?? 0;
  let magOut = st.magOut ?? 0;
  let open = st.open ?? 0;
  let eject = st.eject ?? 0;
  // A pistol's hammer is drawn cocked unless the scene says otherwise; a revolver's starts down.
  let hammerBack = st.hammerBack ?? ((placed.scene.subject ?? "pistol") === "pistol" ? 1 : 0);
  let stage = 0;
  let prevStage = 0;
  let stageFrom = -1;
  const ease = (k: number, len: number) => Easing.inOut(Easing.cubic)(Math.min(1, Math.max(0, k / len)));
  const toward = (v: number, target: number, k: number, len: number) => v + (target - v) * ease(k, len);
  for (const l of placed.lines) {
    if (frame < l.from - 6) break;
    if (l.highlight) {
      highlight = l.highlight;
      hlFrom = l.from - 6;
    }
    const k = frame - l.from;
    if (k < 0) continue;
    if (l.stage !== undefined) {
      prevStage = stage;
      stage = l.stage;
      stageFrom = l.from;
    }
    for (const action of ([] as string[]).concat(l.action ?? [])) switch (action) {
      case "rack":
        slideBack = k < 9 ? ease(k, 9) : k < 18 ? 1 : 1 - ease(k - 18, 7);
        hammerBack = toward(hammerBack, 1, k, 6);
        break;
      case "outOfBattery":
        slideBack = toward(slideBack, 0.18, k, 10);
        break;
      case "slideBack":
        slideBack = toward(slideBack, 1, k, 10);
        hammerBack = toward(hammerBack, 1, k, 6);
        break;
      case "slideForward":
        slideBack = toward(slideBack, 0, k, 8);
        break;
      case "magOut":
        magOut = toward(magOut, 1, k, 20);
        break;
      case "magIn":
        magOut = toward(magOut, 0, k, 16);
        break;
      case "open":
        open = toward(open, 1, k, 18);
        break;
      case "close":
        open = toward(open, 0, k, 14);
        break;
      case "eject":
        eject = toward(eject, 1, k, 14);
        break;
      case "load":
        eject = toward(eject, 0, k, 24);
        break;
      case "cock":
        hammerBack = toward(hammerBack, 1, k, 10);
        break;
      case "decock":
        hammerBack = toward(hammerBack, 0, k, 14);
        break;
    }
  }
  // Stages play out over about a second each, so a jump from 0 to 4 runs the whole sequence.
  if (stageFrom >= 0) {
    const steps = Math.abs(stage - prevStage);
    stage = prevStage + (stage - prevStage) * ease(frame - stageFrom, Math.max(12, steps * 22));
  }
  const glow = spring({ frame: frame - hlFrom, fps, config: { damping: 20 } });
  return { highlight, glow, slideBack, magOut, open, eject, hammerBack, stage };
}

const DiagramScene: React.FC<{ placed: PlacedScene }> = ({ placed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: { damping: 15, stiffness: 90 } });
  const d = diagramAt(placed, frame, fps);
  const s = placed.scene;
  const names = s.names ?? {};
  const subject = s.subject ?? "pistol";
  const drawing =
    subject === "revolver" ? (
      <Revolver state={{ ...d, loaded: s.loaded !== false }} width={940} fontFamily={fontFamily} names={names} />
    ) : subject === "cartridge" ? (
      <Cartridge state={{ ...d, inBarrel: !!s.inBarrel }} width={940} fontFamily={fontFamily} names={names} />
    ) : (
      <Handgun state={{ ...d, showSafety: s.showSafety, showHammer: s.showHammer, loaded: s.loaded, hammerBack: d.hammerBack }} width={940} fontFamily={fontFamily} names={names} />
    );
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 140, top: 110 }}>
        <Heading text={s.heading} size={60} />
      </div>
      <div style={{ position: "absolute", left: 150, top: 170, transform: `translateX(${(1 - enter) * -300}px)`, opacity: enter }}>{drawing}</div>
      <Presenter placed={placed} size={380} point lookX={-1} lookY={-0.2} right={40} seed={3} />
    </AbsoluteFill>
  );
};

/** A photo or drawing from the book, cropped by prepare.py, with an optional caption. */
const FigureScene: React.FC<{ placed: PlacedScene }> = ({ placed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = placed.scene;
  const enter = spring({ frame: frame - 4, fps, config: { damping: 15, stiffness: 100 } });
  const zoom = interpolate(frame, [0, placed.frames], [1, 1.05]);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 140, top: 110 }}>
        <Heading text={s.heading} size={60} />
      </div>
      <div style={{ position: "absolute", left: 140, top: 250, width: 1180, height: 640, display: "flex", alignItems: "center", justifyContent: "center", opacity: enter, transform: `scale(${0.94 + 0.06 * enter})` }}>
        {s.figureFile && (
          <div style={{ background: "#fff", padding: 14, borderRadius: 18, boxShadow: "0 30px 80px rgba(0,0,0,0.5)", maxWidth: 1180, maxHeight: 640, overflow: "hidden" }}>
            <Img src={staticFile(s.figureFile)} style={{ maxWidth: 1152, maxHeight: 612, display: "block", transform: `scale(${zoom})` }} />
          </div>
        )}
      </div>
      {s.caption && <div style={{ position: "absolute", left: 140, top: 900, width: 1180, textAlign: "center", fontFamily, fontSize: 30, fontWeight: 600, color: theme.muted }}>{s.caption}</div>}
      <Presenter placed={placed} size={380} point lookX={-1} lookY={-0.1} right={40} seed={8} />
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
        <Card label={r.label ?? (r.number ? `Rule ${r.number}` : "Rule")}>
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
            const at = revealFrame(placed, i);
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
      case "figure":
        return <FigureScene placed={placed} />;
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
