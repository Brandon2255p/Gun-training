# Handgun Proficiency — study video series

An animated, narrated video series made from the two study books (handling and legal), generated entirely on
this machine. Each episode teaches one topic, with an instructor character, an animated pistol, captions that
light up word by word, and a quiz at the end.

## Tools

| Job | Tool | Licence |
| --- | --- | --- |
| Scenes and rendering | [Remotion](https://www.remotion.dev) (React → MP4, rendered in Node) | Free for individuals and companies of up to 3 people |
| Voice | [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), [timestamped ONNX export](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX-timestamped), via [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) — runs on the CPU | Apache-2.0 / MIT |
| Narration check | [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (`base.en`) | MIT |
| Music | Synthesised by `scripts/prepare.py` | Ours |
| Font | Inter, bundled in `public/fonts` | OFL |

Kokoro reports how long it spends on every phoneme, so the instructor's mouth and the captions follow the voice
exactly — no separate syncing step. Whisper then listens back to every line and flags any that don't match the
script, since this is legal and safety material.

## Use

You need Node with pnpm, [uv](https://docs.astral.sh/uv/), ffmpeg and poppler (`pdftotext`).

```bash
pnpm install
pnpm setup                 # once: downloads the Kokoro model (~90 MB) into .cache/
pnpm extract               # source/*.pdf → source/text/<book>/p001.txt … (to write scripts from)
pnpm prepare-assets        # voices every episode in episodes/ (only changed lines are re-voiced)
pnpm check                 # Whisper listens back and flags lines that don't match the script
pnpm render                # every episode → out/<id>.mp4 (1920×1080)
pnpm render ep01           # just one
pnpm render --stills ep01  # a PNG per scene, to check layouts quickly
pnpm studio                # preview and scrub through episodes in the browser
```

## Writing an episode

Each file in `episodes/` is one episode. Scenes play in order; every scene has `lines` (narration, one sentence
each). A line is a string, or an object that also cues the visuals as it starts:

```jsonc
{ "text": "The slide moves back and forward.", "highlight": ["slide"], "action": "rack" }
```

| Scene `type` | Fields | Shows |
| --- | --- | --- |
| `title` | — | Episode number, title, subtitle; the instructor waves |
| `talk` | `heading`, `bullets` | Bullets appear one per line (or set `show` on a line) |
| `diagram` | `heading` | The pistol; lines set `highlight` (parts) and `action` |
| `rule` | `rule: { number, text }` | A big rule card |
| `term` | `term`, `definition` | A key-term card |
| `quiz` | `question`, `options`, `answer` (0-based), `reveal` (lines) | A 5-second "pause and think" countdown, then the answer |
| `recap` | `points` | Points tick in one per line |

Every scene can have `source` (e.g. `"Handling book, p. 14"`), shown on screen so each fact can be checked.

Pistol parts: `slide`, `frame`, `barrel`, `muzzle`, `chamber`, `ejectionPort`, `frontSight`, `rearSight`,
`trigger`, `triggerGuard`, `grip`, `magazine`, `magRelease`, `slideStop`, `safety`.
Actions: `rack`, `slideBack`, `slideForward`, `magOut`, `magIn`.

**Pronunciation:** if Kokoro says a word wrong, add it to `pronunciation.json` (applies everywhere), or give one
line a `say` field with the spoken version (the caption still shows `text`).

## Voice and backends

`series.json` sets the voice (`bm_george`; others in the
[voice list](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)) and speed.

`"backend": "openai"` sends lines to an OpenAI-compatible speech server instead (e.g. the Unsloth server on the
tailnet — only reachable from a machine on it). The key comes from the `UNSLOTH_API_KEY` environment variable,
never a file. That server returns audio only, so Whisper times the words and sync is a little looser.
