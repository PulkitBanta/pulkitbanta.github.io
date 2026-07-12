# Repository Instructions

## Git workflow

- Stay on the current branch unless the user explicitly asks to create or switch branches.
- Never create a branch merely because the current branch is `main`.
- Before committing, inspect recent commit subjects with `git log` and follow the repository's established style.
- Use a single-line Conventional Commit subject with no commit body, for example: `feat: add AI-readable site content`.
- Use an appropriate Conventional Commit type such as `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, or `ci`, with an optional scope when useful.
- Do not commit or push unless the user explicitly requests it.

## Package manager

- Use Yarn for dependency management and package scripts. Do not introduce npm or pnpm lockfiles.
