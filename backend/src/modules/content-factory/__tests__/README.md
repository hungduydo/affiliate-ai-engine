# Content Factory Tests

Comprehensive test suite for the Content Factory module — AI-powered content generation orchestration.

## Structure

```
__tests__/
├── fixtures/
│   └── content.fixtures.ts      # Shared test data factories
├── gemini.adapter.spec.ts        # GeminiAdapter unit tests
├── content.service.spec.ts       # ContentService unit tests
├── content-generation.service.spec.ts  # ContentGenerationService integration tests
└── README.md                     # This file
```

## Running Tests

### All tests
```bash
npm run test
```

### Content Factory only
```bash
npm run test:content-factory
```

### Watch mode (auto-rerun on changes)
```bash
npm run test:watch
```

### With coverage report
```bash
npm run test:coverage
```

### Single test file
```bash
npm run test -- content.service.spec.ts
```

## Test Layers

### Unit Tests (Fastest)
- **GeminiAdapter** — Mocks `@google/generative-ai` responses
- **ContentService** — CRUD operations, status validation, mocked Prisma
- **ContentGenerationService** — Orchestration logic, mocked HTTP + Gemini

### Integration Tests (Medium)
- **ContentGenerationProcessor** — BullMQ job processing, state transitions
- **Database state** — Real Prisma client with test database

### E2E Tests (Slowest)
- **Full workflow** — `POST /content` → generation → status updates
- Requires running infrastructure (Postgres, Redis)

## Key Testing Patterns

### Fixtures
```typescript
import { createContentFixture, createProductFixture } from './fixtures/content.fixtures';

const content = createContentFixture({ status: ContentStatus.GENERATED });
const product = createProductFixture({ name: 'Custom Name' });
```

### Mocking Prisma
```typescript
const prisma = {
  content: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};
prisma.content.findUnique.mockResolvedValue(content);
```

### Mocking HTTP (axios/RxJS)
```typescript
const http = {
  get: jest.fn(),
};
http.get.mockReturnValue(of({ data: product }));
```

### Mocking Gemini
```typescript
const gemini = {
  generate: jest.fn(),
};
gemini.generate.mockResolvedValue({
  title: 'Generated Title',
  body: 'Generated Body',
});
```

## Coverage Goals

| Component | Unit | Integration | Total |
|-----------|------|-------------|-------|
| GeminiAdapter | 95% | — | 95% |
| ContentService | 90% | 95% | 95% |
| ContentGenerationService | 85% | 90% | 90% |
| Processor | 75% | 90% | 85% |
| **Overall** | — | — | **90%** |

Current coverage: `npm run test:coverage`

## Common Issues

### Test timeout
If tests timeout, increase in `jest.setup.ts`:
```typescript
jest.setTimeout(15000); // 15 seconds
```

### Module resolution
Ensure `moduleNameMapper` in `jest.config.js` matches `tsconfig.json`:
```json
{
  "@modules/*": "src/modules/*",
  "@shared/*": "src/shared/*"
}
```

### RxJS subscriptions not cleaning up
Always use `firstValueFrom()` in tests to avoid hanging subscriptions:
```typescript
const result = await firstValueFrom(httpService.get(...));
```

## Next Steps

1. Create processor tests (`content-generation.processor.spec.ts`)
2. Add integration tests with real database
3. Set up E2E tests with Docker containers
4. Configure CI/CD pipeline to run tests on every PR
5. Add mutation testing with `stryker` for test quality analysis
