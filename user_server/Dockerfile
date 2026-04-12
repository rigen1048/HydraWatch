FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install-prod
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

FROM base AS install-dev
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

FROM base AS builder
COPY --from=install-dev /temp/dev/node_modules node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN bun run build

FROM node:20-slim AS release

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/.next/standalone ./

COPY --from=builder /usr/src/app/.next/static ./.next/static

COPY --from=builder /usr/src/app/next.config.ts ./
COPY --from=builder /usr/src/app/package.json ./


EXPOSE 3000/tcp

CMD ["node", "server.js"]
