# Repository Instructions

## Architecture

- No shared layout file — each page (`src/pages/*.astro`) defines its own `<html>`, `<head>`, `<body>`.
- A shared `<head>` component (`SiteMeta.astro`) is used on every page for meta tags and third-party head scripts.
- Body-level third-party snippets (e.g. noscript iframes) get their own component, placed right after `<body>` on each page.
- Extract repeated code into components rather than duplicating it across pages.

## Git workflow

- Stay on the current branch unless the user explicitly asks to create or switch branches.
- Never create a branch merely because the current branch is `main`.
- Before committing, inspect recent commit subjects with `git log` and follow the repository's established style.
- Use a single-line Conventional Commit subject with no commit body, keeping it to 4-5 words max, for example: `feat: add AI-readable site content`.
- Use an appropriate Conventional Commit type such as `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, or `ci`, with an optional scope when useful.
- Do not commit or push unless the user explicitly requests it.

## Package manager

- Use Yarn for dependency management and package scripts. Do not introduce npm or pnpm lockfiles.
- If `yarn` is not found or the wrong version, run `npm install -g corepack && corepack enable` first, then use `yarn`.
