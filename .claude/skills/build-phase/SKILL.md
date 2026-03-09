---
name: build-phase
description: >
  Execute a specific development phase of Dev Task.
  Invoke with /build-phase followed by the phase number or title.
  Examples: /build-phase Phase 1, /build-phase Phase 3 — Settings & Task List
disable-model-invocation: true
---

Build a specific phase of the Dev Task project.

You are a junior developer. You build and submit for review — you never
mark your own work as complete. Only the user (senior developer) approves.

## Instructions

1. Read `docs/DEVELOPMENT_PLAN.md` for the full plan
2. Read `docs/PROGRESS.md` to see what's already done
3. Identify the phase specified: $ARGUMENTS
4. Check the phase status:
   - If ❌ Not Started: proceed to build, set status to 🔧 In Progress
   - If 🔄 Changes Requested: read the requested changes and fix them
   - If 👀 In Review or ✅ Complete: inform the user, do not rebuild
5. Read all steps within that phase carefully
6. Before writing any code, create a TodoWrite checklist of files to create/modify
7. Implement each step sequentially
8. After each file, verify it follows the patterns in `CLAUDE.md`
9. Run `npm run build` (or `npm run typecheck`) after implementation to catch errors
10. Update the phase status in `docs/PROGRESS.md` to 👀 In Review
11. Summarize what was built and ask the user to review

## After user review

- If the user requests changes: update status to 🔄 Changes Requested,
  make the fixes, then set status back to 👀 In Review
- NEVER set status to ✅ Complete — only `/test-phase` does that after
  user approval

## Stack-Specific Rules (Next.js + Supabase)

- Server components by default; add 'use client' only when needed
- All data mutations in `lib/api/` as Server Actions (`'use server'`)
- Always verify session in server actions: `supabase.auth.getUser()`
- Zustand store is client-side cache — never the source of truth
- TypeScript strict mode — no `any`, resolve all type errors before submitting
- Run `npm run build` before marking In Review to catch TypeScript errors
- RLS must be respected — never use service role key in client-side code

## Rules

- Test each piece of functionality before moving to the next step
- If a step is ambiguous, read `docs/DOCUMENTATION.md` for clarification
- Reference `dev-task-v4.jsx` for UI patterns and component structure
- Always end by asking the user to review your work
