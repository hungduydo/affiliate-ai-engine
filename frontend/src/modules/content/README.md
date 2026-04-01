# content Module

AI content creation, editing, and approval workflow.

---

## Pages

### `ContentListPage` (`/content`)
- Table of all content items with status badges
- **Status flow strip** — visual pipeline: RAW → AI_PROCESSING → GENERATED → PENDING_APPROVAL → PUBLISHING → PUBLISHED
- Actions per row: **Regenerate** (RAW/FAILED only), **Publish** (GENERATED/PENDING_APPROVAL)
- Filters: platform, status, search
- Auto-refreshes rows in `AI_PROCESSING` or `PUBLISHING` status (polls every 3s)

### `ContentGeneratePage` (`/content/generate`)
- **Pre-selection**: reads `?productId=` query param from ProductDetailPage "Generate Content" button
  - Fetches product by ID, pre-fills search box with product name
- Step 1: Product search (minimum 2 chars, dropdown shows matching products)
- Step 2: Select Platform + Content Type
- Step 3: Submit → `POST /content` → polls job until `GENERATED`
- Step 4: Preview generated content inline → navigate to editor

### `ContentEditorPage` (`/content/:id`)
- Displays title + body in editable form
- Action buttons:
  - **Approve** — moves to `PENDING_APPROVAL` status
  - **Publish** — sends to publishing queue
  - **Regenerate** — re-triggers AI (only on RAW or FAILED)
- Polls status when in `AI_PROCESSING` or `PUBLISHING`

---

## Content Type Labels

| Enum Value | Display Label |
|-----------|--------------|
| `BLOG_POST` | Blog Post |
| `SOCIAL_POST` | Social Post |
| `VIDEO_SCRIPT` | Video Script |
| `CAROUSEL` | Carousel (Slides) |
| `THREAD` | Thread (X / Twitter) |
| `HERO_COPY` | Hero Copy (Website) |

---

## Hooks (`useContent.ts`)

```typescript
useContentList(filters)     // GET /content with pagination
useContent(id)              // GET /content/:id (+ polling option)
useCreateContent()          // POST /content → { contentId, jobId }
useTriggerGenerate(id)      // POST /content/:id/generate
useUpdateContent(id)        // PATCH /content/:id (edit title/body)
useUpdateContentStatus(id)  // PUT /content/:id/status
```

---

## Services (`content.service.ts`)

```typescript
getMany(filters)           // Paginated list
getById(id)                // Single content
generate(payload)          // Create + enqueue generation job
triggerGenerate(id)        // Re-trigger for RAW/FAILED
update(id, patch)          // Edit title/body
updateStatus(id, status)   // Transition status
```
