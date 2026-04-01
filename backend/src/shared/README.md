# shared/

Cross-cutting concerns shared across all backend modules.

---

## Structure

```
shared/
├── ai/                    # LLM-agnostic AI adapter system
│   ├── ai-adapter.interface.ts   # AIAdapter contract + ProductDNA types
│   ├── ai.module.ts              # Global NestJS module (@Global)
│   └── gemini.adapter.ts         # Google Gemini implementation
│
├── filters/
│   └── global-exception.filter.ts   # Catches all unhandled exceptions → JSON response
│
├── types/
│   └── common.types.ts              # Shared TypeScript types (PaginatedResponse, etc.)
│
└── utils/
    └── prompt-renderer.ts           # renderPrompt(template, vars) — {{variable}} substitution
```

---

## AI Adapter System

The AI adapter provides an **LLM-agnostic interface** so any provider (Gemini, Claude, GPT) can be swapped without touching business logic.

### Interface (`ai-adapter.interface.ts`)

```typescript
export interface AIAdapter {
  /** Phase 1: Extract structured Product DNA from raw product data */
  extractProductDNA(product: ProductInput): Promise<ProductDNA>;

  /** Phase 2a: Generate content from a prompt string */
  generate(prompt: string): Promise<GeneratedContent>;

  /** Phase 2b: Generate content using DNA context for richer output */
  generateWithDNA(prompt: string, dna: ProductDNA): Promise<GeneratedContent>;
}

export const AI_ADAPTER = Symbol('AI_ADAPTER');
```

### ProductDNA Shape

```typescript
export interface ProductDNA {
  coreProblem: string;                 // The pain point the product solves
  keyFeatures: Array<{
    feature: string;
    emotionalBenefit: string;          // Why it matters emotionally
  }>;
  targetPersona: {
    demographics: string;
    psychographics: string;
  };
  objectionHandling: Array<{
    objection: string;
    counter: string;
  }>;
  visualAnchors: string[];             // Imagery suggestions for creative teams
}
```

### Swapping Providers

To switch from Gemini to another LLM, change **one line** in `ai.module.ts`:

```typescript
// Current:
{ provide: AI_ADAPTER, useClass: GeminiAdapter }

// To use Claude (once ClaudeAdapter is implemented):
{ provide: AI_ADAPTER, useClass: ClaudeAdapter }
```

The `@Global()` decorator on `AiModule` means `AI_ADAPTER` is available in every module without re-importing.

---

## Prompt Renderer

`renderPrompt(template, vars)` performs `{{variable}}` substitution:

```typescript
const result = renderPrompt(
  "Write about {{name}} for {{platform}}",
  { name: "Magic Blender", platform: "WordPress" }
);
// → "Write about Magic Blender for WordPress"
```

### Available Variables (from Product)
`{{name}}` `{{description}}` `{{price}}` `{{commission}}` `{{affiliateLink}}`

---

## Global Exception Filter

All unhandled exceptions are caught and formatted as:

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/products"
}
```
