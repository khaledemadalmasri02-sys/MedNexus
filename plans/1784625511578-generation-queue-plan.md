# Generation Flashcard Calls Fix & Queue System Plan

## Problem Summary

The flashcard generation system has several issues:

1. **Corrupted/Missing Methods**: The `dist/routes/generate.js` references `aiService.streamGenerateCards()` and `offlineGenerator.streamGenerateCards()` that don't exist in the source.

2. **Offline Generator Missing**: `src/lib/offline-generator.ts` doesn't exist but `dist/lib/offline-generator.js` has compiled code.

3. **Inconsistent Fallback Logic**: `src/routes/generate.ts` has inline fallback code that duplicates logic and lacks proper streaming support.

4. **No Queue System**: Generation calls can overwhelm AI providers and there's no queuing for rate limit handling.

## Root Cause Analysis

### Source vs Dist Mismatch

| Source File | Expected Methods | Dist File | Available Methods |
|-------------|------------------|-----------|-------------------|
| `src/lib/ai.ts` | `generateCards`, `generateQuestions` | `dist/lib/ai.js` | Same, but missing `streamGenerateCards` |
| `src/routes/generate.ts` | Inline fallback | `dist/routes/generate.js` | References missing `streamGenerateCards` |
| `src/lib/offline-generator.ts` | Doesn't exist | `dist/lib/offline-generator.js` | Has `OfflineGenerator` class |

### Issues Identified

1. `AIService` in `src/lib/ai.ts` lacks `streamGenerateCards()` and `streamGenerateQuestions()` methods
2. `OfflineGenerator` class is missing from source (exists only in dist)
3. The `generate.ts` route has inline implementations that should be in separate modules
4. No queuing mechanism for managing concurrent generation requests

## Implementation Plan

### Phase 1: Create Offline Generator Module

**File**: `src/lib/offline-generator.ts`

Create the missing module with:
- `OfflineGenerator` class with `generateCards()`, `generateQuestions()`, `streamGenerateCards()`, `streamGenerateQuestions()`
- Same implementation as in `dist/lib/offline-generator.js`

### Phase 2: Add Streaming Methods to AI Service

**File**: `src/lib/ai.ts`

Add to `AIService` class:
- `async *streamGenerateCards(text, count, options?): AsyncGenerator<{type: 'progress'|'card', data: any}>`
- `async *streamGenerateQuestions(text, count, options?): AsyncGenerator<{type: 'progress'|'card', data: any}>`

These will yield progress events and individual cards/questions as they're generated.

### Phase 3: Create Generation Queue System

**File**: `src/lib/generation-queue.ts` (new)

Create a Durable Object-based queue system:

```typescript
interface GenerationJob {
  id: string
  userId: string | null
  type: 'cards' | 'questions'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  text: string
  count: number
  options?: GenerateOptions
  result?: any
  error?: string
  createdAt: Date
  updatedAt: Date
  retryCount: number
  priority: number
}

class GenerationQueue {
  private jobs: Map<string, GenerationJob>
  private running: Set<string>
  
  enqueue(job: Omit<GenerationJob, 'id'|'status'|'createdAt'|'updatedAt'|'retryCount'>): string
  dequeue(): GenerationJob | null
  get(id: string): GenerationJob | undefined
  update(id: string, patch: Partial<GenerationJob>): void
  complete(id: string, result: any): void
  fail(id: string, error: string): void
  getPending(): GenerationJob[]
  getRunning(): GenerationJob[]
}
```

### Phase 4: Create Generation Job Routes

**File**: `src/routes/generation-jobs.ts` (new)

Create routes:
- `POST /api/generation-jobs` - Enqueue a generation job
- `GET /api/generation-jobs` - List pending/running jobs for user
- `GET /api/generation-jobs/:id` - Get job status
- `GET /api/generation-jobs/:id/stream` - SSE stream for job progress
- `DELETE /api/generation-jobs/:id` - Cancel a job

### Phase 5: Update Generate Routes

**File**: `src/routes/generate.ts`

Refactor to:
1. Import `OfflineGenerator` from `./lib/offline-generator`
2. Add streaming methods to routes
3. Use queue for rate-limited scenarios
4. Remove inline fallback implementations

### Phase 6: Add D1 Tables for Persistent Queue

**File**: `src/db/schema.ts`

Add tables:
```typescript
export const generationJobs = sqliteTable("generation_jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  text: text("text"),
  count: integer("count").notNull().default(10),
  options: text("options"),
  result: text("result"),
  error: text("error"),
  retryCount: integer("retry_count").notNull().default(0),
  priority: integer("priority").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});
```

## Detailed Task List

### Task 1: Create `src/lib/offline-generator.ts`
- Copy implementation from `dist/lib/offline-generator.js`
- Export `OfflineGenerator` class and `offlineGenerator` singleton

### Task 2: Add streaming methods to `src/lib/ai.ts`
- Add `streamGenerateCards()` method
- Add `streamGenerateQuestions()` method
- Both yield `{type: 'progress'|'card', data: ...}`

### Task 3: Create `src/lib/generation-queue.ts`
- Implement `GenerationQueue` class
- In-memory queue with D1 persistence option
- Methods: enqueue, dequeue, get, update, complete, fail, getPending, getRunning

### Task 4: Create `src/routes/generation-jobs.ts`
- POST /api/generation-jobs
- GET /api/generation-jobs
- GET /api/generation-jobs/:id
- GET /api/generation-jobs/:id/stream
- DELETE /api/generation-jobs/:id

### Task 5: Update `src/routes/generate.ts`
- Import `OfflineGenerator`
- Use streaming methods
- Remove inline fallback code

### Task 6: Update `src/db/schema.ts`
- Add `generationJobs` table

### Task 7: Update `src/worker.ts`
- Import `generationJobRoutes`
- Register routes

## Data Flow for Queued Generation

```
Client POST /api/generation-jobs
  ↓
Queue.enqueue(job) → returns jobId
  ↓
Background processor picks up job
  ↓
AI Service attempts generation
  ↓
Success → queue.complete(jobId, result) → UI receives result via SSE
  ↓
Failure → Check retry count
  ↓
retries < MAX → queue.fail(jobId, error) → auto-retry
  ↓
retries >= MAX → queue.fail(jobId, error) → final status
```

## Rate Limit Handling

1. When AI provider returns 429:
   - Mark job as "rate-limited"
   - Wait for quota reset (check response headers)
   - Retry with exponential backoff

2. Queue concurrency:
   - Max 3 concurrent AI requests (configurable via `GEN_CONCURRENCY`)
   - Jobs with higher priority processed first

## Validation Plan

1. Unit tests for `OfflineGenerator` methods
2. Unit tests for `AIService.streamGenerateCards()`
3. Integration tests for queue operations
4. Manual testing:
   - Generate cards with AI available
   - Generate cards with AI unavailable (offline fallback)
   - Rate limit scenario (429 response)
   - Concurrent generation requests

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing generation | High | Keep backward-compatible endpoints |
| Queue memory limits | Medium | Use D1 for persistence, in-memory cache |
| SSE connection drops | Medium | Implement reconnection logic in frontend |
| Rate limit exhaustion | High | Implement backoff and clear error messages |

## Estimated Implementation Order

1. `src/lib/offline-generator.ts` (create missing module)
2. `src/lib/ai.ts` (add streaming methods)
3. `src/db/schema.ts` (add generation_jobs table)
4. `src/routes/generation-jobs.ts` (new queue routes)
5. `src/routes/generate.ts` (refactor to use new modules)
6. `src/worker.ts` (register new routes)