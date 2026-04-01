# config Module

Manages prompt templates for AI content generation and provides connector status information.

**Database:** `config_db`

---

## Responsibilities

- CRUD for `PromptTemplate` records
- Serve active templates to `content-factory` during generation
- Report which external connectors are configured (env var presence check)

---

## Prompt Templates

Templates use `{{variable}}` syntax rendered at generation time.

### Available Variables
| Variable | Source |
|----------|--------|
| `{{name}}` | Product name |
| `{{description}}` | Product description |
| `{{price}}` | Product price |
| `{{commission}}` | Commission percentage |
| `{{affiliateLink}}` | Affiliate tracking URL |

### Template Selection
The content-factory queries templates by `platform + contentType + isActive=true`. The **first matching active template** is used. If none found, the built-in default prompt fires.

### Important: `isActive` Filter Behavior
- **Settings UI** (`GET /config/prompts`) — returns ALL templates (no default `isActive` filter)
- **Generation** (`GET /api/internal/prompts?isActive=true`) — only active templates

---

## Database Schema

```prisma
model PromptTemplate {
  id          String      @id @default(cuid())
  name        String
  platform    Platform    // WORDPRESS | FACEBOOK | TIKTOK | YOUTUBE | SHOPIFY
  contentType ContentType // BLOG_POST | SOCIAL_POST | VIDEO_SCRIPT | CAROUSEL | THREAD | HERO_COPY
  template    String      // Full prompt with {{variables}}
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}
```

---

## Connector Status

`GET /config/connector-status` returns a boolean map of which connectors have credentials configured:

```json
{
  "clickbank": true,
  "cj": false,
  "shopee": true,
  "wordpress": true,
  "facebook": false,
  "shopify": false,
  "gemini": true
}
```

Only checks for **env var presence** — never exposes actual values.

---

## File Structure

```
config/
├── config.module.ts
├── application/
│   └── prompt-templates.service.ts   # CRUD; isActive filter is optional
├── presentation/
│   ├── config.controller.ts          # Public endpoints
│   └── config.internal.controller.ts # GET /api/internal/prompts
└── prisma/
    ├── schema.prisma
    └── migrations/
```
