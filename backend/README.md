# Backend — OmniAffiliate AI Engine

NestJS monoservice powering the affiliate automation platform. Runs on **port 3001**.

---

## Quick Start

```bash
npm install
npm run dev          # ts-node-dev with hot reload
```

Swagger docs: `http://localhost:3001/docs`

---

## Environment Variables

Create `backend/.env` from the root `.env.example`:

```bash
# 4 isolated databases
DATABASE_URL_PRODUCTS=postgresql://postgres:postgres_dev@localhost:5432/products_db
DATABASE_URL_CONTENT=postgresql://postgres:postgres_dev@localhost:5433/content_db
DATABASE_URL_PUBLISH=postgresql://postgres:postgres_dev@localhost:5434/publish_db
DATABASE_URL_CONFIG=postgresql://postgres:postgres_dev@localhost:5435/config_db

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

## Module Map

| Module | Database | Purpose |
|--------|----------|---------|
| `product-management` | `products_db` | Product CRUD, status lifecycle, DNA storage |
| `content-factory` | `content_db` | AI content generation, status machine |
| `distribution-hub` | `publish_db` | Platform publishing, publish logs |
| `source-connector` | *(none)* | Data ingestion from affiliate networks |
| `config` | `config_db` | Prompt templates, connector status |
| `queue-engine` | *(Redis)* | BullMQ job orchestration |
| `shared/ai` | *(none)* | LLM-agnostic AI adapter (Gemini impl) |

---

## API Routes

### Products (`/api/products`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | List with filters: `search`, `status`, `page`, `limit` |
| GET | `/products/:id` | Single product with DNA |
| POST | `/products` | Create product |
| PUT | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |
| POST | `/products/:id/extract-dna` | Trigger Product DNA extraction |
| GET | `/api/internal/products/:id` | Internal — used by content-factory |
| POST | `/api/internal/products` | Internal — bulk save from source-connector |

### Source Connector (`/api/source-connector`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/source-connector/ingest` | `{ source, keyword, limit }` → `{ jobId }` |
| GET | `/source-connector/jobs/:jobId` | Poll job status |
| POST | `/source-connector/import-csv` | `multipart/form-data` → `{ headers, rows, filePath }` |
| POST | `/source-connector/import-csv/confirm` | `{ filePath, mapping, source }` → `{ jobId }` |

### Content (`/api/content`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/content` | List with filters: `productId`, `platform`, `status`, `page`, `limit` |
| GET | `/content/:id` | Single content item |
| POST | `/content` | `{ productId, platform, contentType, promptId? }` → `{ contentId, jobId }` |
| POST | `/content/:id/generate` | Re-trigger AI generation (status must be RAW or FAILED) |
| PATCH | `/content/:id` | Edit `title` and/or `body` |
| PUT | `/content/:id/status` | Update status (validated transition) |

### Publishing (`/api/publishing`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/publishing/logs` | List logs with filters |
| GET | `/publishing/logs/:id` | Single publish log |
| POST | `/publishing/publish` | `{ contentId, platform }` → `{ publishLogId, jobId }` |

### Config (`/api/config`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/config/prompts` | List templates (no default `isActive` filter) |
| POST | `/config/prompts` | Create prompt template |
| PUT | `/config/prompts/:id` | Update template |
| DELETE | `/config/prompts/:id` | Delete template |
| GET | `/config/connector-status` | Boolean map of configured connectors |

---

## Key Patterns

### LLM-Agnostic AI Adapter
The `AIAdapter` interface (in `shared/ai/`) decouples content generation from Gemini:
```typescript
// To swap to Claude, change ONE line in ai.module.ts:
{ provide: AI_ADAPTER, useClass: ClaudeAdapter }  // instead of GeminiAdapter
```

### Worker Bootstrap
All BullMQ workers **must** be started via `OnApplicationBootstrap`:
```typescript
@Injectable()
class FooBootstrap implements OnApplicationBootstrap {
  constructor(private readonly processor: FooProcessor) {}
  onApplicationBootstrap() { this.processor.start(); }
}
```

### Cross-Module Communication
Modules never share a database. They communicate via internal REST:
```typescript
const res = await firstValueFrom(
  this.http.get(`${this.internalBase}/api/internal/products/${productId}`)
);
```

### Job Queue
Data contains IDs only — never full objects:
```typescript
await queueService.addJob(QUEUE_NAMES.CONTENT, JobName.GENERATE_CONTENT, { contentId });
```

---

## Database Migrations

```bash
# From repo root — migrate all 4 databases
npm run db:migrate

# Regenerate Prisma clients after schema changes
npm run db:generate
```

---

## Testing

```bash
npm test                        # All unit tests
npm run test:content-factory    # Content factory tests only
npm run test:coverage           # With coverage report
```

---

## TypeScript Check

```bash
npx tsc --noEmit
```
