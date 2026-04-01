# publishing Module

View publish logs and trigger content publishing to external platforms.

---

## Pages

### `PublishingPage` (`/publishing`)
- Table of all publish logs with status, platform, published link
- **Auto-refresh** — polls every 5s when any log is in `PENDING` or `PUBLISHING` state
- **Publish Content modal** — select content ID + platform → `POST /publishing/publish`
- Click a log row to see full detail (error messages, timestamp, link)

---

## Services (`publishing.service.ts`)

```typescript
getLogs(filters)      // GET /publishing/logs with pagination
getLogById(id)        // GET /publishing/logs/:id
publish(payload)      // POST /publishing/publish → { publishLogId, jobId }
```

---

## Publish Flow (Frontend Perspective)

```
1. User clicks "Publish" on ContentListPage or PublishingPage modal
2. POST /publishing/publish { contentId, platform }
3. Returns { publishLogId, jobId }
4. PublishingPage auto-refreshes (5s interval)
5. Log transitions: PENDING → PUBLISHING → PUBLISHED (or FAILED)
6. On PUBLISHED: publishedLink appears as a clickable URL
```
