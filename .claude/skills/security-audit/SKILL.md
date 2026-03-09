---
name: security-audit
description: >
  Run a security audit on the Dev Task codebase.
  Checks for Supabase RLS, auth middleware, key exposure, input validation, and TypeScript safety.
  Run before deploying to production.
disable-model-invocation: true
---

## Security Audit Checklist for Dev Task

Scan the entire codebase and verify:

### Supabase-specific
- [ ] RLS enabled on every table (profiles, statuses, clients, tasks, time_entries)
- [ ] Every table has `own_data` policy: `user_id = auth.uid()`
- [ ] Service role key (`SUPABASE_SERVICE_ROLE_KEY`) never appears in client-side code or components
- [ ] `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` does NOT exist (would expose to browser)
- [ ] All server actions call `supabase.auth.getUser()` before any data operation
- [ ] Supabase browser client uses anon key only

### Auth & Routing
- [ ] `middleware.ts` protects ALL routes under `(dashboard)`
- [ ] No dashboard route accessible without session (test by removing cookie manually)
- [ ] Logout clears session properly and redirects to `/login`
- [ ] No registration route exists (`/register`, `/signup`, `/auth/signup`)

### Server Actions
- [ ] Every file in `lib/api/` has `'use server'` at the top
- [ ] Every server action verifies session before any DB operation
- [ ] User-provided UUIDs (task IDs, client IDs) used in queries are validated as UUIDs
- [ ] No string interpolation into SQL — use Supabase query builder or parameterized RPC

### Client-side Safety
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` or any secrets in files under `app/`, `components/`, `lib/store/`
- [ ] No direct Supabase mutations from client components (mutations via server actions only)
- [ ] Zustand store contains no sensitive auth tokens

### Input Validation
- [ ] Task title: required, trimmed before save
- [ ] Time entry minutes: must be > 0
- [ ] Priority: validated against allowed values before save
- [ ] Recurrence type: validated against allowed values
- [ ] Recurrence weekdays: array values between 0–6

### Universal checks
- [ ] No secrets (API keys, passwords, tokens) in source code or comments
- [ ] No secrets in `.env.local` committed to git (check `.gitignore`)
- [ ] `node_modules/` and `.next/` in `.gitignore`
- [ ] Error messages don't leak internal Supabase details to the UI
- [ ] No `eval()` or `dangerouslySetInnerHTML` without sanitization
- [ ] `npm audit` shows no critical vulnerabilities

### TypeScript Safety
- [ ] `npm run build` passes with zero errors
- [ ] No `any` types in `lib/api/`, `lib/store/`, or `components/`
- [ ] All server action return types explicitly typed

Report results as a checklist with ✅ PASS / ❌ FAIL and fix any issues found.
