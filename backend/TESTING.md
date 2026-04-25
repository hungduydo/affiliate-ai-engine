# Testing Guide — flow/backend

## Prerequisites

Infrastructure must be running before any test that touches a real database:

```bash
cd /Users/user/develop/ommani-platform
docker compose up -d
```

Verify:
```bash
docker compose ps   # postgres + redis should be healthy
```

---

## Run all unit tests

```bash
cd flow/backend
npm test
```

Runs every `*.spec.ts` file under `src/`. No database required — all dependencies are mocked.

---

## Run tests for a specific module

```bash
# Content factory (all specs)
npm run test:content-factory

# A single file
npx jest trending-video.adapter
npx jest content-factory.e2e
npx jest direct.adapter
npx jest content-generation.service
npx jest content.service
```

---

## Run with coverage

```bash
npm run test:coverage
```

Coverage thresholds: 70% branches · 75% functions · 75% lines · 75% statements.

---

## Watch mode (re-runs on file save)

```bash
npm run test:watch
```

---

## Database migrations (required before e2e)

Each module has its own Prisma schema and database. Run them individually:

```bash
# From flow/backend/
npx prisma migrate dev --config src/modules/product-management/prisma.config.ts --name <migration-name>
npx prisma migrate dev --config src/modules/content-factory/prisma.config.ts    --name <migration-name>
npx prisma migrate dev --config src/modules/distribution-hub/prisma.config.ts   --name <migration-name>
npx prisma migrate dev --config src/modules/config/prisma.config.ts             --name <migration-name>
```

Or use the root-level scripts (from `flow/`):

```bash
npm run db:migrate:products
npm run db:migrate:content
npm run db:migrate:publish
npm run db:migrate:config
```

After a schema change, regenerate Prisma clients:

```bash
npm run db:generate   # regenerates all four clients
```

---

## What each test file covers

| File | What it tests |
|------|---------------|
| `source-connector/__tests__/trending-video.adapter.spec.ts` | `TrendingVideoAdapter` — job creation, polling, approval filter, limit, error handling, platform URL mapping |
| `content-factory/__tests__/content-factory.e2e.spec.ts` | `ContentService.updateMediaAssets()`, `create()` with `sourceVideoUrl`, `ContentGenerationService` VIDEO_SCRIPT → BullMQ video job dispatch |
| `content-factory/__tests__/content-generation.service.spec.ts` | AI generation flow, DNA-enhanced generation, prompt template selection, error handling |
| `content-factory/__tests__/content.service.spec.ts` | CRUD, status transitions, pagination |
| `distribution-hub/__tests__/direct.adapter.spec.ts` | WordPress/Shopify publish, Facebook delegation to flow-accounts |
| `source-connector/__tests__/csv.importer.spec.ts` | CSV preview and import |

---

## Common issues

**`DATABASE_URL_* not set` errors**
The `.env` file must exist at `flow/backend/.env` with all four `DATABASE_URL_*` vars. Copy from `.env.example` and fill in values. Docker must be running.

**`prisma migrate dev` without `--config` fails**
Always pass `--config` pointing to the module-level `prisma.config.ts`. The bare `prisma migrate dev` command has no default schema.

**Tests pass locally but fail in CI**
Unit tests mock all external dependencies — no network or DB access. If CI fails, check that `jest-mock-extended` and `ts-jest` versions match `package.json`.
