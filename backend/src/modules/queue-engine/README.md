# queue-engine Module

Centralized BullMQ job queue management. Provides a `QueueService` for enqueuing jobs and routes incoming jobs to the correct processor.

**Storage:** Redis

---

## Queue Names

| Constant | Queue Name | Purpose |
|----------|-----------|---------|
| `QUEUE_NAMES.PRODUCT_SCRAPER` | `product-scraper` | Ingest + CSV import jobs |
| `QUEUE_NAMES.CONTENT_GENERATION` | `content-generation` | AI content generation |
| `QUEUE_NAMES.PUBLISH_CONTENT` | `publish-content` | Platform publishing |
| `QUEUE_NAMES.PRODUCT_ENRICHMENT` | `product-enrichment` | Detail page fetching |

---

## Job Names

```typescript
enum JobName {
  SCRAPE_PRODUCT    // Ingest from affiliate network
  IMPORT_CSV        // Process CSV file
  GENERATE_CONTENT  // AI generation
  PUBLISH_CONTENT   // Publish to platform
  ENRICH_PRODUCT    // Fetch product detail page
}
```

---

## Usage

```typescript
// Enqueue a job (IDs only — never full objects)
await queueService.addJob(
  QUEUE_NAMES.CONTENT_GENERATION,
  JobName.GENERATE_CONTENT,
  { contentId: 'abc123' }
);

// Poll status from frontend
GET /source-connector/jobs/:jobId
```

---

## Worker Bootstrap Pattern

All processors must be started via `OnApplicationBootstrap`. The queue-engine module handles this for the product-scraper. Each feature module handles its own processor bootstrap:

- `SourceConnectorBootstrap` → `ProductScraperProcessor` + `ProductEnrichmentProcessor`
- `ContentFactoryBootstrap` → `ContentGenerationProcessor`
- `DistributionBootstrap` → `PublishContentProcessor`

---

## File Structure

```
queue-engine/
├── queue-engine.module.ts
├── queue.service.ts          # addJob(), getQueue(), getJobStatus()
├── queue.constants.ts        # QUEUE_NAMES, JobName enum
└── processors/
    ├── product-scraper.processor.ts      # Routes SCRAPE_PRODUCT / IMPORT_CSV
    └── product-enrichment.processor.ts   # Routes ENRICH_PRODUCT
```
