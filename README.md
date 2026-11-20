[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](./LICENSE)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

# Bitsocial Stats

The Bitsocial network stats stack behind `https://stats.bitsocial.net/`. It moved here, with its history, from the `stats/` directory of the [`bitsocial-web`](https://github.com/bitsocialnet/bitsocial-web) monorepo.

## What Lives Here

```text
web/         Public stats dashboard (Vite + React) and its read-only API server
monitor/     Network monitor feeding Prometheus, Grafana and the dashboard
shared/      PromQL shared by the dashboard and the Grafana dashboard generator
grafana/     Operator dashboards, provisioning and the dashboard generator
prometheus/  Prometheus scrape configuration
deploy/      Production Compose file, Caddy block and the VPS deploy receiver
compose.yaml Local Docker Compose stack
scripts/     Local launchers, build checks and agent tooling
```

The monitor and the dashboard server are built into one Docker image ([`monitor/Dockerfile`](./monitor/Dockerfile)). Public traffic reaches the dashboard, which queries Prometheus with a fixed set of queries; Grafana runs on the VPS loopback for operators only. See [`web/README.md`](./web/README.md), [`monitor/README.md`](./monitor/README.md) and [`grafana/README.md`](./grafana/README.md) for each part.

## Getting Started

Use the pinned Node.js version from [`.nvmrc`](./.nvmrc), Yarn 4 via Corepack, and Docker for the full stack.

```bash
nvm install && nvm use
corepack enable
corepack yarn install
corepack yarn start
```

`yarn start` brings up the local Compose stack, waits for the dashboard and serves it at `https://stats.bitsocial.localhost` through Portless (`PORTLESS=0` skips Portless). It creates `.env` from [`.env.example`](./.env.example) on first run. Ctrl+C stops the containers; their data stays in Docker volumes.

## Common Commands

```bash
corepack yarn start                  # Docker stack + dashboard on a Portless URL
corepack yarn start:stats-web        # dashboard with hot reload, API proxied to STATS_API_URL
corepack yarn start:stats-monitor    # the monitor alone
corepack yarn stats:up               # docker compose up --build
corepack yarn stats:down
corepack yarn stats:logs
corepack yarn build:verify           # checks selected from the current diff
corepack yarn build:stats-web        # typecheck + dashboard build
corepack yarn build:stats-monitor    # syntax check of every monitor file
corepack yarn build:stats-dashboards # regenerate Grafana dashboards and monitor snapshots
corepack yarn test
corepack yarn lint
corepack yarn typecheck
corepack yarn format:check
corepack yarn deps:check-pinned
corepack yarn deps:check-hardened
```

## Deployment

Every push to `master` deploys to the VPS through [`.github/workflows/deploy-stats.yml`](./.github/workflows/deploy-stats.yml) and the forced-command receiver in [`deploy/deploy-from-github.sh`](./deploy/deploy-from-github.sh), once the `STATS_DEPLOY_ENABLED` repository variable is `true`. Host layout, required secrets, Caddy and Grafana access are in [`deploy/README.md`](./deploy/README.md).

## Contributing

Agent and contributor workflow rules are in [`AGENTS.md`](./AGENTS.md). Use Conventional Commits (`corepack yarn commit` runs Commitizen).

## License

[AGPL-3.0](./LICENSE).
