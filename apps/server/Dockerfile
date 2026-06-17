FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS builder
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile --filter @citydenapartments/server --filter @citydenapartments/shared

COPY apps/server/ apps/server/
COPY packages/shared/ packages/shared/

RUN pnpm --filter @citydenapartments/server exec tsc -p ../../packages/shared/tsconfig.build.json
RUN pnpm --filter @citydenapartments/server build

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/apps/server/package.json apps/server/

RUN pnpm install --frozen-lockfile --filter @citydenapartments/server --prod

COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/apps/server/dist apps/server/dist

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "apps/server/dist/main.js"]
