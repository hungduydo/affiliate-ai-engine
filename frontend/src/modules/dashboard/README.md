# dashboard Module

Landing page showing live platform metrics.

---

## Pages

### `DashboardPage` (`/dashboard`)

Four metric cards, each fetching live data:

| Card | Query | Metric |
|------|-------|--------|
| Total Products | `GET /products?limit=1` | `total` count |
| Generated Content | `GET /content?status=GENERATED&limit=1` | `total` count |
| Published | `GET /content?status=PUBLISHED&limit=1` | `total` count |
| Pending Approval | `GET /content?status=PENDING_APPROVAL&limit=1` | `total` count |

All four queries run in parallel via TanStack Query.

---

## Services (`dashboard.service.ts`)

Thin wrappers around the products and content APIs, extracting `total` from paginated responses.
