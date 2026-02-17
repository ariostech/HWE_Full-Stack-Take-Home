#!/bin/sh
set -e

echo "==> Running database migrations..."
cd /app/apps/api
npx tsx src/database/migrate.ts

if [ "$SEED_DB" = "true" ]; then
  echo "==> Seeding database..."
  npx tsx src/database/seed.ts
fi

echo "==> Starting API server..."
npx tsx dist/main
