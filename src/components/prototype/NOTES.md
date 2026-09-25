# PROTOTYPE — Himachal drive easter egg

**Landing redesign (done):** B · Paper won over four rounds of variants. It's the real `src/pages/index.astro` and
`src/pages/blogs.astro`: warm paper, stone + teal, one font (Instrument Sans), sticky intro column with scroll-spy,
line-drawn Himachal ridges, scroll reveals. All other variants and the switcher were deleted.

**Still a prototype:** `drive/` — a three.js mountain drive with signboards for each blog and project. Dev-only
(`showDrive` in `src/pages/index.astro`). Triggers: type `drive`, or click "Take the scenic route →".

**Open question:** ship it? If yes, rewrite `drive/` outside `prototype/`, pick the production trigger, and check
mobile performance. If no, delete this folder and the `three` / `@types/three` dependencies.
