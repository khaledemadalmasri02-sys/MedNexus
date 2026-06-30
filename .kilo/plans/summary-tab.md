# Summary Tab — File Upload, OCR, PDF Generation

## Overview

Add a new "Summary Generator" sub-tab to the existing `SummaryTab.tsx` component (which currently shows deck statistics). The new sub-tab provides multi-file upload (PDFs, images, PowerPoints, etc.), advanced text extraction with OCR and text correction, style selection with animated preview cards, and Python-powered PDF generation with live animated progress — processing files in chunks of 3.

## Architecture

```
Frontend (React + Framer Motion)
  ├── SummaryTab (tab container — extends existing)
  │   ├── FileUploadZone (drag-and-drop, multi-file, animated)
  │   ├── FileQueueList (per-file status, progress, thumbnails)
  │   ├── StyleSelector (animated style preview cards)
  │   ├── SummaryProgressBar (chunked processing animation)
  │   └── SummaryResult (download/view generated PDF)
  └── API client additions (src/lib/api.ts)

Backend (Express)
  ├── POST /api/summary/upload    — receive & store files
  ├── POST /api/summary/generate  — trigger Python pipeline
  ├── GET  /api/summary/status/:id — SSE progress stream
  └── GET  /api/summary/download/:id — serve generated PDF

Python Pipeline (src/scripts/summary_builder.py)
  ├── File type detection & routing
  ├── Text extraction (PDF, image OCR, PPTX, DOCX, etc.)
  ├── Text correction (OCR cleanup, paragraph fix, spacing)
  ├── AI-powered summarization (via OpenRouter API)
  └── PDF generation (ReportLab) with style templates
```

## Step 1: Python Pipeline — src/scripts/summary_builder.py

### 1a. Install Python dependencies

```bash
pip3 install reportlab pymupdf python-pptx openpyxl
```

### 1b. Create src/scripts/summary_builder.py

Single Python script that:
1. Accepts CLI args: --files (comma-separated paths), --style (style name), --output (output PDF path), --chunk-size (default 3), --api-key, --api-base
2. Processes files in chunks of 3:
   - For each file, detect type by extension
   - PDFs: Extract text via PyMuPDF; if text is empty/short, fall back to OCR (pdf2image -> pytesseract)
   - Images (png/jpg/jpeg/webp): OCR via pytesseract with --psm 6
   - PowerPoints (.pptx): Extract text via python-pptx
   - Spreadsheets (.xlsx/.csv): Extract via openpyxl/csv
   - Text files (.txt/.md): Direct read
3. Text correction pass on extracted text:
   - Fix hyphenated line breaks (join word-\nbreak)
   - Remove excessive whitespace / normalize spaces
   - Fix paragraph boundaries (join broken single-line paragraphs)
   - Fix wrong line starts (lines starting mid-sentence that should continue previous)
   - Remove OCR artifacts (random special chars, garbled words)
4. Send corrected text to OpenRouter API for summarization (structured summary with sections)
5. Generate styled PDF using ReportLab with the chosen style template
6. Write progress to stdout (JSON lines) so the backend can stream it

### 1c. Style templates in Python

Define 5 style templates as Python functions:
- Academic: Clean serif, structured headers, numbered sections, muted colors
- Modern: Sans-serif, bold accent colors, colored section blocks, icon bullets
- Minimal: Lots of whitespace, thin lines, small elegant typography
- Clinical: Medical-style, color-coded sections (Key Points, Clinical Pearls, Summary)
- Cornell: Cornell note-style layout with cue column, summary area at bottom

## Step 2: Backend API Routes — src/routes/summary.ts

### 2a. Create src/routes/summary.ts

Routes:
- POST   /api/summary/upload      — multer multi-file upload, returns file IDs
- POST   /api/summary/generate    — accepts { fileIds, style }, spawns Python process, returns jobId
- GET    /api/summary/status/:id  — SSE endpoint streaming progress from Python stdout
- GET    /api/summary/download/:id — serves the generated PDF file
- DELETE /api/summary/:id          — cleanup job files

### 2b. Upload handling

- Use multer with disk storage to ./data/summary_uploads/
- Accept: pdf, png, jpg, jpeg, webp, pptx, ppt, xlsx, xls, csv, txt, md, docx
- Max 20 files, 50MB each
- Return file metadata (id, name, size, type)

### 2c. Job management

- In-memory job store (Map) tracking: status, progress, output path, error
- On generate: spawn python3 src/scripts/summary_builder.py as child process
- Parse stdout JSON lines for progress events -> store in job
- SSE endpoint reads from job progress array, sends events to client
- Cleanup temp files on completion or after 1-hour TTL

### 2d. Wire into src/app.ts

Import and mount the summary router at /api/summary.

## Step 3: Frontend — Extend SummaryTab.tsx

### 3a. Add "Summary Generator" sub-tab

The existing SummaryTab.tsx shows deck stats. Add a sub-tab switcher:
- Overview (existing stats)
- Summary Generator (new feature)

Use the existing AnimatedTabs component from src/components/ui/index.tsx for the sub-tab switcher, styled consistently with the site's glass/gradient aesthetic.

### 3b. FileUploadZone.tsx

- Full-width drag-and-drop zone using native HTML5 drag events
- Animated border glow on drag-over (framer-motion animate on border color/box-shadow)
- Accepts: .pdf, .png, .jpg, .jpeg, .webp, .pptx, .ppt, .xlsx, .xls, .csv, .txt, .md, .docx
- Shows file type icons (lucide-react) for each accepted type
- On drop: validate files, upload to POST /api/summary/upload via FormData
- Animated entrance for each file card (staggered motion.div with initial/animate)
- Per-file status indicators: pending -> uploading -> uploaded (with animated checkmark)

### 3c. FileQueueList.tsx

- Shows uploaded files as glass cards with:
  - File type icon + name + size
  - Remove button (animated X)
  - Extraction status badge (pending/extracting/done/error)
- "Add more files" button

### 3d. StyleSelector.tsx + StylePreviewCard.tsx

- Horizontal scrollable row of 5 style preview cards
- Each card: mini PDF preview (rendered as a small stylized CSS mockup), style name, description
- Selected card: glowing border animation, scale up, checkmark badge
- Cards animate in with staggered entrance (framer-motion)
- Preview boxes show actual mini visual representations of the PDF style

### 3e. SummaryProgressBar.tsx

- Extend the existing AnimatedProgressBar.tsx pattern
- Multi-stage progress:
  1. Uploading files (per-file progress)
  2. Extracting text (per-file, with file name shown)
  3. Correcting text (animated text correction visualization)
  4. Generating summary (AI processing animation)
  5. Building PDF (style-specific animation)
- Chunk indicator: "Processing files 1-3 of 8..." with animated chunk counter
- Connected to SSE endpoint for real-time updates
- Animated gradient progress bar with glowing tip (matching existing AnimatedProgressBar design)
- Stage icons that light up as each stage completes

### 3f. SummaryResult.tsx

- Shows generated PDF with:
  - Download button (animated, gradient)
  - Preview iframe/embed
  - "Generate another" button
  - File size and page count

### 3g. API client additions — src/lib/api.ts

Add summaryApi with: upload(), generate(), download(), delete()
SSE progress handled via EventSource in a custom hook.

### 3h. Custom hook — useSummaryGeneration.ts

Manages the entire summary generation lifecycle:
- File upload state, job tracking, SSE connection, error handling, cleanup

## Step 4: Styling & Animation Details

All styling follows the existing design system:
- Glass cards: var(--glass-card-bg), backdrop-filter: blur(20px), var(--glass-border)
- Accents: Cyan (#06B6D4), Purple (#8B5CF6), Emerald (#10B981)
- Animations: Framer Motion with springTransition and smoothTransition from ui/constants.ts
- Typography: Space Grotesk for headings, Inter for body, JetBrains Mono for code/stats
- Dark mode first with light mode overrides (existing pattern)

## Files to Create

| File | Purpose |
|------|---------|
| src/scripts/summary_builder.py | Python PDF pipeline |
| src/routes/summary.ts | Express API routes |
| new-frontend/src/components/summary/FileUploadZone.tsx | Drag-and-drop upload |
| new-frontend/src/components/summary/FileQueueList.tsx | File list management |
| new-frontend/src/components/summary/StyleSelector.tsx | Style preview cards |
| new-frontend/src/components/summary/StylePreviewCard.tsx | Individual style preview |
| new-frontend/src/components/summary/SummaryProgressBar.tsx | Multi-stage progress |
| new-frontend/src/components/summary/SummaryResult.tsx | Result display |
| new-frontend/src/hooks/useSummaryGeneration.ts | Generation lifecycle hook |

## Files to Modify

| File | Change |
|------|--------|
| new-frontend/src/components/SummaryTab.tsx | Add sub-tab navigation (Overview / Summary Generator) |
| new-frontend/src/lib/api.ts | Add summaryApi methods |
| src/app.ts | Mount summary router |
| src/config.ts | Add SUMMARY_UPLOAD_PATH, SUMMARY_OUTPUT_PATH config vars |

## Open Questions

1. AI summarization: Should the summary text be generated using the existing OpenRouter/AI integration (reusing the same API key and model config), or should the Python script handle its own AI calls?
2. PDF preview: Should the frontend show an actual PDF preview (using iframe/embed) or a rendered HTML preview of the summary content?
3. Style previews: Should the style preview cards be static CSS mockups or should we generate actual mini-PDFs on the backend for preview?
4. File retention: How long should uploaded files and generated PDFs be kept on the server? (Suggest: 1 hour TTL with auto-cleanup)
5. Max file limits: 20 files x 50MB OK, or different limits?
