# Squircles

## Overview

Argent uses squircles as the default corner geometry for rounded UI. The intent is to keep surfaces feeling softer and more native without changing the app's spacing, component APIs, or Tailwind usage.

This is a progressive enhancement. Browsers that support CSS `corner-shape` render rounded corners as squircles. Browsers that do not support it keep the normal `border-radius` result.

## Shape Model

The squircle shape comes from the superellipse family:

```text
(|x / a|)^n + (|y / b|)^n = 1
```

Where:

- `a` is half the width
- `b` is half the height
- `n = 2` is an ellipse or circle
- higher values move toward a square-like shape

In CSS, Argent does not generate path data or SVG masks manually. The app asks the browser to use squircle corner shaping on elements that already have a `border-radius`.

## Implementation

The source of truth is [app/globals.css](../app/globals.css).

The radius scale is still the Tailwind/shadcn radius scale:

```css
@theme inline {
    --radius-sm: calc(var(--radius) - 4px);
    --radius-md: calc(var(--radius) - 2px);
    --radius-lg: var(--radius);
    --radius-xl: calc(var(--radius) + 4px);
}
```

The app-level shape token is defined on `:root`:

```css
:root {
    --radius: 1.125rem;
    --corner-shape: squircle;
}
```

The enhancement is applied globally behind a feature query:

```css
@layer base {
    @supports (corner-shape: squircle) {
        *,
        *::before,
        *::after {
            corner-shape: var(--corner-shape);
        }
    }
}
```

## Usage

Keep using normal radius utilities:

```tsx
<div className="rounded-xl border bg-card" />
<Button variant="ghost" size="sm" />
<Avatar className="rounded-full" />
```

Do not replace normal radii with `clip-path`, SVG masks, or hand-built superellipse paths for standard UI. Those approaches are harder to compose with borders, shadows, focus rings, overflow, and Radix/shadcn primitives.

## When To Opt Out

Use the global squircle behavior for:

- cards
- buttons
- inputs
- dropdowns
- dialogs
- sheets
- popovers
- dashboard modules

Opt out only when a true geometric circle, pill, or hard-edged shape is required. Use a local CSS override:

```tsx
<div className="rounded-full [corner-shape:round]" />
```

or a named CSS class:

```css
.corner-round {
    corner-shape: round;
}
```

## PRISM Overlays

PRISM surfaces in [lib/PRISM.ts](../lib/PRISM.ts) still use Tailwind radius tokens such as `rounded-xl` and `rounded-lg`. The squircle layer changes the geometry of those radii without changing the PRISM token API.

This means overlay components should keep composing existing tokens:

```tsx
className={cn(PRISM.container, "min-w-[220px]")}
```

Do not add separate masks or outlines to PRISM containers just to create squircle corners. The border, background, blur, shadow, focus ring, and corner geometry should live on the same visual surface when possible.

## Focus And Outline Notes

Focus rings and browser outlines can look detached if they are applied to a wrapper outside the visual surface. Prefer applying focus-visible rings to the same element that owns the radius and PRISM chrome.

For floating UI, the preferred layering is:

1. Radix positioning primitive
2. PRISM visual container
3. interactive rows inside the container

Avoid adding an extra bordered wrapper around dialogs, dropdowns, or popovers unless it is part of the intended visual surface.

## Adjustment Guide

To make all app corners larger or smaller, change only:

```css
--radius: 1.125rem;
```

To change the corner family globally, change only:

```css
--corner-shape: squircle;
```

Do not bulk-edit component markup for a global corner adjustment. Component-level changes should be reserved for local density or layout needs.
