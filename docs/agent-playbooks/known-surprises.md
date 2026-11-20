# Known Surprises

This file tracks repository-specific confusion points that caused agent mistakes.

## Entry Criteria

Add an entry only if all are true:

- It is specific to this repository (not generic advice).
- It is likely to recur for future agents.
- It has a concrete mitigation that can be followed.

If uncertain, ask the developer before adding an entry.

## Entry Template

```md
### [Short title]

- **Date:** YYYY-MM-DD
- **Observed by:** agent name or contributor
- **Context:** where/when it happened
- **What was surprising:** concrete unexpected behavior
- **Impact:** what went wrong or could go wrong
- **Mitigation:** exact step future agents should take
- **Status:** confirmed | superseded
```

## Entries

Entries recorded in the `bitsocial-web` monorepo that apply to this repository are kept below; the rest stay in that repository's history.

### Portless 0.11 reuses legacy proxy state unless the launcher forces HTTPS

- **Date:** 2026-04-28
- **Observed by:** Tommaso + Codex
- **Context:** Upgrading the normal `yarn start` flow from the old `http://bitsocial.localhost:1355` proxy URL to `https://bitsocial.localhost`.
- **What was surprising:** Even with `portless@0.11.1` installed, Portless reused the existing `~/.portless/proxy.port = 1355` HTTP proxy and printed the legacy `:1355` URL.
- **Impact:** Updating package versions and docs is not enough; `yarn start` can still advertise and use the old URL when a contributor has legacy Portless state running.
- **Mitigation:** Keep the start scripts explicitly starting the Portless HTTPS proxy on port `443` before registering app routes, so the runtime flow migrates away from persisted `1355` state instead of inheriting it.
- **Status:** confirmed

### Commitizen hooks block non-interactive commits

- **Date:** 2026-03-18
- **Observed by:** Codex
- **Context:** Agent-driven commit workflows
- **What was surprising:** `git commit` triggers Commitizen through Husky and waits for interactive TTY input, which hangs non-interactive agent shells.
- **Impact:** Agents can stall indefinitely during what should be a normal commit.
- **Mitigation:** Use `git commit --no-verify -m "message"` for agent-created commits. Humans can still use `corepack yarn commit` or `corepack yarn exec cz`.
- **Status:** confirmed

### Corepack is required to avoid Yarn classic

- **Date:** 2026-03-19
- **Observed by:** Codex
- **Context:** Package manager migration to Yarn 4
- **What was surprising:** The machine still has a global Yarn classic install on `PATH`, so running plain `yarn` can resolve to v1 instead of the pinned Yarn 4 version.
- **Impact:** Developers can accidentally bypass the repo's package-manager pinning and get different install behavior or lockfile output.
- **Mitigation:** Use `corepack yarn ...` for shell commands, or run `corepack enable` first so plain `yarn` resolves to the pinned Yarn 4 version.
- **Status:** confirmed

### Fixed Portless app names collide across Bitsocial Web worktrees

- **Date:** 2026-03-30
- **Observed by:** Codex
- **Context:** Starting `yarn start` in one Bitsocial Web worktree while another worktree was already serving through Portless
- **What was surprising:** Using the literal Portless app name `bitsocial` in every worktree makes the route itself collide, even when the backing ports are different, so the second process fails because `bitsocial.localhost` is already registered.
- **Impact:** Parallel Bitsocial Web branches can block each other even though Portless is meant to let them coexist safely.
- **Mitigation:** Keep Portless startup behind the launcher (`scripts/start-stats.mjs` here, through `scripts/dev-server-utils.mjs`), which uses a branch-scoped `*.stats.bitsocial.localhost` route outside the canonical case and falls back to a branch-scoped route when the bare `stats.bitsocial.localhost` name is already occupied.
- **Status:** confirmed

### Worktree shells can miss the repo's pinned Node version

- **Date:** 2026-04-03
- **Observed by:** Codex
- **Context:** Running `yarn start` in Git worktrees such as `.claude/worktrees/*` or sibling worktree checkouts
- **What was surprising:** Some worktree shells resolved `node` and `yarn node` to Homebrew Node `25.2.1` even though the repo pins `22.12.0` in `.nvmrc`, so `yarn start` could silently run the dev launchers under the wrong runtime.
- **Impact:** Dev-server behavior can drift between the main checkout and worktrees, making bugs hard to reproduce and violating the repo's expected Node 22 toolchain.
- **Mitigation:** Keep the dev launchers behind `scripts/start-stats.mjs`, which re-execs under the `.nvmrc` Node binary when the current shell is on the wrong version. Shell setup should still prefer `nvm use`.
- **Status:** confirmed

### `skills add` installs Codex and Cursor copies into the gitignored `.agents/` directory

- **Date:** 2026-08-18
- **Observed by:** Tommaso + Claude
- **Context:** Installing the `improve-threejs` skill from `millionco/react-doctor` with the `skills` CLI (`vercel-labs/skills`).
- **What was surprising:** `npx skills add <repo> --skill <name> --agent codex` and `--agent cursor` both write to `.agents/skills/<name>/`, not to `.codex/skills/` or `.cursor/skills/`. `AGENTS.md` forbids a repo-level `.agents/` directory and `.gitignore:29` ignores it, so both copies are silently untracked. Only `--agent claude-code` writes to the expected `.claude/skills/`. Separately, the documented comma-separated form (`--agent claude-code,codex,cursor`) fails with "Invalid agents" and installs nothing, even though each name is valid on its own.
- **Impact:** The install reports success while two of the three toolchain copies land somewhere that will never be committed, so Codex and Cursor silently lack the skill after a fresh clone. The comma form can also produce a no-op install that reads as a success.
- **Current mitigation:** The repository now tracks `.agents/skills` as its canonical source and generates Claude copies with `yarn ai-workflow:sync`. The former `.agents` prohibition and ignore rule have been removed. Do not copy new skills into three independent roots; check generated parity and the app catalog after adding a skill.
- **Status:** confirmed
