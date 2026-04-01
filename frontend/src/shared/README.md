# shared/

Reusable components and utilities used across all feature modules.

---

## Structure

```
shared/
├── layout/
│   ├── AppLayout.tsx    # Main shell: Sidebar + Header + <Outlet />
│   ├── Sidebar.tsx      # Navigation links (uses Lucide icons + active route highlight)
│   └── Header.tsx       # Top bar with page title
├── ui/
│   ├── StatusBadge.tsx      # Colored badge for ProductStatus / ContentStatus / PublishStatus
│   └── EnrichStatusBadge.tsx # Badge for EnrichStatus (PENDING/ENRICHING/DONE/FAILED/SKIPPED)
└── utils/
    ├── cn.ts            # clsx + tailwind-merge helper
    └── format.ts        # formatDate(), formatPrice(), truncate()
```

---

## StatusBadge

Renders any status enum as a colored pill:

```tsx
<StatusBadge status="ACTIVE" />      // green
<StatusBadge status="RAW" />         // gray
<StatusBadge status="AI_PROCESSING" /> // amber (pulsing)
<StatusBadge status="PUBLISHED" />   // blue
<StatusBadge status="FAILED" />      // red
```

Handles: `ProductStatus`, `ContentStatus`, `PublishStatus`.

---

## cn() Utility

```typescript
import { cn } from '@shared/utils/cn';

cn('base-class', condition && 'conditional-class', 'another-class')
// Safely merges Tailwind classes, resolving conflicts
```

---

## AppLayout

All authenticated pages render inside `AppLayout`:
```
┌─────────────────────────────────────────┐
│  Sidebar  │  Header                     │
│           ├─────────────────────────────┤
│  Nav      │  <Outlet />                 │
│  Links    │  (page content here)        │
│           │                             │
└─────────────────────────────────────────┘
```
