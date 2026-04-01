# source-connector Module

Ingests products from affiliate networks and e-commerce platforms. Has **no own database** — saves products via internal REST API to `product-management`.

---

## Responsibilities

- Connect to affiliate network APIs (ClickBank, CJ)
- Scrape Shopee and Lazada via Playwright
- Import products from CSV files with column mapping
- Enrich raw products by fetching full product detail pages

---

## Supported Sources

| Source | Adapter | Status |
|--------|---------|--------|
| ClickBank | `clickbank.adapter.ts` | API-based |
| CJ Affiliate | `cj.adapter.ts` | API-based |
| Shopee | `shopee.playwright.adapter.ts` | Playwright (requires cookies) |
| Lazada | `lazada.detail-fetcher.ts` | Playwright |
| CSV | `csv.importer.ts` | File upload with column mapper |

---

## Product Status on Ingest

| Source | Initial Status |
|--------|---------------|
| API sources (ClickBank, CJ) | `ENRICHED` — API already returns full data |
| Shopee / Lazada | `ENRICHED` — Playwright fetches full detail |
| CSV import | `RAW` — only basic fields available |

---

## Enrichment Pipeline

After products reach `RAW` or `ENRICHED` status, they can be further enriched:

```
ENRICH_PRODUCT job { productId }
  ↓
ProductEnrichmentProcessor
  ↓
ShopeeDetailFetcher | LazadaDetailFetcher (Playwright)
  ↓
Fetches: description, images, specs, ratings, reviews
  ↓
Product.enrichStatus = DONE, metadata populated
```

---

## File Structure

```
source-connector/
├── source-connector.module.ts        # SourceConnectorBootstrap (OnApplicationBootstrap)
├── application/
│   ├── product-ingestion.service.ts  # Orchestrates ingest + save via internal API
│   └── product-enrichment.service.ts # Triggers detail fetching
├── domain/
│   └── adapters/
│       ├── source.adapter.interface.ts
│       └── product-detail-fetcher.interface.ts
├── infrastructure/
│   ├── adapters/
│   │   ├── clickbank/
│   │   │   ├── clickbank.adapter.ts   # ClickBank Marketplace API
│   │   │   └── clickbank.mapper.ts    # Maps API response → Product shape
│   │   ├── cj/
│   │   │   ├── cj.adapter.ts          # CJ Affiliate REST API
│   │   │   └── cj.mapper.ts
│   │   ├── shopee/
│   │   │   ├── shopee.playwright.adapter.ts   # Network intercept for product list
│   │   │   ├── shopee.detail-fetcher.ts       # Product detail page scraper
│   │   │   ├── shopee.cookies.ts              # Cookie loading helper
│   │   │   └── shopee.mapper.ts
│   │   └── lazada/
│   │       ├── lazada.detail-fetcher.ts
│   │       └── lazada.mapper.ts
│   └── csv/
│       └── csv.importer.ts            # CSV parsing, column mapping, validation
└── presentation/
    ├── source.controller.ts           # POST /source-connector/ingest
    ├── csv.controller.ts              # POST /source-connector/import-csv
    └── dto/
        ├── ingest-products.dto.ts
        ├── enrich-batch.dto.ts
        └── csv-upload.dto.ts
```

---

## Shopee Setup

Shopee requires pre-saved browser cookies (login state):

1. Log in to `affiliate.shopee.vn` in a real browser
2. Export cookies from DevTools → Network → copy as JSON
3. Save to path specified in `SHOPEE_COOKIE_FILE_PATH` env var

The adapter intercepts the internal Shopee API response during page navigation.

---

## CSV Import Flow

```
1. POST /source-connector/import-csv (multipart)
   → Returns: { headers, sampleRows, filePath }

2. User maps CSV columns to product fields in frontend ColumnMapper

3. POST /source-connector/import-csv/confirm { filePath, mapping, source }
   → Returns: { jobId }
   → BullMQ IMPORT_CSV job → CsvImporter → save as RAW products
```
