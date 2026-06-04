# Argent Design System

## 1. Visual Theme & Atmosphere

Argent is a high-clarity financial cockpit with polished glass surfaces and continuous squircle geometry. It should feel closer to a dense Vercel dashboard than a marketing site: compact navigation, neutral canvases, fast scanning, and strong hierarchy. Glass is a primary material, but financial values, charts, tables, warnings, and destructive states always win on readability.

**Key attributes:** Precise, glassy, compact, premium, calm  
**Density:** Medium-high for product screens; lower only on auth screens  
**Personality:** Financial control room, not decorative fintech landing page

## 2. Color Palette & Roles

### Neutral
| Name | Hex | Role |
| --- | --- | --- |
| Paper | #ffffff | Light canvas and high-contrast card backing |
| Ink | #080808 | Primary light-mode text and dark-mode canvas |
| Graphite | #171717 | Dark elevated surface |
| Mist | #f7f7f7 | Light secondary surface |
| Muted Gray | #706f70 | Secondary copy |
| Soft Gray | #d4d8df | Dark-mode secondary copy |

### Semantic
| Name | Hex | Role |
| --- | --- | --- |
| Focus Blue | #3b82f6 | Focus rings, info states, subtle spotlight |
| Income Green | #22c55e | Income and positive movement |
| Expense Red | #ef4444 | Expenses, destructive actions, risk |
| Warning Amber | #f59e0b | Bills due, attention states |
| Neutral Slate | #6b7280 | Other categories and muted labels |

### Material Roles
| Token | Role |
| --- | --- |
| `uds-bg-glass` | High-opacity UDS controls, overlays, dock, toolbar chrome |
| `uds-bg-elevated` | Readable financial panels and data cards |
| `uds-bg-raised` | Selected controls and active glass cells |
| `app-framework-surface` | Main product frame surrounding all app pages |

## 3. Typography Rules

### Font Stack
- **Sans:** Akt, `-apple-system`, `BlinkMacSystemFont`, `"SF Pro Text"`, `"Helvetica Neue"`, `Arial`, `sans-serif`
- **Mono:** Geist Mono, `"SF Mono"`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`, monospace

### Type Scale
| Level | Size | Weight | Line Height | Letter Spacing | Usage |
| --- | --- | --- | --- | --- | --- |
| Page Title | 28px | 650 | 1.15 | 0 | Product page identity |
| Section Title | 18px | 600 | 1.25 | 0 | Major financial panels |
| Card Title | 13-14px | 500 | 1.35 | 0 | Dashboard modules |
| Body | 15px | 400 | 1.5 | 0 | Forms and content |
| Data | 13px | 450 | 1.4 | 0 | Tables, rows, metadata |
| Caption | 11-12px | 500 | 1.35 | 0 | Labels, shortcuts, badges |

Use tabular numerals for money, percentages, dates, and counts. Do not scale font size with viewport width.

## 4. Component Stylings

- **Buttons:** Solid buttons are reserved for primary commitments. Glass buttons are the default secondary action. Ghost buttons are for low-emphasis icon actions.
- **Cards and panels:** Use `UDS.cardSurface`, `UDS.dataPanelSurface`, or `UDS.panelSurface`; avoid local border/shadow recipes.
- **Inputs:** Use `UDS.inputSurface`, floating labels where existing forms use them, and the shared squircle focus treatment.
- **Overlays:** Dropdowns, sheets, dialogs, command palette, popovers, and tooltips use UDS glass with blur and the shared squircle edge layer.
- **Navigation:** Sidebar items are compact glass cells. Mobile uses a bottom glass dock for primary finance routes and the sidebar sheet for secondary routes.

## 5. Layout Principles

- Use 4px-based spacing: 4, 8, 12, 16, 24, 32, 48.
- Main app pages use `PageShell` with container queries, not viewport-only decisions.
- App pages must remain vertically scrollable. Desktop content should fit without accidental overflow; use inner scroll only for deliberate dense widgets such as tables, calendars, sheets, dialogs, and long lists. Mobile may scroll naturally.
- Dashboard keeps a command-center structure: overview metrics, primary analytics, support rail.
- Data-heavy finance pages prioritize scanning: stable table/card dimensions, dense rows, and sticky toolbars where useful.
- Mobile reserves safe-area space for the bottom dock and avoids hiding table/card actions behind hover-only controls.

## 6. Depth & Elevation

- Depth comes from neutral translucency, blur, clipped squircle edge highlights, and restrained UDS drop/inset shadows.
- Resting financial panels should be readable glass, around 82-98% opacity depending on theme and density.
- Floating overlays use the UDS neutral glass material: high-opacity fill, modest blur, a light scrim, and a small inset highlight.
- Avoid nested cards. Repeated items can be cards; page sections should be unframed layout bands or direct panels.

## 7. Motion & Interaction

- Motion is short and functional: 150-220ms for hover/control states, 280ms for overlay entry, 180ms for exit.
- Active controls may scale down slightly. Hover should not resize layout.
- Respect reduced motion. Decorative canvas effects and spotlight motion must degrade cleanly.
- Keyboard focus must land on the same element that owns the squircle surface.

## 8. Responsive Behavior

- Mobile: bottom dock, one-column panels, mobile cards for table-like content.
- Tablet: two-column metric grids and split support cards when space allows.
- Desktop: resizable sidebar plus inset app frame.
- Wide desktop: dashboard can use the 5-column analytics/support layout.

## 9. Accessibility & Quality Rules

- Financial values, risk states, and form errors must pass contrast in light and dark modes.
- Color never carries meaning alone; pair semantic color with labels, icons, or copy.
- Preserve colorblind mode category overrides.
- Keep touch targets at least 44px where controls are primary mobile actions.
- Use existing UDS and `sq-*` utilities before creating any new visual treatment.
