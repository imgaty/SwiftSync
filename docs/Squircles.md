# Squircles

## Overview

Argent uses squircle corners for app surfaces. The intent is to keep surfaces feeling softer and more native while keeping the visible border and the corner shape on the same visual surface.

Argent renders app squircles through one continuous-corner system. CSS utilities provide deterministic fallback clipping, radius metadata, and redrawn border tokens. Browsers with native `corner-shape: squircle` support use that path first for corner geometry. `SquircleProvider` keeps an exact measured superellipse fallback for browsers without native corner-shape support, while visible `sq-border-*` edges are redrawn by the shared CSS edge layer.

The `sq-*` utilities own geometry only. Visible glass borders are opt-in through `sq-border-muted`, `sq-border-soft`, or `sq-border-strong`; this prevents plain shape helpers, dots, avatars, and nested controls from getting an accidental second-looking edge.

## Shape Model

The squircle shape comes from the superellipse family described by the Wikipedia squircle article:

```text
(|x / a|)^n + (|y / b|)^n = 1
```

Where:

- `a` is half the width
- `b` is half the height
- `n = 2` is an ellipse or circle
- `n = 4` is the common squircle prototype
- higher values move toward a square-like shape

In CSS, Argent uses `corner-shape: squircle` where the browser supports it, so shadows and material paint follow a native superellipse-style curve. The runtime keeps a base radius plus a bounded area response: `radius = clamp(base + scale * 320 * (1 - exp(-sqrt(width * height) / damping)), min(width, height) / 2)`. The default damping is `420`, which lets larger containers become visibly rounder without the oversized panel corners that come from an unbounded power curve. Short controls still clamp into capsules or circles. Older browsers get a first-paint `shape()`/polygon fallback, then the runtime applies a measured p=4 superellipse path that the shared border layer inherits.

## Implementation

The source of truth is split between [app/globals.css](../app/globals.css) and [components/squircle-provider.tsx](../components/squircle-provider.tsx).

Fallback polygon paths are defined on `:root`:

```css
:root {
    --sq-clip: polygon(
        var(--sq-p) 0,
        calc(100% - var(--sq-p)) 0,
        /* additional superellipse points */
        var(--sq-d) var(--sq-a)
    );
}
```

Tailwind custom utilities apply metadata first, then the fallback paths:

```css
@utility sq-xl {
    --sq-base-r: 14px;
    --sq-q: 0.6;
    --sq-scale: 0.014;
    --sq-growth-damping: 420;
    clip-path: polygon(10% 0, 90% 0, /* ... */, 8% 1%);
    clip-path: shape(
        from 14px 0,
        hline to calc(100% - 14px),
        curve to 100% 14px with calc(100% - 5px) 0 / 100% 5px,
        /* remaining sides */
        close
    );
}
```

The global CSS maps those utilities to radius metadata and border tokens. `sq-border-*` keeps a transparent layout border, then redraws the visible edge through the shared pseudo-element. Once `SquircleProvider` has measured the element, that pseudo-element is clipped to the ring between the outer superellipse and a true inward normal offset of the same curve:

```css
:where(.sq-xl, .squircle-surface) {
    border-radius: var(--sq-r);
}

.sq-border-soft {
    border-width: var(--sq-border-width);
    border-color: transparent !important;
}

:where(.sq-border-muted, .sq-border-soft, .sq-border-strong)::after {
    box-shadow:
        inset 0 0 0 var(--sq-border-width) var(--sq-border-layer-color),
        inset 0 1px 0 var(--sq-border-layer-highlight-color),
        inset 1px 0 0 var(--sq-border-layer-glow-color),
        inset 0 -1px 0 var(--sq-border-layer-shadow-color);
}

:where(.sq-border-muted, .sq-border-soft, .sq-border-strong)[data-squircle-border-runtime="path"]::after {
    clip-path: var(--sq-border-clip-path);
    background: radial-gradient(circle at 18% 0%, var(--sq-border-layer-sheen-color), transparent 42%),
        linear-gradient(180deg, var(--sq-border-layer-highlight-color), transparent 36%),
        var(--sq-border-layer-color);
    box-shadow: none;
}

@supports ((-webkit-mask: linear-gradient(#000 0 0)) or (mask: linear-gradient(#000 0 0))) {
    :where(.sq-border-muted, .sq-border-soft, .sq-border-strong):not([data-squircle-border-runtime="path"])::after {
        background: radial-gradient(circle at 18% 0%, var(--sq-border-layer-sheen-color), transparent 42%),
            linear-gradient(135deg, var(--sq-border-layer-highlight-color), transparent, var(--sq-border-layer-shadow-color));
        mask-composite: exclude;
    }
}
```

The root layout mounts `SquircleProvider`. It detects native CSS corner-shape support first. If support exists, the provider measures each shared squircle and writes `--sq-measured-r`. If not, it scans shared squircle utilities, reads `--sq-base-r`, `--sq-scale`, `--sq-growth-damping`, and `--sq-q` from computed styles, and generates the p=4 superellipse path. For explicit `sq-border-*` edges, it also writes `--sq-border-clip-path` as an outer path plus a reversed inward offset path. CSS still owns the paint, while the runtime supplies the measured geometry that keeps the ring thickness constant through the corner.

UDS surfaces are configured through `udsSurface()` and `udsContainer()` in [lib/UDS.ts](../lib/UDS.ts). Each material feature is independently switchable:

```tsx
udsContainer({
    background: "glass",
    blur: true,
    border: "soft",
    radius: "xl",
    shadow: "panel",
    spotlight: true,
})

udsSurface({
    background: "elevated",
    blur: false,
    border: false,
    radius: "lg",
    shadow: false,
})
```

UDS state styles change the `--sq-border-*` variables instead of adding detached ring or wrapper borders. The visible material lives on the same `.uds-surface` element, while the shared edge layer redraws the border, highlight, and inset shadow from those variables. The measured border path is an inward normal offset, so adjacent or nested squircle borders keep a stable visual gap around the corner. It does not cast an outer edge shadow, because that pools at the lower squircle corners. Card fills should stay quiet and near-neutral so the glass edge carries the surface definition.

The app framework shell uses the same rule with a high-opacity glass fill in both light and dark modes. `SidebarInset` must carry a literal `sq-xl` class plus `app-framework-surface`; do not hide the squircle class behind a responsive or peer variant. Variant-prefixed squircle utilities set the fallback clip path but do not match the global native corner selectors, which can leave the framework border clipped with rectangular `border-radius: 0`.

The shared card shell uses the same radius metadata and fallback path:

```css
.squircle-surface {
    --sq-base-r: 16px;
    --sq-q: 0.6;
    --sq-scale: 0.016;
    --sq-growth-damping: 420;
    clip-path: polygon(10% 0, 90% 0, /* ... */, 8% 1%);
    clip-path: shape(from 16px 0, hline to calc(100% - 16px), /* ... */, close);
}
```

## Usage

Use the app squircle utilities instead of Tailwind corner utilities:

```tsx
<div className="sq-xl border bg-card" />
<Button variant="ghost" size="sm" />
<Avatar className="sq-full" />
```

Available utilities include `sq-sm`, `sq-md`, `sq-lg`, `sq-xl`, `sq-2xl`, `sq-full`, `sq-none`, and the small fixed-size aliases used by existing components.

Do not add local SVG masks, overlay strokes, or hand-built one-off paths for standard UI. The only visible squircle border path should be the shared CSS edge layer. If a new shape size is needed, add it to the global utility set first.

## App-Wide Policy

Use the global squircle behavior for:

- cards
- buttons
- inputs
- dropdowns
- dialogs
- sheets
- popovers
- dashboard modules

Do not add local corner overrides for ordinary UI. If a component needs the large card treatment, use the shared `squircle-surface` class.

## UDS Overlays

UDS surfaces in [lib/UDS.ts](../lib/UDS.ts) use shared semantic surface tokens. Large card surfaces compose the shared `squircle-surface` shape without requiring local component overrides.

This means overlay components should keep composing existing tokens:

```tsx
className={cn(UDS.containerClass({ spotlight: false }), "min-w-[220px]")}
```

Do not add separate masks or outlines to UDS containers just to create squircle corners. The background, blur, focus ring, border layer, and corner geometry should be owned by the shared UDS surface classes.

UDS outlines should remain material-like rather than graphic. Use the shared `sq-border-*` tokens for edge strength, then let the shared squircle edge layer redraw the clipped glass border, highlight, side glow, and lower inset shade from those variables. Do not add local `ring-*`, extra wrapper borders, component-local edge overlays, semantic color washes, or bottom-offset drop shadows behind UDS chrome.

## Focus And Outline Notes

Focus rings and browser outlines can look detached if they are applied to a wrapper outside the visual surface. Prefer applying focus-visible rings to the same element that owns the squircle path and UDS chrome.

For floating UI, the preferred layering is:

1. Radix positioning primitive
2. UDS visual container
3. interactive rows inside the container

Avoid adding an extra bordered wrapper around dialogs, dropdowns, or popovers unless it is part of the intended visual surface.

## Adjustment Guide

To make all app corners larger or smaller, adjust the global `sq-*` utility metadata in [app/globals.css](../app/globals.css). Update the fallback `shape()` path only when the fallback geometry also needs to change.

```css
@utility sq-xl {
    --sq-base-r: 14px;
    --sq-q: 0.6;
    --sq-scale: 0.014;
    clip-path: shape(from 14px 0, hline to calc(100% - 14px), /* ... */, close);
}
```

Do not bulk-edit component markup for a global corner adjustment. Component-level changes should be reserved for local density or layout needs.
