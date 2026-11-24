/** Everything on screen must end above this y, so the caption box (bottom-left) never covers it. */
export const CONTENT_BOTTOM = 830;

/** Roughly how many lines `text` wraps to at `font` px in a box `width` px wide (Inter, bold). */
export function wrappedLines(text: string, font: number, width: number): number {
  const perLine = Math.max(8, Math.floor(width / (font * 0.53)));
  let lines = 1;
  let used = 0;
  for (const word of text.split(" ")) {
    const w = word.length + (used ? 1 : 0);
    if (used + w > perLine && used > 0) {
      lines++;
      used = word.length;
    } else used += w;
  }
  return lines;
}

/** The largest font (between min and max) at which the items stack into `height`. */
export function fitList(items: string[], width: number, height: number, gapFor: (font: number) => number, max = 48, min = 24, lineHeight = 1.22): number {
  for (let font = max; font > min; font -= 2) {
    const h = items.reduce((sum, t) => sum + wrappedLines(t, font, width) * font * lineHeight, 0) + gapFor(font) * Math.max(0, items.length - 1);
    if (h <= height) return font;
  }
  return min;
}

/** The largest font at which one block of text fits in width × height. */
export function fitText(text: string, width: number, height: number, max: number, min = 24, lineHeight = 1.2): number {
  for (let font = max; font > min; font -= 2) {
    if (wrappedLines(text, font, width) * font * lineHeight <= height) return font;
  }
  return min;
}
