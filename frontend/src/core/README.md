# core/

Infrastructure layer — everything modules depend on but don't implement themselves.

---

## Structure

```
core/
├── api/
│   ├── api-client.ts    # Axios instance (baseURL: /api, credentials: include)
│   └── api.types.ts     # All TypeScript types for API models + enums
├── query/
│   └── query-client.ts  # TanStack Query v5 client configuration
└── router/
    └── AppRouter.tsx    # React Router v7 route tree
```

---

## api-client.ts

Axios instance with:
- `baseURL: '/api'` (proxied to `http://localhost:3001`)
- Response interceptor for error normalization

All service files import from here:
```typescript
import { apiClient } from '@core/api/api-client';
```

---

## api.types.ts

Single source of truth for all API types consumed by the frontend.

### Key Types

```typescript
// Product lifecycle
type ProductStatus = 'RAW' | 'ENRICHED' | 'ACTIVE' | 'INACTIVE';
type EnrichStatus = 'PENDING' | 'ENRICHING' | 'DONE' | 'FAILED' | 'SKIPPED';

// Content pipeline
type ContentStatus = 'RAW' | 'AI_PROCESSING' | 'GENERATED' | 'PENDING_APPROVAL'
                   | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
type Platform = 'WORDPRESS' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE' | 'SHOPIFY';
type ContentType = 'BLOG_POST' | 'SOCIAL_POST' | 'VIDEO_SCRIPT'
                 | 'CAROUSEL' | 'THREAD' | 'HERO_COPY';

// Product DNA (from CaaS Phase 1)
interface ProductDNA {
  coreProblem: string;
  keyFeatures: Array<{ feature: string; emotionalBenefit: string }>;
  targetPersona: { demographics: string; psychographics: string };
  objectionHandling: Array<{ objection: string; counter: string }>;
  visualAnchors: string[];
}

interface Product {
  id: string;
  name: string;
  source: string;
  status: ProductStatus;
  enrichStatus: EnrichStatus;
  productDna?: ProductDNA;
  dnaExtractedAt?: string;
  // ... more fields
}
```

---

## query-client.ts

TanStack Query v5 client with:
- `staleTime: 30_000` (30 seconds)
- `retry: 1`
- Error boundary integration

---

## AppRouter.tsx

Defines all routes under `AppLayout`. Route order:
1. `/products/import` **before** `/products/:id`
2. `/content/generate` **before** `/content/:id`
