# StudyPilot Library Decks — Clone/Copy Workflow

## Goal
Let StudyPilot users browse a **curated library of pre-made decks** and **clone (deep-copy)**
them into their own decks, so the cloned decks flow through the existing StudyPilot
features (Plan → Study → Due & New) with no code changes to those features.

Scope (confirmed with user):
- Library decks are **seeded curated content** (admin-authored), stored in a new
  `library_decks` + `library_cards` table. Not user-published, not existing decks flagged public.
- Cloning is a **deep copy**: a new user-owned `decks` row + copies of all `cards`.
  Fully editable, independent SM-2 progress. No link back to the source.
- UI is a **new "Library" tab** on the existing StudyPilot page.

## Current architecture (for context)
- Backend route: `src/routes/studypilot.ts` (`studypilotRoutes`), mounted in `src/worker.ts:87`.
- Data model: `src/db/schema.ts`. Decks are `decks` (owner `userId`), cards are `cards`
  referencing `deckId`. StudyPilot progress uses `cardProgress` keyed by `cardId+userId`.
- Frontend API client: `new-frontend/src/lib/studypilotApi.ts`.
- Frontend page: `new-frontend/src/pages/StudyPilot.tsx` (tabs: upload|plan|study|due),
  components `components/studypilot/PlanView.tsx`, `components/studypilot/StudySession.tsx`.
- `getModules` returns only `eq(decks.userId, userId)` decks → cloned decks appear
  automatically in Plan/Study/Due.

## Implementation tasks

### 1. DB schema (`src/db/schema.ts`)
Add two tables (mirror of `decks`/`cards` but with no `userId`/`cardProgress`):
- `libraryDecks`: `id`, `name`, `description`, `category` (text), `tags` (text),
  `difficulty` (text: easy|medium|hard, nullable), `cardCount` (int, denormalized),
  `createdAt`.
- `libraryCards`: `id`, `libraryDeckId` (fk → libraryDecks.id, cascade), `front`, `back`,
  `tags`, `cardType` (default "basic"), `difficulty` (text, nullable),
  `aiFront`, `aiBack`, `aiExplanation`, `source`.
- Export both from `src/db/index.ts` (add to destructure + `schemaModule`).

### 2. Migration
- Run `npm run migrate:generate` (drizzle-kit) to emit SQL into `migrations/` for the two
  new tables. Verify the generated `0004_*.sql` matches the schema.
- Add a seed script `scripts/seed-library.ts` (or a `scripts/seed-library.mjs`) that inserts
  a handful of sample decks (e.g. "Spanish Basics", "Intro to Python", "Biology 101") with
  cards. Wire as `npm run seed:library`. (Content authored as JSON in the script.)

### 3. Backend routes (`src/routes/studypilot.ts`)
Add endpoints (reuse `getDb`/`getUserId` helpers; require auth with 401 like others):

- `GET /studypilot/library` — list library decks with computed `cardCount`, optional
  `?category=` and `?q=` (search name/description/tags). Returns
  `{ decks: LibraryDeckSummary[] }`.
- `GET /studypilot/library/:id` — return one library deck with its cards
  (for preview). Returns `{ deck, cards }`.
- `POST /studypilot/library/:id/clone` — deep-copy:
  - Insert a new `decks` row: `name` (prefix "Library: " optional), `description`,
    `kind:"deck"`, `userId`.
  - Insert copies of every `libraryCards` row into `cards` with `deckId` = new deck,
    copying front/back/tags/cardType/difficulty/ai* fields. Re-encode `tags` so the
    existing `diff:` parsing in `getModules`/plan still works (store `topics|diff:hard`).
  - Return `{ deckId, cardCount }` (201).

Add Zod schemas for the clone/params. No `cardProgress` rows created (new cards start fresh).

### 4. Frontend API client (`new-frontend/src/lib/studypilotApi.ts`)
Add types + methods:
- `LibraryDeck { id, name, description, category, tags, difficulty, cardCount }`
- `getLibrary(params?)` → `{ decks: LibraryDeck[] }`
- `getLibraryDeck(id)` → `{ deck, cards }`
- `cloneLibraryDeck(id)` → `{ deckId, cardCount }`

### 5. Frontend UI — Library tab (`new-frontend/src/pages/StudyPilot.tsx`)
- Add `"library"` to the `Tab` type and the tab bar (icon e.g. `Library` from lucide).
- Add a `LibraryTab` component:
  - Search input + category filter.
  - Grid/list of `LibraryDeck` cards (name, description, category, cardCount, difficulty badge).
  - "Preview" opens a modal/drawer listing the cards (uses `getLibraryDeck`).
  - "Clone to my decks" button → `cloneLibraryDeck(id)`; on success flash toast
    "Cloned N cards into your decks" and switch to the Plan tab (so the user can immediately
    build a plan including it). The cloned deck auto-appears in `getModules`.

### 6. Validation / verify
- `npm run typecheck` (or `tsc --noEmit`) on both `src` and `new-frontend`.
- `npm run lint` for the frontend.
- Manual: ingest-free flow — open Library → preview → clone → Plan (deck shows under
  "Modules to include") → Study (deck listed) → Due (cards appear as new).
- Seed script idempotent (check existence before insert) so re-runs are safe.

## Risks / notes
- Cloned cards' `tags` must keep the `|diff:X` format or difficulty ordering in Plan/Modules
  breaks. Encode difficulty from `libraryCards.difficulty` on clone.
- Library content is read-only to users; clone only writes to `decks`/`cards` (no new
  `cardProgress`). Existing SM-2 logic is untouched.
- Keep `library_*` tables separate from `decks`/`cards` to avoid polluting user-scoped
  queries (`eq(decks.userId, userId)`) and free-tier deck counting (`freeTierUsage.deckCount`
  is updated by the decks route — confirm clone path doesn't inflate it; if it does, that is
  acceptable/expected since the user now owns the deck).

## Open follow-ups (out of scope)
- Pagination/infinite scroll for large libraries.
- User-published decks + ratings.
- Removing a cloned deck from library view (dup detection).
