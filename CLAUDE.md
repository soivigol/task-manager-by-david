@~/.claude/standards/react-nextjs.md
@~/.claude/standards/node.md

# Dev Task

Single-user task management and time-tracking web app for a freelancer managing
multiple clients. Next.js 14 App Router + TypeScript + Tailwind + Supabase
(PostgreSQL + Auth + RLS) + Zustand. Deployed to Vercel. No registration —
users are created manually in the Supabase dashboard.

## Quick Reference
- Plan: docs/DEVELOPMENT_PLAN.md
- Docs: docs/DOCUMENTATION.md
- Progress: docs/PROGRESS.md
- Design reference: dev-task-v4.jsx (prototype — adapt to production patterns)

## Architecture
- App Router (not Pages Router) — server components by default
- 'use client' only when state, effects, or event handlers are needed
- All data mutations via Server Actions in `lib/api/`
- Zustand store (`lib/store/app-store.ts`) is the client-side cache — populated from server components, updated optimistically after server actions
- Auth protected by `middleware.ts` — all routes except `/login` require session

## Coding Standards
- TypeScript strict mode — no `any`, no `as` unless unavoidable
- Functional components only, no class components
- Props interfaces defined inline or in `types/app.types.ts`
- CSS: Tailwind utility classes only; CSS Grid for task row layout
- Grid template constant: `minmax(0, 1fr) 96px 30px 78px 78px 86px` — used in StatusGroup header AND TaskRow (same 6 columns)
- Font: DM Sans from Google Fonts (`font-family: 'DM Sans', system-ui, sans-serif`)
- Sidebar background: `#1a1a2e` | Primary button: `#1a1a2e` hover `#252540`
- Focus ring: `focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500`

## Security Rules
- RLS on every table — NEVER query without RLS or use service role key client-side
- Service role key: server-side only, never in any client bundle
- All foreign key UUIDs validated before use in server actions
- No raw SQL string interpolation — always use Supabase query builder or parameterized RPC

## Data Model Summary
- `profiles` (1) → `statuses`, `clients`, `tasks`, `time_entries` (N each)
- `tasks` can have `parent_id` (subtask) — max 1 level deep
- `tasks.total_tracked_minutes` — maintained by DB trigger, don't compute client-side
- `clients.prepaid_remaining_minutes` — decremented by DB trigger on time_entry INSERT; can go negative
- Recurring tasks: `recurrence_type` + related fields on tasks; when moved to is_closed status → clone next occurrence via `changeTaskStatus()` server action

## Key Patterns

**Server action + optimistic update:**
```typescript
// 1. Optimistic update in store
store.updateTaskOptimistic(id, { status_id: newId })
// 2. Server action
const { toastMessage } = await changeTaskStatus(id, newId)
// 3. Refresh store from server (or handle error → revert)
```

**Adding a new server action:**
- Add to appropriate file in `lib/api/`
- Mark with `'use server'`
- Always call `createServerClient()` from `lib/supabase/server.ts`
- Always verify session: `const { data: { user } } = await supabase.auth.getUser()`

**Adding a new page:**
- Place under `app/(dashboard)/[route]/page.tsx`
- Fetch data server-side and pass to client component
- Add route to Sidebar nav items

## What NOT to Do
- Don't call Supabase from client components directly (except auth)
- Don't use the Pages Router or `getServerSideProps`
- Don't bypass auth middleware by adding routes outside `(dashboard)`
- Don't set ✅ Complete in PROGRESS.md — only `/test-phase` does that after user approval
- Don't add registration UI — users are added via Supabase dashboard only
- Don't use `prepaid_total_minutes` as a counter — it's the package size (static)

## How to Build
1. `/build-phase Phase 1 — Scaffolding & Auth`
2. Review → `/test-phase Phase 1`
3. `/clear` → Repeat for next phase
4. Before release: `/security-audit`
