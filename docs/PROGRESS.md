# Dev Task — Progress Tracker

| # | Phase | Status | Completed |
|---|-------|--------|-----------|
| 1 | Scaffolding & Auth | ✅ Complete | — |
| 2 | Layout & Navigation | ✅ Complete | — |
| 3 | Settings & Task List Foundation | ✅ Complete | — |
| 4 | Task Modal (Create + Edit + Delete) | ✅ Complete | — |
| 5 | Subtasks | ✅ Complete | — |
| 6 | Time Tracking + Prepaid | ✅ Complete | — |
| 7 | Recurring Tasks | ✅ Complete | — |
| 8 | Drag & Drop + Ordering | ✅ Complete | — |
| 9 | Rich Editor + Reports + PDF | ✅ Complete | — |
| 10 | Polish + Deploy | 👀 In Review | — |

## Status Legend
- ❌ Not Started
- 🔧 In Progress
- 👀 In Review — built by Claude, waiting for user review
- 🔄 Changes Requested — user requested changes, Claude is fixing
- ✅ Complete — user approved + test-phase passed
- 🚫 Blocked — cannot proceed, waiting for resolution

## Status Flow
```
❌ Not Started → 🔧 In Progress → 👀 In Review → ✅ Complete
                                        ↓
                                  🔄 Changes Requested → 🔧 In Progress → 👀 In Review

Any active status → 🚫 Blocked (external dependency or question)
🚫 Blocked → 🔧 In Progress (once resolved)
```

## Post-Phase Improvements

### Inline editing & smart sorting (2026-03-10)
- **Inline title editing**: click task name to edit in place (Enter/blur saves, Esc cancels)
- **Inline due date editing**: click date to open native date picker
- **Inline client picker**: click client badge to change client via dropdown
- **Pencil icon**: opens full modal, visible on hover and during title edit
- **Smart task sorting**: default sort by priority then due date desc; if user drags to reorder, that group switches to manual sort order (persisted in localStorage)
- **Hydration fix**: localStorage-backed state (dateFilter, collapsedGroups, customOrderGroups) now deferred to post-mount to prevent SSR hydration mismatch

## Notes

_Updated by Claude Code at every status transition. A phase only reaches
✅ Complete after user approval AND passing all success criteria in /test-phase._
