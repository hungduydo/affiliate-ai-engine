# Frontend Implementation Guide — Flow OmniAffiliate Engine

Comprehensive documentation of the React/Vite frontend architecture, module structure, data flows, and implementation patterns for both LLMs and humans.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Core Modules](#core-modules)
4. [State Management](#state-management)
5. [Data Flow](#data-flow)
6. [Component Patterns](#component-patterns)
7. [Service Layer](#service-layer)
8. [Routing](#routing)
9. [API Integration](#api-integration)
10. [UI/UX Conventions](#uiux-conventions)
11. [Common Implementation Tasks](#common-implementation-tasks)

---

## Architecture Overview

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Build | Vite | Fast dev server, optimized builds |
| Framework | React 19 | UI library |
| Routing | React Router v7 | Client-side navigation |
| Data Fetching | TanStack Query v5 | Server state management |
| Local State | Zustand | Lightweight client state |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| HTTP | Axios | API client |
| Icons | Lucide React | Icon library |
| TypeScript | TypeScript | Type safety |

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     User Browser                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React Component Tree                                │   │
│  │  ├─ AppRouter (routing logic)                        │   │
│  │  ├─ Pages (feature modules)                          │   │
│  │  └─ Shared (layout, UI, utilities)                   │   │
│  └────────────────┬─────────────────────────────────────┘   │
│                   │                                          │
│  ┌────────────────┼─────────────────────────────────────┐   │
│  │  State Layer   │                                    │   │
│  │  ├─ TanStack Query (server state: products, etc)   │   │
│  │  └─ Zustand (local state: UI, filters)             │   │
│  └────────────────┼─────────────────────────────────────┘   │
│                   │ HTTP (Axios)                            │
│  ┌────────────────┴─────────────────────────────────────┐   │
│  │  Services (business logic)                           │   │
│  │  ├─ products.service.ts                              │   │
│  │  ├─ content.service.ts                               │   │
│  │  ├─ publishing.service.ts                            │   │
│  │  └─ settings.service.ts                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │ /api/*
                         ▼
              Backend (NestJS, port 3001)
              (See BACKEND.md)
```

### Key Principles

1. **No `"use client"`** — This is React/Vite, not Next.js. Ignore suggestions to add it.
2. **Server state ≠ client state** — Products list is server state (TanStack Query). UI filters are client state (Zustand).
3. **Thin controllers, thick services** — Components delegate logic to service layer.
4. **Feature modules** — Each feature (products, content, publishing) is isolated under `/modules`.

---

## Project Structure

```
frontend/src/
├── main.tsx                    # React entry point
├── App.tsx                     # Root component
│
├── core/                       # Core infrastructure (not feature-specific)
│   ├── api/
│   │   ├── api-client.ts       # Axios instance with global config
│   │   └── api.types.ts        # All TypeScript types (Product, Content, etc.)
│   ├── query/
│   │   └── query-client.ts     # TanStack Query client config
│   └── router/
│       └── AppRouter.tsx       # Route definitions
│
├── shared/                     # Reusable components & utilities
│   ├── layout/
│   │   ├── AppLayout.tsx       # Sidebar + outlet wrapper
│   │   ├── Sidebar.tsx         # Navigation menu
│   │   └── Header.tsx          # Top header bar
│   ├── ui/
│   │   ├── StatusBadge.tsx     # Product/Content/Publish status display
│   │   ├── EnrichStatusBadge.tsx # Enrich status display
│   │   └── [other-ui].tsx      # Reusable UI components
│   └── utils/
│       ├── cn.ts               # clsx + tailwind-merge utility
│       └── format.ts           # formatDate(), formatCurrency()
│
└── modules/                    # Feature modules (feature-driven)
    ├── dashboard/
    │   ├── pages/
    │   │   └── DashboardPage.tsx       # 4 metric cards
    │   └── services/
    │       └── dashboard.service.ts    # Fetch summary metrics
    │
    ├── products/
    │   ├── pages/
    │   │   ├── ProductListPage.tsx     # Table + filters + pagination
    │   │   ├── ProductDetailPage.tsx   # Single product view
    │   │   └── ProductImportPage.tsx   # Tabs: Live Ingest | CSV
    │   ├── components/
    │   │   ├── IngestionForm.tsx       # Source + keyword + limit form
    │   │   ├── JobStatusCard.tsx       # Job progress/status display
    │   │   ├── CsvUpload/
    │   │   │   ├── CsvDropzone.tsx     # File upload drag-drop
    │   │   │   ├── ColumnMapper.tsx    # CSV column → field mapping
    │   │   │   └── ImportPreview.tsx   # Show parsed CSV rows
    │   │   └── ProductTable/
    │   │       └── ProductTable.tsx    # Data table with sort/filter
    │   ├── hooks/
    │   │   └── useProducts.ts          # Hook wrapper around service
    │   └── services/
    │       ├── products.service.ts     # CRUD: get, getMany, create
    │       └── import.service.ts       # Ingest, CSV upload, enrich
    │
    ├── content/
    │   ├── pages/
    │   │   ├── ContentListPage.tsx     # Table + status flow + actions
    │   │   ├── ContentGeneratePage.tsx # Product select → generate → preview
    │   │   └── ContentEditorPage.tsx   # Edit title/body + publish
    │   ├── hooks/
    │   │   └── useContent.ts
    │   └── services/
    │       └── content.service.ts      # CRUD + generate + publish actions
    │
    ├── publishing/
    │   ├── pages/
    │   │   └── PublishingPage.tsx      # Logs table + publish modal
    │   └── services/
    │       └── publishing.service.ts   # getLogs, publish
    │
    └── settings/
        ├── pages/
        │   └── SettingsPage.tsx        # Tabs: Prompts | Connectors
        ├── components/
        │   ├── PromptTemplateTable.tsx # CRUD list
        │   ├── PromptTemplateForm.tsx  # Create/edit modal
        │   └── ConnectorStatus.tsx     # Status grid
        └── services/
            └── settings.service.ts     # Prompts CRUD, getConnectorStatus()
```

### Directory Naming Conventions

- **`pages/`** — Full-page components tied to routes
- **`components/`** — Reusable sub-components used within pages
- **`hooks/`** — Custom React hooks (query wrappers, state)
- **`services/`** — Business logic + API calls
- **`core/`** — Infrastructure (routing, API client, config) — shared by all modules
- **`shared/`** — Reusable layout, UI, utilities across modules

---

## Core Modules

### 1. API Client (`core/api`)

**Purpose:** Centralized Axios configuration, TypeScript types, error handling.

**Files:**

#### `api-client.ts`
```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message ?? error.message ?? 'Unknown error';
    return Promise.reject(new Error(message));
  },
);
```

**Key Points:**
- Base URL proxied in dev: `/api` → `http://localhost:3001` (via `vite.config.ts`)
- 15s timeout for all requests
- Automatic error extraction from response
- Global error handler in interceptor

#### `api.types.ts`
```typescript
// All TypeScript types defined here
export type Platform = 'WORDPRESS' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE' | 'SHOPIFY';
export type ContentType = 'BLOG_POST' | 'SOCIAL_POST' | 'VIDEO_SCRIPT' | ...;
export type ProductStatus = 'RAW' | 'ACTIVE' | 'INACTIVE' | 'PENDING';
export type ContentStatus = 'RAW' | 'AI_PROCESSING' | 'GENERATED' | ...;

export interface Product {
  id: string;
  externalId: string;
  source: 'CLICKBANK' | 'CJ' | 'SHOPEE' | 'LAZADA' | 'CSV';
  name: string;
  description?: string;
  price?: number;
  commission?: number;
  affiliateLink: string;
  imageUrl?: string;
  status: ProductStatus;
  enrichStatus: 'PENDING' | 'ENRICHED' | 'FAILED';
  metadata?: {
    gallery?: string[];
    videos?: string[];
    rating?: number;
    reviewCount?: number;
    categories?: string[];
  };
}

export interface Content {
  id: string;
  productId: string;
  platform: Platform;
  contentType: ContentType;
  title?: string;
  body: string;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}
// ... etc
```

**How to use:**
```typescript
import { apiClient } from '@core/api/api-client';
import type { Product } from '@core/api/api.types';

const response = await apiClient.get<Product>('/products/123');
```

---

### 2. Query Client (`core/query`)

**Purpose:** Configure TanStack Query (React Query) globally.

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10,   // 10 minutes (garbage collection)
      retry: 1,
    },
    mutations: {
      retry: 0, // Don't auto-retry mutations (user's intent matters)
    },
  },
});
```

---

### 3. Router (`core/router`)

**Purpose:** Define all routes and page mappings.

```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@shared/layout/AppLayout';
import { DashboardPage } from '@modules/dashboard/pages/DashboardPage';
import { ProductListPage } from '@modules/products/pages/ProductListPage';
// ... more imports

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'products', element: <ProductListPage /> },
      { path: 'products/import', element: <ProductImportPage /> },
      { path: 'products/:id', element: <ProductDetailPage /> },
      { path: 'content', element: <ContentListPage /> },
      { path: 'content/generate', element: <ContentGeneratePage /> },
      { path: 'content/:id', element: <ContentEditorPage /> },
      { path: 'publishing', element: <PublishingPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
```

**Route Order:** `/products/import` must come **before** `/products/:id` to avoid literal paths being matched as ID parameters.

---

## State Management

### TanStack Query (Server State)

**What is it?** Fetches and caches data from the backend. Automatic refetch, deduplication, background updates.

**When to use:** Product list, content details, publishing logs — anything that comes from the backend.

**Example:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { productsService } from './products.service';

function MyComponent() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['products', filters],  // Unique key
    queryFn: () => productsService.getMany(filters),
    staleTime: 1000 * 60 * 5,  // Reuse data for 5 min
    refetchInterval: false,     // Don't auto-refetch
  });

  return (
    <div>
      {isLoading && <Spinner />}
      {error && <Error message={error.message} />}
      {data && <ProductList products={data.data} />}
    </div>
  );
}
```

**Polling (for job status):**
```typescript
const { data: jobStatus } = useQuery({
  queryKey: ['job', jobId],
  queryFn: () => importService.getJobStatus(jobId),
  refetchInterval: (query) => {
    // Stop polling when job completes or fails
    const state = query.state.data?.state;
    if (state === 'completed' || state === 'failed') return false;
    return 2000; // Poll every 2 seconds
  },
});
```

**Mutations (POST, PUT, DELETE):**
```typescript
const mutation = useMutation({
  mutationFn: (dto) => contentService.generate(dto),
  onSuccess: (data) => {
    // Update UI after success
    queryClient.invalidateQueries({ queryKey: ['content'] });
    navigate(`/content/${data.contentId}`);
  },
  onError: (error) => {
    // Handle error
    showToast(error.message, 'error');
  },
});

function handleSubmit() {
  mutation.mutate({ productId, platform, contentType });
}
```

**Key patterns:**
- **Query keys** are arrays that identify cached data: `['products', filters]`, `['content', contentId]`
- **Stale time** — how long before data is considered "stale" and needs refetching
- **GC time** — how long to keep unused data in cache before deleting
- **Refetch interval** — for polling (job status, live data)
- **Invalidation** — after mutation, invalidate queries to refetch: `queryClient.invalidateQueries({ queryKey: ['products'] })`

### Zustand (Client State)

**What is it?** Lightweight store for UI state (filters, UI toggles, local selections).

**When to use:** Modal open/close, sidebar collapsed/expanded, current page number, search filters that don't persist.

**Example:**
```typescript
import { create } from 'zustand';

interface FilterStore {
  search: string;
  status?: string;
  page: number;
  setSearch: (search: string) => void;
  setStatus: (status?: string) => void;
  setPage: (page: number) => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
  search: '',
  status: undefined,
  page: 1,
  setSearch: (search) => set({ search, page: 1 }), // Reset page on search
  setStatus: (status) => set({ status, page: 1 }),
  setPage: (page) => set({ page }),
}));

// In component
function ProductFilter() {
  const { search, setSearch } = useFilterStore();
  return (
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  );
}
```

**When NOT to use Zustand:**
- User's edit history (use component `useState`)
- Data from backend (use TanStack Query)
- Complex nested state (keep it simple in Zustand)

---

## Data Flow

### Flow 1: Product Ingestion

```
User fills form: source=CLICKBANK, keyword="iPhone", limit=10
           ↓
Click "Search" button
           ↓
IngestionForm.tsx calls importService.ingest()
           ↓
POST /source-connector/ingest { source, keyword, limit }
           ↓
Backend processes (see BACKEND.md)
           ↓
Response: { jobId: 'job-123' }
           ↓
Frontend stores jobId in component state (useState)
           ↓
useQuery polls: GET /source-connector/jobs/job-123 every 2s
           ↓
JobStatusCard displays progress
           ↓
When state === 'completed':
  ├─ Stop polling
  ├─ Show success message
  ├─ Invalidate products query
  ├─ Navigate to /products
  └─ Product list auto-refetches
```

**Key component:** `JobStatusCard` handles polling and display.

---

### Flow 2: Content Generation

```
User on /content/generate page
           ↓
Selects product (search + click)
Selects platform (FACEBOOK)
Selects contentType (SOCIAL_POST)
           ↓
Click "Generate" button
           ↓
ContentGeneratePage.tsx calls contentService.generate()
           ↓
POST /content { productId, platform, contentType, promptId }
           ↓
Backend creates Content record + enqueues job (see BACKEND.md)
           ↓
Response: { contentId: 'content-456', jobId: 'job-456' }
           ↓
Frontend stores contentId in component state
           ↓
useQuery polls: GET /content/content-456 every 3s
           ↓
As status changes:
  RAW → AI_PROCESSING → GENERATED
           ↓
When status === 'GENERATED':
  ├─ Stop polling
  ├─ Display content preview (title + body)
  ├─ Show edit button, publish button, regenerate button
  └─ User can PATCH to edit, or PUT /status to publish
```

**Key features:**
- Conditional polling with `refetchInterval`
- Frontend displays different UI based on status
- Edit (PATCH) doesn't need backend flow (local form state)
- Publish triggers new job in publishing module

---

### Flow 3: Publishing

```
User on /content/:id (ContentEditorPage)
           ↓
Content status is GENERATED
           ↓
User clicks "Publish to Facebook" button
           ↓
ContentEditorPage calls contentService.publish()
           ↓
POST /publishing/publish { contentId, platform }
           ↓
Backend creates PublishLog + enqueues job (see BACKEND.md)
           ↓
Response: { publishLogId: 'log-789', jobId: 'job-789' }
           ↓
Navigation to /publishing (PublishingPage)
           ↓
PublishingPage filters logs by contentId
           ↓
useQuery polls: GET /publishing/logs?contentId=... every 3s
           ↓
Status changes:
  PENDING → PUBLISHING → PUBLISHED
           ↓
When status === 'PUBLISHED':
  ├─ Stop polling
  ├─ Show published link
  ├─ Show success toast
  └─ Mark as published in content list
```

---

## Component Patterns

### 1. Page Component (Connected to Router)

Pages are full-screen components tied to routes. They coordinate data fetching and layout.

```typescript
// ProductListPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsService } from '../services/products.service';
import { useFilterStore } from '@shared/stores/filterStore';

export function ProductListPage() {
  const { search, status, page } = useFilterStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', search, status, page],
    queryFn: () => productsService.getMany({ search, status, page }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Products</h1>
        <p className="text-zinc-400">Manage your product catalog</p>
      </div>

      {/* Filter controls */}
      <FilterBar />

      {/* Data display */}
      {isLoading && <Spinner />}
      {error && <ErrorAlert message={error.message} />}
      {data && (
        <>
          <ProductTable products={data.data} />
          <Pagination total={data.total} page={page} pageSize={data.pageSize} />
        </>
      )}
    </div>
  );
}
```

**Pattern:**
- Use `useQuery` to fetch data
- Use Zustand for filter state
- Delegate to smaller components for UI rendering
- Handle loading/error/success states explicitly

---

### 2. Form Component

Forms handle user input, validation, submission.

```typescript
// IngestionForm.tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { importService } from '../services/import.service';

export function IngestionForm({ onSuccess }) {
  const [source, setSource] = useState<'clickbank' | 'cj' | 'shopee'>('clickbank');
  const [keyword, setKeyword] = useState('');
  const [limit, setLimit] = useState(10);

  const mutation = useMutation({
    mutationFn: () => importService.ingest({ source, keyword, limit }),
    onSuccess: (data) => {
      onSuccess(data.jobId);
      setKeyword('');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Source</label>
        <select value={source} onChange={(e) => setSource(e.target.value as any)}>
          <option value="clickbank">ClickBank</option>
          <option value="cj">Commission Junction</option>
          <option value="shopee">Shopee</option>
        </select>
      </div>

      <div>
        <label>Keyword</label>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search keyword…"
        />
      </div>

      <div>
        <label>Limit</label>
        <input
          type="number"
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value))}
          min="1"
          max="50"
        />
      </div>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
      >
        {mutation.isPending ? 'Searching…' : 'Search Products'}
      </button>

      {mutation.error && <ErrorAlert message={mutation.error.message} />}
    </form>
  );
}
```

**Pattern:**
- Local `useState` for form inputs
- `useMutation` for submission
- Call `onSuccess` callback to notify parent
- Show loading state during submission
- Display error from mutation

---

### 3. Display Component (Presentational)

Receives data as props, renders UI without side effects.

```typescript
// ProductTable.tsx
import type { Product } from '@core/api/api.types';
import { StatusBadge } from '@shared/ui/StatusBadge';
import { formatDate } from '@shared/utils/format';

interface ProductTableProps {
  products: Product[];
  onRowClick?: (productId: string) => void;
}

export function ProductTable({ products, onRowClick }: ProductTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900 border-b border-zinc-800">
          <tr>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Source</th>
            <th className="px-4 py-2 text-left">Price</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Created</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              onClick={() => onRowClick?.(product.id)}
              className="border-b border-zinc-800 hover:bg-zinc-900 cursor-pointer"
            >
              <td className="px-4 py-2">{product.name}</td>
              <td className="px-4 py-2 text-zinc-400">{product.source}</td>
              <td className="px-4 py-2">${product.price ?? 'N/A'}</td>
              <td className="px-4 py-2">
                <StatusBadge status={product.status} />
              </td>
              <td className="px-4 py-2 text-zinc-400">
                {formatDate(product.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Pattern:**
- Pure function, no hooks (except rarely used ones)
- Receives data as props
- Delegates logic to parent via callbacks
- Focuses on visual rendering

---

## Service Layer

**Purpose:** Encapsulate business logic and API calls.

Each feature module has a `services/` folder with service functions.

### Example: `products.service.ts`

```typescript
import { apiClient } from '@core/api/api-client';
import type { Product, Page } from '@core/api/api.types';

export const productsService = {
  /**
   * Fetch multiple products with filters
   * @param filters search, status, page, pageSize
   * @returns Paginated products
   */
  getMany: async (filters: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Page<Product>> => {
    const response = await apiClient.get<Page<Product>>('/products', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Fetch single product by ID
   */
  getById: async (id: string): Promise<Product> => {
    const response = await apiClient.get<Product>(`/products/${id}`);
    return response.data;
  },

  /**
   * Create new product
   */
  create: async (dto: CreateProductDto): Promise<Product> => {
    const response = await apiClient.post<Product>('/products', dto);
    return response.data;
  },

  /**
   * Update product status
   */
  updateStatus: async (id: string, status: ProductStatus): Promise<Product> => {
    const response = await apiClient.put<Product>(`/products/${id}/status`, {
      status,
    });
    return response.data;
  },

  /**
   * Delete product
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },
};
```

### Example: `import.service.ts`

```typescript
import { apiClient } from '@core/api/api-client';

export const importService = {
  /**
   * Ingest products from affiliate network
   */
  ingest: async (data: {
    source: 'clickbank' | 'cj' | 'shopee';
    keyword: string;
    limit: number;
  }): Promise<{ jobId: string }> => {
    const response = await apiClient.post('/source-connector/ingest', {
      source: data.source.toUpperCase(),
      keyword: data.keyword,
      limit: data.limit,
    });
    return response.data;
  },

  /**
   * Upload CSV file
   */
  uploadCsv: async (file: File): Promise<{
    filePath: string;
    headers: string[];
    rows: string[][];
  }> => {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post('/source-connector/import-csv', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Confirm CSV import with column mapping
   */
  confirmCsv: async (data: {
    filePath: string;
    source: string;
    mapping: Record<string, string>;
  }): Promise<{ jobId: string }> => {
    const response = await apiClient.post('/source-connector/import-csv/confirm', data);
    return response.data;
  },

  /**
   * Poll job status (for ingestion, enrichment, etc.)
   */
  getJobStatus: async (jobId: string, queue?: string) => {
    const response = await apiClient.get(`/source-connector/jobs/${jobId}`, {
      params: queue ? { queue } : undefined,
    });
    return response.data;
  },
};
```

**Service Pattern:**
- Export object with named methods (easier to tree-shake than default export)
- Async/await syntax
- Each method handles one API call or business operation
- Types defined in `@core/api/api.types.ts`
- Error handling delegated to interceptor + component error boundary

---

## Routing

**Framework:** React Router v7

### Route Definition

Routes defined in `core/router/AppRouter.tsx`:

```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@shared/layout/AppLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      // Redirect root to dashboard
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // Dashboard
      { path: 'dashboard', element: <DashboardPage /> },

      // Products
      { path: 'products', element: <ProductListPage /> },
      { path: 'products/import', element: <ProductImportPage /> }, // MUST come before /:id
      { path: 'products/:id', element: <ProductDetailPage /> },

      // Content
      { path: 'content', element: <ContentListPage /> },
      { path: 'content/generate', element: <ContentGeneratePage /> }, // MUST come before /:id
      { path: 'content/:id', element: <ContentEditorPage /> },

      // Publishing
      { path: 'publishing', element: <PublishingPage /> },

      // Settings
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
```

**Important:** Routes with literal paths (like `/products/import`) must be declared **before** parameterized routes (like `/products/:id`). Otherwise, React Router matches `/products/import` to the `:id` parameter.

### Navigation

Use React Router's `useNavigate` hook:

```typescript
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();

  function handleClick() {
    navigate('/products/123');        // Navigate to product detail
    navigate('/content?tab=draft');   // Navigate with search params
    navigate(-1);                     // Go back
  }

  return <button onClick={handleClick}>Go</button>;
}
```

### Link Component

```typescript
import { Link } from 'react-router-dom';

<Link
  to={`/products/${productId}`}
  className="text-violet-500 hover:text-violet-400"
>
  View Details
</Link>
```

---

## API Integration

### Request Flow

```
Component (useQuery / useMutation)
           ↓
Service function (e.g., productsService.getMany())
           ↓
apiClient.get() / apiClient.post() (Axios)
           ↓
Request interceptor (adds auth headers if needed)
           ↓
HTTP request to backend (/api → proxied to :3001)
           ↓
Backend response
           ↓
Response interceptor (extracts error message)
           ↓
Component receives data or error
```

### Error Handling

**Global (in interceptor):**
```typescript
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract meaningful error message from backend
    const message = error.response?.data?.message ?? error.message ?? 'Unknown error';
    return Promise.reject(new Error(message));
  },
);
```

**Component level (in mutation):**
```typescript
const mutation = useMutation({
  mutationFn: contentService.generate,
  onError: (error) => {
    showToast(error.message, 'error'); // Toast notification
  },
});
```

### Types and DTOs

All types centralized in `core/api/api.types.ts`:

```typescript
// DTO for sending to backend
export interface CreateProductDto {
  externalId: string;
  source: 'CLICKBANK' | 'CJ' | 'SHOPEE' | 'LAZADA' | 'CSV';
  name: string;
  description?: string;
  price?: number;
  commission?: number;
  affiliateLink?: string;
  productLink?: string;
  imageUrl?: string;
  rawData?: Record<string, unknown>;
}

// Response from backend
export interface Product extends CreateProductDto {
  id: string;
  status: ProductStatus;
  enrichStatus: EnrichStatus;
  enrichedAt?: string;
  productDna?: ProductDNA;
  dnaExtractedAt?: string;
  metadata?: ProductMetadata;
  createdAt: string;
  updatedAt: string;
}

// Paginated response
export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

---

## UI/UX Conventions

### Design System

- **Theme:** Dark mode (zinc/neutral palette + violet accent)
- **Typography:** System fonts, size scale (xs, sm, base, lg, xl, 2xl)
- **Spacing:** Tailwind default scale (0.25rem increments)
- **Colors:** Zinc (grays), Violet (accent), Red/Yellow/Green (status)
- **Borders:** Subtle zinc-800 borders, rounded-md default

### Status Badges

```typescript
// StatusBadge.tsx — visual indicator of object state
<StatusBadge status="ACTIVE" />      // Green
<StatusBadge status="PENDING" />     // Yellow
<StatusBadge status="INACTIVE" />    // Gray
<StatusBadge status="FAILED" />      // Red
```

### Loading States

```typescript
{isLoading && (
  <div className="flex items-center gap-2 text-zinc-400">
    <Loader2 className="h-4 w-4 animate-spin" />
    Loading...
  </div>
)}
```

### Empty States

```typescript
{data?.length === 0 && (
  <div className="text-center py-12">
    <Inbox className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
    <p className="text-zinc-400">No products found</p>
    <Link to="/products/import" className="text-violet-500">
      Import your first product
    </Link>
  </div>
)}
```

### Forms

- **Labels:** Uppercase, tracking-wide, text-xs, text-zinc-400
- **Inputs:** bg-zinc-800, border-zinc-700, text-white, rounded-md
- **Focus state:** ring-1 ring-violet-500
- **Error state:** border-red-500, text-red-400

```typescript
<div className="space-y-2">
  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
    Product Name
  </label>
  <input
    className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white
               placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
    placeholder="Enter name…"
  />
</div>
```

### Modals / Dialogs

Use native `<dialog>` or third-party component (Radix UI recommended).

```typescript
<dialog
  open={isOpen}
  className="w-full max-w-md rounded-lg bg-zinc-950 border border-zinc-800 p-6"
>
  <h2 className="text-lg font-semibold text-white mb-4">Confirm Action</h2>
  <p className="text-sm text-zinc-400 mb-6">Are you sure?</p>
  <div className="flex gap-3">
    <button onClick={() => setIsOpen(false)} className="flex-1 px-4 py-2 rounded bg-zinc-800 text-white hover:bg-zinc-700">
      Cancel
    </button>
    <button onClick={handleConfirm} className="flex-1 px-4 py-2 rounded bg-violet-600 text-white hover:bg-violet-700">
      Confirm
    </button>
  </div>
</dialog>
```

### Toast Notifications

Use a toast library (e.g., `sonner`, `react-toastify`):

```typescript
import { toast } from 'sonner';

// Success
toast.success('Product created!');

// Error
toast.error('Failed to create product');

// Custom
toast.custom(<CustomToastComponent />);
```

---

## Common Implementation Tasks

### Add a New Page

1. Create page component in `modules/[feature]/pages/[Feature]Page.tsx`
2. Add route to `core/router/AppRouter.tsx`
3. Add navigation link to `Sidebar.tsx` if needed
4. Create service if needed in `modules/[feature]/services/[feature].service.ts`

**Example: Add a Review Page**
```typescript
// modules/reviews/pages/ReviewListPage.tsx
import { useQuery } from '@tanstack/react-query';
import { reviewsService } from '../services/reviews.service';

export function ReviewListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['reviews'],
    queryFn: reviewsService.getMany,
  });

  return (
    <div>
      <h1>Reviews</h1>
      {isLoading ? <Spinner /> : <ReviewTable reviews={data} />}
    </div>
  );
}
```

```typescript
// core/router/AppRouter.tsx
{
  path: 'reviews',
  element: <ReviewListPage />,
},
```

### Add a New Service Endpoint

1. Add type in `core/api/api.types.ts`
2. Add function in service file
3. Use in component

```typescript
// core/api/api.types.ts
export interface Review {
  id: string;
  productId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// modules/reviews/services/reviews.service.ts
export const reviewsService = {
  getMany: async () => {
    const response = await apiClient.get<Review[]>('/reviews');
    return response.data;
  },
  create: async (dto: CreateReviewDto) => {
    const response = await apiClient.post('/reviews', dto);
    return response.data;
  },
};

// In component
const mutation = useMutation({
  mutationFn: reviewsService.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['reviews'] });
  },
});
```

### Add a New Status Type

1. Update backend Prisma schema (see BACKEND.md)
2. Update `core/api/api.types.ts`
3. Update `StatusBadge.tsx` to handle new status
4. Update any components that reference the status

```typescript
// core/api/api.types.ts
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Review {
  status: ReviewStatus;
  // ...
}

// shared/ui/StatusBadge.tsx
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-900 text-yellow-200',
  APPROVED: 'bg-green-900 text-green-200',
  REJECTED: 'bg-red-900 text-red-200',
  // ... other statuses
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}
```

### Update Component to Poll Data

```typescript
const { data: jobStatus } = useQuery({
  queryKey: ['job', jobId],
  queryFn: () => importService.getJobStatus(jobId),
  refetchInterval: (query) => {
    const state = query.state.data?.state;
    if (state === 'completed' || state === 'failed') return false;
    return 2000; // Poll every 2 seconds
  },
});
```

---

## Debugging & Development

### Dev Server

```bash
cd frontend && npm run dev
# Runs on http://localhost:5173
# Proxies /api/* to http://localhost:3001
```

### React DevTools Browser Extension

Inspect component tree, props, hooks state:
```
Chrome/Firefox → Extensions → React DevTools
```

### TanStack Query DevTools

Add to your app to inspect queries/mutations:
```bash
npm install @tanstack/react-query-devtools
```

```typescript
// App.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@core/query/query-client';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Network Tab

Check actual HTTP requests/responses:
```
Browser DevTools → Network tab → Filter by Fetch/XHR
```

---

## Summary

**Stack:** React 19 + Vite + React Router + TanStack Query + Zustand + Tailwind CSS + Axios

**Architecture:** Feature modules (products, content, publishing, settings) + shared core (API, router, query client)

**State:**
- **Server state** (products, content, logs) → TanStack Query
- **Client state** (filters, UI flags) → Zustand
- **Form state** (temporary input values) → React `useState`

**Patterns:**
- Service layer for all API calls
- Thin controllers (components), thick services
- Type-safe with central `api.types.ts`
- Query keys by feature/resource
- Dark theme, consistent UI conventions

**Key principles:**
- Never use `"use client"` (this is React, not Next.js)
- Components are thin; services are thick
- Server state is cached and revalidated; client state is temporary
- Status badges, loading states, empty states always shown
- Modal/dialog components for confirmations
- Toast notifications for user feedback
