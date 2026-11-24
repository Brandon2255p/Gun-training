"""Checks episode scripts for structural mistakes before voicing.

Usage: python3 scripts/lint.py [episode files...]   (default: episodes/*.json)
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PARTS = {
    "pistol": "slide frame barrel muzzle chamber ejectionPort frontSight rearSight trigger triggerGuard grip magazine magRelease slideStop safety hammer",
    "revolver": "barrel muzzle frontSight rearSight frame cylinder chambers cylinderRelease ejectorRod hammer trigger triggerGuard grip crane",
    "cartridge": "bullet case powder primer primerPocket flashHole rim firingPin barrel",
}
ACTIONS = {
    "pistol": "rack slideBack slideForward magOut magIn",
    "revolver": "open close eject load cock decock",
    "cartridge": "",
}
TYPES = "title talk diagram figure rule term quiz recap".split()
SPOKEN_BAD = re.compile(r"[()\[\]/&%#@*_<>]|\be\.g\.|\bi\.e\.|\betc\b")


def text(line) -> str:
    return line if isinstance(line, str) else line.get("text", "")


def lint(path: Path) -> list[str]:
    errs: list[str] = []
    ep = json.loads(path.read_text())
    for k in ("id", "number", "title", "scenes"):
        if k not in ep:
            errs.append(f"missing episode field {k}")
    total_lines = 0
    words = 0
    types = []
    for si, s in enumerate(ep.get("scenes", [])):
        where = f"scene {si} ({s.get('type')})"
        t = s.get("type")
        types.append(t)
        if t not in TYPES:
            errs.append(f"{where}: unknown type")
        lines = s.get("lines", []) + s.get("reveal", [])
        if not s.get("lines"):
            errs.append(f"{where}: no lines")
        total_lines += len(lines)
        for li, l in enumerate(lines):
            tx = text(l)
            words += len(tx.split())
            if not tx.strip():
                errs.append(f"{where} line {li}: empty")
            if SPOKEN_BAD.search(l.get("say", tx) if isinstance(l, dict) else tx):
                errs.append(f"{where} line {li}: symbol/abbreviation in narration: {tx!r}")
            if len(tx.split()) > 45:
                errs.append(f"{where} line {li}: long line ({len(tx.split())} words)")
        if t not in ("title",) and t != "quiz" and not s.get("source") and si > 0 and ep["id"] != "ep00":
            errs.append(f"{where}: no source")
        if t in ("talk", "recap"):
            items = s.get("bullets" if t == "talk" else "points") or []
            if not items:
                errs.append(f"{where}: no bullets/points")
            explicit = any(isinstance(l, dict) and "show" in l for l in s.get("lines", []))
            if explicit:
                shown = {l["show"] for l in s["lines"] if isinstance(l, dict) and "show" in l}
                missing = set(range(len(items))) - shown
                if missing:
                    errs.append(f"{where}: items never shown: {sorted(missing)}")
                if any(x >= len(items) for x in shown):
                    errs.append(f"{where}: show index out of range")
            elif len(s.get("lines", [])) < len(items):
                errs.append(f"{where}: {len(items)} items but only {len(s['lines'])} lines (some never appear)")
            elif len(s.get("lines", [])) > len(items) + 0:
                errs.append(f"{where}: more lines than items without 'show' (extra lines show nothing new — OK only if intended)")
        if t == "quiz":
            opts = s.get("options") or []
            if not s.get("question") or len(opts) < 2:
                errs.append(f"{where}: needs question and options")
            if not isinstance(s.get("answer"), int) or not 0 <= s["answer"] < len(opts):
                errs.append(f"{where}: answer index invalid")
            if not s.get("reveal"):
                errs.append(f"{where}: no reveal lines")
        if t == "rule" and not (s.get("rule") or {}).get("text"):
            errs.append(f"{where}: rule.text missing")
        if t == "term" and not (s.get("term") and s.get("definition")):
            errs.append(f"{where}: term/definition missing")
        if t == "figure":
            fig = s.get("figure") or {}
            if not (ROOT / "source" / "pages" / fig.get("page", "-")).exists():
                errs.append(f"{where}: figure page not found: {fig.get('page')}")
            crop = fig.get("crop")
            if crop and (len(crop) != 4 or any(not 0 <= c <= 1 for c in crop) or crop[0] + crop[2] > 1.001 or crop[1] + crop[3] > 1.001):
                errs.append(f"{where}: bad crop {crop}")
        if t == "diagram":
            subj = s.get("subject", "pistol")
            if subj not in PARTS:
                errs.append(f"{where}: unknown subject {subj}")
                continue
            valid = set(PARTS[subj].split())
            for k in (s.get("names") or {}):
                if k not in valid:
                    errs.append(f"{where}: names has unknown part {k}")
            for li, l in enumerate(s.get("lines", [])):
                if not isinstance(l, dict):
                    continue
                for p in l.get("highlight", []) or []:
                    if p not in valid:
                        errs.append(f"{where} line {li}: unknown part {p}")
                    if subj == "pistol" and p == "safety" and not s.get("showSafety"):
                        errs.append(f"{where} line {li}: safety highlighted without showSafety")
                    if subj == "pistol" and p == "hammer" and not s.get("showHammer"):
                        errs.append(f"{where} line {li}: hammer highlighted without showHammer")
                if "action" in l and l["action"] not in ACTIONS[subj].split():
                    errs.append(f"{where} line {li}: action {l['action']} not valid for {subj}")
                if "stage" in l and (subj != "cartridge" or not 0 <= l["stage"] <= 4):
                    errs.append(f"{where} line {li}: bad stage")
    if types and types[0] != "title":
        errs.append("first scene should be title")
    if len(types) >= 2 and not (types[-1] == "recap" and "quiz" in types):
        errs.append("should end with quiz(zes) then recap")
    minutes = (words / 2.6 + total_lines * 0.3 + types.count("quiz") * 5 + len(types) * 1) / 60
    print(f"{path.name}: {len(types)} scenes, {total_lines} lines, ~{minutes:.1f} min")
    return errs


def main() -> None:
    files = [Path(a) for a in sys.argv[1:]] or sorted((ROOT / "episodes").glob("*.json"))
    bad = 0
    for f in files:
        for e in lint(f):
            bad += 1
            print(f"  ✗ {e}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
