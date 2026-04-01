# Backend Implementation Guide — Flow OmniAffiliate Engine

Comprehensive documentation of the NestJS backend architecture, module responsibilities, data flows, and implementation patterns for both LLMs and humans.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Modules](#core-modules)
3. [Data Flows](#data-flows)
4. [Database Design](#database-design)
5. [Queue System](#queue-system)
6. [Implementation Patterns](#implementation-patterns)
7. [API Reference](#api-reference)
8. [Key Design Decisions](#key-design-decisions)

---

## Architecture Overview

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/Vite)                    │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP Calls
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              NestJS Backend (Port 3001)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Route Handlers (Controllers)                        │   │
│  │  • Products, Content, Publishing, Config            │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────┼──────────────────────────────────┐   │
│  │  5 Domain Modules  │                                 │   │
│  ├────────────────────┼──────────────────────────────────┤   │
│  │ Product-Management (DB: products_db)                 │   │
│  │ Content-Factory    (DB: content_db)                  │   │
│  │ Distribution-Hub   (DB: publish_db)                  │   │
│  │ Config             (DB: config_db)                   │   │
│  │ Source-Connector   (No DB — uses product-mgmt API)   │   │
│  └────────────────────┬──────────────────────────────────┘   │
│                       │                                      │
│       ┌───────────────┼───────────────┐                      │
│       ▼               ▼               ▼                      │
│   PostgreSQL    BullMQ Queue      AI Adapter                │
│   (4 x DB)      (Redis)           (Gemini)                  │
└─────────────────────────────────────────────────────────────┘
```

### Module Communication Pattern

- **Same-module calls:** Direct service injection
- **Cross-module calls:** Internal REST APIs only (`/api/internal/*`)
- **Async work:** BullMQ job queue (Redis)
- **External APIs:** Gemini (AI), WordPress, Facebook, Shopify

**Why?** Complete isolation. Each module owns its database and can be tested, scaled, and maintained independently.

---

## Core Modules

### 1. Product-Management Module

**Responsibility:** Manage product catalog — create, read, update, delete products. Store product metadata, affiliate links, and enrichment data.

**When used:**
- User imports products from ClickBank, CJ, Shopee, or CSV
- User views product list or details
- Other modules need to fetch product info (content generation, publishing)

**Database:** `products_db`

**Key Classes:**

| Class | Purpose |
|-------|---------|
| `ProductsService` | Core business logic — CRUD, status transitions, enrichment |
| `PrismaProductRepository` | Data access — queries, filtering, pagination |
| `DeeplinkGenerator` | Generate affiliate URLs from source+externalId |
| `ProductsController` | Public REST endpoints (`/products`) |
| `ProductsInternalController` | Internal REST endpoints (`/api/internal/products`) |
| `ProductDnaService` | Extract AI-powered product DNA (brand, category, features) |

**Data Model:**
```
Product {
  id: UUID
  externalId: String (unique per source)
  source: CLICKBANK | CJ | SHOPEE | LAZADA | CSV
  name: String
  description?: String
  price?: Float
  commission?: Float
  affiliateLink: String (unique)
  imageUrl?: String
  rawData: JSON (original API response)
  status: RAW | ACTIVE | INACTIVE | PENDING
  enrichStatus: PENDING | ENRICHED | FAILED
  enrichedAt?: DateTime
  productDna?: JSON { brand, categories, keyFeatures, demographics }
  dnaExtractedAt?: DateTime
  metadata?: JSON { gallery, videos, rating, reviewCount, categories }
  createdAt, updatedAt
}
```

**Status Transitions:**
- `RAW` → `ACTIVE` (after enrichment)
- `ACTIVE` ↔ `INACTIVE` (manual)
- `PENDING` → `RAW` (enrichment failed)

**How to implement a new feature:**
```typescript
// Example: Add product to wishlist
// 1. Extend Product model in prisma/schema.prisma
// 2. Add method to ProductsRepository
// 3. Add method to ProductsService
// 4. Add endpoint to ProductsController
// 5. Update ProductsInternalController if other modules need it
```

---

### 2. Content-Factory Module

**Responsibility:** Generate platform-specific marketing content using AI (Gemini). Store content drafts and approve-for-publish workflow.

**When used:**
- User generates content from a product (create Content record)
- Background job processes AI generation
- User edits content, approves it, triggers publish

**Database:** `content_db`

**Key Classes:**

| Class | Purpose |
|-------|---------|
| `ContentService` | CRUD, status transitions, filtering |
| `ContentGenerationService` | Orchestrate AI generation, fetch product + template + render + call Gemini |
| `ContentGenerationProcessor` | BullMQ worker (concurrency 2) — processes GENERATE_CONTENT jobs |
| `ContentController` | Public REST (`/content`) |
| `ContentInternalController` | Internal REST (`/api/internal/content`) |

**Data Model:**
```
Content {
  id: UUID
  productId: String (no FK — references products_db)
  platform: WORDPRESS | FACEBOOK | TIKTOK | YOUTUBE | SHOPIFY
  contentType: BLOG_POST | SOCIAL_POST | VIDEO_SCRIPT | CAROUSEL | THREAD | HERO_COPY
  title?: String
  body: String (Markdown, initially '')
  mediaAssets?: JSON []
  promptId?: String (references config_db)
  status: RAW | AI_PROCESSING | GENERATED | PENDING_APPROVAL | PUBLISHING | PUBLISHED | FAILED
  createdAt, updatedAt
}
```

**Flow:**
1. **User creates content** — `POST /content { productId, platform, contentType, promptId? }`
   - Validates product exists (internal API call)
   - Creates Content record with status = `RAW`
   - Enqueues `GENERATE_CONTENT` job
   - Returns `{ contentId, jobId }`

2. **Job processes in background** (ContentGenerationProcessor)
   - Fetch Product data from `products_db` (internal API)
   - Fetch Prompt Template from `config_db` (internal API) or use default
   - Render template with product variables: `{{name}}`, `{{price}}`, `{{affiliateLink}}`
   - Call Gemini AI with filled prompt
   - Parse JSON response: `{ title, body }`
   - Update Content record with `title`, `body`, status = `GENERATED`

3. **User edits & approves** — `PATCH /content/:id { title?, body? }`
   - Edit content before publishing

4. **User triggers publish** — `PUT /content/:id/status { status: PUBLISHED }`
   - Status transitions are validated (see `ContentStatus` VO)
   - Enqueues publishing job in Distribution-Hub module

**Content Status Transitions:**
```
RAW → AI_PROCESSING → GENERATED → PENDING_APPROVAL → PUBLISHING → PUBLISHED
           ↓                          ↓                      ↓
        FAILED ─────────────────────────────────────────────┘
                    (can regenerate from GENERATED or FAILED)
```

**Key Implementation Detail — Prompt Templating:**
```typescript
// renderPrompt replaces {{variable}} patterns with product data
const filledPrompt = renderPrompt(template, {
  name: 'iPhone 15',
  price: 999,
  affiliateLink: 'https://example.com/click/...',
});
// Result: "Product: iPhone 15, Price: $999. Check it out at: https://..."
```

**How to add support for a new platform:**
1. Add `PLATFORM_NAME` to `Platform` enum in Prisma schema
2. Add content type variants in `ContentType` enum
3. Update `ContentGenerationService.buildDefaultPrompt()` with platform-specific templates
4. Add platform handler in `PublishContentService` (Distribution-Hub module)

---

### 3. Source-Connector Module

**Responsibility:** Ingest products from external affiliate networks (ClickBank, CJ, Shopee, Lazada) and CSV files. Handle product detail fetching and enrichment.

**When used:**
- User clicks "Ingest Products" — searches ClickBank/CJ for keyword
- User uploads CSV file with product data
- User triggers product enrichment (scrape images, ratings, etc.)

**Key Classes:**

| Class | Purpose |
|-------|---------|
| `ProductIngestionService` | Main orchestrator — route to adapter, bulk-save via internal API |
| `ProductEnrichmentService` | Queue detail-fetcher jobs (images, ratings, reviews) |
| `ClickBankAdapter` | Query ClickBank API, transform response to Product DTO |
| `CJAdapter` | Query Commission Junction API |
| `ShopeeAdapter` | Web scrape Shopee (Playwright) |
| `LazadaDetailFetcher` | Fetch product details from Lazada |
| `ShopeeDetailFetcher` | Fetch images, ratings, reviews from Shopee |
| `CsvImporter` | Parse CSV, validate columns, transform to Product DTO |
| `SourceController` | Public endpoint (`/source-connector/ingest`) |
| `CsvController` | CSV upload endpoints |

**Data Model (no internal DB):**
- Uses `Product` model from Product-Management module
- Creates/updates via internal REST API (`/api/internal/products`)

**Flow:**

#### Ingestion Flow
```
User submits form (source, keyword, limit)
  ↓
POST /source-connector/ingest { source, keyword, limit }
  ↓
ProductIngestionService.ingest()
  ├─ Route by source → ClickBankAdapter | CJAdapter | ShopeeAdapter
  ├─ Fetch from API
  ├─ Map response to CreateProductDto[]
  ├─ POST /api/internal/products (bulk-save)
  ├─ Enqueue SCRAPE_PRODUCT job (if auto-enrich enabled)
  └─ Return { jobId, count }
```

#### CSV Import Flow
```
User uploads CSV file
  ↓
POST /source-connector/import-csv (multipart/form-data)
  ↓
CsvImporter.parse()
  ├─ Validate headers
  ├─ Auto-detect columns
  └─ Return { headers, rows, filePath }

User maps CSV columns → product fields
  ↓
POST /source-connector/import-csv/confirm { filePath, mapping, source }
  ↓
ProductIngestionService.importCsv()
  ├─ Read CSV file
  ├─ Transform rows using mapping
  ├─ POST /api/internal/products (bulk-save)
  ├─ Enqueue IMPORT_CSV job
  └─ Return { jobId, productIds }
```

#### Enrichment Flow
```
BullMQ job: PRODUCT_ENRICHMENT { productId, source }
  ↓
ProductEnrichmentService.enrich()
  ├─ Fetch product from internal API
  ├─ Route by source → ShopeeDetailFetcher | LazadaDetailFetcher
  ├─ Fetch images, rating, reviewCount, categories
  ├─ POST /api/internal/products/:id/enrich { images, rating, ... }
  └─ Update status to ENRICHED
```

**Adapter Pattern:**
Each source (ClickBank, CJ, Shopee) has:
1. **Adapter** — API client, auth, pagination
2. **Mapper** — Transform API response to Product DTO

Example ClickBank:
```typescript
// clickbank.adapter.ts
async search(keyword: string, limit: number) {
  const response = await axios.get('https://api.clickbank.com/products', {
    headers: { Authorization: `Bearer ${this.apiKey}` },
    params: { query: keyword, limit },
  });
  return response.data.products; // Array of ClickBank products
}

// clickbank.mapper.ts
mapToProduct(cbProduct): CreateProductDto {
  return {
    externalId: cbProduct.productId,
    source: 'CLICKBANK',
    name: cbProduct.title,
    price: cbProduct.price,
    commission: cbProduct.commissionRate,
    // ...
  };
}
```

**How to add a new affiliate network:**
1. Create `new-source.adapter.ts` — API client + search/detail methods
2. Create `new-source.mapper.ts` — Transform to CreateProductDto
3. Update `ProductIngestionService.ingest()` to route to new adapter
4. Register in SourceConnectorModule providers

---

### 4. Distribution-Hub Module

**Responsibility:** Publish approved content to WordPress, Facebook, Shopify. Track publish logs and retry on failure.

**When used:**
- User clicks "Publish Content" button
- Background job routes content to platform adapter
- Content appears on WordPress, Facebook, or Shopify

**Database:** `publish_db`

**Key Classes:**

| Class | Purpose |
|-------|---------|
| `PublishingService` | Create PublishLog records, query logs |
| `PublishContentService` | Route to adapter by platform |
| `PublishContentProcessor` | BullMQ worker (concurrency 3) — processes PUBLISH_CONTENT jobs |
| `WordPressAdapter` | Create posts via XML-RPC or REST API |
| `FacebookAdapter` | Create feed posts via Graph API |
| `ShopifyAdapter` | Create blog articles via REST API |

**Data Model:**
```
PublishLog {
  id: UUID
  contentId: String (no FK — references content_db)
  platform: WORDPRESS | FACEBOOK | SHOPIFY
  publishedLink?: String (URL to published content)
  status: PENDING | PUBLISHING | PUBLISHED | FAILED
  errorMessage?: String
  publishedAt?: DateTime
  createdAt
}
```

**Flow:**
```
User clicks "Publish Content" for a GENERATED content
  ↓
POST /publishing/publish { contentId, platform }
  ↓
PublishingController
  ├─ Create PublishLog (status = PENDING)
  ├─ Enqueue PUBLISH_CONTENT job
  └─ Return { publishLogId, jobId }

BullMQ job processes:
  ↓
PublishContentProcessor.process()
  ├─ Update PublishLog status → PUBLISHING
  ├─ GET /api/internal/content/:contentId (fetch full content)
  ├─ Route by platform → WordPressAdapter | FacebookAdapter | ShopifyAdapter
  ├─ Adapter.publish(content) → { publishedLink }
  ├─ Update PublishLog status → PUBLISHED
  ├─ PUT /api/internal/content/:contentId/status { PUBLISHED }
  └─ Return success

On error:
  ├─ Catch exception
  ├─ Update PublishLog status → FAILED + errorMessage
  └─ Throw (BullMQ will retry)
```

**Adapter Pattern:**
Each platform has a `publish(content)` method that returns `{ publishedLink: string }`.

Example WordPress:
```typescript
// wordpress.adapter.ts
async publish(content: ContentDto) {
  const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
  const response = await axios.post(
    `${this.siteUrl}/wp-json/wp/v2/posts`,
    {
      title: content.title,
      content: content.body, // HTML
      status: 'publish',
    },
    { headers: { Authorization: `Basic ${auth}` } },
  );
  return { publishedLink: response.data.link };
}
```

**How to add a new publishing platform:**
1. Create `new-platform.adapter.ts` with `publish(content)` method
2. Update `PublishContentService.route()` to handle new platform
3. Add platform to `Platform` enum in content_db schema
4. Register adapter in DistributionHubModule

---

### 5. Config Module

**Responsibility:** Store and retrieve prompt templates and connector status. Templates are reusable AI prompts for different platform + content type combinations.

**When used:**
- Content generation job needs to fetch template for (platform, contentType)
- User views/edits prompt templates in settings UI
- API returns connector status (which integrations are configured)

**Database:** `config_db`

**Key Classes:**

| Class | Purpose |
|-------|---------|
| `PromptTemplatesService` | CRUD prompt templates, no filter defaults |
| `ConfigController` | Public endpoints (`/config/prompts`, `/config/connector-status`) |
| `ConfigInternalController` | Internal endpoint (`/api/internal/prompts`) |

**Data Model:**
```
PromptTemplate {
  id: UUID
  name: String (e.g., "Facebook Social Post Template")
  platform: WORDPRESS | FACEBOOK | TIKTOK | YOUTUBE | SHOPIFY
  contentType: BLOG_POST | SOCIAL_POST | VIDEO_SCRIPT | CAROUSEL | THREAD | HERO_COPY
  template: String (contains {{variable}} placeholders)
  isActive: Boolean (default true)
  createdAt, updatedAt
}
```

**Prompt Variables:**
- `{{name}}` — Product name
- `{{description}}` — Product description
- `{{price}}` — Product price
- `{{commission}}` — Affiliate commission percentage
- `{{affiliateLink}}` — Affiliate URL

**API Behavior:**

| Endpoint | Behavior |
|----------|----------|
| `GET /config/prompts` | Returns all templates (for UI list) |
| `GET /config/prompts?platform=FACEBOOK&contentType=SOCIAL_POST` | Filter by platform + type |
| `GET /api/internal/prompts?isActive=true` | Internal — returns only active (for generation) |
| `POST /config/prompts` | Create new template |
| `PUT /config/prompts/:id` | Edit template |
| `DELETE /config/prompts/:id` | Delete template |

**Connector Status Endpoint:**
```
GET /config/connector-status
→ {
  clickbank: true,  // CLICKBANK_DEV_API_KEY env var present?
  cj: true,         // CJ_API_TOKEN env var present?
  shopee: true,     // SHOPEE_COOKIE_FILE_PATH file exists?
  wordpress: true,  // WORDPRESS_URL + WORDPRESS_APP_PASSWORD env vars?
  facebook: true,   // FACEBOOK_ACCESS_TOKEN env var?
  shopify: true,    // SHOPIFY_ACCESS_TOKEN env var?
  gemini: true,     // GOOGLE_API_KEY env var?
}
```

**How to implement a new platform template:**
1. Create template in UI: `POST /config/prompts`
2. Template automatically available in content generation
3. No code changes needed (templates are data-driven)

---

### 6. Queue-Engine Module

**Responsibility:** Manage BullMQ job queue. Routes jobs to correct processor.

**When used:**
- Any async task: product scraping, CSV import, content generation, publishing

**Key Classes:**

| Class | Purpose |
|-------|---------|
| `QueueService` | Add job to queue |
| `ProductScraperProcessor` | Handle SCRAPE_PRODUCT, IMPORT_CSV jobs |
| `ProductEnrichmentProcessor` | Handle PRODUCT_ENRICHMENT jobs |

**Job Types:**
```typescript
enum JobName {
  SCRAPE_PRODUCT = 'SCRAPE_PRODUCT',        // Source ingestion
  IMPORT_CSV = 'IMPORT_CSV',                // CSV import
  PRODUCT_ENRICHMENT = 'PRODUCT_ENRICHMENT', // Fetch images, ratings
  GENERATE_CONTENT = 'GENERATE_CONTENT',    // AI generation
  PUBLISH_CONTENT = 'PUBLISH_CONTENT',      // Publish to platform
}

const QUEUE_NAMES = {
  PRODUCT_INGESTION: 'product-ingestion',   // SCRAPE_PRODUCT, IMPORT_CSV
  PRODUCT_ENRICHMENT: 'product-enrichment', // PRODUCT_ENRICHMENT
  CONTENT_GENERATION: 'content-generation', // GENERATE_CONTENT
  PUBLISH_CONTENT: 'publish-content',       // PUBLISH_CONTENT
};
```

**Job Structure:**
```typescript
// Job always contains IDs only, never full objects
// Processor fetches data via internal APIs
await queueService.addJob(
  QUEUE_NAMES.CONTENT_GENERATION,
  JobName.GENERATE_CONTENT,
  { contentId: 'abc123' } // ID only
);
```

---

## Data Flows

### Flow 1: Product Ingestion

```
1. User visits /products/import tab
2. User enters: source=CLICKBANK, keyword="iPhone", limit=10
3. Frontend: POST /source-connector/ingest
   └─ Returns: { jobId: 'job-123' }
4. Frontend polls: GET /source-connector/jobs/job-123 (every 2s)
5. Backend (async):
   ├─ ClickBankAdapter.search("iPhone", 10)
   ├─ ClickBankMapper.mapToProduct() for each result
   ├─ POST /api/internal/products { bulk create }
   ├─ Job complete: jobId responds with { count: 10, productIds: [...] }
6. Frontend displays success: "10 products imported"
7. Optional: If AUTO_ENRICH_AFTER_CSV=true, products auto-enrich
   ├─ Enqueue PRODUCT_ENRICHMENT jobs
   ├─ Fetch images, ratings from Shopee/Lazada
   ├─ Update metadata in products_db
```

**State in Redis:** Job state (queued, active, completed) — BullMQ native

---

### Flow 2: Content Generation

```
1. User visits /content/generate
2. User selects product, platform=FACEBOOK, contentType=SOCIAL_POST, promptId=optional
3. Frontend: POST /content { productId, platform, contentType, promptId }
   └─ Returns: { contentId: 'content-456', jobId: 'job-456' }
4. Frontend polls: GET /content/content-456 (every 2s)
   ├─ Initial: status=RAW
   ├─ After 1s: status=AI_PROCESSING
5. Backend (ContentGenerationProcessor):
   ├─ Update: status → AI_PROCESSING
   ├─ GET /api/internal/products/:productId (fetch product data)
   ├─ GET /api/internal/prompts?platform=FACEBOOK&contentType=SOCIAL_POST&isActive=true
   ├─ renderPrompt(template, productData) — replace {{variables}}
   ├─ Call Gemini AI: generateContent(filledPrompt)
   ├─ Parse response: { title, body }
   ├─ Update: title, body, status → GENERATED
6. Frontend: status=GENERATED, display preview
7. User can:
   ├─ PATCH /content/:id to edit title/body
   ├─ POST /content/:id/generate to regenerate
   ├─ PUT /content/:id/status { PUBLISHED } to publish
```

**Concurrency:** 2 content generation jobs at a time (resource-intensive Gemini calls)

---

### Flow 3: Publishing

```
1. User views generated content
2. User clicks "Publish to Facebook"
3. Frontend: POST /publishing/publish { contentId, platform=FACEBOOK }
   └─ Returns: { publishLogId: 'log-789', jobId: 'job-789' }
4. Frontend polls: GET /publishing/logs/log-789 (every 2s)
   ├─ Initial: status=PENDING
   ├─ After 1s: status=PUBLISHING
5. Backend (PublishContentProcessor):
   ├─ Update: status → PUBLISHING
   ├─ GET /api/internal/content/:contentId (fetch full content)
   ├─ FacebookAdapter.publish(content)
   ├─ POST graph.facebook.com/v19.0/{pageId}/feed
   ├─ Response: { link: 'https://facebook.com/post/123' }
   ├─ Update: publishedLink, status → PUBLISHED
   ├─ PUT /api/internal/content/:contentId/status { PUBLISHED }
6. Frontend: status=PUBLISHED, show link to published content
```

**Concurrency:** 3 publish jobs at a time

**Retry:** On failure, BullMQ automatically retries (exponential backoff, up to 3 times)

---

## Database Design

### Isolation Principle

Each module owns its database — **no shared Prisma client, no cross-database foreign keys**.

```
┌─ products_db ───────────────────┐
│ Product                         │
│ (externalId, source, status)    │
└─────────────────────────────────┘

┌─ content_db ─────────────────────┐
│ Content                          │
│ (productId: String, NO FK)       │
└──────────────────────────────────┘

┌─ publish_db ──────────────────────┐
│ PublishLog                        │
│ (contentId: String, NO FK)        │
└───────────────────────────────────┘

┌─ config_db ───────────────────────┐
│ PromptTemplate                    │
└───────────────────────────────────┘
```

**Why?**
- **Scalability:** Each module's DB can grow independently
- **Isolation:** Failure in one DB doesn't affect others
- **Flexibility:** Can use different DB engines per module
- **Testability:** Easy to mock or use in-memory DB for tests

**Consequence:** Cross-module queries must go through internal REST APIs, not SQL joins.

---

### Prisma Configuration

Each module has its own Prisma client:

```typescript
// backend/src/modules/content-factory/prisma/prisma.service.ts
import { PrismaClient as ContentPrismaClient } from '@prisma-client/content-factory';

@Injectable()
export class ContentPrismaService extends ContentPrismaClient {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL_CONTENT,
        },
      },
    });
  }
}
```

**Path aliases in `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@modules/*": ["src/modules/*"]
    }
  }
}
```

**Prisma client regeneration:**
```bash
npm run db:generate  # Regenerate all 4 @prisma-client/* packages
npm run db:migrate   # Run migrations for all 4 databases
```

---

## Queue System

### BullMQ Architecture

Jobs are stored in Redis. Workers poll for jobs and process them.

```
┌─ Redis ────────────────────────────┐
│ Queue: product-ingestion           │
│ Queue: content-generation          │
│ Queue: publish-content             │
│ Job state (active, completed, etc) │
└────────────────────────────────────┘
                ↑
                │
        ┌───────┴─────────┐
        │                 │
    Processor A      Processor B
    (concurrency 3)  (concurrency 2)
```

### Job Lifecycle

```
PENDING → ACTIVE → COMPLETED
            ↓
          FAILED → (retry with backoff) → ACTIVE
```

### Processor Bootstrap

**Critical:** All processors must be started via `OnApplicationBootstrap`:

```typescript
// content-factory.module.ts
@Module({
  providers: [
    ContentGenerationService,
    ContentGenerationProcessor,
    ContentGenerationBootstrap, // Add this
    // ...
  ],
})

@Injectable()
class ContentGenerationBootstrap implements OnApplicationBootstrap {
  constructor(private readonly processor: ContentGenerationProcessor) {}
  onApplicationBootstrap() {
    this.processor.start(); // Start listening for jobs
  }
}
```

**Why?** Otherwise, jobs queue but never get processed.

---

## Implementation Patterns

### 1. Service Layer Pattern

All business logic lives in `*.service.ts`. Controllers are thin wrappers.

```typescript
// content.service.ts (application layer)
@Injectable()
export class ContentService {
  async create(dto: CreateContentDto) {
    // Validate, create, enqueue job
  }

  async findById(id: string) {
    // Load from DB
  }

  async updateStatus(id: string, status: ContentStatus) {
    // Validate transition, update
  }
}

// content.controller.ts (presentation layer)
@Controller('content')
export class ContentController {
  constructor(private readonly service: ContentService) {}

  @Post()
  create(@Body() dto: CreateContentDto) {
    return this.service.create(dto);
  }
}
```

### 2. Repository Pattern

Data access abstraction via repositories.

```typescript
// product.repository.interface.ts
export interface ProductRepository {
  findById(id: string): Promise<Product>;
  findMany(filter: ProductFilter): Promise<Product[]>;
  create(dto: CreateProductDto): Promise<Product>;
}

// prisma-product.repository.ts
@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: ProductPrismaService) {}

  async findById(id: string) {
    return this.prisma.product.findUnique({ where: { id } });
  }
}
```

### 3. DTO Validation

NestJS decorators validate input at the controller boundary.

```typescript
// create-content.dto.ts
export class CreateContentDto {
  @IsUUID()
  productId: string;

  @IsEnum(Platform)
  platform: Platform;

  @IsEnum(ContentType)
  contentType: ContentType;

  @IsOptional()
  @IsUUID()
  promptId?: string;
}

// Controller
@Post()
create(@Body() dto: CreateContentDto) {
  // dto is validated here
  return this.service.create(dto);
}
```

### 4. Value Objects for Status Transitions

Status validation logic is encapsulated in value objects.

```typescript
// content-status.vo.ts
export enum ContentStatus {
  RAW = 'RAW',
  AI_PROCESSING = 'AI_PROCESSING',
  GENERATED = 'GENERATED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PUBLISHING = 'PUBLISHING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

export function canTransitionStatus(from: ContentStatus, to: ContentStatus): boolean {
  const validTransitions = {
    [ContentStatus.RAW]: [ContentStatus.AI_PROCESSING],
    [ContentStatus.AI_PROCESSING]: [ContentStatus.GENERATED, ContentStatus.FAILED],
    [ContentStatus.GENERATED]: [ContentStatus.PENDING_APPROVAL, ContentStatus.AI_PROCESSING],
    // ...
  };
  return validTransitions[from]?.includes(to) ?? false;
}

// Usage
if (!canTransitionStatus(currentStatus, newStatus)) {
  throw new BadRequestException('Invalid status transition');
}
```

### 5. Prompt Templating

Product data is injected into AI prompts via simple string replacement.

```typescript
// prompt-renderer.ts
export function renderPrompt(
  template: string,
  variables: Record<string, unknown>,
): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  });
  return result;
}

// Usage
const filledPrompt = renderPrompt(template, {
  name: 'iPhone 15',
  price: 999,
  affiliateLink: 'https://example.com/...',
});
```

### 6. Internal REST API Pattern

Cross-module communication via HTTP (simulates microservice boundaries).

```typescript
// content-factory calling product-management
constructor(private readonly http: HttpService, private readonly config: ConfigService) {
  this.internalBase = config.get('BACKEND_INTERNAL_URL', 'http://localhost:3001');
}

async getProduct(productId: string) {
  const res = await firstValueFrom(
    this.http.get(`${this.internalBase}/api/internal/products/${productId}`)
  );
  return res.data;
}
```

---

## API Reference

### Product Management (`/api/products`)

```
GET    /products                    List products with filters
POST   /products                    Create product
GET    /products/:id                Get product details
PUT    /products/:id                Update product
DELETE /products/:id                Delete product
PUT    /products/:id/status         Update product status
POST   /api/internal/products       Bulk create (internal)
GET    /api/internal/products/:id   Get product (internal)
POST   /api/internal/products/:id/enrich  Apply enrichment (internal)
```

### Source Connector (`/api/source-connector`)

```
POST   /source-connector/ingest                 Ingest from network
GET    /source-connector/jobs/:jobId            Poll job status
POST   /source-connector/import-csv             Upload CSV
POST   /source-connector/import-csv/confirm     Confirm import + mapping
```

### Content (`/api/content`)

```
GET    /content                     List content with filters
POST   /content                     Create content + enqueue generation
GET    /content/:id                 Get content details
PATCH  /content/:id                 Edit content (title, body)
PUT    /content/:id/status          Update status
POST   /content/:id/generate        Regenerate (if GENERATED or FAILED)
GET    /api/internal/content/:id    Get content (internal)
PUT    /api/internal/content/:id/status  Update status (internal)
```

### Publishing (`/api/publishing`)

```
GET    /publishing/logs             List publish logs with filters
POST   /publishing/publish          Publish content to platform
GET    /publishing/logs/:id         Get log details
```

### Config (`/api/config`)

```
GET    /config/prompts              List all templates
POST   /config/prompts              Create template
GET    /config/prompts/:id          Get template
PUT    /config/prompts/:id          Update template
DELETE /config/prompts/:id          Delete template
GET    /config/connector-status     Connector configuration status
GET    /api/internal/prompts        Get active templates (internal)
```

---

## Key Design Decisions

### 1. Why 4 Databases Instead of 1?

**Decision:** Each module has isolated PostgreSQL database.

**Rationale:**
- Product schema (9 fields) rarely changes
- Content schema (7 fields) independent of products
- Publishing only tracks logs, separate concern
- Config is reference data, shared by multiple modules
- Allows independent scaling (content_db can be read-heavy)

**Trade-off:** Cross-module queries require internal REST calls (latency), not SQL joins (fast). Acceptable because inter-module calls are infrequent.

### 2. Why BullMQ (Redis) for Async?

**Decision:** Use BullMQ for all async operations.

**Rationale:**
- Scraping takes 10-30s (can't be synchronous)
- AI generation takes 5-15s (block user? No.)
- Publishing calls external APIs (retry on failure)
- Job persistence in Redis (survives app restart)
- Concurrency control (max 3 publish jobs at a time)

**Alternative:** Event-driven (Kafka). Not needed here — BullMQ is simpler and sufficient.

### 3. Why Gemini (not ChatGPT)?

**Decision:** Use Google Gemini API for content generation.

**Rationale:**
- JSON output format native support
- Lower cost per token
- Good multimodal support (future image/video)
- Fast inference (~2-3 seconds)

**Implementation:** `GeminiAdapter` in `/shared/ai/gemini.adapter.ts`

### 4. Why Product DNA?

**Decision:** Extract AI-powered product DNA (brand, category, features).

**Rationale:**
- Product details scraped from sites are often missing
- AI can infer from product name + description
- DNA used to enrich content generation prompts
- Optional but powerful for better content

### 5. Why Internal REST for Cross-Module Calls?

**Decision:** Use HTTP REST endpoints instead of shared database.

**Rationale:**
- Clear separation of concerns
- Easy to convert to microservices later
- Each module independently testable
- No cyclic dependencies

**Trade-off:** Extra latency (milliseconds), acceptable.

---

## Common Implementation Tasks

### Add a New Product Field

1. Update Prisma schema: `backend/src/modules/product-management/prisma/schema.prisma`
   ```prisma
   model Product {
     // ... existing fields
     newField: String?
   }
   ```

2. Run migration: `cd backend && npx prisma migrate dev --name add_new_field`

3. Update DTO: `CreateProductDto`, `UpdateProductDto`

4. Update service method if validation needed

5. Update controller endpoint

6. Regenerate Prisma: `npm run db:generate`

### Add a New Content Platform

1. Add platform to enum: `Platform` in content_db schema

2. Add content types (if different from others)

3. Add template defaults in `ContentGenerationService.buildDefaultPrompt()`

4. Create adapter in `distribution-hub/infrastructure/{platform}.adapter.ts`

5. Update `PublishContentService.route()` to handle platform

6. Test end-to-end

### Handle a Failed Job

BullMQ auto-retries failed jobs with exponential backoff. To manually retry:

```typescript
const queue = new Queue(QUEUE_NAMES.CONTENT_GENERATION, { connection });
const failedJobs = await queue.getFailed();
for (const job of failedJobs) {
  await job.retry(); // Retry immediately
}
```

---

## Debugging & Observability

### Redis CLI

View BullMQ queue state:
```bash
redis-cli
> KEYS *  # All keys
> HGETALL bull:content-generation:*  # Job details
```

### Logs

All processors log to stdout:
```
[NestFactory] Starting NestApplication...
[AppModule] ..dependencies loaded
[ProductScraper worker started]
[ContentGeneration worker started]
[Publishing worker started]
Processing job GENERATE_CONTENT (job-123)
Content abc123 generated successfully
```

### Health Check

```bash
curl http://localhost:3001/health
# Returns: { "status": "ok" }
```

---

## Summary

**Architecture:** 5 domain modules (Product, Content, Distribution, Config, SourceConnector) + 1 queue module + shared infrastructure.

**Communication:** Internal REST APIs (cross-module), BullMQ (async), PostgreSQL (persistence).

**Flows:**
1. **Ingest** — Users → Source adapters → Product DB
2. **Generate** — Product + Template → Gemini AI → Content DB
3. **Publish** — Content → Platform adapters → PublishLog DB

**Key principle:** Module isolation with REST boundaries = testability + scalability.
