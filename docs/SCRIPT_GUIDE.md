# How to write an episode script

Episodes are JSON files in `episodes/` (see `episodes/ep00-welcome.json` for a working example and `README.md`
"Writing an episode" for every field). This guide is the house style. The rules in `CLAUDE.md` always apply.

## Source of truth

- The only source is the handgun manual: transcriptions in `source/text/handgun/sNNN.txt`, page images in
  `source/pages/sNNN.jpg`, index in `source/text/handgun/INDEX.md`. If a transcription line looks odd, check the image.
- Every fact must be traceable to a printed page. Set `"source": "Handgun manual, p. 14"` (or `pp. 14–15`) on every
  scene that states a fact. Use the **printed** page number from the transcription header, not the scan number.
- No facts from memory, other books or the internet — even "common knowledge" about firearms. If the book doesn't
  say it, the episode doesn't say it. Linking words and teaching phrasing ("Let's look at…", "Remember…") are fine.
- Legal content: keep the book's wording for requirements, tests and answers (e.g. "the attack must be unlawful").
  Don't soften, strengthen or generalise. Scenario answers must match the book's answer and its stated reason.
- Lists (rules, steps, conditions) must be complete and in the book's order, with the book's numbering. If a list is
  too long for one scene, split it across consecutive scenes — don't drop items.
- Where pages disagree (the transcribers flagged some), follow the content page over a form, and say nothing that
  depends on the contradiction.

## Shape of an episode

- 3–6 minutes: roughly 35–70 narration lines in total. One topic.
- Start with a `title` scene (two lines: what this episode covers, why it matters per the book).
- Teach with `talk`, `diagram`, `figure`, `rule`, `term` scenes. Mix them; avoid more than two `talk` scenes in a row.
- End with one or two `quiz` scenes, then a `recap`. Prefer quiz questions based on the book's formative exam
  (`s079`–`s089`, printed pp. 71–81) that fit the episode; the answer must come from the content pages.
- Quiz `options`: 3 short options, exactly one correct per the book; `answer` is its 0-based index; `reveal` lines
  state the answer and the reason, citing the book's wording.

## Lines (narration)

- One sentence per line, spoken style, ideally 6–20 words. They're read by a text-to-speech voice and shown as captions.
- Write for the ear: spell out units and symbols ("7 metres", "9 millimetre", "percent"), no brackets, no "e.g.",
  no "i.e.", no slashes, no abbreviations except ones the book uses and that are said as letters (SAPS, PFTC).
- Bullets / points / rule text / definitions are on-screen text: short (under ~60 characters for bullets), matching
  the book's terms.
- In `talk` and `recap`, bullet *i* appears with line *i* by default. If the scene needs more lines than bullets,
  put `"show": n` (0-based bullet index) on the lines that reveal a bullet; once any line in a scene has `show`,
  lines without it reveal nothing new.
- `rule` cards are labelled "Rule N"; set `rule.label` (e.g. "Principle", "Remember") when the book doesn't call it a rule.
- `numbered: true` on a `talk` scene shows the bullets as numbered steps (use for procedures).

## Visuals

- `diagram` with `subject`: `"pistol"` (default), `"revolver"` or `"cartridge"`. Lines can carry `highlight`
  (list of part ids; sticky until the next line that sets it; `[]` clears) and `action` / `stage`.
  - Pistol parts: slide, frame, barrel, muzzle, chamber, ejectionPort, frontSight, rearSight, trigger, triggerGuard,
    grip, magazine, magRelease, slideStop, safety (needs `"showSafety": true`), hammer (needs `"showHammer": true`).
    Actions: rack, slideBack, slideForward, magOut, magIn. `"loaded": false` shows an empty magazine.
  - Revolver parts: barrel, muzzle, frontSight, rearSight, frame, cylinder, chambers, cylinderRelease, ejectorRod,
    hammer, trigger, triggerGuard, grip, crane. Actions: open, close (cylinder), eject, load, cock, decock.
    `"loaded": false` shows empty chambers.
  - Cartridge parts: bullet, case, powder, primer, primerPocket, flashHole, rim, firingPin, barrel. Lines set
    `"stage"`: 0 assembled, 1 firing pin strikes primer, 2 primer flash through flash hole, 3 powder burns / gas,
    4 bullet leaves the case down the barrel. `"inBarrel": true` draws the chamber and barrel.
  - `names` overrides a label to match the book, e.g. `{"magRelease": "Magazine catch"}`. Use the book's part names.
  - Only label a part with a name the book uses for it. If the book's diagram names a part the drawing doesn't have,
    use a `figure` scene instead.
- `figure`: shows a crop of a scanned page — for photos the drawings can't show (stances, grips, sight pictures,
  procedure photos). `"figure": {"page": "s029.jpg", "crop": [x, y, w, h]}` with fractions of the image (0–1);
  add `"rotate": 180` for pages scanned upside down (s026, s027). Open the image to choose the crop; crop tightly to
  the photos (and their captions), not text paragraphs. Add a short `caption` naming what's shown.
- Pages scanned upside down (s026, s027) or in halves are listed in INDEX.md.
