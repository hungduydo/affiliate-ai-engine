# Flow — OmniAffiliate AI Engine

Personal SaaS for affiliate marketing automation. Ingests products from affiliate networks, generates AI-written platform-specific content via Gemini, and auto-publishes to WordPress, Facebook, and Shopify.

---

## Architecture

**Monorepo** — `backend/` (NestJS) + `frontend/` (React/Vite) in one repo.

**Backend:** NestJS monoservice (single process) with **4 isolated PostgreSQL databases** — one per domain module. No shared Prisma client, no cross-module foreign keys. Modules communicate via internal REST APIs (`/api/internal/*`). BullMQ on Redis for async job processing.

**Frontend:** React 19 + Vite, feature-module layout, TanStack Query v5 for server state, Zustand for local state. **Not Next.js** — never add `"use client"` directives.

---

## Running the project

```bash
# Start infrastructure (Postgres x4 + Redis)
npm run infra:up

# Run backend + frontend concurrently
npm run dev

# Migrate all 4 databases
npm run db:migrate

# Regenerate all Prisma clients
npm run db:generate
```

Individual:
```bash
cd backend && npm run dev      # http://localhost:3001
cd frontend && npm run dev     # http://localhost:5173
```

Swagger docs: `http://localhost:3001/docs`

---

## Tech stack

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/common` | ^11 | Framework |
| `@prisma/client` | ^7 | ORM (4 separate instances) |
| `bullmq` | ^5 | Job queue |
| `ioredis` | ^5 | Redis client |
| `@google/generative-ai` | ^0.24 | Gemini AI |
| `playwright` | ^1.58 | Shopee scraper |
| `csv-parse` | ^6 | CSV import |
| `@nestjs/axios` | ^4 | HTTP client for internal calls |
| `class-validator` | ^0.14 | DTO validation |

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19 | UI |
| `react-router-dom` | ^7 | Routing |
| `@tanstack/react-query` | ^5 | Server state |
| `axios` | ^1 | HTTP client |
| `zustand` | ^5 | Local state |
| `tailwindcss` | ^4 | Styling |
| `lucide-react` | ^1 | Icons |

---

## Environment variables

Copy `.env.example` to `backend/.env` and fill in values.

```bash
# 4 isolated databases
DATABASE_URL_PRODUCTS=postgresql://postgres:postgres_dev@localhost:5432/products_db
DATABASE_URL_CONTENT=postgresql://postgres:postgres_dev@localhost:5432/content_db
DATABASE_URL_PUBLISH=postgresql://postgres:postgres_dev@localhost:5432/publish_db
DATABASE_URL_CONFIG=postgresql://postgres:postgres_dev@localhost:5432/config_db

REDIS_URL=redis://localhost:6379
BACKEND_INTERNAL_URL=http://localhost:3001

# AI
GOOGLE_API_KEY=
GEMINI_MODEL=gemini-1.5-pro

# Source connectors
CLICKBANK_DEV_API_KEY=
CLICKBANK_CLERK_ID=
CJ_WEBSITE_ID=
CJ_API_TOKEN=
SHOPEE_COOKIE_FILE_PATH=./shopee-cookies.json

# Publishing
WORDPRESS_URL=
WORDPRESS_USERNAME=
WORDPRESS_APP_PASSWORD=
FACEBOOK_PAGE_ID=
FACEBOOK_ACCESS_TOKEN=
SHOPIFY_STORE_URL=
SHOPIFY_ACCESS_TOKEN=
SHOPIFY_BLOG_ID=
```

---

## Backend structure

```
backend/src/
├── app.module.ts                        # Root module (ConfigModule.forRoot isGlobal: true)
├── main.ts                              # Bootstrap, port 3001, Swagger at /docs
├── health.controller.ts                 # GET /health
│
├── modules/
│   ├── product-management/              # DB: products_db
│   │   ├── prisma/schema.prisma         # Product model, ProductStatus enum
│   │   ├── application/products.service.ts
│   │   ├── infrastructure/
│   │   │   ├── deeplink-generator.ts
│   │   │   └── prisma-product.repository.ts
│   │   ├── presentation/
│   │   │   ├── products.controller.ts          # GET/POST/PUT/DELETE /products
│   │   │   └── products.internal.controller.ts # GET/POST /api/internal/products
│   │   └── product-management.module.ts
│   │
│   ├── source-connector/                # No DB (uses product-management internal API)
│   │   ├── application/product-ingestion.service.ts
│   │   ├── infrastructure/adapters/
│   │   │   ├── clickbank/clickbank.adapter.ts + clickbank.mapper.ts
│   │   │   ├── cj/cj.adapter.ts + cj.mapper.ts
│   │   │   ├── shopee/shopee.playwright.adapter.ts + shopee.mapper.ts
│   │   │   └── csv/csv.importer.ts
│   │   ├── presentation/
│   │   │   ├── source.controller.ts    # POST /source-connector/ingest
│   │   │   └── csv.controller.ts       # POST /source-connector/import-csv
│   │   └── source-connector.module.ts  # SourceConnectorBootstrap (OnApplicationBootstrap)
│   │
│   ├── content-factory/                 # DB: content_db
│   │   ├── prisma/schema.prisma         # Content model, ContentStatus/Platform/ContentType enums
│   │   ├── application/
│   │   │   ├── content.service.ts       # CRUD + update()
│   │   │   └── content-generation.service.ts  # Gemini orchestration
│   │   ├── infrastructure/gemini.adapter.ts   # @google/generative-ai, JSON output parsing
│   │   ├── processors/content-generation.processor.ts  # BullMQ worker, concurrency 2
│   │   ├── presentation/
│   │   │   ├── content.controller.ts           # GET/POST/PATCH/PUT /content
│   │   │   └── content.internal.controller.ts  # GET/PUT /api/internal/content
│   │   └── content-factory.module.ts    # ContentFactoryBootstrap (OnApplicationBootstrap)
│   │
│   ├── distribution-hub/                # DB: publish_db
│   │   ├── prisma/schema.prisma         # PublishLog model, PublishStatus enum
│   │   ├── application/
│   │   │   ├── publishing.service.ts    # createLog(), getLogs()
│   │   │   └── publish-content.service.ts  # Routes to platform adapters
│   │   ├── infrastructure/
│   │   │   ├── wordpress.adapter.ts    # POST /wp-json/wp/v2/posts, Basic auth
│   │   │   ├── facebook.adapter.ts     # POST graph.facebook.com/v19.0/{pageId}/feed
│   │   │   └── shopify.adapter.ts      # POST /admin/api/2024-01/blogs/{id}/articles.json
│   │   ├── processors/publish-content.processor.ts  # BullMQ worker, concurrency 3
│   │   ├── presentation/
│   │   │   ├── publishing.controller.ts          # GET /publishing/logs, POST /publishing/publish
│   │   │   └── publishing.internal.controller.ts
│   │   └── distribution-hub.module.ts   # DistributionBootstrap (OnApplicationBootstrap)
│   │
│   ├── config/                          # DB: config_db
│   │   ├── prisma/schema.prisma         # PromptTemplate model
│   │   ├── application/prompt-templates.service.ts  # CRUD; no isActive default filter
│   │   ├── presentation/config.controller.ts
│   │   │   # GET/POST/PUT/DELETE /config/prompts
│   │   │   # GET /config/connector-status  (env var presence, no values)
│   │   └── config.module.ts
│   │
│   └── queue-engine/
│       ├── queue.service.ts             # addJob(), getQueue()
│       ├── queue.constants.ts           # QUEUE_NAMES, JobName enum
│       ├── processors/product-scraper.processor.ts  # Routes SCRAPE_PRODUCT / IMPORT_CSV
│       └── queue-engine.module.ts
│
└── shared/
    ├── filters/global-exception.filter.ts
    ├── types/common.types.ts
    └── utils/prompt-renderer.ts         # renderPrompt(template, vars) — {{variable}} substitution
```

### Key backend patterns

**Workers must be started via `OnApplicationBootstrap`:**
```typescript
@Injectable()
class FooBootstrap implements OnApplicationBootstrap {
  constructor(private readonly processor: FooProcessor) {}
  onApplicationBootstrap() { this.processor.start(); }
}
// Add FooBootstrap to providers array in module
```

**Cross-module calls use internal REST (no shared DB):**
```typescript
// content-factory calling product-management
const res = await firstValueFrom(
  this.http.get(`${this.internalBase}/api/internal/products/${productId}`)
);
```

**Job queue — data contains IDs only, never full objects:**
```typescript
await queueService.addJob(QUEUE_NAMES.CONTENT_GENERATION, JobName.GENERATE_CONTENT, { contentId });
```

**Prisma path aliases** (`tsconfig.json`):
- `@shared/*` → `src/shared/*`
- `@modules/*` → `src/modules/*`

---

## Frontend structure

```
frontend/src/
├── core/
│   ├── api/
│   │   ├── api-client.ts        # Axios instance, baseURL /api (proxied to :3001)
│   │   └── api.types.ts         # Product, Content, PublishLog, PromptTemplate, ConnectorStatus, enums
│   ├── query/query-client.ts
│   └── router/AppRouter.tsx     # All routes
│
├── shared/
│   ├── layout/
│   │   ├── AppLayout.tsx        # Sidebar + outlet
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── ui/StatusBadge.tsx       # Renders ContentStatus / PublishStatus / ProductStatus
│   └── utils/
│       ├── cn.ts                # clsx + tailwind-merge
│       └── format.ts            # formatDate()
│
└── modules/
    ├── dashboard/
    │   └── pages/DashboardPage.tsx      # 4 live metric cards (products, generated, published, pending)
    │
    ├── products/
    │   ├── pages/
    │   │   ├── ProductListPage.tsx      # Table + filters + pagination
    │   │   ├── ProductDetailPage.tsx    # Single product view
    │   │   └── ProductImportPage.tsx    # Tabs: Live Ingest | CSV Import
    │   ├── components/
    │   │   ├── IngestionForm.tsx         # Source/keyword/limit → POST /source-connector/ingest
    │   │   ├── JobStatusCard.tsx         # Polls job status every 2s, fires onComplete callback
    │   │   ├── CsvUpload/CsvDropzone.tsx
    │   │   ├── CsvUpload/ColumnMapper.tsx
    │   │   ├── CsvUpload/ImportPreview.tsx
    │   │   └── ProductTable/ProductTable.tsx
    │   ├── hooks/useProducts.ts
    │   └── services/
    │       ├── products.service.ts
    │       └── import.service.ts         # ingest(), uploadCsv(), confirmCsv(), getJobStatus()
    │
    ├── content/
    │   ├── pages/
    │   │   ├── ContentListPage.tsx       # Table + status flow strip + Regenerate/Publish actions
    │   │   ├── ContentGeneratePage.tsx   # Product search → generate → job poll → preview → approve
    │   │   └── ContentEditorPage.tsx     # View/edit title+body, Approve/Publish/Regenerate buttons
    │   ├── hooks/useContent.ts
    │   └── services/content.service.ts  # getMany, getById, generate, triggerGenerate, update, updateStatus
    │
    ├── publishing/
    │   ├── pages/PublishingPage.tsx      # Logs table, auto-refresh, Publish Content modal
    │   └── services/publishing.service.ts  # getLogs, getLogById, publish
    │
    └── settings/
        ├── pages/SettingsPage.tsx        # Tabs: Prompt Templates | Connectors
        ├── components/
        │   ├── PromptTemplateTable.tsx   # CRUD list with edit/delete
        │   ├── PromptTemplateForm.tsx    # Create/edit modal with {{variable}} hint buttons
        │   └── ConnectorStatus.tsx       # Live grid from GET /config/connector-status
        └── services/settings.service.ts  # getPrompts (no default isActive), createPrompt, updatePrompt, deletePrompt, getConnectorStatus
```

### Frontend routes

```
/                      → redirect /dashboard
/dashboard             → DashboardPage
/products              → ProductListPage
/products/import       → ProductImportPage   (must come before /products/:id)
/products/:id          → ProductDetailPage
/content               → ContentListPage
/content/generate      → ContentGeneratePage (must come before /content/:id)
/content/:id           → ContentEditorPage
/publishing            → PublishingPage
/settings              → SettingsPage
```

### Frontend conventions

- **No `"use client"`** — this is Vite/React, not Next.js. Ignore any suggestions to add it.
- **TanStack Query v5** — `onSuccess` on `useQuery` is removed. Use `useEffect` watching query data instead.
- **API proxy** — `vite.config.ts` proxies `/api/*` → `http://localhost:3001`. Frontend calls `/api/content`, backend serves `/content` (global prefix `api`).
- **Path aliases** — `@core`, `@shared`, `@modules` configured in `vite.config.ts` + `tsconfig.app.json`.
- **Dark theme** — zinc/neutral palette, violet accent. No light mode.

---

## API reference

### Products (`/api/products`)
```
GET    /products                    # List with filters: search, status, page, limit
GET    /products/:id                # Single product
POST   /products                    # Create product
PUT    /products/:id                # Update product
DELETE /products/:id                # Delete product
GET    /api/internal/products/:id   # Internal — used by content-factory
POST   /api/internal/products       # Internal — used by source-connector to bulk-save
```

### Source Connector (`/api/source-connector`)
```
POST   /source-connector/ingest                 # { source, keyword, limit } → { jobId }
GET    /source-connector/jobs/:jobId            # Poll job status
POST   /source-connector/import-csv             # multipart/form-data → { headers, rows, filePath }
POST   /source-connector/import-csv/confirm     # { filePath, mapping, source } → { jobId }
```

### Content (`/api/content`)
```
GET    /content                     # List with filters: productId, platform, status, page, limit
GET    /content/:id                 # Single content
POST   /content                     # { productId, platform, contentType, promptId? } → { contentId, jobId }
POST   /content/:id/generate        # Re-trigger AI generation (status must be RAW or FAILED)
PATCH  /content/:id                 # { title?, body? } — edit content
PUT    /content/:id/status          # { status } — update status (validated transition)
GET    /api/internal/content/:id    # Internal
PUT    /api/internal/content/:id/status  # Internal — used by distribution-hub after publishing
```

### Publishing (`/api/publishing`)
```
GET    /publishing/logs             # List with filters: contentId, platform, status, page, limit
GET    /publishing/logs/:id         # Single log
POST   /publishing/publish          # { contentId, platform } → { publishLogId, jobId }
```

### Config (`/api/config`)
```
GET    /config/prompts              # List templates — filters: platform, contentType, isActive (optional, no default)
GET    /config/prompts/:id
POST   /config/prompts              # { name, platform, contentType, template, isActive? }
PUT    /config/prompts/:id          # { name?, template?, isActive? }
DELETE /config/prompts/:id
GET    /config/connector-status     # { clickbank, cj, shopee, wordpress, facebook, shopify, gemini } — booleans only
GET    /api/internal/prompts        # Internal — used by content-factory during generation
```

---

## Data flow

### Product ingestion
```
Frontend form → POST /source-connector/ingest → BullMQ job
→ ProductScraperProcessor → ClickBankAdapter | CJAdapter | ShopeeAdapter | CsvImporter
→ POST /api/internal/products (bulk save)
→ Job state tracked in Redis (BullMQ native)
```

### Content generation
```
Frontend → POST /content { productId, platform, contentType }
→ ContentController creates RAW content → enqueues GENERATE_CONTENT job → returns { contentId, jobId }
→ ContentGenerationProcessor (concurrency 2):
  1. status → AI_PROCESSING
  2. GET /api/internal/products/:productId
  3. GET /api/internal/prompts?platform=...&contentType=...
  4. renderPrompt(template, productData)  ← {{name}}, {{price}}, {{description}}, etc.
  5. GeminiAdapter.generate(prompt)  ← JSON response { title, body }
  6. status → GENERATED (or FAILED)
→ Frontend polls GET /content/:id until status changes
```

### Publishing
```
Frontend → POST /publishing/publish { contentId, platform }
→ PublishingController creates PublishLog (PENDING) → enqueues PUBLISH_CONTENT job → returns { publishLogId, jobId }
→ PublishContentProcessor (concurrency 3):
  1. status → PUBLISHING
  2. GET /api/internal/content/:contentId
  3. Route by platform → WordPressAdapter | FacebookAdapter | ShopifyAdapter
  4. status → PUBLISHED + publishedLink  (or FAILED + errorMessage)
  5. PUT /api/internal/content/:contentId/status { PUBLISHED }
```

---

## Database schemas (summary)

### products_db — `Product`
```
id, externalId (unique), source, name, description?, price?, commission?,
affiliateLink (unique), imageUrl?, rawData (Json), status (ACTIVE|INACTIVE|PENDING),
metadata?, createdAt, updatedAt
Indexes: source, status
```

### content_db — `Content`
```
id, productId (no FK), platform (WORDPRESS|FACEBOOK|TIKTOK|YOUTUBE|SHOPIFY),
contentType (BLOG_POST|SOCIAL_POST|VIDEO_SCRIPT), title?, body,
mediaAssets?, promptId?, status (RAW|AI_PROCESSING|GENERATED|PENDING_APPROVAL|PUBLISHING|PUBLISHED|FAILED),
createdAt, updatedAt
Indexes: productId, status
```

### publish_db — `PublishLog`
```
id, contentId (no FK), platform, publishedLink?, status (PENDING|PUBLISHING|PUBLISHED|FAILED),
errorMessage?, publishedAt?, createdAt
Indexes: contentId, status
```

### config_db — `PromptTemplate`
```
id, name, platform, contentType, template (string with {{variables}}),
isActive (default true), createdAt, updatedAt
Index: isActive
```

### Prompt template variables
`{{name}}` `{{description}}` `{{price}}` `{{commission}}` `{{affiliateLink}}`

---

## Key gotchas

### `isActive` filter on prompt templates
`GET /config/prompts` with **no `isActive` param** returns ALL templates (for the management UI).
`GET /api/internal/prompts` used during content generation should pass `isActive=true`.
The service default was previously `true`, which broke the settings UI — it's now `undefined` (no filter).

### Worker bootstrap
All three BullMQ workers must have their `start()` called via `OnApplicationBootstrap`. Without it, jobs queue but never process. See `SourceConnectorBootstrap`, `ContentFactoryBootstrap`, `DistributionBootstrap` in each module.

### Route order in AppRouter
`/products/import` must be declared **before** `/products/:id`, and `/content/generate` before `/content/:id`, to avoid the literal paths being matched as IDs.

### TanStack Query v5
`onSuccess` on `useQuery` is removed in v5. Use:
```typescript
useEffect(() => {
  if (data && condition) doSomething(data);
}, [data]);
```

### Shopee adapter
Requires pre-saved cookies at `SHOPEE_COOKIE_FILE_PATH`. Load cookies from browser DevTools after manual login to `affiliate.shopee.vn`. The adapter intercepts network responses — exact API endpoint path may need updating if Shopee changes their internal API.

### Content body on creation
`POST /content` for AI generation sends `body: ''`. The `body` field in `CreateContentDto` is optional — `ContentService.create()` defaults to `''`.

---

## TypeScript checks

```bash
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

Both must pass clean before any commit.

---

## Documentation Requirements

**When starting backend work (modifying `backend/src`):**
- **MUST** read `BACKEND.md` first to understand module responsibilities, data flows, and patterns
- **MUST** update `BACKEND.md` if adding new modules, changes to data flows, or new architecture decisions

**When starting frontend work (modifying `frontend/src`):**
- **MUST** read `FRONTEND.md` first to understand component structure, state management, and patterns
- **MUST** update `FRONTEND.md` if adding new page modules, changing state management, or new routing patterns

**When adding/updating significant features:**
- Update the relevant documentation (`BACKEND.md` or `FRONTEND.md`) with:
  - What the feature does
  - When it's used (user flow)
  - How it's implemented (code patterns, key classes/components)
  - Any new modules, services, or state management added

Example: Adding product enrichment feature
- Update `BACKEND.md` — add enrichment service flow in "Source-Connector Module" section
- Update `FRONTEND.md` — add enrichment button to ProductDetailPage in "Product Module" section

---

## NEVER

- **Never read `node_modules/` folder** — it's auto-generated dependencies, provides no project context, and bloats responses.
- **Never read `.env` files** — they contain secrets and are not committed. Use `.env.example` for reference instead.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
