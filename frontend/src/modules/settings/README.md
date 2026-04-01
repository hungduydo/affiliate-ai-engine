# settings Module

Configure AI prompt templates and view connector credential status.

---

## Pages

### `SettingsPage` (`/settings`)

Two-tab layout:

**Tab 1: Prompt Templates**
- `PromptTemplateTable` — lists all templates (no `isActive` filter — shows ALL for management)
- **Create** button → `PromptTemplateForm` modal (create mode)
- **Edit** per row → `PromptTemplateForm` modal (edit mode)
- **Delete** per row → confirmation → `DELETE /config/prompts/:id`

**Tab 2: Connectors**
- `ConnectorStatus` grid — shows boolean badges for each connector
- Data from `GET /config/connector-status`
- Connectors shown: ClickBank, CJ, Shopee, WordPress, Facebook, Shopify, Gemini

---

## Components

### `PromptTemplateForm`
- Fields: Name, Platform (dropdown), Content Type (dropdown), Template textarea, isActive toggle
- **Variable hint buttons** — click `{{name}}`, `{{price}}`, etc. to insert at cursor
- Content Type dropdown shows human-readable labels:
  - Blog Post, Social Post, Video Script, Carousel (Slides), Thread (X / Twitter), Hero Copy (Website)

### `PromptTemplateTable`
- Columns: Name, Platform, Content Type, Active status, Actions
- Inline edit/delete per row

### `ConnectorStatus`
- Grid of connector cards with green (configured) / red (not configured) badges
- Reads from `GET /config/connector-status` — only env var presence, no secrets

---

## Services (`settings.service.ts`)

```typescript
getPrompts(filters?)      // GET /config/prompts (no default isActive)
createPrompt(data)        // POST /config/prompts
updatePrompt(id, data)    // PUT /config/prompts/:id
deletePrompt(id)          // DELETE /config/prompts/:id
getConnectorStatus()      // GET /config/connector-status
```
