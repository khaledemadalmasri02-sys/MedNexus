# Comprehensive Codebase Analysis & Upgrade Plan
## AI-Powered Medical Flashcard Generation System

---

## Phase 1: Full Codebase Analysis

### 1.1 Project Structure

```
mednexus-cloudflare/
├── src/
│   ├── worker.ts                    # Main entry point (Hono app)
│   ├── types.ts                     # Type definitions (Bindings, SessionVariables)
│   ├── lib/
│   │   ├── ai.ts                    # AI Service (OpenAI, OpenRouter, Groq, etc.)
│   │   ├── config.ts                # Configuration management
│   │   ├── helpers.ts               # Database helpers, insertBatched, SSE helpers
│   │   ├── auth.ts                  # Session management, OAuth, JWT
│   │   ├── password.ts              # Password hashing
│   │   ├── logger.ts                # Structured logging
│   │   ├── error-capture.ts         # Error classification and logging
│   │   ├── sm2.ts                   # Spaced repetition algorithm
│   │   ├── pdfText.ts               # Workers-native PDF text extraction
│   │   └── offline-generator.ts     # Heuristic card generation fallback
│   ├── db/
│   │   ├── index.ts                 # Drizzle ORM setup
│   │   ├── schema.ts                # Database schema (710+ lines)
│   │   ├── schema-flashcard.ts      # Re-exports
│   │   └── schema-study-pilot.ts    # Re-exports
│   ├── routes/                       # 25+ API route files
│   │   ├── auth.ts                  # Authentication routes
│   │   ├── cards.ts                 # Card CRUD operations
│   │   ├── decks.ts                 # Deck management
│   │   ├── generate.ts              # Card generation (AI + offline)
│   │   ├── explanations.ts          # Explanation generation (7 modes)
│   │   ├── agents.ts                # AI agents (Study Buddy, Exam Sim, etc.)
│   │   ├── studypilot.ts            # StudyPilot planner integration
│   │   ├── summary.ts               # Content summarization
│   │   ├── upload.ts                # File upload parsing
│   │   ├── extract.ts               # PDF/text extraction
│   │   └── ...                      # 15+ other route files
│   ├── middleware/
│   │   └── validate.ts              # Zod validation middleware
│   ├── studypilot/
│   │   └── planner.ts               # Study planning heuristics
│   └── ...
├── new-frontend/                     # React/TypeScript frontend
│   ├── src/
│   │   ├── App.tsx                  # Main routing
│   │   ├── lib/api.ts               # API client (1700+ lines)
│   │   ├── pages/                   # Page components
│   │   └── components/              # UI components
│   └── package.json                 # React 19, Tailwind 4, Vite 8
└── data/                            # SQLite databases, uploads
```

### 1.2 Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Runtime | Cloudflare Workers | Edge deployment |
| Framework | Hono v4.6.14 | Lightweight, middleware-based |
| ORM | Drizzle ORM v0.36.4 | SQLite (D1) for Workers |
| Database | D1 (SQLite) | 710+ line schema with 40+ tables |
| AI Providers | OpenRouter, OpenAI, Groq, Mistral, Google AI, Local (LM Studio/Ollama) | Multi-provider support |
| Frontend | React 19, Tailwind 4, Vite 8, Framer Motion | Modern SPA |
| PDF Processing | Custom Workers-native extraction | No pdfjs on Workers |
| Authentication | Session-based with HTTP-only cookies | Google OAuth, guest access |

### 1.3 Database Schema Summary

**Core Tables:**
- `users` - User accounts with OAuth support
- `sessions` - Session management
- `decks` / `cards` - Main flashcard data
- `qbanks` / `questions` - Question banks (MCQ format)
- `card_progress` - SM-2 spaced repetition data
- `tags` / `deck_tags` / `qbank_tags` - Tag management

**AI/Generation Tables:**
- `generation_logs` - Track AI generation attempts
- `summaries` - Content summarization
- `studypilot_plans` - Study planning
- `library_decks` / `library_cards` - Curated content
- `article_jobs` - Article generation
- `generation_jobs` - Queued generation

**Agent/AI Tables:**
- `agent_sessions` - Agent conversation state
- `agent_usage` - Usage tracking
- `agent_knowledge` - Knowledge base
- `agent_response_cache` - Response caching
- `agent_cache_analytics` - Analytics

### 1.4 API Endpoints (25+ routes)

**Authentication:** `/auth/login`, `/auth/register`, `/auth/guest`, `/auth/oauth/google`

**Deck Management:** `/decks`, `/decks/:id`, `/decks/tree`, `/decks/:id/cards`, `/decks/:id/export`, `/decks/merge`

**Card Management:** `/cards`, `/cards/:id`, `/cards/regenerate-batch`

**Generation:** `/generate`, `/generate/stream` - AI card generation

**Explanations:** `/explanations/generate/:deckId`, `/explanations/progress/:deckId` - 7-mode explanation generation

**StudyPilot:** `/studypilot/ingest`, `/studypilot/plan`, `/studypilot/library` - Content ingestion and planning

**Agents:** `/agents/chat`, `/agents/smart-review`, `/agents/deck-doctor`, `/agents/generate-exam`, `/agents/summarize`, `/agents/mnemonics`

**Extraction:** `/extract/pdf`, `/extract/pdf/batch`, `/extract/text`

**Summary:** `/summary/upload`, `/summary/generate`, `/summary/download/:id`

### 1.5 AI Pipeline Architecture

```
Text/PDF Input
      ↓
[PDF Extraction] (Workers-native, no pdfjs)
      ↓
[Document Cleaning] (pdfText.ts sanitization)
      ↓
[AI Generation] → OpenRouter/OpenAI/Groq/Local
      ├── generateCards() → Basic flashcards
      ├── generateQuestions() → MCQs
      └── explainCard() → 7 explanation modes
      ↓
[Offline Fallback] (heuristic generator)
      ↓
[Database Storage] (cards, explanations)
      ↓
[SM-2 Spaced Repetition] (card_progress table)
```

### 1.6 Current Flashcard Generation System

**Location:** `src/lib/ai.ts` (lines 499-549)
**Key Function:** `generateCards(text, cardCount, options)`

**Current Implementation:**
```typescript
async generateCards(text: string, cardCount = 10, options: GenerateOptions = {}): Promise<GeneratedCard[]> {
  const chunks = this.splitIntoChunks(this.sanitizePromptInput(text), 4000);
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 5, 10));
  const perChunk = Math.max(1, Math.ceil(cardCount / chunks.length));
  // Parallel processing with runPool
  return flatten(await runPool(chunks, async (chunk) => {
    return await this.generateCardsChunk(chunk, perChunk, options, model);
  }, concurrency));
}
```

**System Prompt:**
```
You are an expert flashcard creator. Generate ${count} high-quality flashcards from the provided text.
Rules:
- Each card should test ONE key concept
- Front: a clear, specific question or prompt (1-2 sentences max)
- Back: a concise, accurate answer (1-3 sentences max)
- Include relevant tags as an array of strings
```

### 1.7 StudyPilot Pipeline (`src/studypilot/planner.ts`)

**Text → Cards Pipeline:**
1. `splitCards()` - Splits text into chunks
2. `buildCard()` - Creates RawCard with type/difficulty/topics
3. `ingestText()` - Full ingest function
4. `clusterModules()` - Groups cards by topic overlap
5. `orderModules()` - Orders easy→hard
6. `buildSchedule()` - Distributes across days

**Card Types Detected:**
- `definition` - Term definitions
- `formula` - Equations
- `problem` - Clinical scenarios

### 1.8 Explanation Generation System

**Location:** `src/routes/explanations.ts`

**7 Explanation Modes (from `ai.ts` lines 302-310):**
1. `full` - Comprehensive breakdown
2. `revision` - Concise summary
3. `osce` - Clinical scenario
4. `brief` - Bullet points
5. `mnemonic` - Memory aids
6. `clinical` - Clinical relevance
7. `testtrap` - Common exam pitfalls

**Optimization:** Batch generation (7*N → ceil(N/10) calls)

### 1.9 Storage & Caching

**In-Memory (per-isolate):**
- `progressStore` - Explanation generation progress
- `agentResponseCache` - In-memory cache (also in DB)

**Database Caching:**
- `agent_response_cache` - Hash-based caching (24h TTL)
- `agent_cache_analytics` - Usage analytics

### 1.10 Performance Characteristics

**Concurrency:**
- AI calls: Max 5-10 concurrent based on `GEN_CONCURRENCY`
- DB inserts: Batched (10 rows per batch via `insertBatched`)

**Timeouts:**
- Local AI: Configurable via `LOCAL_AI_TIMEOUT_MS`
- Retry logic: 3 retries with exponential backoff

**PDF Processing:**
- Max 2MB, 200 streams, 250K chars
- FlateDecode stream decompression

---

## Phase 2: Current Flashcard Pipeline Analysis

### 2.1 Pipeline Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    INPUT SOURCES                                 │
├─────────────────────────────────────────────────────────────────┤
│  PDF File ───┐                                                   │
│  Text      ├──→ extract.ts → pdfText.ts → Clean Text           │
│  Markdown  ─┘                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DOCUMENT CLEANING                             │
├─────────────────────────────────────────────────────────────────┤
│  - Normalize line endings                                       │
│  - Remove extra whitespace                                      │
│  - Trim to 1M chars max                                         │
│  - Sanitize prompt injection attempts                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CHUNKING                                      │
├─────────────────────────────────────────────────────────────────┤
│  splitIntoChunks(text, 4000)                                    │
│  - Paragraph-based splitting                                    │
│  - Max 4000 chars per chunk                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI GENERATION                                 │
├─────────────────────────────────────────────────────────────────┤
│  generateCardsChunk()                                           │
│  ├── System prompt (flashcard creation rules)                   │
│  ├── User prompt (text chunk)                                   │
│  ├── Call AI (OpenRouter/OpenAI/Local)                        │
│  ├── Parse JSON response                                        │
│  └── Retry on failure (max 3)                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OFFLINE FALLBACK                              │
├─────────────────────────────────────────────────────────────────┤
│  offlineGenerator.generateCards()                               │
│  ├── extractKeyTerms() - Capitalized terms, definitions         │
│  ├── extractKeySentences() - Medium-length sentences            │
│  ├── generateQuestionFromSentence() - Fill-in-blank cards       │
│  ├── generateDefinitionCard() - Term definitions                │
│  └── generateMCQFromContent() - Multiple choice questions       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE STORAGE                              │
├─────────────────────────────────────────────────────────────────┤
│  INSERT INTO cards (deckId, front, back, tags, cardType, ...)   │
│  INSERT INTO decks (name, description, kind, userId, ...)       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Weaknesses Identified

1. **No Medical Knowledge Graph**: Cards are generated from raw text without structured medical concept extraction
2. **Limited Card Types**: Only "basic" and "mcq" supported
3. **No Duplicate Detection**: No semantic similarity checking
4. **No Difficulty Classification**: Cards not graded for review priority
5. **No Fact Verification**: AI can hallucinate medical facts
6. **No Image Processing**: PDF images ignored
7. **No Anki Export**: Only CSV export available
8. **No Structured Metadata**: Missing subject, organ system, USMLE topic tags

---

## Phase 3: Upgrade Recommendations

### 3.1 Redesigned Pipeline Architecture

```
PDF/Image
    ↓
OCR (Tesseract.js on client, or external service)
    ↓
Layout Detection (pdf.js/marked regions)
    ↓
Document Cleaning
    ↓
Medical Structure Detection
    ↓
Knowledge Graph Builder
    ↓
Concept Extraction
    ↓
Fact Verifier
    ↓
Card Planner
    ↓
Multi-Type Card Generator
    ↓
Card Quality Review
    ↓
Duplicate Detector
    ↓
Difficulty Classifier
    ↓
Explanation Generator (7 modes)
    ↓
Tag Generator
    ↓
Anki Formatter
    ↓
Export
```

### 3.2 Medical Knowledge Graph Schema

**Add to schema.ts:**

```typescript
// Medical Concepts
export const medicalConcepts = sqliteTable("medical_concepts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  conceptType: text("concept_type").notNull(), // disease, drug, hormone, gene, etc.
  synonyms: text("synonyms"), // JSON array
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

// Medical Relationships
export const medicalRelationships = sqliteTable("medical_relationships", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceConceptId: integer("source_concept_id").references(() => medicalConcepts.id),
  targetConceptId: integer("target_concept_id").references(() => medicalConcepts.id),
  relationshipType: text("relationship_type").notNull(), // causes, treats, presents_with, etc.
  strength: integer("strength").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

// Card Metadata (enhanced)
export const cardMetadata = sqliteTable("card_metadata", {
  cardId: integer("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }).primaryKey(),
  subject: text("subject"), // Anatomy, Physiology, Pathology, etc.
  organSystem: text("organ_system"), // Cardiovascular, Respiratory, etc.
  discipline: text("discipline"), // Pharmacology, Microbiology, etc.
  difficulty: text("difficulty"), // easy, medium, hard, expert
  highYieldScore: integer("high_yield_score", { mode: "number" }), // 0-100
  keywords: text("keywords"), // JSON array
  pageNumber: integer("page_number"),
  figureNumber: text("figure_number"),
  usmleTopic: text("usmle_topic"),
  conceptId: integer("concept_id").references(() => medicalConcepts.id),
  estimatedReviewTime: integer("estimated_review_time"), // seconds
});
```

### 3.3 AI Multi-Agent Pipeline

**Define 10 specialized agents:**

1. **Document Cleaner Agent** - OCR cleanup, noise removal
2. **Medical Concept Extractor Agent** - Disease, drug, finding extraction
3. **Knowledge Graph Builder Agent** - Build concept relationships
4. **Flashcard Planner Agent** - Determine card count, types, topics
5. **Flashcard Generator Agent** - Create cards from concepts
6. **Medical Reviewer Agent** - Verify medical accuracy
7. **Quality Reviewer Agent** - Check card quality, duplicates
8. **Duplicate Detector Agent** - Semantic similarity
9. **Tag Generator Agent** - Subject, system, difficulty tags
10. **Anki Exporter Agent** - Format for Anki import

### 3.4 New Card Types to Support

1. **Basic** - Q/A format (existing)
2. **Cloze** - Fill-in-the-blank with high-yield deletions
3. **Clinical Vignette** - USMLE-style patient scenarios
4. **Compare/Contrast** - Disease A vs Disease B
5. **Mnemonic** - Memory aids
6. **Table** - Comparison tables
7. **Flowchart** - Pathophysiology flow
8. **Algorithm** - Diagnostic/management algorithms
9. **Image Occlusion** - Hide parts of diagrams
10. **Label Identification** - Anatomy/imaging labels
11. **Histology** - Microscopic images
12. **Radiology** - Imaging findings
13. **Pharmacology** - Drug cards with MoA, side effects
14. **Pathology** - Microscopic/pathophysiology
15. **Rapid Recall** - Quick fact cards
16. **High-Yield Summary** - Topic overview cards

### 3.5 Enhanced Prompt Engineering

**Current Prompt Issues:**
- Too generic
- No medical specificity
- No structured output format
- No fact verification

**Recommended Medical-Focused Prompts:**

```markdown
You are a USMLE Step 1 flashcard expert. Generate cards from the provided medical text.

CARD CRITERIA:
- Test ONE high-yield concept per card
- Include USMLE-style clinical correlation
- Add relevant buzzwords (e.g., "painless jaundice", "flame hemorrhage")
- Structure: Q → A → Explanation → Clinical pearl

OUTPUT FORMAT (JSON):
{
  "cards": [
    {
      "front": "Question (1-2 sentences)",
      "back": "Answer (concise)",
      "explanation": "Detailed explanation with pathophysiology",
      "clinicalPearl": "USMLE tip",
      "highYieldScore": 0-100,
      "usmleTopic": "subject-topic",
      "keywords": ["keyword1", "keyword2"],
      "difficulty": "easy|medium|hard",
      "cardType": "basic|cloze|vignette|mnemonic"
    }
  ]
}

VALIDATION:
- Verify facts against text
- Flag uncertain information
- Avoid hallucinated content
```

### 3.6 Fact Verification System

**Implementation:**
1. Extract claims from AI output
2. Check against source text
3. Query medical knowledge base
4. Assign confidence score
5. Flag low-confidence content

### 3.7 Duplicate Detection

**Algorithm:**
1. Compute sentence embeddings (or simple TF-IDF)
2. Compare new cards against existing
3. Threshold: >80% similarity = duplicate
4. Merge or suggest merge

### 3.8 Difficulty Classification

**Factors:**
- Word count (longer = harder)
- Complex terms (rare words)
- Multi-step reasoning required
- Clinical vignette vs definition
- Formula vs concept

### 3.9 Anki Export Enhancement

**Current:** CSV export only
**Needed:**
- .apkg format generation
- Preserve tags, images, explanations
- Support cloze deletions
- Support card types

---

## Phase 4: Implementation Roadmap

### Phase 4.1: Database Schema Updates
- [ ] Add medical concepts tables
- [ ] Add card metadata table
- [ ] Create migration scripts
- [ ] Update type definitions

### Phase 4.2: Knowledge Graph Module
- [ ] Create `src/lib/knowledge-graph.ts`
- [ ] Implement concept extraction
- [ ] Implement relationship mapping
- [ ] Add medical terminology dictionary

### Phase 4.3: Enhanced AI Service
- [ ] Add medical prompt templates
- [ ] Implement fact verification
- [ ] Add batch processing improvements
- [ ] Add confidence scoring

### Phase 4.4: New Card Types
- [ ] Implement cloze generation
- [ ] Implement vignette generation
- [ ] Implement comparison cards
- [ ] Add card type validation

### Phase 4.5: Duplicate Detection
- [ ] Implement similarity algorithm
- [ ] Add duplicate detection endpoint
- [ ] Add merge functionality

### Phase 4.6: Difficulty Classification
- [ ] Implement difficulty scoring
- [ ] Add to card metadata
- [ ] Update study scheduler

### Phase 4.7: Export System
- [ ] Implement Anki .apkg export
- [ ] Add image handling
- [ ] Add metadata preservation

### Phase 4.8: Frontend Updates
- [ ] Add card type selector
- [ ] Add difficulty filters
- [ ] Add tag management UI
- [ ] Add Anki export button

---

## Phase 5: Security & Performance Considerations

### 5.1 Security
- Input sanitization for prompt injection
- Rate limiting on AI endpoints
- Secure file upload handling
- SQL injection prevention (Drizzle ORM)

### 5.2 Performance
- Batch processing for large documents
- Caching for repeated queries
- Streaming for large responses
- Database indexing for card search

---

## Phase 6: Testing Strategy

1. **Unit Tests** - Individual functions (planner, AI parsing)
2. **Integration Tests** - Full pipeline with sample medical texts
3. **Performance Tests** - Large PDF processing
4. **Accuracy Tests** - Medical fact accuracy verification

---

## Phase 7: Documentation Requirements

1. Architecture documentation
2. API documentation
3. Prompt documentation
4. Knowledge graph documentation
5. Developer guide
6. Deployment guide
7. Testing guide
8. Future roadmap

---

## Summary

The current codebase is a solid foundation for a flashcard system but lacks the specialized medical education features required for USMLE Step 1 preparation. Key upgrades needed:

1. **Medical Knowledge Graph** - Structured concept extraction
2. **Enhanced Card Types** - Cloze, vignette, comparison, etc.
3. **Fact Verification** - Prevent hallucination
4. **Duplicate Detection** - Semantic similarity
5. **Difficulty Classification** - Spaced repetition optimization
6. **Anki Export** - Proper flashcard format

The existing architecture (Hono + Drizzle + Cloudflare Workers) is well-suited for these upgrades, with the main work being in the AI pipeline and database schema extensions.