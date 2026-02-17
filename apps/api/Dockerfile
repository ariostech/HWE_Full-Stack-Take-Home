FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/src/database/migrations ./apps/api/src/database/migrations
COPY packages/shared ./packages/shared
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY apps/api/src/database/migrate.ts ./apps/api/src/database/migrate.ts
COPY apps/api/src/database/seed.ts ./apps/api/src/database/seed.ts
COPY apps/api/src/database/schema.ts ./apps/api/src/database/schema.ts
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
RUN chmod +x ./apps/api/docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["./apps/api/docker-entrypoint.sh"]
