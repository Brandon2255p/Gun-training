# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Turns the study books in source/ into text, one file per page, so episode scripts can cite pages.

- source/<book>.pdf      → source/text/<book>/p001.txt ... and source/text/<book>/all.txt (with page markers)
- Pages with almost no text (scans, diagrams) are also saved as images, p001.png, to read by eye.

Needs poppler (pdftotext, pdftoppm). Usage: uv run --script scripts/extract.py
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source"
OUT = SRC / "text"
SCANNED = 80  # characters: fewer than this and the page is treated as an image


def pages(pdf: Path) -> int:
    info = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True).stdout
    return int(next(l.split()[-1] for l in info.splitlines() if l.startswith("Pages:")))


def main() -> None:
    pdfs = sorted(SRC.glob("*.pdf"))
    if not pdfs:
        sys.exit("Put the study books in source/ as PDFs first.")
    for pdf in pdfs:
        dest = OUT / pdf.stem
        dest.mkdir(parents=True, exist_ok=True)
        n = pages(pdf)
        combined, images = [], 0
        for i in range(1, n + 1):
            text = subprocess.run(
                ["pdftotext", "-layout", "-f", str(i), "-l", str(i), str(pdf), "-"], capture_output=True, text=True
            ).stdout
            (dest / f"p{i:03d}.txt").write_text(text)
            combined.append(f"\n===== {pdf.stem} — page {i} =====\n{text}")
            if len(text.strip()) < SCANNED:
                subprocess.run(["pdftoppm", "-png", "-r", "110", "-f", str(i), "-l", str(i), "-singlefile", str(pdf), str(dest / f"p{i:03d}")], check=True)
                images += 1
        (dest / "all.txt").write_text("".join(combined))
        print(f"{pdf.name}: {n} pages → {dest.relative_to(ROOT)} ({images} saved as images)")


if __name__ == "__main__":
    main()
