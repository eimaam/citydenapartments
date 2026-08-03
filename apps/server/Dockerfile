FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS builder
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY packages/email/package.json packages/email/

RUN pnpm install --frozen-lockfile --filter @citydenapartments/server --filter @citydenapartments/shared --filter @citydenapartments/email

COPY apps/server/ apps/server/
COPY packages/shared/ packages/shared/
COPY packages/email/ packages/email/

RUN pnpm --filter @citydenapartments/shared build
RUN pnpm --filter @citydenapartments/email build
RUN pnpm --filter @citydenapartments/server build

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/apps/server/package.json apps/server/
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/email/package.json packages/email/

RUN pnpm install --frozen-lockfile --filter @citydenapartments/server --filter @citydenapartments/shared --filter @citydenapartments/email --prod

COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/email/dist packages/email/dist
COPY --from=builder /app/apps/server/dist apps/server/dist

# Ensure internal packages are resolvable at runtime
RUN mkdir -p /app/node_modules/@citydenapartments && \
    ln -sfn /app/packages/shared /app/node_modules/@citydenapartments/shared && \
    ln -sfn /app/packages/email /app/node_modules/@citydenapartments/email

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "apps/server/dist/main.js"]
