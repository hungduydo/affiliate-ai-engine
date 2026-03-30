# Flow Content Factory — Testing Strategy

**Scope**: `backend/src/modules/content-factory/` — Gemini-based content generation orchestration

---

## 1. Testing Layers

### Unit Tests (Fastest, Most Coverage)
- **ContentService** — CRUD operations, status transitions
- **ContentGenerationService** — Orchestration logic, error handling
- **GeminiAdapter** — Prompt building, JSON parsing, API error mapping
- **Utility functions** — Prompt rendering, validation helpers

### Integration Tests (Medium Speed, Realistic)
- **ContentGenerationProcessor** (BullMQ worker) — Job ingestion, status updates, cross-module calls
- **Database state** — Verify content records are persisted correctly
- **Internal API calls** — Mock `POST /api/internal/products/:id`, `GET /api/internal/prompts`

### End-to-End Tests (Slowest, User Perspective)
- Full flow: `POST /content` → job enqueued → processor runs → `GET /content/:id` sees updated status
- Optional: Real Gemini API integration in staging

---

## 2. Testing Pyramid

```
                    /\         E2E (5–10 tests)
                   /  \        - Happy path
                  /    \       - Error scenarios
                 /------\
                /        \     Integration (15–25 tests)
               /          \    - Job processing
              /            \   - Status transitions
             /              \  - Cross-module calls
            /----------------\
           /                  \ Unit (40–60 tests)
          /                    \ - Services
         /                      \ - Adapters
        /________________________\ - Utils
```

---

## 3. Unit Tests

### ContentService

**Test file**: `content.service.spec.ts`

#### CRUD Operations
```typescript
describe('ContentService', () => {
  describe('create()', () => {
    it('should create content with RAW status', () => {
      // Arrange: valid DTO
      // Act: service.create(createContentDto)
      // Assert: contentId returned, status === RAW, createdAt set
    });

    it('should throw ValidationException for invalid platform', () => {
      // Arrange: DTO with platform = "INVALID"
      // Act & Assert: expect(service.create(...)).rejects.toThrow()
    });

    it('should enqueue GENERATE_CONTENT job', () => {
      // Arrange: mock queueService.addJob
      // Act: service.create(...)
      // Assert: queueService.addJob called with correct jobName and contentId
    });
  });

  describe('update()', () => {
    it('should update content title and body', () => {
      // Arrange: existing content, update DTO
      // Act: service.update(contentId, updateDto)
      // Assert: title/body updated, updatedAt changed
    });

    it('should not allow updates to PUBLISHED content', () => {
      // Status validation test
    });
  });

  describe('updateStatus()', () => {
    it('should transition RAW → AI_PROCESSING', () => {
      // Arrange: content with RAW status
      // Act: service.updateStatus(contentId, AI_PROCESSING)
      // Assert: status updated, no error
    });

    it('should reject invalid status transitions', () => {
      // Arrange: content with GENERATED status
      // Act: service.updateStatus(contentId, RAW)
      // Assert: throw InvalidStatusTransitionException
    });
  });
});
```

### ContentGenerationService

**Test file**: `content-generation.service.spec.ts`

#### Orchestration Logic
```typescript
describe('ContentGenerationService', () => {
  describe('generateContent()', () => {
    it('should fetch product and prompt, render, and call Gemini', async () => {
      // Arrange:
      // - Mock HTTP calls to /api/internal/products/:id
      // - Mock HTTP calls to /api/internal/prompts
      // - Mock GeminiAdapter.generate()
      // Act: service.generateContent(contentId, productId, platform)
      // Assert:
      // - Each service called in order
      // - Gemini called with rendered prompt
      // - Returned { title, body }
    });

    it('should throw ProductNotFoundException if product fetch fails', async () => {
      // Arrange: HTTP mock returns 404
      // Act & Assert: expect(...).rejects.toThrow(ProductNotFoundException)
    });

    it('should throw PromptTemplateNotFoundException if no matching prompt exists', async () => {
      // Similar to above
    });

    it('should handle missing prompt variables gracefully', async () => {
      // Arrange: prompt has {{unknownVar}} not in product data
      // Act: service.generateContent(...)
      // Assert: rendered prompt contains empty string or original var placeholder
    });

    it('should retry Gemini call up to 3 times on transient errors', async () => {
      // Arrange: GeminiAdapter throws temporary error twice, then succeeds
      // Act & Assert: verify retries occur with exponential backoff
    });

    it('should throw GeminiException on persistent API failures', async () => {
      // Arrange: All 3 retries fail
      // Act & Assert: expect(...).rejects.toThrow(GeminiException)
    });
  });
});
```

### GeminiAdapter

**Test file**: `gemini.adapter.spec.ts`

#### AI Integration
```typescript
describe('GeminiAdapter', () => {
  describe('generate()', () => {
    it('should call @google/generative-ai and parse JSON response', async () => {
      // Arrange: mock GenerativeModel.generateContent()
      // Act: adapter.generate(prompt)
      // Assert: returns { title, body }
    });

    it('should validate JSON response schema', async () => {
      // Arrange: Gemini returns { title: "...", body: "..." } (valid)
      // Act & Assert: parse succeeds
    });

    it('should throw GeminiException if response is invalid JSON', async () => {
      // Arrange: Gemini returns plain text, not JSON
      // Act & Assert: throw GeminiException
    });

    it('should throw GeminiException if required fields are missing', async () => {
      // Arrange: response = { title: "..." }  (missing body)
      // Act & Assert: throw GeminiException
    });

    it('should handle content filtering (safety flags)', async () => {
      // Arrange: Gemini marks response as blocked due to safety filters
      // Act & Assert: throw GeminiException with "BLOCKED_BY_SAFETY" code
    });

    it('should respect max token limits', async () => {
      // Arrange: set maxTokens = 500
      // Act: adapter.generate(prompt, { maxTokens: 500 })
      // Assert: GenerativeModel called with correct token limit
    });
  });
});
```

---

## 4. Integration Tests

### ContentGenerationProcessor (BullMQ Worker)

**Test file**: `content-generation.processor.spec.ts`

#### Job Processing
```typescript
describe('ContentGenerationProcessor', () => {
  let processor: ContentGenerationProcessor;
  let queueService: QueueService;
  let contentService: ContentService;
  let contentGenService: ContentGenerationService;

  beforeEach(async () => {
    // Set up in-memory or local Redis for testing
    // Initialize processor with mocked services
  });

  describe('process()', () => {
    it('should mark content as AI_PROCESSING, generate, and mark GENERATED', async () => {
      // Arrange:
      // - Create content with RAW status
      // - Enqueue GENERATE_CONTENT job with { contentId }
      // - Mock contentGenService.generateContent() → { title, body }
      // Act: processor.process(job)
      // Assert:
      // - contentService.updateStatus(contentId, AI_PROCESSING) called
      // - contentGenService.generateContent() called
      // - contentService.update(contentId, { title, body }) called
      // - contentService.updateStatus(contentId, GENERATED) called
    });

    it('should mark content as FAILED on generation error', async () => {
      // Arrange: contentGenService.generateContent() throws GeminiException
      // Act & Assert:
      // - contentService.updateStatus(contentId, FAILED) called
      // - Job transitions to failed state (BullMQ native)
    });

    it('should NOT update content if it was deleted', async () => {
      // Arrange: content deleted during processing
      // Act & Assert: catch NotFoundException, mark job as failed
    });

    it('should handle concurrent jobs (concurrency: 2)', async () => {
      // Arrange: enqueue 5 jobs
      // Act: let processor run
      // Assert: verify max 2 jobs execute in parallel (BullMQ native)
    });
  });
});
```

### Database State

**Test file**: `content-generation.integration.spec.ts`

#### Persistence
```typescript
describe('Content Generation — Database Integration', () => {
  it('should persist generated content to content_db', async () => {
    // Arrange: create content
    // Act: trigger generation
    // Assert: verify content record in database has title/body/status
  });

  it('should not leave orphaned records on partial failure', async () => {
    // Arrange: generation fails after content.create() but before processor runs
    // Act & Assert: verify content exists in RAW state (correct state)
  });
});
```

---

## 5. End-to-End Tests

**Test file**: `content-factory.e2e.spec.ts`

### Happy Path
```typescript
describe('Content Factory E2E', () => {
  it('should generate and store content for a product', async () => {
    // Arrange:
    // - POST /products (create product via product-management internal API)
    // - POST /config/prompts (create template)
    // Act:
    // - POST /content { productId, platform: "WORDPRESS", contentType: "BLOG_POST" }
    // - Wait for job completion (poll /content/:id until status !== RAW)
    // Assert:
    // - Content status is GENERATED
    // - title and body are populated
    // - No error message
  });

  it('should handle content approval and publishing', async () => {
    // Arrange: generated content in GENERATED state
    // Act:
    // - PATCH /content/:id { title, body } (edit)
    // - PUT /content/:id/status { status: PENDING_APPROVAL }
    // - (In real flow) POST /publishing/publish { contentId, platform }
    // Assert: status transitions are valid
  });
});
```

### Error Scenarios
```typescript
describe('Content Factory E2E — Error Paths', () => {
  it('should handle missing product', async () => {
    // Arrange: POST /content with non-existent productId
    // Act & Assert: returns error, content in FAILED state
  });

  it('should handle missing prompt template', async () => {
    // Arrange: no template for platform=FACEBOOK, contentType=BLOG_POST
    // Act & Assert: content in FAILED state
  });

  it('should handle Gemini API downtime', async () => {
    // Arrange: mock Gemini to timeout
    // Act & Assert: retries occur, eventually FAILED state
  });
});
```

---

## 6. Mocking Strategy

### External Services

| Service | Mock Library | Approach |
|---------|--------------|----------|
| `@google/generative-ai` | `jest.mock()` | Mock `GenerativeModel.generateContent()` to return `{ text: '{"title":"...", "body":"..."}' }` |
| Product Management API | `@nestjs/testing` HttpMock | Mock HTTP calls to `GET /api/internal/products/:id` |
| Config Module API | `@nestjs/testing` HttpMock | Mock HTTP calls to `GET /api/internal/prompts` |
| BullMQ / Redis | `jest-mock-extended` or `ioredis-mock` | For unit tests, mock `QueueService.addJob()`. For integration, use local Redis or `redis-mock`. |

### Example Mock Setup

```typescript
// content-generation.service.spec.ts
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';

describe('ContentGenerationService', () => {
  let httpService: HttpService;

  beforeEach(() => {
    httpService = {
      get: jest.fn(),
      post: jest.fn(),
    } as any;
  });

  it('should fetch product via HTTP', async () => {
    const mockProduct = { id: '123', name: 'Test Product', price: 29.99 };
    httpService.get.mockReturnValue(of({ data: mockProduct }));

    // Test code...
  });

  it('should handle HTTP 404', async () => {
    httpService.get.mockReturnValue(
      throwError(() => new HttpException('Not Found', 404))
    );

    // Test code...
  });
});
```

---

## 7. Test Data & Fixtures

**File**: `test/fixtures/content.fixtures.ts`

```typescript
export const createContentFixture = (overrides = {}) => ({
  productId: 'prod-123',
  platform: 'WORDPRESS',
  contentType: 'BLOG_POST',
  title: null,
  body: '',
  status: 'RAW',
  ...overrides,
});

export const createProductFixture = (overrides = {}) => ({
  id: 'prod-123',
  name: 'Test Product',
  description: 'A great test product',
  price: 29.99,
  commission: 10,
  affiliateLink: 'https://example.com/aff',
  ...overrides,
});

export const createPromptFixture = (overrides = {}) => ({
  id: 'prompt-123',
  platform: 'WORDPRESS',
  contentType: 'BLOG_POST',
  template: 'Write a blog post about {{name}} ({{price}}). Description: {{description}}',
  isActive: true,
  ...overrides,
});
```

---

## 8. CI/CD Integration

### Test Commands

```bash
# backend/package.json
{
  "scripts": {
    "test": "jest",
    "test:content-factory": "jest content-factory",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "npm run db:migrate && jest --runInBand content-factory.e2e.spec.ts"
  }
}
```

### Jest Configuration

**File**: `backend/jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverageFrom: [
    'src/modules/content-factory/**/*.ts',
    '!src/modules/content-factory/**/*.module.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};
```

### GitHub Actions / CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres_test
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: npm install
      - run: npm run db:migrate
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
```

---

## 9. Coverage Goals

| Component | Unit | Integration | E2E | Total Target |
|-----------|------|-------------|-----|---|
| ContentService | 90% | 95% | 100% | **95%** |
| ContentGenerationService | 85% | 90% | 95% | **90%** |
| GeminiAdapter | 90% | — | 100% | **95%** |
| Processor | 75% | 90% | 100% | **85%** |
| Controllers | 70% | 90% | 100% | **85%** |
| **Overall Module** | — | — | — | **90%** |

---

## 10. Test Checklist

- [ ] All CRUD operations tested
- [ ] All status transitions tested and validated
- [ ] Error handling for each external dependency
- [ ] Retry logic for transient failures
- [ ] Concurrent job processing
- [ ] Database persistence
- [ ] HTTP error mapping
- [ ] Prompt variable rendering with edge cases
- [ ] JSON parsing from Gemini response
- [ ] BullMQ job enqueuing/completion
- [ ] Job failure scenarios
- [ ] Content update permission checks
- [ ] Timestamp handling (createdAt, updatedAt)

---

## 11. Running Tests Locally

```bash
# Unit tests only
npm run test -- content-factory --testPathPattern=\.spec\.ts$

# With coverage
npm run test:coverage -- --testPathPattern=content-factory

# Watch mode (during development)
npm run test:watch -- content-factory

# Single test file
npm run test -- content-generation.service.spec.ts

# Integration tests (requires local Postgres + Redis)
npm run infra:up
npm run test -- content-factory.integration.spec.ts

# E2E tests (full app)
npm run dev &  # Start backend/frontend in background
npm run test:e2e
```

---

## 12. Continuous Improvement

- **Mutation testing** (optional): Use `stryker` to verify test quality
- **Performance baselines**: Track how long content generation takes; alert on regressions
- **Load testing**: BullMQ concurrency under high job volume
- **Snapshot testing** (optional): For Gemini response schema validation
