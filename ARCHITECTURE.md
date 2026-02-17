# Architecture Decision Records

## Overview

This document explains the key technical decisions, trade-offs, and architectural patterns used in the Emissions Ingestion & Analytics Engine. The system is designed for **data integrity**, **resilience**, and **developer ergonomics**.

---

## System Architecture

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────┐
│   Next.js Web    │────▶│   NestJS API      │────▶│  PostgreSQL  │
│   (Dashboard)    │     │   (REST + CQRS)   │     │  (Primary)   │
│   Port 3000      │     │   Port 4000       │     │  Port 5432   │
└──────────────────┘     └───────┬───────────┘     └──────────────┘
                                 │
                                 ▼
                         ┌──────────────┐
                         │    Redis     │
                         │   (Cache)    │
                         │  Port 6379   │
                         └──────────────┘
```

### Monorepo Structure (Turborepo)

```
├── apps/
│   ├── api/          NestJS backend
│   └── web/          Next.js frontend
├── packages/
│   └── shared/       Zod schemas, types, constants
├── docker-compose.yml
└── turbo.json
```

**Why Turborepo?** It provides incremental builds, task caching, and parallel execution for a monorepo with multiple apps sharing code. The `@emissions/shared` package is consumed by both `apps/api` and `apps/web`, guaranteeing type-safe contracts (bonus task #7).

---

## Key Technical Decisions

### 1. Idempotency Strategy (Network Resilience)

**Problem:** Field devices in low-connectivity areas retry failed POST requests. Without protection, this causes duplicate records and double-counted emissions.

**Solution: Dual-layer idempotency**

- **Redis (fast path):** `Idempotency-Key` header → check Redis first (O(1) lookup, 24h TTL)
- **PostgreSQL (durable path):** `idempotency_keys` table as fallback if Redis is unavailable or after restart
- On cache hit → return stored response with `meta.duplicate: true`
- On cache miss → process normally, store response in both Redis and Postgres

**Trade-offs:**

- Extra storage cost (dual-write) traded for guaranteed consistency across Redis flushes
- 24h key expiry balances storage vs. practical retry windows for field devices
- Requires clients to send `Idempotency-Key` header (enforced by API)

### 2. Concurrency Control (Pessimistic Locking)

**Problem:** Multiple concurrent sensors updating the same site's `total_emissions_to_date` creates race conditions.

**Solution: `SELECT ... FOR UPDATE`**

- Within the ingestion transaction, we lock the target site row before reading it
- All measurements are inserted and the site total is updated atomically
- Concurrent requests for the same site queue behind the lock

**Why not Optimistic Locking?**

- Optimistic locking (version check + retry) creates a "thundering herd" under high concurrency to the same site
- For batch ingestion involving real monetary data (OGMP 2.0 reporting), we prefer guaranteed serial execution over retry complexity
- The lock scope is narrow (single row, single transaction) — throughput impact is minimal
- The `version` column exists on `sites` for future use cases (e.g., admin metadata updates) where optimistic locking is more appropriate

### 3. CQRS-lite Architecture Pattern

**Pattern:** Commands (writes) and Queries (reads) are separated into distinct handler classes using `@nestjs/cqrs`.

| Component                                                   | Purpose                     |
| ----------------------------------------------------------- | --------------------------- |
| `CreateSiteCommand` → `CreateSiteHandler`                   | Site creation logic         |
| `IngestMeasurementsCommand` → `IngestMeasurementsHandler`   | Atomic batch ingestion      |
| `GetSiteMetricsQuery` → `GetSiteMetricsHandler`             | Metrics aggregation (read)  |
| `ListSitesQuery` → `ListSitesHandler`                       | Site listing (read)         |
| `MeasurementsIngestedEvent` → `MeasurementsIngestedHandler` | Post-ingestion side effects |

**Why CQRS-lite and not full Event Sourcing?**

- Full event sourcing adds significant complexity (event store, projections, snapshots) disproportionate to current needs
- The command/query separation makes each handler testable in isolation
- Event bus allows adding side effects (alerting, logging) without touching ingestion logic
- Easy to evolve toward full CQRS/ES if audit requirements grow

### 4. Transactional Outbox Pattern

Every successful ingestion writes an `outbox_events` row within the same database transaction as the measurements and site update. This guarantees that:

- If the transaction commits → the event is persisted
- A downstream processor can poll `outbox_events` for unprocessed events
- No messages are lost even if Redis or external systems are down

This implements bonus task #4 and provides the foundation for a future alerting service.

### 5. API Versioning

**Strategy:** URI-based versioning (`/api/v1/sites`, `/api/v1/ingest`)

**Why URI-based?**

- Most explicit for IoT devices with limited HTTP header manipulation
- Easy to route different versions to different handlers
- NestJS built-in `@Version('1')` decorator makes it zero-cost to add
- Backward-compatible: older sensors stay on v1 while the platform evolves

### 6. Unified Error Response Envelope

All API responses follow this contract:

```json
{
  "success": true|false,
  "data": { ... },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [...]
  },
  "meta": {
    "timestamp": "ISO8601",
    "idempotency_key": "uuid",
    "duplicate": false
  }
}
```

This is enforced by:

- `GlobalExceptionFilter` for all errors
- Controller response wrappers for success cases
- Shared `ApiResponse<T>` type from `@emissions/shared`

A multi-team environment benefits from predictable response shapes regardless of which service or endpoint is called.

### 7. Type-Safe Contract (Shared Package)

The `@emissions/shared` package contains:

- **Zod schemas** (`CreateSiteSchema`, `IngestBatchSchema`) — single source of truth for validation
- **TypeScript types** derived from Zod (`z.infer<>`) — zero type drift
- **Constants** (`EMISSION_UNITS`, `COMPLIANCE_STATUS`) — shared enums

Both the NestJS API and Next.js frontend import from the same package, preventing desynchronization between client and server validation.

### 8. Observability

The `ObservabilityService` tracks:

- Total ingestions processed
- Total measurements recorded
- Duplicate rejections (idempotency cache hits)
- Lock acquisition wait times

These metrics are available at `GET /api/health` and logged at appropriate levels (`log` for normal operations, `warn` for duplicates and alerts).

### 9. Database Design

**Indexes for query performance:**

- `idx_measurements_site_id` — fast lookup by site
- `idx_measurements_timestamp` — time-range queries
- `idx_measurements_site_timestamp` — composite for site+time analytics
- `idx_measurements_batch_id` — trace ingestion batches
- `idx_outbox_unprocessed` — efficient polling for outbox processor

**`batch_id` on measurements:** Every ingestion batch gets a UUID, enabling:

- Traceability of which measurements came from which ingestion
- Potential rollback of an entire batch if needed
- Correlation with idempotency keys

### 10. Frontend Architecture

- **React Query (TanStack Query):** Provides automatic background refetching (5s interval), caching, retry, and optimistic updates
- **Polling over WebSockets:** Chosen for Vercel deployment compatibility and admin dashboard cadence (not real-time trading)
- **Client-side Zod validation:** The ingestion form validates with the same `IngestBatchSchema` before submission, providing instant feedback
- **Idempotency UX:** The form generates a UUID idempotency key, preserves it on retry, and surfaces the `meta.duplicate` flag clearly to the user

---

## Deployment Strategy

### Frontend → Vercel

Next.js deploys natively to Vercel with zero configuration. The `next.config.js` includes API rewrites for local development.

### Backend → Railway

NestJS runs as a long-lived Node.js process. Railway provides managed containers with PostgreSQL and Redis add-ons.

### Infrastructure → Docker Compose (local only)

PostgreSQL and Redis are containerized for local development. The application processes run natively for hot-reload DX.

---

## Future Considerations

1. **Table Partitioning:** When measurements exceed 100M rows, partition by month using PostgreSQL native partitioning
2. **Read Replicas:** Separate read queries (metrics, dashboards) to read replicas for write-heavy workloads
3. **Rate Limiting:** Add per-site rate limiting to prevent sensor malfunction floods
4. **Outbox Processor:** Background worker polling `outbox_events` to notify external alerting services
5. **Full CQRS:** Separate read/write databases when query patterns diverge significantly
