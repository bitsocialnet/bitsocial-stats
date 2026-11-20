# AGENTS.md

## Purpose and priority

Shared instructions for agents working on bitsocial-stats. Explicit user instructions take precedence over repository workflow guidance. MUST rules are requirements; SHOULD rules are defaults. Read linked playbooks only when relevant.

Define completion for non-trivial work and continue through implementation, appropriate verification, and fixes within the requested scope. Use judgment for routine choices; ask only when missing information materially changes the result or an action lacks authorization. Skills do not create additional approval gates.

## Product and source of truth

Bitsocial Stats is the stats stack behind `https://stats.bitsocial.net/`: the public dashboard and its read-only API ([`web/`](./web)), the network monitor ([`monitor/`](./monitor)), the PromQL both share ([`shared/`](./shared)), the operators' Grafana dashboards ([`grafana/`](./grafana)), the Prometheus config ([`prometheus/`](./prometheus)), Docker Compose, and the VPS deploy ([`deploy/`](./deploy)). It moved here from the `bitsocial-web` monorepo, where it lived in `stats/`.

Preserve the production contract unless the user requests a change to it: the Compose project name `deploy`, its image tags and named volumes, the loopback ports `3300`, `3301` and `3302`, the in-container paths under `/app/stats`, and the host layout described in [`deploy/README.md`](./deploy/README.md). Lux's watchdog and backups rely on the container and volume names.

Source, manifests, tests, docs, and runtime evidence establish behavior. AGENTS, skills, playbooks and task logs orient the agent; verify technical claims against source. Check the installed dependency version before assuming a sibling repository provides its implementation.

Record recurring repository surprises with concrete mitigation in [known-surprises.md](docs/agent-playbooks/known-surprises.md) after contributor confirmation. Continue independent work while any needed detail is unresolved.

## Working principles

- Understand the affected flow before editing. Prefer skipping unnecessary work, reusing repository code, native/standard-library features, then installed dependencies before adding code.
- Preserve unrelated edits. Keep changes scoped; avoid adjacent cleanup or broad reformatting without a task reason.
- Simplicity must preserve correctness, validation, accessibility, security, error handling, and useful tests.
- For a bug tied to a file/line, inspect `git log` or `git blame`, then relevant `git show`. Use reproduction or conclusive source/runtime evidence before fixing; see [bug-investigation.md](docs/agent-playbooks/bug-investigation.md).
- Prefer existing evidence before instrumentation. Remove only task-owned temporary logs/artifacts once verification is complete.

## Task router

| Task                                                                       | Guidance/check                                                                                                                      |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Files in a directory with AGENTS.md                                        | Read that directory's instructions                                                                                                  |
| Code or automation changed                                                 | Select checks by impact in [verification.md](docs/agent-playbooks/verification.md)                                                  |
| Dashboard API, queries, or UI changed                                      | Run `yarn workspace @bitsocial/stats-web test` and `yarn build:stats-web`                                                           |
| React state/effects/data flow/performance changed                          | Read relevant React skill rules                                                                                                     |
| Web platform choices in `web/`                                             | Consult [Modern Web Guidance](.agents/skills/modern-web-guidance/SKILL.md) for the relevant feature                                 |
| UI/layout changed                                                          | Verify affected flows; choose browsers/viewports using the verification playbook                                                    |
| `monitor/Dockerfile`, a Compose file, or anything the image copies changed | Build the image locally; keep in-container paths, image tags, volume names and the project name                                     |
| `deploy/deploy-from-github.sh` changed                                     | It runs as root on the production host: keep its host paths and the protected `deploy/.env` exclude; see [deploy](deploy/README.md) |
| `package.json` changed                                                     | Run `corepack yarn install` and keep `yarn.lock` synchronized                                                                       |
| Dependencies/imports changed                                               | Run advisory `yarn knip`; resolve relevant new findings                                                                             |
| AI workflow files changed                                                  | Edit shared sources; run `yarn ai-workflow:sync`, `yarn ai-workflow:check`, `yarn ai-workflow:test`                                 |
| Bug fix or substantive review correction exposes a preventable mistake     | Use [retro](.agents/skills/retro/SKILL.md) for the smallest worthwhile prevention                                                   |
| Open PR feedback or merge readiness                                        | Use `review-and-merge-pr` within the requested scope                                                                                |
| Durable handoff/resumption, or a run long enough to hit context compaction | Use [long-running-agent-workflow.md](docs/agent-playbooks/long-running-agent-workflow.md)                                           |
| Frontend design or visual review                                           | Use `impeccable`; preserve the requested visual scope and existing product truth                                                    |
| Dependency manifest/lock changed                                           | Keep `deps:check-pinned` and `deps:check-hardened` passing                                                                          |

## Code and product constraints

### Package and Dependency Rules

- Use Yarn 4 via Corepack, never `npm` or `bun`.
- Use exact versions for `dependencies`, `devDependencies`, and `optionalDependencies` in every tracked `package.json`. Do not introduce semver ranges, `^`, `~`, wildcard ranges, or tags like `latest`.
- Keep the repo's Yarn registry hardening enabled: exact-version defaults, checksum verification, and a 3-day `npmMinimalAgeGate`. If a dependency or lockfile change needs to bypass the age gate, document the reason before introducing a preapproval exception.
- Keep `yarn.lock` synchronized when dependency manifests change.
- Keep Yarn configured to add exact versions by default, keep `yarn deps:check-pinned` passing, and run `yarn deps:check-hardened` when dependency manifests or `yarn.lock` change.
- Respect the repo's existing dependency versioning style. Do not rewrite version ranges just to satisfy a personal preference.

### Stats architecture

- The monitor in [`monitor/`](./monitor) is the executable data collector; the repository root is the umbrella project around it.
- The public dashboard in [`web/`](./web) is a Vite/React SPA plus `server/server.mjs`, which serves it and a read-only API over Prometheus. Keep every PromQL expression fixed on the server; requests may only pick allowlisted views, ranges, clients, and listed community addresses. The server builds every API document on its own schedule ([`server/snapshots.mjs`](./web/server/snapshots.mjs)) and requests only read those snapshots: never let a request trigger a Prometheus query, so visitor traffic cannot add load.
- Define "online", post and user counts once in [`shared/stats-queries.mjs`](./shared/stats-queries.mjs) so the dashboard and Grafana agree.
- The dashboard is built into the monitor's Docker image and runs as the Compose `web` service. The production `/etc/caddy/Caddyfile` also serves sites outside this repo, so deploys leave it alone: keep the `stats.bitsocial.net` block in [`deploy/Caddyfile`](./deploy/Caddyfile) and copy that block to the host by hand, never the whole file (see [`deploy/README.md`](./deploy/README.md#activating-caddy)).
- Prefer editing dashboard generation inputs and provisioning files over hand-tweaking exported dashboard JSON unless the task is explicitly a one-off dashboard patch.
- Keep public naming Bitsocial-first in dashboards and docs. Use PKC/community terminology in repo-owned monitor code, and keep legacy upstream strings only where current compatibility requires them.
- In the dashboard, do not use `useEffect` to synchronize derived state that can be calculated during render, preserve `prefers-reduced-motion` fallbacks whenever you add or change animation, and follow the visual system in `web/src/index.css` and `web/tailwind.config.ts` (see the Console Rule in [DESIGN.md](./DESIGN.md)).

### Security and Boundaries

- Never commit secrets or API keys. The production `deploy/.env` exists only on the host.
- Never push to a remote unless the user explicitly asks.
- Do not build wallet integration, authentication, or governance in this repo.

## Git and ownership

- Keep `master` releasable: every push to `master` deploys to production once deploys are enabled. Default to short-lived `codex/feature/*`, `codex/fix/*`, `codex/docs/*`, or `codex/chore/*` branches unless the user asks otherwise.
- For an unrelated task on another active branch, use a descriptive worktree from `master`; never switch branches underneath another agent. Related delegated slices may share a checkout with non-overlapping ownership.
- Stage only task-owned changes, using selective patches for mixed files. Do not use `git add -A` by default. Preserve secrets, unrelated edits, and preexisting artifacts during cleanup.
- Only commit, push, publish, or merge when authorized; existing authorization persists through necessary steps. When a PR is requested, target `master` and make it ready for review unless a draft was requested.
- After an authorized merge, remove only the verified merged branch/worktree. Never perform Git cleanup from lifecycle hooks.
- Open a PR for every branch you push; GitHub deletes PR branches on merge, but nothing removes a branch without one. If you abandon or supersede a pushed branch you created, delete it once you have verified it holds no unmerged work.
- Use `gh` for GitHub operations. Use [commit-issue-format.md](docs/agent-playbooks/commit-issue-format.md) for requested wording or actual commit/issue creation, not automatic suggestions.

## Verification and resources

- Use the narrowest reliable behavior checks first. Run applicable checks once for the final state, repeating only after changes, failures, or unresolved concerns. Preserve explicit CI/release/user requirements.
- Documentation-only work needs document/workflow checks, not an app build. Add regression tests for non-trivial testable bugs, not wording changes.
- Inspect active workloads before heavy work. Serialize installs, builds/full suites, Docker image builds, and browser sessions across the task. One owner runs heavy verification; never stop processes of unclear ownership.
- Reuse a compatible dev server or stats stack in the same worktree when safe. Otherwise record and clean up only the processes and containers this task starts; never start a server for documentation-only work.
- Run browser engines sequentially through `./scripts/pw-session.sh open <session> ...` and `close <session>`. One browser is active machine-wide. Exit 75 means busy; defer or use the bounded wait. Close the exact owned session even after failure, never `close-all` or `kill-all`.
- Default to isolated sessions; personal-browser reuse requires authorization. A caller-owned session can be reused by a delegated helper without taking over its lifecycle.
- Review the final task-owned diff. Use `code-quality-review` for non-trivial changes or an explicit review; apply high-confidence in-scope findings. Knip and coverage are diagnostics, not new repository-wide gates.

## Skills and delegation

- Shared skills live in `.agents/skills/`; `.agents/roles/` is the repository's generator source, not a native discovery path. Commit generated `.claude/skills/`, `.codex/agents/`, and `.claude/agents/` alongside sources. See [skills-and-tools.md](docs/agent-playbooks/skills-and-tools.md).
- Keep harness-specific hooks, permissions, and metadata explicit. Leave model and reasoning fields out of committed skills/custom agents so runtime invocation, user defaults, and inheritance control selection. Do not invent a `latest` model alias.
- Use built-in worker/explorer roles for ordinary implementation/research; custom roles cover browser checks and review. Avoid compulsory specialist chains.
- Delegate substantial independent work when it improves speed or context isolation. Give scope, acceptance criteria, context, ownership, and expected evidence; check that evidence before accepting a child's result. At most four workers by default; no overlapping writes or concurrent browser work.
- Use relevant React guidance for the changed state/effect/data flow; load `you-might-not-need-an-effect` for a focused uncertain effect/memo review. Do not apply Next.js/server rules indiscriminately to the Vite client.
- Prefer installed tools and CLIs. Look up current external APIs when needed; do not install skills merely because a normal task mentions their domain. Keep tool catalogs relevant; unused integrations add choices even when schemas are deferred.

## Commands and playbooks

`yarn start` runs the whole stack in Docker (monitor, Prometheus, Grafana and the dashboard) and serves the dashboard at `https://stats.bitsocial.localhost`; worktrees may use branch-scoped routes, and `PORTLESS=0 yarn start` bypasses Portless. `yarn start:stats-web` serves the dashboard with hot reload and proxies `/api` to `STATS_API_URL` (default `http://127.0.0.1:3302`). `yarn start:stats-monitor` runs the monitor alone. `yarn stats:up`, `yarn stats:down` and `yarn stats:logs` manage the local Compose stack directly.

Use `yarn build:verify` for the affected checks. Other checks: `yarn build:stats-web`, `yarn build:stats-monitor`, `yarn test`, `yarn lint`, `yarn typecheck`, `yarn format:check`, `yarn knip`. `yarn build:stats-dashboards` regenerates the Grafana dashboards and monitor snapshots from the live community lists, so it rewrites tracked files. Preserve Yarn exact pins, hardening, and the existing age gate.

Load details when needed: [hooks](docs/agent-playbooks/hooks-setup.md), [verification](docs/agent-playbooks/verification.md), [skills/tools](docs/agent-playbooks/skills-and-tools.md), [long-running work](docs/agent-playbooks/long-running-agent-workflow.md), [known surprises](docs/agent-playbooks/known-surprises.md), [deploy](deploy/README.md).
