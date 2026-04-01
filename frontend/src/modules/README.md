# modules/

Feature modules following a consistent structure: `pages/`, `components/`, `hooks/`, `services/`, `store/`.

---

## Module Index

| Module | Route | Purpose |
|--------|-------|---------|
| [dashboard](dashboard/) | `/dashboard` | Live metrics: products, generated, published, pending |
| [products](products/) | `/products` | Product list, detail, import (CSV + live ingest) |
| [content](content/) | `/content` | AI content generation, editing, approval |
| [publishing](publishing/) | `/publishing` | Publish logs, trigger publishing |
| [settings](settings/) | `/settings` | Prompt templates CRUD, connector status |

---

## Module Anatomy

Each module follows this structure:

```
module-name/
├── pages/          # Full-page route components (connected to router)
├── components/     # Reusable UI pieces local to this module
├── hooks/          # TanStack Query hooks (queries + mutations)
├── services/       # API call functions (axios wrappers)
└── store/          # Zustand store for local UI state
```

### Layer Responsibilities

- **`services/`** — Pure functions that call `apiClient`. Return raw API data. No React.
- **`hooks/`** — Wrap services in `useQuery` / `useMutation`. Handle cache invalidation.
- **`pages/`** — Consume hooks, manage page-level state, render layout.
- **`components/`** — Presentational, receive props, emit callbacks.
- **`store/`** — Ephemeral UI state that doesn't belong in server cache (wizard steps, selected rows, etc.)
