---
name: test-phase
description: >
  Verify a completed phase of Dev Task meets all success criteria.
  Invoke with /test-phase followed by the phase number.
  Examples: /test-phase Phase 1, /test-phase Phase 3
disable-model-invocation: true
---

Verify that a development phase of Dev Task is complete and working.

IMPORTANT: Only run this after the user has reviewed and approved the
phase. If the phase status is not 👀 In Review or the user has not
explicitly approved it, ask for approval first.

## Steps

1. Confirm the user has approved the phase (check status is 👀 In Review)
2. Read `docs/DEVELOPMENT_PLAN.md` and find the phase: $ARGUMENTS
3. Read the Success Criteria for that phase
4. Run `npm run build` — verify no TypeScript or build errors
5. Test each criterion using these methods:
   - **File existence:** Use Glob to verify files were created at expected paths
   - **Code correctness:** Read key files and verify implementation matches spec
   - **TypeScript:** Check build output for type errors
   - **Auth flow:** Verify middleware protects dashboard routes, login redirects work
   - **Server actions:** Verify `'use server'` directive, session check, RLS respected
   - **UI patterns:** Verify CSS Grid template, Tailwind classes, component structure match CLAUDE.md
6. Check security: no secrets in source code, RLS respected, no client-side service role key usage
7. Check CLAUDE.md compliance: no `any`, no Pages Router, no direct Supabase calls from client
8. List any issues found and fix them
9. If all criteria pass: update `docs/PROGRESS.md` status to ✅ Complete
10. If any fail: list what failed, fix it, re-test until all pass, then update to ✅ Complete

## Report format

For each criterion, report:
- ✅ PASS: [criterion] — [evidence]
- ❌ FAIL: [criterion] — [what's wrong] — [fix applied]

## Final status

Only set ✅ Complete when ALL of the following are true:
1. The user explicitly approved the phase
2. All success criteria pass
3. `npm run build` succeeds with no errors
4. All fixes (if any) have been applied and re-verified
