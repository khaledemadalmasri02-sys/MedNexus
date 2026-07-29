# Comprehensive Codebase Review & Upgrade Plan for MedNexus AI Flashcard Generation System

## Executive Summary

This document provides a complete analysis of the MedNexus codebase and a detailed roadmap for transforming it into an enterprise-grade, medical-focused AI flashcard generation platform.

---

## Phase 1: Codebase Analysis

### 1.1 Project Structure

```
mednexus/
├── src/                          # Backend source
│   ├── worker.ts                 # Main entry point (Hono app)
│   ├── types.ts                  # Type definitions
│   ├── db/
│   │   ├── index.ts              # Drizzle DB connection
│   │   ├── schema.ts             # Main schema (710 lines)
│   │   ├── schema-flashcard.ts   # Flashcard-specific exports
│   │   └── schema-study-pilot.ts   # StudyPilot-specific exports
│   ├── lib/
│   │   ├── ai.ts                 # AI service (OpenRouter, OpenAI, local models)
│   │   ├── config.ts             # Configuration management
│   │   ├── helpers.ts            # Common utilities
│   │   ├── pdfText.ts            # Workers-native PDF extraction
│   │   ├── offline-generator.ts  # Heuristic card generation fallback
│   │   ├── auth.ts               # Session management, OAuth
│   │   ├── sm2.ts                # Spaced repetition algorithm
│   │   ├── error-capture.ts      # Error logging and classification
│   │   └── logger.ts             # Logging
│   ├── routes/                   # API routes (30+ files)
│   │   ├── auth.ts
│   │   ├── cards.ts
│   │   ├── decks.ts
│   │   ├── generate.ts
│   │   ├── extract.ts
│   │   ├── agents.ts
│   │   ├── ai-analysis.ts
│   │   ├── studypilot.ts
│   │   └── ... (20+ more)
│   ├── middleware/
│   │   └── validate.ts           # Zod validation middleware
│   └── studypilot/
│       └── planner.ts            # Heuristic study planner
├── new-frontend/                 # React frontend
│   ├── src/pages/                # Page components
│   ├── src/components/           # UI components
│   ├── src/hooks/                # React hooks
│   └── src/lib/api.ts            # API client
├── public/                       # Static assets
├── migrations/                   # Database migrations
├── wrangler.jsonc               # Cloudflare Workers config
└── vite.config.ts                # Vite config
```

### 1.2 Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Cloudflare Workers |
| Framework | Hono (API), React 19 (Frontend) |
| Database | D1 (SQLite) with Drizzle ORM |
| ORM | Drizzle 0.36.4 |
| Validation | Zod 3.23.8 |
| Frontend Build | Vite 8.1.5 |
| Styling | Tailwind CSS 4.3.0 |
| State Management | React Hooks + Context |
| AI Providers | OpenRouter, OpenAI, Groq, Mistral, Google, Local LM Studio/Ollama |
| PDF Processing | Custom Workers-native extraction |
| Deployment | Wrangler, Cloudflare Pages |

### 1.3 API Endpoints Summary

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/generate` | POST | Generate flashcards/questions |
| `/api/generate/stream` | POST | Stream generation (SSE) |
| `/api/extract/pdf` | POST | Extract text from PDF |
| `/api/extract/pdf/batch` | POST | Batch PDF extraction |
| `/api/extract/text` | POST | Clean text processing |
| `/api/upload/cards` | POST | Parse and upload cards |
| `/api/upload/pdf-cards` | POST | Convert extracted text to cards |
| `/api/agents/chat` | POST | Study Buddy chatbot (SSE) |
| `/api/agents/smart-review` | POST | Smart review queue |
| `/api/agents/deck-doctor` | POST | Deck quality analysis |
| `/api/agents/generate-exam` | POST | Generate practice exam |
| `/api/agents/mnemonics` | POST | Generate mnemonics |
| `/api/agents/summarize` | POST | Content summarization |
| `/api/studypilot/ingest` | POST | AI-first content ingestion |
| `/api/studypilot/plan` | POST | Generate study plan |
| `/api/studypilot/explain` | POST | Generate card explanation |
| `/api/ai-analysis/decks/:id/analyze` | POST | Card quality analysis |
| `/api/ai-analysis/cards/:id/improve` | POST | Improve single card |
| `/api/ai-analysis/decks/:id/insights` | POST | Deck insights |
| `/api/import-export/*` | Various | Import/export functionality |
| `/api/decks/*` | Various | Deck management |
| `/api/cards/*` | Various | Card management |
| `/api/auth/*` | Various | Authentication |
| `/api/dashboard/*` | Various | Dashboard stats |
| `/api/search` | GET | Search across content |
| `/api/tags` | Various | Tag management |

### 1.4 Database Schema (Key Tables)

**Users & Auth:**
- `users` - User accounts with OAuth support
- `sessions` - Session management
- `emailVerificationTokens`, `passwordResetTokens` - Auth flows

**Content:**
- `decks` - Study decks (supports hierarchy via parentId)
- `cards` - Flashcards with front/back, tags, choices (MCQ)
- `qbanks` / `questions` - Question banks

**StudyPilot:**
- `studypilotPlans` - Deadline-driven study plans
- `studySessions` - Study session logs
- `studyPlanInstances` - Generated daily study items
- `studyPlanTemplates` - User-created templates
- `libraryDecks` / `libraryCards` - Curated library content

**AI & Agents:**
- `agentKnowledge` - Knowledge base for agents
- `agentResponseCache` - Response caching
- `agentUsage` - Usage tracking
- `chatMessages` - Chat history
- `generationLogs` - Generation tracking

**Progress & Analytics:**
- `cardProgress` - SM-2 spaced repetition data
- `exams` - Practice exams
- `groupStudyRooms` - Collaborative study
- `achievements` - User achievements
- `feedback` - User feedback

### 1.5 AI Pipeline

```
User Input (PDF/Text/Notes)
        ↓
PDF Extraction (Workers-native) OR Text Input
        ↓
Text Cleaning & Chunking (max 4000 chars/chunk)
        ↓
AI Generation (Parallel, bounded concurrency)
        ├── Flashcards: generateCards()
        ├── Questions: generateQuestions()
        └── Explanations: explainCard()
        ↓
Fallback: Offline Generator (heuristic)
        ↓
Database Storage
        ↓
SM-2 Progress Tracking
```

### 1.6 Frontend Architecture

- **Routing**: React Router 7
- **State**: React Hooks, Context
- **UI Library**: Tailwind CSS 4 with custom components
- **Animations**: Framer Motion
- **3D/Visual**: Three.js, React Three Fiber
- **File Upload**: Custom drag-drop zones with progress
- **Streaming**: SSE for real-time generation
- **PDF Viewer**: pdfjs-dist, react-pdf

---

## Phase 2: Current Flashcard Pipeline Analysis

### 2.1 Current Pipeline Flow

```
[User Upload] → PDF/Text Input
     ↓
[Extract] → extractPdfText() - Workers-native extraction
     ↓
[Clean] → Basic whitespace normalization
     ↓
[Chunk] → Split by paragraphs, max 4000 chars
     ↓
[Generate] → AI Service (OpenRouter/Local)
     ↓
[Parse] → JSON array extraction with tolerant parsing
     ↓
[Store] → Database with deck creation
     ↓
[Fallback] → Offline Generator if AI fails
```

### 2.2 Weaknesses Identified

1. **No Medical Specialization**: Prompts are generic, not medical-focused
2. **Limited Card Types**: Only "basic" and "mcq"
3. **No Knowledge Graph**: Cards generated without structured relationships
4. **No Duplicate Detection**: Cards can duplicate content
5. **No Difficulty Classification**: All cards treated equally
6. **No Image Processing**: Images not utilized
7. **No OCR**: Image/PDF with images not processed
8. **No Anki Export**: Limited export formats (CSV, JSON, MD)
9. **No Image Occlusion**: Visual cards not supported
10. **No Fact Verification**: AI can hallucinate
11. **No Structured Metadata**: Missing Subject, Organ System, etc.
12. **No Medical Concept Extraction**: Disease, drug, symptom detection missing

---

## Phase 3: Upgrade Architecture

### 3.1 Target Pipeline Architecture

```
[User Input: PDF/Image/Text/Notes]
        ↓
[PDF OCR] → Extract text + images (Tesseract + pdfjs)
        ↓
[Layout Detection] → Identify sections, tables, figures
        ↓
[Document Cleaning] → Remove artifacts, normalize
        ↓
[Medical Structure Detection] → Identify disease, drug, finding markers
        ↓
[Knowledge Graph Builder] → Create structured medical graph
        ↓
[Concept Extraction] → Extract entities (disease, symptom, drug, etc.)
        ↓
[Fact Verification] → Validate against extracted content
        ↓
[Card Planning] → Determine optimal card distribution
        ↓
[Multi-Type Card Generation]
        ├── Basic cards
        ├── Cloze deletions
        ├── Clinical vignettes
        ├── Compare/contrast
        ├── Mnemonics
        ├── Tables
        ├── Flowcharts
        ├── Algorithms
        ├── Image occlusion
        ├── Label identification
        ├── Histology
        ├── Radiology
        ├── Pharmacology
        └── Pathology
        ↓
[Card Quality Review] → Apply quality rules
        ↓
[Duplicate Detection] → Semantic similarity check
        ↓
[Difficulty Classification] → Easy/Medium/Hard/Expert
        ↓
[Explanation Generation] → Multiple explanation modes
        ↓
[Tag Generation] → Medical subject tags
        ↓
[Anki Formatting] → Convert to Anki-compatible format
        ↓
[Export] → Anki, CSV, JSON, Markdown, HTML
```

---

## Phase 4: Intelligent Medical Understanding

### 4.1 Medical Entity Types to Identify

| Entity Type | Examples |
|-------------|----------|
| Disease | Myocardial infarction, COPD, Diabetes mellitus |
| Symptom | Chest pain, Dyspnea, Jaundice |
| Sign | Murmur, Rubor, Clubbing |
| Pathophysiology | Cascade, Mechanism, Process |
| Etiology | Infection, Autoimmune, Genetic |
| Risk Factor | Smoking, Hypertension, Family history |
| Diagnosis | Criteria, Workup, Differential |
| Differential Diagnosis | List of possibilities |
| Investigation | Lab tests, Imaging, Biopsy |
| Treatment | Medication, Surgery, Therapy |
| Drug Class | ACE inhibitors, Beta blockers |
| Mechanism of Action | How it works |
| Contraindication | When NOT to use |
| Adverse Effect | Side effects |
| Laboratory Finding | Specific values |
| Histology | Microscopic appearance |
| Embryology | Developmental origin |
| Biochemistry | Metabolic pathway |
| Physiology | Normal function |
| Microbiology | Organism characteristics |
| Immunology | Antibody, T-cell, etc. |
| Genetics | Mutation, Inheritance |
| Radiology Finding | X-ray, CT, MRI appearance |
| USMLE Pearl | High-yield fact |
| Clinical Correlation | Real-world relevance |
| High-Yield Fact | Important for boards |
| Common Trap | Misconception |
| Board Buzzword | Key terminology |

---

## Phase 5: Knowledge Graph Schema

### 5.1 Graph Structure

```typescript
// Knowledge Graph Node Types
type NodeType = 
  | 'disease' | 'symptom' | 'sign' | 'finding'
  | 'drug' | 'treatment' | 'investigation'
  | 'pathophysiology' | 'etiology' | 'risk_factor'
  | 'diagnosis' | 'differential' | 'lab_finding'
  | 'histology' | 'embryology' | 'biochemistry'
  | 'physiology' | 'microbiology' | 'immunology'
  | 'genetics' | 'radiology' | 'mechanism'
  | 'contraindication' | 'adverse_effect' | 'mnemonic';

// Relationships
type Relationship = 
  | 'causes' | 'associated_with' | 'manifests_as'
  | 'diagnosed_by' | 'treated_by' | 'caused_by'
  | 'contraindicated_with' | 'adverse_effect_of'
  | 'mechanism_of' | 'pathophysiology_of'
  | 'etiology_of' | 'risk_factor_for'
  | 'differential_of' | 'investigation_for'
  | 'lab_finding_in' | 'histology_of'
  | 'radiology_of' | 'embryology_of'
  | 'biochemistry_of' | 'physiology_of'
  | 'microbiology_of' | 'immunology_of'
  | 'genetics_of' | 'mnemonic_for';
```

---

## Phase 6: Advanced Card Types

### 6.1 Card Type Specifications

| Card Type | Structure | Use Case |
|-----------|-----------|----------|
| Basic | Q: Front, A: Back | Core recall |
| Cloze | Fill in the blank | High-yield facts |
| Clinical Vignette | Patient scenario | USMLE style |
| Compare/Contrast | A vs B | Differential |
| Mnemonic | Memory aid | Memorization |
| Table | Structured data | Comparison |
| Flowchart | Process | Pathophysiology |
| Algorithm | Decision tree | Management |
| Image Occlusion | Hide part of image | Visual recall |
| Label Identification | Label diagram | Anatomy/Pathology |
| Histology | Microscopic image | Pathology |
| Radiology | Imaging study | Radiology |
| Pharmacology | Drug mechanism | Pharmacology |
| Pathology | Disease process | Pathology |
| Rapid Recall | Quick fact | Review |
| High-Yield Summary | Key points | Final review |

---

## Phase 7: Card Quality Rules

### 7.1 Quality Validation Checklist

- [ ] Tests ONE idea only
- [ ] Front is a clear question (not statement)
- [ ] Back is concise, accurate
- [ ] No ambiguity
- [ ] No multiple answers
- [ ] Not too short (<20 chars)
- [ ] Not too vague
- [ ] No duplicate content
- [ ] Appropriate difficulty
- [ ] High-yield focus
- [ ] No trivia
- [ ] Active recall format
- [ ] No passive recognition cues

---

## Phase 8: Difficulty Classification

### 8.1 Classification Logic

```
Easy: 
- Definition cards
- Named entity recall
- Simple fact recall
- Keywords: "define", "name", "list", "identify"

Medium:
- Mechanism questions
- Pathophysiology
- Diagnosis criteria
- Treatment options
- Keywords: "explain", "describe", "what is the mechanism"

Hard:
- Complex pathophysiology
- Drug interactions
- Differential diagnosis
- Case-based scenarios
- Keywords: "analyze", "derive", "calculate", "justify"

Expert:
- Rare diseases
- Complex drug mechanisms
- Research-level content
- Multi-step reasoning
```

---

## Phase 9: Explanation Engine

### 9.1 Explanation Components

1. **Correct Answer**: Direct response
2. **Concise Explanation**: 2-3 sentences
3. **Clinical Relevance**: Why it matters
4. **Why It Matters**: Educational value
5. **Common Mistakes**: Pitfalls to avoid
6. **USMLE Pearl**: High-yield fact
7. **Memory Trick**: Mnemonic aid
8. **Related Concepts**: Connections
9. **Reference Location**: Source page

---

## Phase 10: Image Intelligence

### 10.1 Image Processing Pipeline

```
Image Detection → Crop → OCR → Analysis → Card Generation
       ↓
[Figure, Diagram, Table, Histology, Radiology]
       ↓
[Caption Extraction]
       ↓
[Label Identification]
       ↓
[Image Occlusion Cards]
```

---

## Phase 11: Duplicate Detection

### 11.1 Detection Methods

1. **Exact Match**: String comparison
2. **Semantic Similarity**: Embedding-based
3. **Medical Concept Overlap**: Entity matching
4. **Jaccard Similarity**: Token overlap

---

## Phase 12: Hallucination Prevention

### 12.1 Prevention Strategies

1. **Fact Extraction**: Only use extracted facts
2. **Confidence Scoring**: Rate certainty
3. **Source Attribution**: Track origin
4. **Verification Prompts**: Ask AI to verify
5. **Fallback to Heuristics**: When uncertain

---

## Phase 13: Metadata Schema

### 13.1 Card Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| subject | string | Cardiology, Neurology, etc. |
| organSystem | string | Cardiovascular, Respiratory, etc. |
| discipline | string | Pharmacology, Pathology, etc. |
| difficulty | enum | Easy/Medium/Hard/Expert |
| highYieldScore | number | 0-100 |
| keywords | string[] | Search terms |
| source | string | PDF, AI, Manual |
| pageNumber | number | Source location |
| chapter | string | Source chapter |
| figureNumber | string | Source figure |
| estimatedReviewTime | number | Minutes |
| conceptId | string | Knowledge graph ID |
| kgNodeId | string | Knowledge graph node |

---

## Phase 14: AI Multi-Agent Pipeline

### 14.1 Agent Architecture

```
Agent 1: Document Cleaner
    ↓
Agent 2: Medical Concept Extractor
    ↓
Agent 3: Knowledge Graph Builder
    ↓
Agent 4: Flashcard Planner
    ↓
Agent 5: Flashcard Generator
    ↓
Agent 6: Medical Reviewer
    ↓
Agent 7: Quality Reviewer
    ↓
Agent 8: Duplicate Detector
    ↓
Agent 9: Tag Generator
    ↓
Agent 10: Anki Exporter
```

---

## Phase 15: Frontend Improvements

### 15.1 UX Enhancements

1. **Upload Flow**: Drag-drop with progress
2. **Progress Indicators**: Real-time status
3. **Pipeline Visualization**: Show processing steps
4. **Card Preview**: Editable before saving
5. **Bulk Editing**: Multi-card operations
6. **Filtering**: By tag, difficulty, type
7. **Searching**: Full-text search
8. **Tag Management**: Create/edit tags
9. **Image Preview**: For visual cards
10. **Dark Mode**: Theme support
11. **Accessibility**: WCAG compliance
12. **Responsive Layout**: Mobile-friendly

---

## Phase 16: Backend Improvements

### 16.1 Architectural Improvements

1. **Folder Structure**: Organize by domain
2. **Service Layer**: Business logic separation
3. **Dependency Injection**: Testable code
4. **Caching**: Redis-compatible caching
5. **Streaming Responses**: SSE for real-time
6. **Queue System**: Background jobs
7. **Logging**: Structured logging
8. **Monitoring**: Metrics and health checks
9. **Error Handling**: Comprehensive
10. **Validation**: Input sanitization
11. **Security**: Rate limiting, CSP
12. **Testing**: Unit + integration tests

---

## Phase 17: AI Prompt Engineering

### 17.1 Prompt Improvements

1. **Medical Focus**: USMLE Step 1 style
2. **Structured Output**: JSON schema enforcement
3. **Reduced Hallucinations**: Source-constrained
4. **Chain-of-Thought**: Internal reasoning
5. **Confidence Scoring**: Certainty indicators
6. **Multiple Formats**: Basic, MCQ, Cloze, etc.

---

## Phase 18: Performance Optimization

### 18.1 Optimization Targets

1. **Latency**: Reduce generation time
2. **Memory**: Optimize Workers memory
3. **GPU**: For local models
4. **LLM Calls**: Batch requests
5. **Duplicate OCR**: Cache results
6. **Duplicate Embeddings**: Cache vectors
7. **Parallel Processing**: Batch operations

---

## Phase 19: Export System

### 19.1 Export Formats

1. **Anki (.apkg)**: Full Anki package
2. **CSV**: Comma-separated values
3. **JSON**: Structured data
4. **Markdown**: Human-readable
5. **HTML**: Web-friendly format
6. **Images**: With captions
7. **Tags**: Preserved
8. **Metadata**: Full attribution

---

## Phase 20: Documentation

### 20.1 Documentation to Create

1. **Architecture**: System design
2. **Pipeline**: Processing flow
3. **Folder**: Structure guide
4. **API**: Endpoint reference
5. **AI Workflow**: Prompt library
6. **Knowledge Graph**: Schema and queries
7. **Developer Guide**: Setup and contribution
8. **Deployment**: Production deployment
9. **Testing Guide**: Test suite
10. **Future Roadmap**: Evolution plan

---

## Implementation Priority

### Phase 1 (Immediate - 2 weeks)
- [ ] Add medical entity extraction to prompts
- [ ] Implement duplicate detection
- [ ] Add difficulty classification
- [ ] Expand card types (cloze, vignette)
- [ ] Improve PDF extraction (tables, images)

### Phase 2 (Short-term - 1 month)
- [ ] Build knowledge graph schema
- [ ] Implement multi-agent pipeline
- [ ] Add image processing/OCR
- [ ] Create Anki export
- [ ] Add comprehensive metadata

### Phase 3 (Medium-term - 2-3 months)
- [ ] Full medical knowledge graph
- [ ] Advanced card generation
- [ ] Fact verification system
- [ ] Visual card types
- [ ] Comprehensive testing

### Phase 4 (Long-term - 6+ months)
- [ ] Full USMLE Step 1 specialization
- [ ] Integration with medical databases
- [ ] Advanced visualization
- [ ] Mobile app
- [ ] AI tutor features

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI Hallucination | Medium | High | Fact verification, source attribution |
| Performance Limits | High | Medium | Caching, batching, optimization |
| Data Privacy | Low | High | Encryption, compliance |
| Model Costs | Medium | Medium | Local fallback, caching |
| Medical Accuracy | Low | Critical | Expert review, citations |

---

## Conclusion

This plan outlines the transformation of MedNexus from a general-purpose flashcard generator to a specialized USMLE Step 1 AI platform. The upgrade requires systematic implementation of medical intelligence, knowledge graphs, advanced card types, and comprehensive documentation.

The phased approach ensures backward compatibility while incrementally adding medical specialization and enterprise-grade features.