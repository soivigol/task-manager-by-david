# Dark Theme Implementation Plan

## Goal
Add a manual dark mode toggle button in the header. The user can switch between light and dark themes. The selection persists across sessions via localStorage.

## Approach
Tailwind v4 class-based dark mode (`dark:` variants) + Zustand for toggle state + localStorage for persistence. All existing light classes get `dark:` counterparts. No new dependencies.

## Steps

### Step 1 — Theme infrastructure
- `globals.css`: Add `@custom-variant dark (&:where(.dark, .dark *));` and dark CSS variables for body background/foreground
- `app/layout.tsx`: Add useEffect to toggle `.dark` class on `<html>` based on store state, hydrate from localStorage on mount
- `lib/store/app-store.ts`: Add `theme: 'light' | 'dark'`, `setTheme()`, `hydrateTheme()` with localStorage persistence

### Step 2 — Toggle button in Header
- Add sun/moon icon button to `Header.tsx`, calls `setTheme()` on click

### Step 3 — Dark variants across components
Add `dark:` classes to every color/style Tailwind utility in:
- `app/(dashboard)/layout.tsx` — body bg
- `app/login/page.tsx` — login page surfaces
- All `components/` files — cards, modals, inputs, borders, text, overlays, buttons, selects, tables

### Step 4 — Remove OS-preference dark override in `globals.css`
The existing `@media (prefers-color-scheme: dark)` block conflicts with manual toggle — remove it.

## Color Palette

| Token | Light | Dark |
|-------|-------|------|
| Page/surface bg | white / `#fafafa` | `gray-950` (950) / `gray-900` |
| Card/modal bg | white | `gray-900` |
| Border | `gray-200` | `gray-800` / `gray-700` |
| Primary text | `gray-900` | `gray-100` |
| Secondary text | `gray-700/800` | `gray-300/400` |
| Muted text | `gray-400/500` | `gray-500/600` |
| Input bg | white / `gray-50` | `gray-800` |
| Input border | `gray-200` | `gray-700` |
| Hover surface | `gray-50` / `[#f8f9fb]` | `gray-800` |
| Overlay | `black/20` | `black/60` |
| Sidebar | `#1a1a2e` | unchanged |
| Primary btn | `#1a1a2e` | unchanged |
