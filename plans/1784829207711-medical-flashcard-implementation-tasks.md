# Implementation Plan: Medical Flashcard Platform Upgrade

## Overview

This plan breaks down the MedNexus AI flashcard platform upgrade into atomic, executable tasks. Each task is designed to be independent and testable.

---

## Phase 1: Database Schema Extensions

### Task 1.1: Create Knowledge Graph Tables
**File**: `src/db/schema.ts`
**Action**: Add new tables for medical knowledge graph
```sql
- knowledge_graph_nodes (id, type, name, content, metadata)
- knowledge_graph_edges (source_id, target_id, relationship_type)
- card_metadata (card_id, subject, organ_system, difficulty, high_yield_score, etc.)
```

### Task 1.2: Add Card Type Enumeration
**File**: `src/db/schema.ts`
**Action**: Extend cardType enum to include:
- `cloze`, `vignette`, `compare_contrast`, `mnemonic`, `table`, `flowchart`, `algorithm`, `image_occlusion`, `label_id`, `histology`, `radiology`, `pharmacology`, `pathology`

### Task 1.3: Create Migration Files
**File**: `migrations/`
**Action**: Generate migration scripts for schema changes

---

## Phase 2: Medical Entity Extraction Agent

### Task 2.1: Create Medical Entity Types
**File**: `src/lib/medical-entities.ts` (new file)
**Action**: Define TypeScript types for medical entities

### Task 2.2: Implement Entity Extractor
**File**: `src/lib/entity-extractor.ts` (new file)
**Action**: Create function that extracts medical entities from text using AI

### Task 2.3: Update AI Service Prompts
**File**: `src/lib/ai.ts`
**Action**: Add medical entity extraction prompt to MODE_PROMPTS

---

## Phase 3: Knowledge Graph Builder

### Task 3.1: Create Graph Builder Service
**File**: `src/lib/graph-builder.ts` (new file)
**Action**: Build knowledge graph from extracted entities

### Task 3.2: Implement Relationship Detection
**File**: `src/lib/graph-builder.ts`
**Action**: Detect relationships between entities (causes, treats, manifests, etc.)

### Task 3.3: Add Graph Storage Methods
**File**: `src/lib/graph-builder.ts`
**Action**: Methods to persist nodes and edges to database

---

## Phase 4: Duplicate Detection System

### Task 4.1: Create Similarity Service
**File**: `src/lib/similarity.ts` (new file)
**Action**: Implement text similarity functions (cosine, Jaccard, semantic)

### Task 4.2: Add Duplicate Check to Card Creation
**File**: `src/routes/cards.ts`
**Action**: Check for duplicates before inserting new cards

### Task 4.3: Create Duplicate Resolution Endpoint
**File**: `src/routes/cards.ts`
**Action**: Add POST /cards/merge-duplicates endpoint

---

## Phase 5: Card Quality Review System

### Task 5.1: Create Quality Rules Service
**File**: `src/lib/card-quality.ts` (new file)
**Action**: Implement quality validation rules

### Task 5.2: Add Quality Review to Generation
**File**: `src/routes/generate.ts`
**Action**: Run quality checks on generated cards

### Task 5.3: Create Quality Report Endpoint
**File**: `src/routes/ai-analysis.ts`
**Action**: Add detailed quality scoring

---

## Phase 6: Difficulty Classification

### Task 6.1: Create Difficulty Classifier
**File**: `src/lib/difficulty.ts` (new file)
**Action**: Implement difficulty classification logic

### Task 6.2: Update Card Schema
**File**: `src/db/schema.ts`
**Action**: Add difficulty column to cards table

### Task 6.3: Integrate with Generation
**File**: `src/routes/generate.ts`
**Action**: Classify difficulty during card generation

---

## Phase 7: Enhanced Card Types

### Task 7.1: Add Cloze Card Support
**File**: `src/lib/ai.ts`
**Action**: Add generateClozeCards method with proper prompts

### Task 7.2: Add Clinical Vignette Support
**File**: `src/lib/ai.ts`
**Action**: Add generateVignette method

### Task 7.3: Add Compare/Contrast Support
**File**: `src/lib/ai.ts`
**Action**: Add generateCompareContrast method

### Task 7.4: Add Mnemonic Support
**File**: `src/lib/ai.ts`
**Action**: Add generateMnemonics method

---

## Phase 8: Image Processing Pipeline

### Task 8.1: Add Tesseract.js to Frontend
**File**: `new-frontend/package.json`
**Action**: Already included - verify and use

### Task 8.2: Create Image Processing Endpoint
**File**: `src/routes/upload.ts`
**Action**: Add POST /upload/image-analyze

### Task 8.3: Implement OCR Processing
**File**: `src/lib/ocr.ts` (new file)
**Action**: OCR extraction from uploaded images

### Task 8.4: Add Image Card Types
**File**: `src/db/schema.ts`
**Action**: Add image, bbox, sourceImage columns (already exists)

---

## Phase 9: Anki Export System

### Task 9.1: Create Anki Export Service
**File**: `src/lib/anki-export.ts` (new file)
**Action**: Generate Anki-compatible package structure

### Task 9.2: Add Export Endpoint
**File**: `src/routes/import-export.ts`
**Action**: Add GET /decks/:id/export?format=anki

### Task 9.3: Create Anki Model Definition
**File**: `src/lib/anki-export.ts`
**Action**: Define Anki card types and fields

---

## Phase 10: Explanation Engine Enhancement

### Task 10.1: Add Explanation Types
**File**: `src/lib/ai.ts`
**Action**: Add generateExplanation, generateMnemonicExplanation, etc.

### Task 10.2: Create Explanation Cache
**File**: `src/db/schema.ts`
**Action**: Add explanation caching table

### Task 10.3: Add Explanation Endpoints
**File**: `src/routes/explanations.ts`
**Action**: Create endpoints for different explanation types

---

## Phase 11: Metadata System

### Task 11.1: Add Metadata Columns to Cards
**File**: `src/db/schema.ts`
**Action**: Add subject, organSystem, cardDifficulty, highYieldScore, etc.

### Task 11.2: Create Metadata Extraction
**File**: `src/lib/metadata.ts` (new file)
**Action**: Extract metadata from card content

### Task 11.3: Add Metadata API
**File**: `src/routes/cards.ts`
**Action**: Update card endpoints to handle metadata

---

## Phase 12: Frontend Card Components

### Task 12.1: Create Card Preview Component
**File**: `new-frontend/src/components/cards/CardPreview.tsx` (new file)
**Action**: Display card with all metadata

### Task 12.2: Create Card Editor Component
**File**: `new-frontend/src/components/cards/CardEditor.tsx` (new file)
**Action**: Edit card with all fields

### Task 12.3: Create Card Type Selector
**File**: `new-frontend/src/components/cards/CardTypeSelector.tsx` (new file)
**Action**: UI for selecting card type

### Task 12.4: Add Difficulty Indicator
**File**: `new-frontend/src/components/cards/DifficultyBadge.tsx` (new file)
**Action**: Visual difficulty indicator

---

## Phase 13: Batch Processing System

### Task 13.1: Create Job Queue Table
**File**: `src/db/schema.ts`
**Action**: Add batch_jobs table

### Task 13.2: Create Batch Processing Service
**File**: `src/lib/batch-processor.ts` (new file)
**Action**: Process cards in batches with progress tracking

### Task 13.3: Add Batch Endpoints
**File**: `src/routes/generate.ts`
**Action**: Add batch processing support

---

## Phase 14: Testing Infrastructure

### Task 14.1: Create Unit Test Files
**Files**: 
- `src/lib/ai.test.ts`
- `src/lib/entity-extractor.test.ts`
- `src/lib/graph-builder.test.ts`
- `src/lib/similarity.test.ts`
- `src/lib/card-quality.test.ts`

### Task 14.2: Create Integration Tests
**File**: `tests/api.test.ts` (new file)
**Action**: Test API endpoints

### Task 14.3: Add Test Data
**File**: `tests/fixtures/medical-content.json` (new file)
**Action**: Sample medical content for testing

---

## Phase 15: Documentation

### Task 15.1: Create API Documentation
**File**: `docs/api.md` (new file)
**Action**: Document all API endpoints

### Task 15.2: Create Developer Guide
**File**: `docs/developer-guide.md` (new file)
**Action**: Setup and development guide

### Task 15.3: Create Architecture Documentation
**File**: `docs/architecture.md` (new file)
**Action**: System architecture overview

---

## Execution Order (Dependency Graph)

```
                    ┌─────────────────────────┐
                    │  Phase 1: Schema (1.1-1.3) │
                    └───────────┬───────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │ Phase 2-4: Core Services  │
                    │ (Entity, Graph, Duplicate)│
                    └───────────┬───────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │ Phase 5-7: Quality & Types│
                    │ (Quality, Difficulty,     │
                    │  Card Types)              │
                    └───────────┬───────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
┌────────▼────────┐   ┌──────────▼─────────┐   ┌────────▼────────┐
│ Phase 8: Images │   │ Phase 9: Anki Export│   │ Phase 10: Exp.  │
│ (OCR, Image     │   │ (Export Service)    │   │ (Enhanced)      │
│  Cards)         │   │                     │   │                 │
└─────────────────┘   └─────────────────────┘   └─────────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │ Phase 11: Metadata System │
                    └───────────┬───────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │ Phase 12: Frontend Updates│
                    └───────────┬───────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │ Phase 13: Batch Processing│
                    └───────────┬───────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │ Phase 14: Testing         │
                    └───────────┬───────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │ Phase 15: Documentation   │
                    └───────────────────────────┘
```

---

## Validation Plan

### For Each Task:
1. **Unit Test**: Write test for new function
2. **Integration Test**: Test with actual API call
3. **Manual Test**: Verify in browser/UI
4. **Edge Cases**: Test boundary conditions

### For Schema Changes:
1. Run migrations in test environment
2. Verify data integrity
3. Test rollback capability

### For AI Integration:
1. Test with sample medical content
2. Verify output format
3. Check fallback behavior

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI Hallucination | Fact verification against extracted content |
| Performance | Batch processing, caching, rate limiting |
| Data Loss | Migration backups, test coverage |
| Breaking Changes | Versioned API, deprecation warnings |

---

## Completion Criteria

A task is complete when:
1. ✅ Code changes implemented
2. ✅ Unit tests pass
3. ✅ Integration tests pass
4. ✅ Manual verification successful
5. ✅ Documentation updated
6. ✅ No TypeScript errors
7. ✅ Linting passes