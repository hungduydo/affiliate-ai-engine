# content-factory Module

AI-powered content generation engine. Implements the **CaaS (Content as a Service)** two-phase generation pipeline: DNA-enriched prompts → platform-native content.

**Database:** `content_db`

---

## Responsibilities

- Create content records and enqueue generation jobs
- Generate platform-specific content via the AI adapter
- Manage content status state machine
- Re-trigger generation for failed/raw content
- Internal API for distribution-hub

---

## Content Status State Machine

```
RAW → AI_PROCESSING → GENERATED → PENDING_APPROVAL → PUBLISHING → PUBLISHED
                   ↘                              ↗
                    ──────── SCHEDULED ──────────
       (any stage can → FAILED → RAW to retry)
```

| Status | Meaning |
|--------|---------|
| `RAW` | Record created, generation not started |
| `AI_PROCESSING` | Gemini API call in progress |
| `GENERATED` | AI generated successfully, awaiting review |
| `PENDING_APPROVAL` | Submitted for human review |
| `SCHEDULED` | Approved, queued for future publish |
| `PUBLISHING` | Platform adapter call in progress |
| `PUBLISHED` | Successfully published |
| `FAILED` | Generation or publishing failed |

---

## CaaS Generation Pipeline

```
POST /content { productId, platform, contentType }
  ↓
ContentService.create() → status=RAW, body=''
  ↓
Queue: GENERATE_CONTENT { contentId }
  ↓
ContentGenerationProcessor (concurrency: 2)
  1. status → AI_PROCESSING
  2. GET /api/internal/products/:productId  (fetch product + DNA)
  3. GET /api/internal/prompts?platform=...&contentType=...&isActive=true
  4. renderPrompt(template, productFields)
  5. if (product.productDna)
       ai.generateWithDNA(prompt, dna)  ← richer, persona-targeted
     else
       ai.generate(prompt)              ← fallback
  6. status → GENERATED (or FAILED)
```

---

## Supported Platforms & Content Types

| Platform | Content Types |
|----------|--------------|
| WORDPRESS | BLOG_POST |
| FACEBOOK | SOCIAL_POST, CAROUSEL, THREAD |
| TIKTOK | VIDEO_SCRIPT, CAROUSEL |
| YOUTUBE | VIDEO_SCRIPT |
| SHOPIFY | BLOG_POST, HERO_COPY |

### Content Type Descriptions

| Type | Description |
|------|-------------|
| `BLOG_POST` | Long-form SEO article |
| `SOCIAL_POST` | Short-form engagement post (TEA framework) |
| `VIDEO_SCRIPT` | 45-second TikTok/YouTube script with hook + CTA |
| `CAROUSEL` | 7-slide educational carousel |
| `THREAD` | 5-post Twitter/X thread |
| `HERO_COPY` | Website H1 + FAQ section |

---

## Default Prompt Templates

The system includes built-in CaaS-style prompts for each platform/type combination. These fire when no custom `PromptTemplate` is configured. Custom prompts from `config_db` override the defaults.

---

## File Structure

```
content-factory/
├── content-factory.module.ts
├── application/
│   ├── content.service.ts           # CRUD, status transitions, pagination
│   └── content-generation.service.ts  # Orchestrates AI generation
├── domain/
│   └── value-objects/
│       └── content-status.vo.ts     # Status transition rules + canTransition()
├── processors/
│   └── content-generation.processor.ts  # BullMQ worker (concurrency: 2)
├── presentation/
│   ├── content.controller.ts
│   ├── content.internal.controller.ts   # /api/internal/content/*
│   └── dto/
│       ├── create-content.dto.ts
│       └── update-content.dto.ts
└── prisma/
    ├── schema.prisma
    └── migrations/
```

---

## AI Adapter Integration

The module uses the **globally provided** `AI_ADAPTER` token (never imports GeminiAdapter directly):

```typescript
constructor(
  @Inject(AI_ADAPTER) private readonly ai: AIAdapter,
) {}
```

Swapping to Claude requires zero changes in this module.
