# Writing episode scripts

- Every fact in an episode must come from the books in `source/` (read via `source/text/<book>/pNNN.txt`).
  Don't add facts from memory or the internet, even if they seem right — the test follows these books.
- Put the page on screen: set `source` on every scene that states a fact (e.g. `"Handling book, p. 14"`).
- Quote legal wording closely; don't paraphrase a legal requirement into something looser or stricter.
- One sentence per line, short and spoken-style. One topic per episode, 3–6 minutes.
- End every episode with a `quiz` then a `recap`.
- After editing episodes: `pnpm prepare-assets`, `pnpm check` (must pass), then `pnpm render --stills <id>`
  and look at the stills before rendering video.
