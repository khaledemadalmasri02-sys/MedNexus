# Plan: Admin Page — Users, Errors, Feedback

## Overview

Create an admin dashboard at `/admin` with three tabs:
1. **Users** — list all users, view details, delete
2. **Errors** — list error logs from `error_logs` table, resolve, clear
3. **Feedback** — list user feedback from `feedback` table, view details, delete

---

## Architecture

### Admin Authentication

Use the existing `ADMIN_SECRET_KEY` env variable (already checked in `src/middleware/auth.ts:98`). The admin page will use a simple key-based auth:
- Frontend: user enters admin key → stored in `localStorage` as `admin_key`
- Backend: `requireAdmin` middleware already exists and checks `x-admin-key` header against `ADMIN_SECRET_KEY`
- All admin API routes use `requireAdmin`

### Backend: `src/routes/admin.ts` (new file)

```
GET    /api/admin/stats          — dashboard stats (user count, error count, feedback count)
GET    /api/admin/users          — list all users (paginated)
GET    /api/admin/users/:id      — get user details
DELETE /api/admin/users/:id      — delete user
GET    /api/admin/errors         —paginated, filterable by model/resolved)
POST   /api/admin/errors/:id/resolve — resolve an error
DELETE /api/admin/errors/resolved  — clear resolved errors
GET    /api/admin/feedback       — list feedback (paginated, filterable by type)
DELETE /api/admin/feedback/:id   — delete feedback
```

All routes protected by `requireAdmin` middleware.

### Frontend

#### New page: `new-frontend/src/pages/Admin.tsx`

Tabs layout:
- Users (icon: Users)
- Errors (icon: AlertTriangle)
- Feedback (icon: MessageSquare)

**Users tab:**
- Table with columns: Email, Name, Created, Verified, Actions
- Search/filter by email
- Delete button with confirmation modal
- Click row to expand: show user's decks, cards, study sessions count

**Errors tab:**
- Table with columns: Type, Model, Operation, Occurrences, First Seen, Status
- Filter by model, resolved status
- Click row to expand: show full error message, stack trace, resolution notes
- "Resolve" button (inline resolution notes input)
- "Clear Resolved" bulk action

**Feedback tab:**
- Table with columns: Date, Type, Rating, Message preview, Email (if logged in)
- Filter by type, rating
- Click row to expand: show full message
- Delete button

#### API: `new-frontend/src/lib/api.ts` — add `adminApi` object

```
adminApi.stats()                    → GET /api/admin/stats
adminApi.listUsers(limit, offset)   → GET /api/admin/users
adminApi.getUser(id)                → GET /api/admin/users/:id
adminApi.deleteUser(id)             → DELETE /api/admin/users/:id
adminApi.listErrors(params)         → GET /api/admin/errors
adminApi.resolveError(id, notes, pattern) → POST /api/admin/errors/:id/resolve
adminApi.clearResolvedErrors()       → DELETE /api/admin/errors/resolved
adminApi.listFeedback(params)       → GET /api/admin/feedback
adminApi.deleteFeedback(id)         → DELETE /api/admin/feedback/:id
```

#### Route: Add to `new-frontend/src/App.tsx`

```tsx
const AdminPage = lazy(() => import("./pages/Admin"));
<Route path="/admin" element={<AdminPage />} />
```

#### Navbar: Add admin link for users who know the key

No visible admin link in navbar (security through obscurity). Users navigate to `/admin` directly. The page shows an key input form if no valid key is stored.

---

## Execution Steps

### Step 1: Create backend admin routes

**File: `src/routes/admin.ts`**

Middleware:
- All routes use `requireAdmin` (existing middleware from `src/middleware/auth.ts:93-110`)
- Admin key comes-key` header, compared against `ADMIN_SECRET_KEY` env var

Endpoints:

1. **GET /api/admin ```ts
   const [users] = await db.select({ count: sql<number>`count(*)` }).from(users);
   const [errors] = await db.select({ count: sql<number>`count(*)` }).from(errorLogs);
   const [unresolvedErrors] = await db.select({ count: sql<number>`count(*)` }).from(errorLogs).where(eq(errorLogs.resolved, false));
   const [feedback] = await db.select({ count: sql<number>`count(*)` }).from(feedback);
   res.json({ totalUsers: users.count, totalErrors: errors.count, unresolvedErrors: unresolvedErrors.count, totalFeedback: feedback.count });
   ```

2. **GET /api/admin/users**
   ```ts
   const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
   const offset = parseInt(req.query.offset as string) || 0;
   const allUsers = await db.select().from(users).limit(limit).offset(offset);
   const [count] = await db.select({ count: sql<number>`count(*)` }).from(users);
   res.json({ users: allUsers, total: count.count, limit, offset });
   ```

3 /api/admin/users/:id**
   - Also deletes related data (decks, cards, sessions, feedback, etc.)
   - Or use cascading deletes if configured in schema

4. **GET /api/admin/errors**
   - Supports `?resolved=true/false`, `?model=xxx`, `?limit=50`, `?offset=0`
   - Returns error logs with pagination

5. **POST /api/admin/errors/:id/resolve**
   - Body: `{ resolution_notes: string, fix_pattern: string }`
   - Updates `resolved=true`, sets resolution fields

6. **DELETE /api/admin/errors/resolved**
   - Clears all resolved errors

7. **GET /api/admin/feedback**
   - Supports `?type=xxx`, `?limit=50`, `?offset=0`
   - Left join with users table to get email

8. **DELETE /api/admin/feedback/:id**

### Step 2: Register admin router in `src/routes/index.ts`

Add:
```ts
import adminRouter from "./admin.js";
// ...
router.use("/admin", adminRouter);
```

### Step 3: Add admin API to `new-frontend/src/lib/api.ts`

Add at the end:
```ts
function getAdminKey(): string | null {
  try { return window.localStorage.getItem("admin_key"); } catch { return null; }
}

export const adminApi = {
  stats: () => apiFetch<{ totalUsers: number; totalErrors: number; unresolvedErrors: number; totalFeedback: number }>("/admin/stats", {
    headers: getAdminKey() ? { "x-admin-key": getAdminKey()! } : {},
  }),
  // ... all endpoints
};
```

The `apiFetch` helper already handles auth headers. We need to extend it to conditionally include admin key. Better approach: add an optional `extraHeaders` param to admin-specific calls, or use a dedicated `adminFetch` that includes the key.

### Step 4: Create `new-frontend/src/pages/Admin.tsx`

Structure:
```
AdminPage
├── KeyGate (shows input if no valid key)
└── AdminDashboard (shown after key verified)
    ├── TabNav (Users | Errors | Feedback)
    ├── StatsBar (4 stat cards)
    └── TabContent
        ├── UsersTab
        ├── ErrorsTab
        └── FeedbackTab
```

**KeyGate component:**
- Input field for admin key
- Submit button
- On success, store key in `localStorage.setItem("admin_key", key)` and show dashboard
- Show error message if key is invalid (backend returns 403)

**StatsBar:**
- 4 cards: Total Users, Total Errors, Unresolved Errors, Total Feedback

**UsersTab:**
- Table with columns: Email, Name, Created At, Verified, Actions
- Search input (filters by email)
- Pagination (limit/offset)
- Delete action (with `ConfirmDeleteModal`)
- Expander row showingeck count, card count)

**ErrorsTab:**
- Table: Type | Model | Operation | Occurrences | First Seen | Status
- Filter: resolved status dropdown, model input
- Resolve action with inline textarea for notes
- Clear Resolved bulk button
- Expander: full error message, stack trace, resolution notes

**FeedbackTab:**
- Table: Date | Type | Rating | Message | User
- Filter: type dropdown
- Delete action
- Expander: full message

### Step 5: Add route to `new-frontend/src/App.tsx`

```tsx
const AdminPage = lazy(() => import("./pages/Admin"));
<Route path="/admin" element={<AdminPage />} />
```

### Step 6: Rebuild and verify

1. Kill running server
2. `npm run build`
3. Restart server
4. Visit `/admin`
5. Enter wrong key → should show error
6. Enter correct key (`ADMIN_SECRET_KEY` env var) → dashboard appears
7. Test each tab: list, filter, delete actions work

---

## Files to Create

1. `src/routes/admin.ts` — backend admin API

## Files to Modify

1. `src/routes/index.ts` — register admin router
2. `new-frontend/src/lib/api.ts` — add `adminApi` object
3. `new-frontend/src/App.tsx` — add `/admin` route
4. `new-frontend/src/pages/Admin.tsx` — new admin dashboard page

## Required Environment Variable

`ADMIN_SECRET_KEY` — if not set, admin access is disabled. Add to `.env`:
```
ADMIN_SECRET_KEY=your-secret-key-here
```

## Validation

- Visit `/admin` without key → shows key input form
- Enter wrong key → error message
- Enter correct key → dashboard with stats
- Users tab: can list, search, delete users
- Errors tab: can list, filter, resolve
- Feedback tab: can list, filter, delete feedback
- All API calls without valid admin key → 403
- Non-admin routes unaffected
