FROM node:22.23.4-bookworm-slim

# The repository lives under /app/stats in the image, where the monorepo's stats/ directory was, so
# the in-container paths the Compose files, volumes and host tooling use did not change when stats
# moved out of bitsocial-web.
WORKDIR /app/stats

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git python3 make g++ libfontconfig1 \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY .yarnrc.yml package.json yarn.lock ./
COPY monitor/package.json ./monitor/package.json
COPY web/package.json ./web/package.json

RUN yarn install --immutable

COPY monitor ./monitor
COPY shared ./shared
COPY web ./web

# The stats dashboard ships in this image too: the web service runs web/server/server.mjs from it,
# so every deploy that rebuilds the monitor also rebuilds the dashboard.
RUN yarn vite build --config web/vite.config.ts

WORKDIR /app/stats/monitor

CMD ["node", "monitor.js"]
