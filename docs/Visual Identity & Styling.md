# Visual Identity & Styling

## Overview

Argent uses a **clean financial dashboard** aesthetic with **refracting glass overlays** for elevated UI. The goal is to keep the product feeling modern and tactile without sacrificing readability.

## Core visual principles

- **Clarity first** — financial data must remain readable at a glance.
- **Refracting overlays** — menus, popovers, tooltips, dialogs, and sheets should feel translucent and elevated.
- **Consistent chrome** — border, blur, radius, spacing, and muted text treatment should stay uniform across floating UI.
- **Minimal duplication** — shared styling should come from tokens, not repeated ad-hoc class lists.

## Styling layers

### 1. Base app surfaces
The Button component (`components/ui/button.tsx`) and standard UI primitives handle general-purpose app surfaces such as:
- cards
- inputs
- standard non-floating shells

#### Button Variants

The Button component uses three visual families, each with a destructive counterpart:

| Variant              | Style                                                           |
| :------------------- | :-------------------------------------------------------------- |
| `solid`              | Filled black/white background with shadow                       |
| `solid-destructive`  | Filled red background                                           |
| `glass`              | Translucent backdrop-blur with subtle borders                   |
| `glass-destructive`  | Translucent red glass                                           |
| `ghost`              | Transparent with hover wash                                     |
| `ghost-destructive`  | Transparent red with hover wash                                 |

Sizes: `default`, `sm`, `lg`, `icon`, `icon-sm`, `icon-lg`.

### 2. Polished overlay surfaces
Use `lib/PRISM.ts` and the exported `PRISM` token map for:
- dropdown menus
- context menus
- popovers
- tooltips
- dialogs
- sheets
- floating selectors and overlay panels

### 3. Class composition
Use `cn()` from `lib/utils.ts` to compose tokens with local layout utilities.

```tsx
import { cn } from "@/lib/utils"
import { PRISM } from "@/lib/PRISM"

<div className={cn(PRISM.container, "min-w-[220px]")}>...</div>
```

## `PRISM` token purpose

`PRISM` stands for **Polished Refractive Interface Surface Map**.

It is the shared source of truth for overlay styling, including:
- container chrome
- item states
- muted text treatment
- separators
- titles and descriptions
- overlay backdrops
- close button styling

## `PRISM` spec reference

### Cell anatomy
Every `PRISM` row should read as a compact three-part cell:

`[icon / indicator] [primary label + optional secondary text] [checkmark / shortcut / chevron]`

- **Height feel:** visually around `32–36px`
- **Horizontal rhythm:** `gap-2` between icon and text, `px-2 py-2` inside the row
- **Corners:** `rounded-lg`
- **Alignment:** primary content left, affordances right
- **Density rule:** keep it compact, but never cramped

### Element reference

| Element | Spacing / size | Light mode | Dark mode | Notes |
| --- | --- | --- | --- | --- |
| Container | `rounded-xl p-[7px]`, base `text-[13px]` | `text-black`, `bg-white/[0.03]`, thin `border-white/[0.15]` | `text-white`, same glass shell with stronger perceived contrast | Use only for floating UI |
| Labels | `px-8 py-1.5`, `text-[13px] font-semibold tracking-wide` | `text-neutral-500` | `text-neutral-400` | Group headings and section labels |
| Item / button cells | `gap-2 rounded-lg px-8 py-2` | subtle `bg-black/[0.06]` on hover/focus | subtle `bg-white/[0.12]` on hover/focus | Base interactive row primitive |
| Icons | `size-4`, no shrinking | `text-neutral-500` → `text-black` on focus | `text-neutral-400` → `text-white` on focus | Decorative/supporting, not the primary target |
| Checkmarks / shortcuts | right aligned, shortcuts use `ml-auto text-[12px] tracking-wide` | `text-neutral-500` | `text-neutral-400` | Keep the right slot visually lighter than the main label |
| Titles | `text-[15px] font-semibold` | `text-black` | `text-white` | Dialog and sheet headings |
| Descriptions | `text-[13px]` | `text-neutral-500` | `text-neutral-400` | Helper copy, never brighter than the title |
| Close button | `rounded-lg p-1.5` | muted icon + translucent hover wash | muted icon + brighter white hover wash | Use the same chrome language as other PRISM controls |

### Interaction rules
- **Hover / focus:** glass wash + faint inset highlight; no heavy solid fills
- **Disabled:** `pointer-events-none opacity-40`
- **Destructive:** red text with restrained red background feedback
- **Motion:** `animateIn` is softer and slightly longer than `animateOut`

### Color discipline
- Primary content should always be the highest-contrast element in the row.
- Secondary copy, icons, shortcuts, and labels should all use the shared muted treatment.
- If a local override makes the glass effect harder to read, remove the override.

## Usage rules

- Prefer `PRISM` tokens over rewriting the same glass classes manually.
- Compose with `cn()` for layout or size tweaks.
- Keep overrides small and intentional.
- Do not create one-off shadow/border/blur styles when an existing token already matches.
- If a new overlay pattern becomes reusable, add it to `lib/PRISM.ts`.

## Naming guidance

- `PRISM` is reserved for the polished/floating overlay identity.
- Standard UI primitives (Button, Card, Input) live in `components/ui/` and follow the shadcn/ui pattern.

## Design intent summary

The visual identity should feel:
- **precise**
- **lightweight**
- **premium**
- **calm**
- **readable under both light and dark themes**
