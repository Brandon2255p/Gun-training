// Renders episodes to out/<id>.mp4 (1920x1080, 30fps).
// Usage: pnpm render              every episode
//        pnpm render ep01 ep02    just those
//        pnpm render --stills ep01  a PNG of every scene at the end of its last line (its fullest moment), to check layouts quickly
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, mkdir } from "node:fs/promises";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const stills = args.includes("--stills");
const only = args.filter((a) => !a.startsWith("--"));
const data = JSON.parse(await readFile(path.join(root, "src/generated/episodes.json"), "utf8"));
const ids = data.episodes.map((e) => e.id).filter((id) => only.length === 0 || only.includes(id));

const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
await mkdir(path.join(root, "out"), { recursive: true });
for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id });
  if (stills) {
    const { layout } = await import("../src/timeline.ts").catch(() => ({ layout: null }));
    const frames = layout
      ? layout(data.episodes.find((e) => e.id === id), composition.fps).scenes.map((s) => { const all = [...s.lines, ...s.reveal]; const last = all[all.length - 1]; return s.from + (last ? last.from + last.frames - 3 : Math.floor(s.frames * 0.7)); })
      : [0, Math.floor(composition.durationInFrames / 2)];
    for (const [i, frame] of frames.entries()) {
      const output = path.join(root, "out", `${id}-scene${String(i).padStart(2, "0")}.png`);
      await renderStill({ composition, serveUrl, frame, output });
      console.log(output);
    }
    continue;
  }
  const outputLocation = path.join(root, "out", `${id}.mp4`);
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation,
    concurrency: Number(process.env.RENDER_CONCURRENCY) || (await import("node:os")).availableParallelism(),
    onProgress: ({ progress }) => process.stdout.write(`\r${id}: ${Math.round(progress * 100)}%`),
  });
  console.log(`\n${outputLocation} (${(composition.durationInFrames / composition.fps / 60).toFixed(1)} min)`);
}
