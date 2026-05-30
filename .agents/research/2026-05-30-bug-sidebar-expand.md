# Bug Hunt: Sidebar Not Expandable

Date: 2026-05-30

## Symptom

The collapsed sidebar edge was not reliably expandable. The behavior was tied to the desktop sidebar rail, which is the edge hit target used to resize and toggle the sidebar.

## Phase 1: Root Cause

- Symptom location: `components/ui/sidebar.tsx`, `SidebarRail`.
- Root cause: the rail had been rendered through the shared `Button` primitive in the current working tree. That primitive adds fixed sizing, padding, rounded styling, hover background, and transforms intended for visible buttons, which breaks the rail's intended full-height invisible hit area.
- Git archaeology: the last committed sidebar implementation used a plain `button`; the regression was in the local working-tree change around `SidebarRail`. Recent sidebar history includes `1fc66e3 Commit sidebar component.`

## Phase 2: Pattern

The working pattern is a purpose-built rail control:

- absolute positioned on the sidebar edge
- full height
- transparent background
- explicit narrow hit width
- centered pseudo-element for the visible resize line

That differs from the generic `Button`, which is optimized for toolbar/menu controls.

## Phase 3: Hypothesis

Hypothesis: replacing the generic `Button` rail with a plain transparent `button` and giving it an explicit centered hit area restores expand/collapse behavior because the rail no longer inherits fixed button dimensions.

Result: implemented the smallest targeted change in `SidebarRail`.

## Phase 4: Fix And Verification

Changed `SidebarRail` to:

- render a plain `button type="button"`
- use `w-3 p-0 bg-transparent`
- center the hit target over the sidebar edge with side-aware translate classes
- keep the existing mouse drag/toggle handlers

Verification:

- `pnpm run typecheck` passed.
- `pnpm exec eslint components/ui/sidebar.tsx --cache --cache-location .next/cache/eslint/` passed.

Browser verification note: the in-app browser backend was unavailable in this session, so interactive browser verification could not be completed here.
