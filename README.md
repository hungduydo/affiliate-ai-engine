# Flow — OmniAffiliate AI Engine

Personal SaaS for affiliate marketing automation. Ingests products from affiliate networks, generates AI-written platform-specific content via Gemini, and auto-publishes to WordPress, Facebook, and Shopify.

---

## Quick Start

```bash
# 1. Start infrastructure (Postgres ×4 + Redis)
npm run infra:up

# 2. Run backend + frontend concurrently
npm run dev

# 3. Migrate all 4 databases (first time only)
npm run db:migrate

# 4. Regenerate all Prisma clients (after schema changes)
npm run db:generate
```

Individual services:
```bash
cd backend && npm run dev      # http://localhost:3001
cd frontend && npm run dev     # http://localhost:5173
```

Swagger API docs: `http://localhost:3001/docs`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Monorepo Root                            │
│                                                                 │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐ │
│  │      backend/           │  │       frontend/              │ │
│  │   NestJS Monoservice    │  │    React 19 + Vite           │ │
│  │   Port: 3001            │  │    Port: 5173                │ │
│  │                         │  │                              │ │
│  │  ┌───────────────────┐  │  │  ┌──────────────────────┐   │ │
│  │  │ product-management│  │  │  │  TanStack Query v5   │   │ │
│  │  │ content-factory   │  │  │  │  Zustand stores      │   │ │
│  │  │ distribution-hub  │  │  │  │  React Router v7     │   │ │
│  │  │ source-connector  │  │  │  └──────────────────────┘   │ │
│  │  │ config            │  │  └──────────────────────────────┘ │
│  │  │ queue-engine      │  │                                 │
│  │  └───────────────────┘  │                                 │
│  └─────────────────────────┘                                 │
│                                                               │
│  Infrastructure (Docker):                                     │
│  ├── products_db   (PostgreSQL :5432)                        │
│  ├── content_db    (PostgreSQL :5433)                        │
│  ├── publish_db    (PostgreSQL :5434)                        │
│  ├── config_db     (PostgreSQL :5435)                        │
│  └── Redis         (:6379)                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Product Ingestion
```
Form → POST /source-connector/ingest → BullMQ
     → ClickBankAdapter | CJAdapter | ShopeeAdapter | CsvImporter
     → POST /api/internal/products (bulk save, status=ENRICHED or RAW)
```

### Product Enrichment
```
RAW product → BullMQ ENRICH_PRODUCT job
           → ShopeeDetailFetcher | LazadaDetailFetcher
           → Playwright scrapes product page
           → status=ENRICHED, metadata populated
```

### Product DNA Extraction (CaaS Phase 1)
```
ENRICHED product → POST /products/:id/extract-dna
                → GeminiAdapter.extractProductDNA()
                → { coreProblem, keyFeatures, targetPersona,
                    objectionHandling, visualAnchors }
                → status=ACTIVE, productDna saved
```

### Content Generation (CaaS Phase 2)
```
POST /content { productId, platform, contentType }
  → ContentGenerationProcessor (BullMQ, concurrency 2)
  → GET product + DNA from internal API
  → renderPrompt(template, productData)
  → ai.generateWithDNA(prompt, dna) | ai.generate(prompt)
  → status=GENERATED
```

### Publishing
```
POST /publishing/publish { contentId, platform }
  → PublishContentProcessor (BullMQ, concurrency 3)
  → WordPressAdapter | FacebookAdapter | ShopifyAdapter
  → status=PUBLISHED + publishedLink
```

---

## Product Status Pipeline

```
RAW ──────► ENRICHED ──────► ACTIVE ──────► INACTIVE
(CSV import)  (detail fetched)  (DNA extracted)

RAW: Imported via CSV or source connector (no product detail)
ENRICHED: Playwright fetched product page, metadata populated
ACTIVE: Product DNA extracted — ready for AI content generation
INACTIVE: Manually disabled
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11, TypeScript 5 |
| Database | PostgreSQL (×4 isolated), Prisma 7 |
| Queue | BullMQ 5 on Redis |
| AI | Google Gemini via LLM-agnostic AIAdapter interface |
| Scraping | Playwright 1.58 |
| Frontend | React 19, Vite 8, TailwindCSS 4 |
| State | TanStack Query v5, Zustand 5 |
| Routing | React Router v7 |

---

## Project Structure

```
flow/
├── backend/          # NestJS API (see backend/README.md)
├── frontend/         # React app (see frontend/README.md)
├── infra/            # Docker infrastructure
├── docs/             # Architecture documentation
├── docker-compose.yml
├── docker-init.sql
└── CLAUDE.md         # AI assistant context
```

---

## Environment Setup

Copy `.env.example` to `backend/.env` and fill in values. See [backend/README.md](backend/README.md) for details.

---

## TypeScript Checks

```bash
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

Both must pass clean before committing.
