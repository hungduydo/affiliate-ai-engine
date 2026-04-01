# distribution-hub Module

Handles publishing approved content to external platforms and tracking publish history.

**Database:** `publish_db`

---

## Responsibilities

- Create publish jobs and track their status
- Route content to the correct platform adapter
- Store publish logs with links and error messages
- Internal API to update content status after successful publish

---

## Supported Platforms

| Platform | Adapter | Method |
|----------|---------|--------|
| WordPress | `wordpress.adapter.ts` | `POST /wp-json/wp/v2/posts` with Basic Auth |
| Facebook | `facebook.adapter.ts` | `POST graph.facebook.com/v19.0/{pageId}/feed` |
| Shopify | `shopify.adapter.ts` | `POST /admin/api/2024-01/blogs/{id}/articles.json` |

---

## Publishing Pipeline

```
POST /publishing/publish { contentId, platform }
  ↓
PublishingService.createLog() → status=PENDING
  ↓
Queue: PUBLISH_CONTENT { publishLogId }
  ↓
PublishContentProcessor (concurrency: 3)
  1. status → PUBLISHING
  2. GET /api/internal/content/:contentId
  3. Route by platform → WordPressAdapter | FacebookAdapter | ShopifyAdapter
  4. On success: status=PUBLISHED, publishedLink saved
     On failure: status=FAILED, errorMessage saved
  5. PUT /api/internal/content/:contentId/status { PUBLISHED }
```

---

## Database Schema

```prisma
model PublishLog {
  id            String        @id @default(cuid())
  contentId     String        // Reference only — no FK
  platform      Platform
  publishedLink String?
  status        PublishStatus @default(PENDING)
  errorMessage  String?
  publishedAt   DateTime?
  createdAt     DateTime      @default(now())
}

enum PublishStatus {
  PENDING | PUBLISHING | PUBLISHED | FAILED
}
```

---

## File Structure

```
distribution-hub/
├── distribution-hub.module.ts
├── application/
│   ├── publishing.service.ts      # createLog(), getLogs(), getLogById()
│   └── publish-content.service.ts # Routes to platform adapters
├── domain/
│   └── adapters/
│       └── publisher.adapter.interface.ts
├── infrastructure/
│   ├── wordpress.adapter.ts
│   ├── facebook.adapter.ts
│   └── shopify.adapter.ts
├── processors/
│   └── publish-content.processor.ts   # BullMQ worker (concurrency: 3)
└── presentation/
    ├── publishing.controller.ts
    ├── publishing.internal.controller.ts
    └── dto/
```
