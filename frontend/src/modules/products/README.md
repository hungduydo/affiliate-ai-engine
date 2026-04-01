# products Module

Manages product browsing, detailed view with DNA display, and product import (live ingest + CSV).

---

## Pages

### `ProductListPage` (`/products`)
- Searchable, filterable table of products
- Filters: `search`, `status` (RAW/ENRICHED/ACTIVE/INACTIVE), `enrichStatus`
- Pagination with configurable page size
- Clickable rows → navigate to ProductDetailPage

### `ProductDetailPage` (`/products/:id`)
- Full product card with all metadata
- **"Extract DNA" button** (violet) — triggers CaaS Phase 1
  - Disabled while enrichment is in progress
  - Shows confirmation dialog if DNA already exists ("data will be replaced")
  - Calls `POST /products/:id/extract-dna`
- **"Generate Content" button** (green) — only shown when `status === 'ACTIVE'`
  - Navigates to `/content/generate?productId={id}` for pre-selected flow
- **DNA Panel** — shown when `productDna` exists
  - Collapsible sections: Core Problem, Key Features, Target Persona, Objection Handling, Visual Anchors

### `ProductImportPage` (`/products/import`)
- **Tab 1: Live Ingest** — select source (Shopee/ClickBank/CJ), enter keyword + limit
  - Polls job status every 2s via `JobStatusCard`
  - Fires `onComplete` callback when done
- **Tab 2: CSV Import** — multi-step wizard:
  1. `CsvDropzone` — drag/drop or click to upload
  2. `ColumnMapper` — map CSV headers to product fields
  3. `ImportPreview` — confirm sample rows before submit

---

## Components

| Component | Purpose |
|-----------|---------|
| `IngestionForm` | Source/keyword/limit form → `POST /source-connector/ingest` |
| `JobStatusCard` | Polls `GET /source-connector/jobs/:jobId` every 2s |
| `CsvDropzone` | File upload with drag-and-drop |
| `ColumnMapper` | Maps CSV column headers to Product fields |
| `ImportPreview` | Shows sample rows with mapped values before confirm |
| `ProductTable` | Sortable/filterable data table with status badges |

---

## Hooks (`useProducts.ts`)

```typescript
useProducts(filters)        // GET /products with pagination
useProduct(id)              // GET /products/:id
useCreateProduct()          // POST /products
useUpdateProduct()          // PUT /products/:id
useDeleteProduct()          // DELETE /products/:id
useExtractProductDNA()      // POST /products/:id/extract-dna
                            // → invalidates product query on success
```

---

## Services

| File | Exports |
|------|---------|
| `products.service.ts` | `getProducts`, `getProductById`, `createProduct`, `updateProduct`, `deleteProduct`, `extractDNA` |
| `import.service.ts` | `ingest`, `uploadCsv`, `confirmCsv`, `getJobStatus` |
