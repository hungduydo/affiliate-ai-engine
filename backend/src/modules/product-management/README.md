# product-management Module

Manages the full product lifecycle — from raw import through enrichment to AI-ready ACTIVE status with extracted Product DNA.

**Database:** `products_db`

---

## Responsibilities

- CRUD operations for products
- Product status state machine (RAW → ENRICHED → ACTIVE → INACTIVE)
- Product DNA extraction via AI adapter
- Internal API for cross-module access (no shared DB)

---

## Product Status Pipeline

```
RAW ──────────► ENRICHED ──────────► ACTIVE ──────────► INACTIVE
  (CSV import)    (detail fetched)     (DNA extracted)

Transitions allowed:
  RAW      → ENRICHED | INACTIVE
  ENRICHED → ACTIVE | INACTIVE
  ACTIVE   → INACTIVE
  INACTIVE → RAW
```

| Status | Meaning |
|--------|---------|
| `RAW` | Imported via CSV — no product detail fetched yet |
| `ENRICHED` | Playwright fetched product page; metadata populated |
| `ACTIVE` | Product DNA extracted — ready for content generation |
| `INACTIVE` | Manually disabled |

---

## Database Schema

```prisma
model Product {
  id             String        @id @default(cuid())
  externalId     String        @unique
  source         String        // "shopee" | "clickbank" | "cj" | "lazada"
  name           String
  description    String?
  price          Float?
  commission     Float?
  affiliateLink  String        @unique
  productLink    String?       // URL for enrichment crawl
  imageUrl       String?
  rawData        Json          // Original API response
  status         ProductStatus @default(RAW)
  enrichStatus   EnrichStatus  @default(PENDING)
  enrichedAt     DateTime?
  metadata       Json?         // Tags, gallery, ratings, etc.
  productDna     Json?         // Extracted DNA structure
  dnaExtractedAt DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}
```

---

## File Structure

```
product-management/
├── product-management.module.ts     # Module definition + bootstrap
├── application/
│   ├── products.service.ts          # CRUD, createOrUpdate, status validation
│   └── product-dna.service.ts       # DNA extraction via AI adapter
├── domain/
│   ├── entities/product.entity.ts   # Domain entity (extends Prisma model)
│   ├── repositories/
│   │   └── product.repository.interface.ts
│   └── value-objects/
│       └── product-status.vo.ts     # Status transition rules
├── infrastructure/
│   ├── prisma-product.repository.ts # Prisma implementation of repository
│   └── deeplink-generator.ts        # Affiliate deeplink utilities
├── presentation/
│   ├── products.controller.ts       # Public REST endpoints
│   ├── products.internal.controller.ts  # /api/internal/* endpoints
│   └── dto/
│       ├── create-product.dto.ts
│       └── enrich-product.dto.ts
└── prisma/
    ├── schema.prisma
    └── migrations/
```

---

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/products/:id/extract-dna` | Extract Product DNA (shows confirmation if DNA exists) |
| GET | `/products/:id` | Returns product including `productDna` and `dnaExtractedAt` |
| GET | `/api/internal/products/:id` | Used by content-factory to fetch product + DNA |

---

## Product DNA

After DNA extraction, the `productDna` JSON field contains:

```json
{
  "coreProblem": "Users struggle with X",
  "keyFeatures": [
    { "feature": "Feature A", "emotionalBenefit": "Feel confident" }
  ],
  "targetPersona": {
    "demographics": "Ages 25–45, female, urban",
    "psychographics": "Values convenience, eco-conscious"
  },
  "objectionHandling": [
    { "objection": "Too expensive", "counter": "Saves $X per month" }
  ],
  "visualAnchors": ["Before/after transformation", "Lifestyle shot in kitchen"]
}
```

The content generation pipeline uses this DNA to produce platform-native, persona-targeted copy.
