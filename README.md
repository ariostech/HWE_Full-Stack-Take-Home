# Emissions Ingestion & Analytics Engine

A full-stack platform for industrial methane emissions monitoring, built with NestJS, Next.js, PostgreSQL, Redis, and Drizzle ORM.

## Tech Stack

| Layer      | Technology                                        |
| ---------- | ------------------------------------------------- |
| Backend    | NestJS (Node.js), CQRS pattern                    |
| Frontend   | Next.js 15 (App Router), React 19, TanStack Query |
| Database   | PostgreSQL 16                                     |
| Cache      | Redis 7                                           |
| ORM        | Drizzle ORM                                       |
| Validation | Zod (shared between frontend and backend)         |
| Monorepo   | Turborepo + pnpm workspaces                       |

## Prerequisites

- **Node.js** ≥ 18.x
- **pnpm** ≥ 9.x (`npm install -g pnpm`)
- **Docker** and **Docker Compose** (for PostgreSQL and Redis)

## Quick Start

There are two ways to run the project: **fully containerized** (one command) or **native development** (hot reload).

### Option A: One-Command Docker

This builds and runs everything — PostgreSQL, Redis, API, and Web — in Docker containers. Migrations and seed data run automatically on startup.

```bash
cp .env.example .env
docker compose --profile full up --build
```

Once the containers are healthy:

- **Dashboard:** http://localhost:3000
- **API:** http://localhost:4000/api/v1/sites
- **Health check:** http://localhost:4000/api/health

To stop everything: `docker compose --profile full down`

To reset the database: `docker compose --profile full down -v` (removes the volume)

### Option B: Native Development (Hot Reload)

#### 1. Clone and install

```bash
git clone <repo-url>
cd HWE_Full-Stack-Take-Home
pnpm install
```

#### 2. Environment setup

```bash
cp .env.example .env
```

The defaults work out of the box with Docker Compose. See `.env.example` for all configurable values.

#### 3. Start infrastructure (PostgreSQL + Redis)

```bash
docker compose up -d
```

Optionally, start pgAdmin for database inspection:

```bash
docker compose --profile tools up -d
```

pgAdmin is available at http://localhost:5050 (login: `admin@local.dev` / `admin`).

#### 4. Run database migrations

```bash
pnpm db:migrate
```

#### 5. Seed sample data

```bash
pnpm db:seed
```

This creates 4 sample sites with 15 measurements each.

#### 6. Start development servers

```bash
pnpm dev
```

This starts both:

- **API** at http://localhost:4000/api
- **Web** at http://localhost:3000

## API Endpoints

All endpoints are versioned under `/api/v1`:

| Method | Endpoint                    | Description                                                   |
| ------ | --------------------------- | ------------------------------------------------------------- |
| `GET`  | `/api/health`               | Health check + observability metrics                          |
| `POST` | `/api/v1/sites`             | Create a new site                                             |
| `GET`  | `/api/v1/sites`             | List all sites                                                |
| `GET`  | `/api/v1/sites/:id/metrics` | Get site metrics + compliance status                          |
| `POST` | `/api/v1/ingest`            | Batch ingest measurements (requires `Idempotency-Key` header) |

### Example: Create a site

```bash
curl -X POST http://localhost:4000/api/v1/sites \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Pad", "location": "Alberta, CA", "emission_limit": 5000}'
```

### Example: Ingest measurements

```bash
curl -X POST http://localhost:4000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{
    "site_id": "<site-uuid>",
    "measurements": [
      {"value": 55.3, "unit": "kg", "timestamp": "2026-02-16T12:00:00Z", "source": "sensor"}
    ]
  }'
```

Retrying with the same `Idempotency-Key` returns the cached response with `meta.duplicate: true`.

## Database Management

```bash
# Generate migration files from schema changes
pnpm db:generate

# Apply pending migrations
pnpm db:migrate

# Seed sample data
pnpm db:seed

# Open Drizzle Studio (DB browser)
pnpm db:studio
```

## Testing

```bash
# Run unit tests
pnpm test

# Run e2e tests (requires running PostgreSQL + Redis)
pnpm --filter api test:e2e

# Run tests with coverage
pnpm --filter api test:cov
```

## Project Structure

```
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── common/         # Filters, pipes, services (shared)
│   │   │   ├── database/       # Drizzle schema, migrations, seed
│   │   │   ├── health/         # Health check + metrics endpoint
│   │   │   ├── ingest/         # Batch ingestion (CQRS commands, events)
│   │   │   ├── redis/          # Redis module
│   │   │   ├── sites/          # Site management (CQRS commands, queries)
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── test/               # E2E tests
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/            # App Router pages
│           ├── components/     # React components
│           ├── hooks/          # React Query hooks
│           └── lib/            # API client
├── packages/
│   └── shared/                 # Zod schemas, types, constants
├── docker-compose.yml          # Full stack (infra + app containers)
├── ARCHITECTURE.md             # Technical decisions & trade-offs
└── turbo.json                  # Turborepo config
```

## Key Features

- **Idempotent Ingestion:** Dual-layer (Redis + PostgreSQL) idempotency prevents duplicate data on network retries
- **Pessimistic Locking:** `SELECT ... FOR UPDATE` ensures atomic emission total updates under concurrent writes
- **CQRS Pattern:** Command/Query separation with event-driven side effects via `@nestjs/cqrs`
- **Transactional Outbox:** Guarantees downstream event delivery for alerting services
- **Type-Safe Contract:** Shared Zod schemas between frontend and backend
- **API Versioning:** URI-based (`/api/v1/`) for backward-compatible IoT sensor support
- **Observability:** Structured logging tracking ingestion counts, duplicate rejections, and lock wait times

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical decisions and trade-offs.

## Deployment

The repo ships with **vercel.json** and **railway.toml** so any developer can deploy their own instance with minimal effort.

---

### 1. Backend → Railway

Railway will provision the API, PostgreSQL, and Redis from a single GitHub connection.

#### Steps

1. **Create a Railway project** at [railway.app](https://railway.app) → _New Project → Deploy from GitHub Repo_.
2. Select this repository. Railway auto-detects `railway.toml` and will build using the API Dockerfile.
3. **Add plugins** inside the same project:
   - _+ New_ → **PostgreSQL** (provisions a managed instance)
   - _+ New_ → **Redis** (provisions a managed instance)
4. Railway auto-injects `DATABASE_URL`, `REDIS_URL`, etc. into the API service. Open **Variables** on the API service and add / verify:

| Variable       | Value                         | Notes                                                              |
| -------------- | ----------------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL` | _auto from PostgreSQL plugin_ | Usually set automatically via reference variable                   |
| `REDIS_HOST`   | _auto from Redis plugin_      | Use `${{Redis.REDIS_HOST}}` reference                              |
| `REDIS_PORT`   | _auto from Redis plugin_      | Use `${{Redis.REDIS_PORT}}` reference                              |
| `PORT`         | Railway injects automatically | Do **not** set manually                                            |
| `CORS_ORIGIN`  | `https://your-app.vercel.app` | Set this **after** deploying the frontend                          |
| `SEED_DB`      | `true`                        | Set to `true` on first deploy to populate sample data, then remove |
| `NODE_ENV`     | `production`                  |                                                                    |

5. Click **Deploy**. Railway builds the Dockerfile, runs migrations via the entrypoint script, and starts the server.
6. Once deployed, copy the public URL (e.g. `https://your-api-production.up.railway.app`).

> **Health check**: Railway is configured to probe `/api/health` — if the build succeeds but the deploy shows unhealthy, check the DATABASE_URL and REDIS variables.

---

### 2. Frontend → Vercel

#### Steps

1. **Import the repository** at [vercel.com](https://vercel.com) → _Add New Project → Import Git Repository_.
2. Vercel auto-detects `vercel.json`. It will:
   - Install dependencies with `corepack enable && pnpm install`
   - Build only the `web` app via the configured build command
   - Only trigger re-deploys when `apps/web/` or `packages/shared/` change (ignore command)
3. Set environment variables under **Settings → Environment Variables**:

| Variable              | Value                                        | Notes                                |
| --------------------- | -------------------------------------------- | ------------------------------------ |
| `NEXT_PUBLIC_API_URL` | `https://your-api-production.up.railway.app` | The Railway public URL from step 1.6 |

4. Click **Deploy**.

> **Monorepo root directory**: You do **not** need to change the root directory in Vercel — the `vercel.json` at the repo root handles the monorepo build commands.

---

### 3. Post-Deploy Checklist

- [ ] Set `CORS_ORIGIN` in Railway to your Vercel frontend URL
- [ ] Set `NEXT_PUBLIC_API_URL` in Vercel to your Railway backend URL
- [ ] Redeploy both services after updating environment variables
- [ ] Verify health: `curl https://your-api.up.railway.app/api/health`
- [ ] Verify frontend loads and shows site data

---

### 4. Docker (Self-Hosted)

Run the full stack anywhere Docker is available:

```bash
cp .env.example .env   # edit values as needed
docker compose --profile full up --build -d
```

This launches PostgreSQL, Redis, the API (with auto-migration + optional seed), and the frontend behind a single command.

## License

Private — Highwood Engineering Assessment
