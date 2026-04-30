# AGENTS.md — Dev Task

Single-user Next.js 14 App Router + TypeScript (strict) + Tailwind v4 + Supabase (Auth + RLS) + Zustand. All data mutations via Server Actions. No tests, no CI.

## Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Typecheck + build (no separate typecheck script) |
| `npm run lint` | ESLint (flat config, ESLint v9) |
| `npm run start` | Run built app |

## Must-Know Architecture

- **`@/`** path alias maps to project root.
- **`lib/supabase/server.ts`** and **`lib/supabase/client.ts`** both export `createClient()` — same name, different import source. Server module uses `@supabase/ssr` with cookie handling; client module uses `createBrowserClient`.
- **All mutations** go through `lib/api/*.ts` (server actions). Pattern: `'use server'` → `createClient()` → `getUser()` → Supabase query → `revalidatePath()`.
- **Zustand store** (`lib/store/app-store.ts`) is client-side cache — server components seed it via props, client updates it optimistically before calling server actions.
- **`middleware.ts`** protects `(dashboard)` route group. `/login` is public. Authenticated users on `/login` redirect to `/tasks`. Root `/` page redirects based on session.

## Data Model (5 tables — all RLS with `user_id = auth.uid()`)

- `profiles` → created automatically via `on_auth_user_created` trigger
- `statuses` → `name` is AUTO-UPPERCASED on save in server action
- `tasks` → `parent_id` for subtasks (max 1 level deep, enforced by DB trigger); `total_tracked_minutes` maintained by DB trigger on time_entries
- `clients` → `prepaid_total_minutes` = static package size; `prepaid_remaining_minutes` = live counter decremented by `trg_prepaid_deduct` trigger on time_entry INSERT
- `time_entries` → inserts decrement prepaid; deletes do NOT restore prepaid

## Recurrence

- `calcNextDue()` in `lib/recurrence.ts`. Weekday convention: **Mon=0..Sun=6** (not JS's Sun=0).
- When a recurring task moves to `is_closed = true` status → `changeTaskStatus()` clones it into the first open status with the new due date. Subtasks are cloned too.

## UI Conventions

- **CSS Grid** for task rows: `grid-cols-[minmax(0,1fr)_96px_30px_78px_78px_86px]`
- Subtask indent: `pl-[50px]` on Col 1; parent `pl-[2px]`
- Font: DM Sans via `next/font/google` and `@import` in `globals.css`
- Sidebar: `#1a1a2e` / Primary button hover: `#252540`
- Focus: `focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500`
- Toast auto-clears after 3.5s
- Keyboard: `Ctrl/Cmd+N` opens new task modal; `Esc` closes pickers

## Env (from `.env.local.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # used client & server
SUPABASE_SERVICE_ROLE_KEY=        # server-only, never in client bundle
```

## Key Constraints

- Users created manually in Supabase dashboard — no registration UI
- No tests, no CI, no PR workflow
- Migration lives at `supabase/migrations/001_initial.sql`
- Tailwind v4 uses `@import "tailwindcss"` in CSS (not `@tailwind` directives)
- `@dnd-kit` for drag-and-drop; `@tiptap` for rich text; `@react-pdf/renderer` for PDF export
