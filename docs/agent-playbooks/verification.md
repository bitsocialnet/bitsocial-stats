# Verification

Select checks from the changed behavior and remaining uncertainty. Reuse successful evidence for the same final state; rerun after relevant edits or failures. Explicit CI/release/user requirements still apply.

| Change                                                | Appropriate checks                                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Prose/comments/formatting only                        | Diff, references, relevant generators; no app build                                                                       |
| AI workflow sources/configuration                     | `yarn ai-workflow:sync`, `yarn ai-workflow:check`, `yarn ai-workflow:test`                                                |
| Isolated helper or script                             | Focused invocation/fixtures and syntax or type/lint checks for the affected code                                          |
| Shared runtime, dependency, build, integration change | Focused affected checks plus the relevant build/type/lint checks below                                                    |
| Dashboard API, PromQL, or server change               | `yarn workspace @bitsocial/stats-web test` and `yarn build:stats-web`                                                     |
| Monitor change                                        | `yarn workspace @bitsocial/stats-monitor test` and `yarn build:stats-monitor`                                             |
| Dockerfile, Compose, or image contents                | Build the image locally (`yarn stats:up`, or `docker compose -f compose.yaml build monitor`); keep production names/paths |
| Deploy receiver (`deploy/deploy-from-github.sh`)      | `bash -n`, a review against the host layout in `deploy/README.md`, and a dry run of any changed rsync or path logic       |
| CSS/theme/layout only                                 | Affected routes/viewports/themes in selected browsers; build when imports, assets, or CSS processing changed              |
| React state/effects/performance                       | Affected behavior and applicable React guidance                                                                           |

## Project checks

- `yarn build:verify` selects the affected checks from the diff. For a known scope use `yarn build:stats-web` (typecheck plus the dashboard build), `yarn build:stats-monitor` (syntax check of every monitor file), or `yarn test` (dashboard server and monitor tests).
- `yarn build:stats-dashboards` regenerates the Grafana dashboards and monitor snapshots from the live community lists, so it rewrites tracked files; run it when dashboard generation inputs change.
- `yarn lint`, `yarn typecheck`, and `yarn format:check` cover existing repository gates; for a narrow script edit use its focused syntax/fixture/format checks first.
- Manifest/lock changes require `corepack yarn install`, `yarn deps:check-pinned`, and `yarn deps:check-hardened`. `yarn knip` is advisory for dependencies/imports.

## Browser evidence and ownership

Use Chrome for small isolated browser changes. Add Firefox and WebKit for shared CSS/layout/responsiveness, browser-sensitive APIs, broad interactions, releases, or explicit cross-browser criteria. Include affected mobile layouts/touch behavior. A viewport resize alone is not touch emulation. Choose actual routes and content from source rather than assuming examples are available.

Use `playwright-cli` through `./scripts/pw-session.sh`. One browser is active machine-wide; selected engines run sequentially and each exact owned session closes even after failure. Reuse an authorized caller-owned session without closing it. Never use global browser cleanup or stop a server of unclear ownership. No browser/server is needed for documentation-only work.

For performance work, compare the same flow with equivalent viewport, content, network/CPU settings, build mode, and measurement overhead. Distinguish observations from suspected causes.

## Final evidence

One agent owns heavy verification. Inspect active workloads and serialize installs, builds/full suites, Docker image builds, and browser sessions. Report commands/outcomes and specific limitations; missing data or a skipped engine is not a passing result. Tooling fixtures verify formats and mechanics, not end-to-end app discovery or model decision quality.
