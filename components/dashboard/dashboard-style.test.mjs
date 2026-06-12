//
//  dashboard-style.test.mjs
//  Argent
//
//  Created by hilario on 25 May 2026 at 23:00.
//  Description: Covers dashboard style behavior in Argent, asserting dashboard expectations that protect
//  the overview experience from regressions.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))

function readDashboardFile(fileName) {
    return readFileSync(join(here, fileName), "utf8")
}

function readProjectFile(...segments) {
    return readFileSync(join(here, "..", "..", ...segments), "utf8")
}

function getConstBlock(source, constName) {
    const start = source.indexOf(`export const ${constName}`)
    assert.notEqual(start, -1, `${constName} should be exported`)

    const nextExport = source.indexOf("\nexport ", start + 1)
    return source.slice(start, nextExport === -1 ? source.length : nextExport)
}

function getLocalConstObjectBlock(source, constName) {
    const match = source.match(new RegExp(`const ${constName} = \\{[\\s\\S]*?\\n\\} as const`))
    assert.ok(match, `${constName} should exist`)
    return match[0]
}

function getCssBlock(source, selector) {
    const start = source.indexOf(selector)
    assert.notEqual(start, -1, `${selector} should exist`)

    const open = source.indexOf("{", start)
    assert.notEqual(open, -1, `${selector} should open a CSS block`)

    const close = source.indexOf("\n}", open)
    assert.notEqual(close, -1, `${selector} should close a CSS block`)

    return source.slice(start, close + 2)
}

const primitives = readDashboardFile("dashboard-primitives.tsx")
const analyticsPanel = readDashboardFile("dashboard-analytics-panel.tsx")
const financialFocus = readDashboardFile("dashboard-financial-focus.tsx")
const overview = readDashboardFile("dashboard-overview.tsx")
const moduleGrid = readDashboardFile("dashboard-module-grid.tsx")
const recentActivity = readDashboardFile("dashboard-recent-activity.tsx")
const supportSidebar = readDashboardFile("dashboard-support-sidebar.tsx")
const priorityBrief = readDashboardFile("dashboard-priority-brief.tsx")
const dashboardPage = readProjectFile("app", "(main)", "page.tsx")
const mainLayout = readProjectFile("app", "(main)", "layout.tsx")
const sectionCards = readProjectFile("components", "section-cards.tsx")
const pageFramework = readProjectFile("components", "page-framework.tsx")
const globals = readProjectFile("app", "globals.css")
const rootLayout = readProjectFile("app", "layout.tsx")
const design = readProjectFile("DESIGN.md")
const uds = readProjectFile("lib", "UDS.ts")
const card = readProjectFile("components", "ui", "card.tsx")
const button = readProjectFile("components", "ui", "button.tsx")
const dialog = readProjectFile("components", "ui", "dialog.tsx")
const dropdownMenu = readProjectFile("components", "ui", "dropdown-menu.tsx")
const select = readProjectFile("components", "ui", "select.tsx")
const sidebar = readProjectFile("components", "ui", "sidebar.tsx")
const mobileDock = readProjectFile("components", "mobile-dock.tsx")
const commandPalette = readProjectFile("components", "command-palette.tsx")
const authShell = readProjectFile("components", "auth", "auth-shell.tsx")
const loadingScreen = readProjectFile("components", "loading-screen.tsx")
const squircleProvider = readProjectFile("components", "squircle-provider.tsx")
const registerPage = readProjectFile("app", "(auth)", "register", "page.tsx")
const spotlightProvider = readProjectFile("components", "surface-spotlight-provider.tsx")
const chartDisplay = readProjectFile("components", "chart-display.tsx")
const chartAreaInteractive = readProjectFile("components", "chart-area-interactive.tsx")
const cashFlowCard = readProjectFile("components", "cash-flow-card.tsx")
const canvasBackground = readProjectFile("components", "canvas-background.tsx")
const glassSurface = getConstBlock(primitives, "DASHBOARD_GLASS_SURFACE")
const inlineSurface = getConstBlock(primitives, "DASHBOARD_INLINE_SURFACE")
const cardSurface = getConstBlock(primitives, "DASHBOARD_CARD_SURFACE")
const iconBadge = getConstBlock(primitives, "DASHBOARD_CARD_ICON_BADGE")
const statCardToneBlock = getLocalConstObjectBlock(uds, "UDS_STAT_CARD_TONE_CLASSES")
const sqNormalUtility = getCssBlock(globals, "@utility sq-normal")
const sqBigUtility = getCssBlock(globals, "@utility sq-big")
const squircleSurfaceBlock = getCssBlock(globals, ":where(.squircle-surface)")
const udsSurfaceBlock = getCssBlock(globals, ".uds-surface")
const udsBgGlassBlock = getCssBlock(globals, ".uds-bg-glass")
const udsBgElevatedBlock = getCssBlock(globals, ".uds-bg-elevated")
const udsBgRaisedBlock = getCssBlock(globals, ".uds-bg-raised")
const udsBgInputBlock = getCssBlock(globals, ".uds-bg-input")
const udsShadowCardBlock = getCssBlock(globals, ".uds-shadow-card")

assert.doesNotMatch(
    glassSurface,
    /bg-black/,
    "normal dashboard surfaces should not use opaque black card backgrounds",
)
assert.doesNotMatch(
    glassSurface,
    /shadow-\[0_18px/,
    "normal dashboard surfaces should not use heavy card shadows",
)
assert.match(
    glassSurface,
    /UDS\.cardSurface/,
    "dashboard surfaces should use the shared UDS card surface",
)
assert.doesNotMatch(
    glassSurface,
    /spotlight-surface/,
    "dashboard card surfaces should not paint spotlight background gradients",
)
assert.match(
    glassSurface,
    /text-foreground/,
    "dashboard surfaces should keep foreground text semantics",
)
assert.doesNotMatch(
    inlineSurface,
    /spotlight-surface|bg-white\/\[0\.04/,
    "inline dashboard surfaces should be quieter than the previous card-like treatment",
)
assert.match(
    inlineSurface,
    /UDS\.cardSurface/,
    "inline dashboard cards should match the shared UDS card surface",
)
assert.match(
    cardSurface,
    /UDS\.cardSurface/,
    "default dashboard cards should compose the shared UDS card surface",
)
assert.match(
    cardSurface,
    /DASHBOARD_FLAT_SURFACE_SHADOW/,
    "default dashboard cards should use the flat card shadow treatment",
)
assert.match(
    cardSurface,
    /p-4/,
    "default dashboard cards should use 1rem padding",
)
assert.doesNotMatch(
    cardSurface,
    /spotlight-surface/,
    "default nested dashboard cards should not create nested spotlight overlays",
)
assert.doesNotMatch(
    iconBadge,
    /\b(?:size|h|w|p|px|py|pl|pr|pt|pb)-|border|bg-\[/,
    "dashboard card icons should render as the logo only without padding, fixed boxes, or badges",
)
assert.match(
    primitives,
    /DASHBOARD_TITLE_CLASS = "truncate text-sm font-medium tracking-tight text-foreground-secondary"/,
    "dashboard should expose one title style matching the analytics card title",
)
assert.match(
    primitives,
    /<h2 className=\{DASHBOARD_TITLE_CLASS\}/,
    "dashboard surface titles should use the shared dashboard title style",
)
assert.match(
    primitives,
    /export function DashboardCardToolbar/,
    "dashboard primitives should expose a universal card toolbar",
)
assert.match(
    primitives,
    /data-dashboard-card-toolbar/,
    "dashboard card toolbar should expose a stable marker for visual inspection",
)
assert.match(
    primitives,
    /role=\{hasTools \? "toolbar" : undefined\}/,
    "dashboard card toolbar should use toolbar semantics when card tools exist",
)
assert.match(
    primitives,
    /tools\?: React\.ReactNode/,
    "dashboard card templates should expose a tools slot",
)
assert.match(
    primitives,
    /const toolbarContent = tools \?\? action/,
    "dashboard card templates should keep existing action content as a compatibility fallback",
)
assert.match(
    primitives,
    /<DashboardCardToolbar[\s\S]*\{toolbarContent\}[\s\S]*<\/DashboardCardToolbar>/,
    "dashboard card templates should render tools through the universal toolbar",
)
assert.match(
    primitives,
    /DASHBOARD_TITLE_CLASS[\s\S]*labelClassName/,
    "dashboard metric card labels should use the shared dashboard title style",
)
assert.match(
    primitives,
    /icon\?: DashboardIcon/,
    "dashboard metric card icons should be optional",
)
assert.match(
    primitives,
    /UDS\.separator/,
    "dashboard surface header divider should use the UDS separator",
)
assert.doesNotMatch(
    primitives,
    /border-b|cardDivider/,
    "dashboard surface header divider should not use direct border styling",
)
assert.match(
    overview,
    /DashboardMetricCard/,
    "overview cards should use the shared dashboard metric card layout",
)
assert.doesNotMatch(
    overview,
    /UserRound|icon=\{/,
    "overview greeting card should not render a logo/icon",
)
assert.match(
    overview,
    /DashboardMetricCardSkeleton/,
    "overview loading state should use the shared dashboard metric card skeleton",
)
assert.match(
    sectionCards,
    /function DashboardStatCard\(/,
    "dashboard summary cards should use the drawer-inspired stat card treatment",
)
assert.match(
    sectionCards,
    /DashboardStatCardSkeleton/,
    "dashboard summary loading cards should match the drawer-inspired card treatment",
)
assert.match(
    sectionCards,
    /grid grid-cols-2 gap-4 @\[1120px\]\/overview:grid-cols-4/,
    "top summary cards should use a stable 2-up layout that expands to one row on normal desktop dashboard space",
)
assert.doesNotMatch(
    sectionCards,
    /auto-fit/,
    "top summary cards should not auto-fit into uneven card rows",
)
assert.match(
    sectionCards,
    /DASHBOARD_STAT_TONE_STYLES/,
    "dashboard summary cards should centralize their tone treatment",
)
assert.match(
    sectionCards,
    /data-dashboard-stat-card=\{statKey\}/,
    "dashboard summary cards should expose stable card markers for visual inspection",
)
assert.match(
    sectionCards,
    /UDS\.cardSurface[\s\S]*p-4/,
    "dashboard summary cards should compose the shared UDS card shell",
)
assert.doesNotMatch(
    sectionCards,
    /bg-\[radial-gradient\(circle_at_88%_88%|bg-(?:emerald|rose|red|amber|sky|blue)-500\/\[0\.0|border-(?:emerald|rose|red|amber|sky|blue)-500\/25/,
    "dashboard summary cards should not paint colored underlayers beneath UDS glass",
)
assert.doesNotMatch(
    sectionCards,
    /before:absolute before:bottom-3 before:left-0|dashboardToneStyles\.rail|rail:\s*"before:bg|sq-full border px-2/,
    "dashboard summary cards should not render side signal rails",
)
assert.match(
    sectionCards,
    /text-2xl[\s\S]*sm:text-3xl/,
    "dashboard summary cards should use a large bottom-right value treatment",
)
assert.match(
    sectionCards,
    /text-base[\s\S]*text-foreground-secondary/,
    "dashboard summary cards should use the larger lead-card label treatment",
)
assert.doesNotMatch(
    sectionCards,
    /iconClassName=\{isDashboard \? "size-3\.5/,
    "dashboard summary card icons should use the shared dashboard icon size",
)
assert.match(
    pageFramework,
    /const STAT_CARD_SURFACE = cn\(/,
    "page-level stat cards should centralize the neutral dashboard-inspired shell",
)
assert.match(
    pageFramework,
    /UDS\.cardSurface[\s\S]*p-4/,
    "page-level stat cards should compose the shared UDS card shell",
)
assert.match(
    pageFramework,
    /const STAT_CARD_GLOW =\s*"hidden"/,
    "page-level stat cards should not paint a background gradient",
)
assert.doesNotMatch(
    pageFramework,
    /inset_0_1px_0_rgba\(255,255,255,0\.32\)/,
    "page-level stat cards should not draw an inset highlight that reads as a second border",
)
assert.doesNotMatch(
    [uds, sectionCards, pageFramework, priorityBrief].join("\n"),
    /sq-\[28px\]/,
    "large card surfaces should not hard-code one-off shape utilities instead of the shared squircle token",
)
assert.doesNotMatch(
    pageFramework,
    /border-(?:emerald|rose|red|amber|sky|blue)-500|bg-(?:emerald|rose|red|amber|sky|blue)-500|text-(?:emerald|rose|red|amber|sky|blue)-/,
    "page-level stat cards should not reintroduce colored trend card treatments",
)
assert.doesNotMatch(
    overview,
    /DashboardPriorityBrief|priorityItems/,
    "priority brief should live in the dashboard header sidebar, not inline in the overview band",
)
assert.doesNotMatch(
    overview,
    /Financial command center/,
    "dashboard command-center copy should come from localized dashboard labels",
)
assert.match(
    moduleGrid,
    /data-dashboard-layout="command-center"/,
    "dashboard module grid should expose the curated command-center layout",
)
assert.match(
    moduleGrid,
    /"flex min-h-0 min-w-0"/,
    "dashboard module slots should stay layout-only and stretch nested panels without adding borders",
)
assert.doesNotMatch(
    moduleGrid,
    /UDS\.surfaceClass|border:\s*"soft"|overflow-hidden sq-(?:normal|big|xl)/,
    "dashboard module slots should not add a second squircle border or clip nested UDS cards",
)
assert.match(
    moduleGrid,
    /@\[1320px\]\/main:grid-cols-5/,
    "dashboard module grid should align to the same 5-column system as the overview cards",
)
assert.match(
    moduleGrid,
    /@\[1320px\]\/main:col-span-4/,
    "analytics should span four dashboard columns when the support sidebar equals one card",
)
assert.match(
    moduleGrid,
    /DashboardSupportSidebar className="@\[1320px\]\/main:col-span-1"/,
    "dashboard support sidebar should be the same width as one top summary card on large screens",
)
assert.match(
    moduleGrid,
    /PRIMARY_MODULE_ID: DashboardModuleId = "analytics"/,
    "analytics and cash-flow should be the primary dashboard module",
)
assert.match(
    analyticsPanel,
    /ANALYTICS_TOGGLE_CLASS = "h-8 min-h-8 gap-0\.5 p-0\.5"/,
    "analytics view toggle should use one stable toolbar-height pill",
)
assert.match(
    analyticsPanel,
    /ANALYTICS_TOGGLE_ITEM_CLASS = "h-7 min-w-8 px-2\.5 text-xs leading-none sm:min-w-\[7rem\] sm:px-3"/,
    "analytics view toggle items should have matching height and readable labels without mobile overflow",
)
assert.match(
    analyticsPanel,
    /tools=\{/,
    "analytics tools should render through the shared dashboard toolbar slot",
)
assert.doesNotMatch(
    analyticsPanel,
    /action=\{/,
    "analytics should not use a bespoke dashboard surface action slot",
)
assert.match(
    recentActivity,
    /tools=\{/,
    "recent activity tools should render through the shared dashboard toolbar slot",
)
assert.match(
    financialFocus,
    /tools=\{/,
    "financial focus tools should render through the shared dashboard toolbar slot",
)
assert.match(
    analyticsPanel,
    /!showCashFlow \? \(\s*<ChartAreaInteractive/,
    "analytics should render overview as one selected view",
)
assert.match(
    analyticsPanel,
    /showCashFlow[\s\S]*<CashFlowCard accountIds=\{selectedAccountIds\} compact \/>/,
    "analytics should render cash-flow as the alternate selected view",
)
assert.doesNotMatch(
    analyticsPanel,
    /2xl:grid-cols-\[minmax\(0,1fr\)_minmax\(300px,0\.42fr\)\]|2xl:grid-cols-\[auto_minmax\(0,1fr\)\]|hidden 2xl:grid|hidden 2xl:block/,
    "analytics should not render overview and cash-flow side by side",
)
assert.match(
    cashFlowCard,
    /compact\s*\?\s*"flex h-full min-h-\[280px\] flex-col overflow-hidden bg-transparent"/,
    "compact cash-flow should match the dashboard chart minimum height",
)
assert.match(
    analyticsPanel,
    /getPrioritizedAnalyticsInsights\(/,
    "analytics insight strip should rank insights from the current dashboard data before rendering",
)
assert.match(
    analyticsPanel,
    /data-priority-item=\{leadInsight\?\.id\}/,
    "analytics insight strip should expose the current lead insight for data-driven state",
)
assert.match(
    analyticsPanel,
    /data-lead=\{isLead \? "true" : undefined\}/,
    "analytics insight strip should visibly distinguish the active data-driven lead insight",
)
assert.match(
    analyticsPanel,
    /<Icon className=\{cn\("size-4 shrink-0", toneStyles\.icon\)\}/,
    "analytics insight card icons should match the shared dashboard card icon size",
)
assert.doesNotMatch(
    analyticsPanel,
    /before:absolute before:bottom-2 before:left-0|toneStyles\.rail|rail:\s*"before:bg/,
    "analytics insight cards should not render side signal rails",
)
assert.match(
    analyticsPanel,
    /getBudgetUsePriority\(monthlySnapshot\.highestBudgetUse\)/,
    "budget pressure should influence analytics sidebar priority",
)
assert.match(
    analyticsPanel,
    /getDueSoonTone\(monthlySnapshot\.upcomingTotal\)/,
    "upcoming bills should influence analytics sidebar tone",
)
assert.match(
    analyticsPanel,
    /UDS\.separator/,
    "analytics panel should use UDS horizontal separators",
)
assert.doesNotMatch(
    analyticsPanel,
    /UDS\.separatorVertical/,
    "analytics panel should not need vertical separators when views are toggle-exclusive",
)
assert.doesNotMatch(
    analyticsPanel,
    /relative min-w-0 overflow-hidden border|border-t|border-l|ANALYTICS_SOFT_TOP_EDGE|ANALYTICS_PANEL_SURFACE|ANALYTICS_STAT_CARD_SURFACE/,
    "analytics panel should avoid direct border dividers and custom card surface variants",
)
assert.match(
    moduleGrid,
    /zone="supporting"/,
    "secondary dashboard modules should live in a stable supporting zone",
)
assert.match(
    moduleGrid,
    /@\[900px\]\/main:flex-1/,
    "supporting modules should flex vertically inside the dashboard sidebar",
)
assert.match(
    supportSidebar,
    /@\[900px\]\/main:flex @\[900px\]\/main:min-h-0 @\[900px\]\/main:flex-col/,
    "dashboard support sidebar should use a flex column on desktop without fixing page height",
)
assert.doesNotMatch(
    supportSidebar,
    /overflow-y-auto|dashboard-sidebar-scroll-wrap|data-scroll-top|data-scroll-bottom/,
    "dashboard support sidebar should not create an internal desktop scroller for normal page content",
)
assert.match(
    supportSidebar,
    /grid min-w-0 gap-4[\s\S]*@\[900px\]\/main:flex-1[\s\S]*@\[900px\]\/main:flex-col/,
    "dashboard support modules should stretch in a normal grid/flex rail before the page scrolls",
)
assert.match(
    globals,
    /\.dashboard-sidebar-scroll\s*\{[\s\S]*scrollbar-gutter:\s*stable/,
    "deliberate nested dashboard scroll surfaces should reserve stable gutter space",
)
assert.match(
    globals,
    /\.dashboard-sidebar-scroll::\-webkit-scrollbar-thumb[\s\S]*padding-box/,
    "dashboard sidebar scrollbar thumb should use a glass-style clipped background",
)
assert.match(
    globals,
    /\.dashboard-sidebar-scroll::\-webkit-scrollbar-track[\s\S]*background:\s*transparent/,
    "dashboard sidebar scrollbar should not render a visible track container",
)
assert.match(
    globals,
    /\.dashboard-sidebar-scroll::\-webkit-scrollbar\s*\{[\s\S]*width:\s*0\.44rem/,
    "dashboard sidebar scrollbar should stay narrow",
)
assert.doesNotMatch(
    moduleGrid,
    /sidebarTools/,
    "dashboard module grid should not reserve a fixed tools card area in the sidebar",
)
assert.doesNotMatch(
    dashboardPage,
    /DashboardToolsSidebar|sidebarTools/,
    "dashboard page should not render the removed tools sidebar UI",
)
assert.doesNotMatch(
    moduleGrid,
    /localStorage|draggable|onDragStart|isCustomizing|lg:overflow-hidden/,
    "dashboard module grid should not ship end-user drag/drop customization in this pass",
)
assert.doesNotMatch(
    dashboardPage,
    /Customize dashboard|SlidersHorizontal|isCustomizing|lg:overflow-hidden/,
    "dashboard page header should not expose layout customization controls",
)
assert.match(
    dashboardPage,
    /DashboardPriorityBriefDropdown/,
    "dashboard page should expose priority brief through a page-header dropdown action",
)
assert.match(
    dashboardPage,
    /data-dashboard-priority-layout="dropdown"/,
    "priority brief should not be coupled to the dashboard column layout",
)
assert.match(
    priorityBrief,
    /export function DashboardPriorityBriefDropdown/,
    "priority brief should provide a dedicated dropdown action component",
)
assert.match(
    priorityBrief,
    /<Popover open=\{open\} onOpenChange=\{setOpen\}>/,
    "priority brief should render as a popover dropdown rather than a side drawer",
)
assert.match(
    priorityBrief,
    /<PopoverContent[\s\S]*id="dashboard-priority-dropdown"[\s\S]*data-dashboard-priority-dropdown/,
    "priority brief dropdown should expose a stable controlled popover region",
)
assert.match(
    priorityBrief,
    /w-\[min\(20rem,calc\(100vw-1rem\)\)\][\s\S]*max-w-\[20rem\]/,
    "priority brief dropdown should use the same narrower width as the notification popup",
)
assert.doesNotMatch(
    dashboardPage,
    /showPriorityBrief|Sheet|SheetContent|SheetHeader|SheetTitle|SheetDescription|dashboard-priority-sidebar/,
    "priority brief dropdown should not keep the old drawer state or sheet primitives",
)
assert.doesNotMatch(
    dashboardPage,
    /grid-template-columns,column-gap|grid-cols-\[minmax\(320px,1fr\)_320px\]|md:grid-cols-\[minmax\(320px,1fr\)_320px\]/,
    "priority brief dropdown should not resize the dashboard grid",
)
assert.doesNotMatch(
    dashboardPage,
    /grid-cols-\[minmax\(320px,1fr\)_0px\]|md:grid-cols-\[minmax\(320px,1fr\)_0px\]/,
    "priority brief dropdown should not keep a zero-width sidebar track in the page layout",
)
assert.match(
    priorityBrief,
    /aria-controls="dashboard-priority-dropdown"/,
    "priority brief trigger should control the dropdown region",
)
assert.match(
    priorityBrief,
    /aria-expanded=\{open\}/,
    "priority brief trigger should report the dropdown open state",
)
assert.match(
    priorityBrief,
    /DASHBOARD_ACTION_ACTIVE_CLASS/,
    "priority brief trigger should keep the active header-button treatment while open",
)
assert.match(
    priorityBrief,
    /PriorityBriefDropdownRow/,
    "priority brief dropdown should render compact rows instead of the side-panel card stack",
)
assert.match(
    priorityBrief,
    /DashboardPriorityBrief[\s\S]*variant="dropdown"/,
    "priority brief dropdown should render the priority brief in dropdown mode",
)
assert.match(
    priorityBrief,
    /UDS\.separator[\s\S]*"my-1"/,
    "priority brief dropdown rows should use the shared UDS separator",
)
assert.doesNotMatch(
    dashboardPage,
    /translate-x-\[100vw\]/,
    "priority brief dropdown should not animate from a viewport-wide offset",
)
assert.match(
    priorityBrief,
    /function PriorityBriefCard\(/,
    "priority brief should use the same stat-card layout as the dashboard stat cards",
)
assert.match(
    priorityBrief,
    /role="list"[\s\S]*PriorityBriefCard/,
    "priority brief should render the stat-card stack as a list",
)
assert.match(
    priorityBrief,
    /UDS\.cardSurface[\s\S]*p-4/,
    "priority brief cards should compose the same UDS card shell as the dashboard stat cards",
)
assert.doesNotMatch(
    priorityBrief,
    /bg-\[radial-gradient\(circle_at_88%_88%|bg-(?:emerald|rose|red|amber|sky|blue)-500\/\[0\.0|border-(?:emerald|rose|red|amber|sky|blue)-500\/25/,
    "priority brief cards should not paint colored underlayers beneath UDS glass",
)
assert.match(
    priorityBrief,
    /UDS\.separator/,
    "priority brief cards should be separated by the shared UDS separator",
)
assert.match(
    priorityBrief,
    /text-2xl[\s\S]*sm:text-3xl/,
    "priority brief cards should use the same bottom-right value treatment as dashboard stat cards",
)
assert.match(
    priorityBrief,
    /<Icon className=\{cn\("size-5/,
    "priority brief card icons should match the shared dashboard card icon size",
)
assert.doesNotMatch(
    priorityBrief,
    /PriorityBriefSummary|PriorityBriefRow|min-h-\[70px\]|border-t border-border/,
    "priority brief should not use the previous compact row layout",
)
assert.doesNotMatch(
    priorityBrief,
    /toneStyles\.rail|rail:\s*"bg-|absolute bottom-3 left-0 top-3 w-0\.5/,
    "priority brief cards should not render side signal rails",
)
assert.doesNotMatch(
    priorityBrief,
    /DashboardMetricCard/,
    "priority brief drawer should not reuse full dashboard metric cards",
)
assert.doesNotMatch(
    priorityBrief,
    /UDS\.cardHover|hover:bg|hover:border/,
    "priority brief cards should not change card color on hover",
)
assert.doesNotMatch(
    dashboardPage,
    /data-no-topline-style/,
    "dashboard page actions should use the shared invisible topline button styling",
)
assert.match(
    dashboardPage,
    /gap-4 p-3 md:p-4/,
    "dashboard page should let PageShell own the internal scroll container",
)
assert.doesNotMatch(
    dashboardPage,
    /overflow-y-visible|min-h-fit|min-h-full|md:h-full|md:overflow-hidden|@\[900px\]\/main:overflow-hidden/,
    "dashboard page should not override the fixed app frame or internal PageShell scroll",
)
assert.match(
    supportSidebar,
    /DashboardSupportSidebar/,
    "dashboard should expose a support sidebar component after removing tools",
)
assert.doesNotMatch(
    supportSidebar,
    /Tools|Ferramentas|ToolLink|<Card|AccountFilter|onOpenExport|onOpenPriorityBrief/,
    "dashboard support sidebar should not contain the removed tools card UI",
)
assert.match(
    uds,
    /containerClass:\s*udsContainer[\s\S]*container:\s*udsContainer\(\)/,
    "UDS containers should be produced by the shared configurable container builder",
)
assert.match(
    uds,
    /udsContainer[\s\S]*spotlight:\s*true/,
    "default UDS containers should carry the spotlight treatment",
)
assert.match(
    uds,
    /cardSurface:[\s\S]*squircle-surface uds-card-surface[\s\S]*udsSurface\(\{[\s\S]*background:\s*false[\s\S]*blur:\s*false[\s\S]*border:\s*"soft"[\s\S]*radius:\s*"normal"/,
    "UDS card surfaces should keep an explicit flat card fill while the UDS layer stays transparent",
)
assert.match(
    globals,
    /\.uds-card-surface,\s*\.dark \.uds-card-surface\s*\{[\s\S]*background-color:\s*var\(--card\);[\s\S]*background-image:\s*none;[\s\S]*\}/,
    "UDS card surfaces should opt out of material background gradients",
)
assert.match(
    globals,
    /\.uds-card-surface\.spotlight-surface::before\s*\{[\s\S]*background:\s*none;[\s\S]*\}/,
    "UDS card spotlight overlays should not paint a background gradient",
)
assert.doesNotMatch(
    statCardToneBlock,
    /radial-gradient|bg-\[radial-gradient/,
    "UDS stat card tone tokens should not paint radial background gradients",
)
assert.doesNotMatch(
    statCardToneBlock,
    /(?:^|\s)(?:dark:)?bg-(?:purple|blue|red|emerald|amber|neutral)-/,
    "UDS stat card tone tokens should not tint card backgrounds",
)
assert.match(
    uds,
    /export type UDSBlur = boolean/,
    "UDS blur should be a boolean opt-in so each surface chooses whether to blur",
)
assert.doesNotMatch(
    uds,
    /blur:\s*"(?:soft|glass)"/,
    "UDS surfaces should not use legacy named blur modes",
)
assert.match(
    uds,
    /surface:\s*"bg-\[color:color-mix\(in_srgb,var\(--background\)_14%,transparent\)\]"/,
    "generic UDS surface fills should stay transparent against the app canvas",
)
assert.doesNotMatch(
    uds,
    /UDS_BACKGROUND_CLASSES[\s\S]*uds-bg-/,
    "the shared UDS helper should not route old materials through the newer uds-bg skins",
)
assert.match(
    uds,
    /return cn\(\s*"uds-surface squircle-surface"/,
    "the shared UDS helper should attach the global glassmorphism hook to every UDS surface",
)
assert.doesNotMatch(
    uds,
    /UDS_BORDER_CLASSES[\s\S]*sq-border-(?:muted|soft|strong)/,
    "UDS surfaces should keep native old UDS borders and leave the masked squircle edge utilities out of UDS",
)
assert.match(
    uds,
    /cardSurface:[\s\S]*blur:\s*false/,
    "UDS card surfaces should keep their opaque fill sharp without backdrop blur",
)
assert.match(
    uds,
    /cardHover:[\s\S]*hover:bg-\[color:var\(--card-hover\)\]/,
    "UDS card hover should stay on neutral card hover tokens",
)
assert.doesNotMatch(
    uds,
    /cardHover:[\s\S]*dark:hover:bg-\[#050505\]/,
    "dark UDS card hover should not reuse the old near-black fill",
)
assert.doesNotMatch(
    uds,
    /UDS_CARD_SURFACE_SHADOW[\s\S]*inset_0_1px_0_rgba\(255,255,255,0\.32\)/,
    "UDS card shadows should not include inset highlight borders",
)
assert.match(
    uds,
    /overlay:\s*"z-\[999\] \| bg-black\/12 dark:bg-black\/25/,
    "universal UDS overlays should use the previous lighter UDS scrim",
)
assert.doesNotMatch(
    uds,
    /overlay:\s*"[^"]*bg-black\/30 dark:bg-black\/\[0\.58\]/,
    "universal UDS overlays should not use the flattened dark glass scrim",
)
assert.match(
    card,
    /spotlight-surface relative/,
    "the reusable Card component should carry the spotlight treatment",
)
assert.match(
    button,
    /glass:[\s\S]*UDS\.cardSurface[\s\S]*UDS\.cardHover/,
    "glass buttons should compose the shared UDS glass surface and hover treatment",
)
assert.match(
    globals,
    /--background:\s*#ffffff;/,
    "light mode should use a white page background",
)
assert.match(
    globals,
    /--surface:\s*#f3f3f3;/,
    "light mode cards should use the older quiet neutral UDS surface",
)
assert.match(
    globals,
    /--sq-clip:\s*polygon\(/,
    "global squircle geometry should use deterministic polygon clipping",
)
assert.match(
    globals,
    /@supports\s*\(corner-shape:\s*squircle\)[\s\S]*corner-shape:\s*squircle;/,
    "native squircle-capable browsers should use corner-shape so borders and shadows follow the same curve",
)
assert.doesNotMatch(
    globals,
    /@supports\s*\(corner-shape:\s*squircle\)[\s\S]*\)\s*\{\s*-webkit-clip-path:\s*none;\s*clip-path:\s*none;\s*corner-shape:\s*squircle;/,
    "native squircle-capable browsers should keep deterministic clipping instead of switching to engine-specific native corner geometry",
)
assert.match(
    globals,
    /@supports\s*\(corner-shape:\s*squircle\)[\s\S]*\.squircle-surface\.sq-full[\s\S]*corner-shape:\s*round;/,
    "native full-radius squircle utilities should stay circular or capsule-shaped instead of inheriting squircle corners",
)
assert.match(
    globals,
    /--squircle-normal:\s*22px;[\s\S]*--squircle-big:\s*36px;[\s\S]*--app-window-radius:\s*var\(--squircle-big\);[\s\S]*--app-control-radius:\s*var\(--squircle-normal\);/,
    "app squircle tokens should expose normal 22px and big 36px sizes",
)
assert.match(
    globals,
    /:where\(\s*\[data-slot="alert"\][\s\S]*?\[data-slot="input"\][\s\S]*?\[data-slot="textarea"\s*\]\s*\)\s*\{[\s\S]*?--sq-static-r:\s*var\(--app-control-radius\);[\s\S]*?--sq-base-r:\s*var\(--app-control-radius\);[\s\S]*?--sq-scale:\s*0;[\s\S]*?clip-path:\s*var\(--sq-clip-lg\);/,
    "shared UI data-slot controls should use the fixed normal squircle radius app-wide",
)
assert.match(
    globals,
    /\[data-slot="button"\][\s\S]*\[data-slot="textarea"\][\s\S]*corner-shape:\s*squircle;/,
    "shared UI data-slot controls should receive the app-wide squircle safety net",
)
assert.match(
    globals,
    /\[data-slot="dropdown-menu-item"\][\s\S]*\[data-slot="select-item"\][\s\S]*border-radius:\s*var\(--sq-r\);/,
    "shared menu item rows should receive the app-wide squircle radius paint",
)
assert.match(
    globals,
    /\[data-slot="select-content"\][\s\S]*\[data-slot="select-item"\][\s\S]*--sq-static-r:\s*var\(--squircle-big\);[\s\S]*--sq-base-r:\s*var\(--squircle-big\);[\s\S]*--sq-scale:\s*0;/,
    "select surfaces should pin the big squircle radius with radius growth disabled",
)
assert.doesNotMatch(
    dropdownMenu,
    /data-squircle-expand-radius="false"/,
    "dropdown primitives should use shared radius behavior without dropdown-specific radius opt-outs",
)
assert.match(
    select,
    /data-slot="select-content"[\s\S]*data-squircle-expand-radius="false"[\s\S]*data-slot="select-item"[\s\S]*data-squircle-expand-radius="false"/,
    "select primitives should explicitly disable radius exponentiation/growth",
)
assert.match(
    globals,
    /\[data-slot="button"\][\s\S]*\[data-slot="textarea"\][\s\S]*backdrop-filter:\s*none;/,
    "shared UI data-slot controls should keep squircle geometry without inheriting UDS blur",
)
assert.match(
    globals,
    new RegExp("border-" + "radius\\s*:\\s*var\\(--sq-r\\)"),
    "squircle utilities should expose native radius for unified border and corner paint",
)
assert.match(
    globals,
    /@utility sq-normal[\s\S]*clip-path:\s*polygon\(/,
    "sq-normal should be available as the reusable app-wide normal squircle utility with an inline path",
)
assert.match(
    rootLayout,
    /<SquircleProvider \/>/,
    "root layout should mount the app-wide squircle runtime",
)
assert.match(
    squircleProvider,
    /WIKIPEDIA_SQUIRCLE_EXPONENT\s*=\s*4/,
    "squircle provider fallback should match the p=4 superellipse model from the squircle formula",
)
assert.match(
    squircleProvider,
    /getPropertyValue\("--sq-base-r"\)[\s\S]*getPropertyValue\("--sq-scale"\)/,
    "squircle provider should read base radius and area scale metadata from computed CSS",
)
assert.match(
    squircleProvider,
    /\[data-slot="dropdown-menu-item"\][\s\S]*\[data-slot="select-item"\]/,
    "squircle provider should measure menu and select item rows, not only their popover containers",
)
assert.match(
    squircleProvider,
    /CSS\.supports\("corner-shape", "squircle"\)/,
    "squircle provider should detect native CSS corner-shape support",
)
assert.match(
    squircleProvider,
    /dataset\.squircleRenderer\s*=\s*"native"/,
    "squircle provider should retain native CSS corners as a fallback when measured path clips are unavailable",
)
assert.match(
    squircleProvider,
    /supportsNativeCornerShape\(\)\s*&&\s*!supportsCssPathClip\(\)/,
    "squircle provider should prefer measured path clips over native corner-shape when both are available",
)
assert.match(
    squircleProvider,
    /MAXIMUM_RADIUS_MULTIPLIER\s*=\s*1\.35[\s\S]*const radiusFloor\s*=\s*Math\.max\(0, baseRadius\)[\s\S]*const radiusCeiling\s*=\s*radiusFloor \* MAXIMUM_RADIUS_MULTIPLIER[\s\S]*Math\.sqrt\(width \* height\)[\s\S]*1 - Math\.exp\(-lengthFromArea \/ Math\.max\(1, growthDamping\)\)[\s\S]*radiusFloor \* easedArea[\s\S]*Math\.min\(radiusCeiling, radiusFloor \+ proportionalLift\)[\s\S]*setProperty\("--sq-measured-r"/,
    "squircle provider should grow each element from its configured base radius up to 1.35x that radius",
)
assert.match(
    squircleProvider,
    /DEFAULT_RADIUS_GROWTH_DAMPING\s*=\s*1000/,
    "squircle radius growth should use a slow enough damping curve that medium cards do not immediately hit the cap",
)
assert.match(
    squircleProvider,
    /scale <= 0[\s\S]*return radiusFloor/,
    "squircle radius growth should be disabled when scale is zero",
)
assert.match(
    squircleProvider,
    /getAttribute\("data-squircle-expand-radius"\)[\s\S]*\["false", "0", "no", "off"\][\s\S]*const scale = expandsRadius \? readNumber\(style\.getPropertyValue\("--sq-scale"\), 0\) : 0/,
    "squircle radius growth should be opt-out per element with data-squircle-expand-radius",
)
assert.match(
    squircleProvider,
    /superellipsePoint[\s\S]*Math\.abs\(cos\) \*\* power[\s\S]*Math\.abs\(sin\) \*\* power/,
    "fallback squircle paths should be generated from superellipse points instead of quarter-circle arcs",
)
assert.match(
    squircleProvider,
    /normalPower\s*=\s*2 \* Math\.max\(0, exponent - 1\) \/ Math\.max\(1, exponent\)[\s\S]*Math\.abs\(cos\) \*\* normalPower[\s\S]*Math\.abs\(sin\) \*\* normalPower/,
    "superellipse border insets should use the correct p-norm normal for constant corner spacing",
)
assert.match(
    globals,
    /@utility sq-border-soft[\s\S]*border-color:\s*transparent !important;/,
    "squircle border utilities should clear native paint before the shared edge layer redraws them",
)
assert.doesNotMatch(
    squircleProvider,
    /syncBorderOverlay|createElementNS\("http:\/\/www\.w3\.org\/2000\/svg", "svg"\)|setProperty\("border-color", "transparent", "important"\)/,
    "the squircle runtime should measure geometry only; CSS should own the redrawn border layer",
)
assert.match(
    globals,
    /:where\(\.sq-border-muted, \.sq-border-soft, \.sq-border-strong\)[\s\S]*--sq-border-layer-color:[\s\S]*\* 0\.86[\s\S]*--sq-border-layer-sheen-color:[\s\S]*\* 0\.18[\s\S]*--sq-border-layer-highlight-color:[\s\S]*\* 0\.20[\s\S]*--sq-border-layer-glow-color:[\s\S]*\* 0\.30[\s\S]*--sq-border-layer-shadow-color:[\s\S]*\* 0\.16/,
    "shared squircle border strengths should feed the generic redrawn edge layer without taking over UDS surfaces",
)
assert.doesNotMatch(
    globals,
    /--sq-border-layer-drop-color|0 1px 2px var\(--sq-border-layer-drop-color\)/,
    "redrawn squircle borders should not cast bottom-corner drop shadows",
)
assert.match(
    globals,
    /--sq-border-soft-opacity/,
    "global styling should define soft glass squircle border tokens",
)
assert.match(
    globals,
    /--border:\s*color-mix\(in srgb, var\(--argent-smoked-pearl\) 18%, transparent\);[\s\S]*--border-strong:\s*color-mix\(in srgb, var\(--argent-smoked-pearl\) 32%, transparent\);[\s\S]*--sq-border-muted-opacity:\s*0\.06;[\s\S]*--sq-border-soft-opacity:\s*0\.08;[\s\S]*--sq-border-strong-opacity:\s*0\.12;/,
    "light mode borders should restore the older UDS neutral contrast while the squircle edge owns paint",
)
assert.match(
    globals,
    /\.dark\s*\{[\s\S]*--surface-subtle:\s*color-mix\(in srgb, var\(--argent-reversed-grey\) 96%, var\(--argent-jet-black\)\);[\s\S]*--surface:\s*color-mix\(in srgb, var\(--argent-reversed-grey\) 94%, var\(--argent-jet-black\)\);[\s\S]*--surface-elevated:\s*color-mix\(in srgb, var\(--argent-reversed-grey\) 90%, var\(--argent-jet-black\)\);[\s\S]*--border:\s*color-mix\(in srgb, var\(--argent-bright-grey\) 13%, transparent\);[\s\S]*--border-strong:\s*color-mix\(in srgb, var\(--argent-bright-grey\) 24%, transparent\);[\s\S]*--selection-cell-background:\s*rgba\(232, 232, 232, 0\.16\);[\s\S]*--sq-border-rgb:\s*232 232 232;[\s\S]*--sq-border-muted-opacity:\s*0\.08;[\s\S]*--sq-border-soft-opacity:\s*0\.16;[\s\S]*--sq-border-strong-opacity:\s*0\.22;/,
    "dark mode border tokens should restore the older UDS neutral contrast without moving border paint into the runtime",
)
assert.match(
    globals,
    /\.uds-surface[\s\S]*box-shadow:\s*var\(--uds-surface-shadow\);/,
    "legacy UDS CSS hooks should remain available for direct class users",
)
assert.match(
    udsSurfaceBlock,
    /background-color:\s*color-mix\(in srgb, var\(--background\) 14%, transparent\);[\s\S]*background-image:[\s\S]*linear-gradient[\s\S]*backdrop-filter:\s*none;/,
    "UDS surfaces should carry a transparent material hook without default blur",
)
assert.match(
    udsSurfaceBlock,
    /box-shadow:\s*var\(--uds-surface-shadow\);/,
    "legacy UDS surface hooks should not interfere with old native border paint",
)
assert.doesNotMatch(
    udsSurfaceBlock,
    /border-color:\s*transparent !important;|--uds-border-color|--uds-material-edge|--uds-material-highlight|--uds-material-shadow|^\s*border-color:\s*rgb/m,
    "UDS hooks should not hide old native borders or reintroduce detached edge paint",
)
assert.match(
    globals,
    /:where\(\.sq-border-muted, \.sq-border-soft, \.sq-border-strong\)::after\s*\{[\s\S]*z-index:\s*30;[\s\S]*pointer-events:\s*none;[\s\S]*clip-path:\s*inherit;[\s\S]*box-shadow:[\s\S]*inset 0 0 0 var\(--sq-border-width\) var\(--sq-border-layer-color\)[\s\S]*inset 0 1px 0 var\(--sq-border-layer-highlight-color\)[\s\S]*inset 1px 0 0 var\(--sq-border-layer-glow-color\)[\s\S]*inset -1px 0 0 var\(--sq-border-layer-glow-color\)[\s\S]*inset 0 -1px 0 var\(--sq-border-layer-shadow-color\)/,
    "generic shared squircle borders should keep a clipped fallback edge with border, glint, and shadow channels",
)
assert.match(
    globals,
    /:where\(\.sq-border-muted, \.sq-border-soft, \.sq-border-strong\)\[data-squircle-border-runtime="path"\]::after\s*\{[\s\S]*clip-path:\s*var\(--sq-border-clip-path\);[\s\S]*background:[\s\S]*radial-gradient[\s\S]*linear-gradient[\s\S]*linear-gradient[\s\S]*box-shadow:\s*none;/,
    "path-capable browsers should render explicit sq-border utilities as a measured superellipse ring without taking over UDS",
)
assert.match(
    globals,
    /@supports \(\(-webkit-mask:\s*linear-gradient\(#000 0 0\)\) or \(mask:\s*linear-gradient\(#000 0 0\)\)\)[\s\S]*:where\(\.sq-border-muted, \.sq-border-soft, \.sq-border-strong\):not\(\[data-squircle-border-runtime="path"\]\)::after[\s\S]*-webkit-mask:[\s\S]*content-box[\s\S]*-webkit-mask-composite:\s*xor;[\s\S]*mask-composite:\s*exclude;/,
    "masked squircle borders should remain only as the pre-runtime and non-path fallback",
)
for (const [name, block] of [
    ["glass", udsBgGlassBlock],
    ["elevated", udsBgElevatedBlock],
    ["raised", udsBgRaisedBlock],
    ["input", udsBgInputBlock],
]) {
    assert.match(
        block,
        /background-color:\s*(?:color-mix\(in srgb, var\(--background\) \d+%, transparent\)|color-mix\(in srgb, var\(--primary\) 8%, transparent\))/,
        `light UDS ${name} material should use a transparent UDS fill`,
    )
    assert.match(
        block,
        /background-image:[\s\S]*linear-gradient/,
        `light UDS ${name} material should keep a subtle refraction sheen`,
    )
    assert.doesNotMatch(
        block,
        /backdrop-filter:\s*blur\(/,
        `light UDS ${name} material should not blur unless the surface opts in`,
    )
}
assert.match(
    sidebar,
    /app-framework-surface sq-big[\s\S]*h-svh[\s\S]*min-h-0[\s\S]*overflow-hidden[\s\S]*border-border[\s\S]*shadow-none/,
    "the app framework should keep a fixed shell while PageShell owns internal scrolling",
)
assert.match(
    sidebar,
    /h-dvh min-h-0 w-full overflow-hidden/,
    "the sidebar provider should pin the app frame to the viewport instead of the document scroll height",
)
assert.match(
    sidebar,
    /bg-sidebar[\s\S]*text-sidebar-foreground/,
    "the desktop sidebar chrome should use the solid sidebar color token",
)
assert.doesNotMatch(
    sidebar,
    /peer-data-\[variant=inset\]:sq-(?:normal|big|xl)/,
    "the app framework should not hide its squircle rules behind peer variants",
)
assert.match(
    sidebar,
    /peer-data-\[side=left\]:md:ml-0![\s\S]*peer-data-\[side=right\]:md:mr-0!/,
    "the app framework should remove the gap between the sidebar and app frame on the active sidebar side",
)
assert.doesNotMatch(
    sidebar,
    /group-data-\[collapsible=icon\]:group-data-\[(?:side|rendered-side)=/,
    "collapsed sidebar containers should not add side-specific padding",
)
assert.match(
    sidebar,
    /group-data-\[collapsible=icon\]:justify-center/,
    "collapsed sidebar buttons should center icon-only content inside the balanced rail cell",
)
assert.match(
    globals,
    /\.app-framework-surface[\s\S]*background-color:\s*var\(--background\);[\s\S]*background-image:\s*none;[\s\S]*backdrop-filter:\s*none;[\s\S]*border-style:\s*solid;[\s\S]*border-width:\s*1px;[\s\S]*border-color:\s*var\(--border\) !important;[\s\S]*\.dark \.app-framework-surface[\s\S]*background-color:\s*var\(--background\);[\s\S]*background-image:\s*none;[\s\S]*border-color:\s*var\(--border\) !important;/,
    "the app framework surface should use the shared app border token in both themes",
)
assert.match(
    globals,
    /\.uds-bg-glass[\s\S]*background-color:\s*color-mix\(in srgb, var\(--background\) 18%, transparent\);[\s\S]*\.uds-bg-subtle[\s\S]*background-color:\s*color-mix\(in srgb, var\(--background\) 10%, transparent\);[\s\S]*\.uds-bg-surface[\s\S]*background-color:\s*color-mix\(in srgb, var\(--background\) 14%, transparent\);[\s\S]*\.dark \.uds-bg-glass[\s\S]*background-color:\s*color-mix\(in srgb, var\(--background\) 18%, transparent\);[\s\S]*\.dark \.uds-bg-subtle[\s\S]*background-color:\s*color-mix\(in srgb, var\(--background\) 10%, transparent\);[\s\S]*\.dark \.uds-bg-surface[\s\S]*background-color:\s*color-mix\(in srgb, var\(--background\) 14%, transparent\);/,
    "UDS fills should stay transparent across light and dark mode",
)
assert.match(
    globals,
    /\.uds-backdrop[\s\S]*backdrop-filter:\s*blur\(12px\) saturate\(1\.12\);[\s\S]*\.uds-backdrop-soft[\s\S]*backdrop-filter:\s*blur\(4px\);[\s\S]*\.dark \.uds-backdrop[\s\S]*backdrop-filter:\s*blur\(12px\) saturate\(1\.12\);/,
    "UDS backdrop should provide stronger blur only for opt-in transient surfaces",
)
assert.match(
    canvasBackground,
    /const DPR_CAP = 2[\s\S]*const DOT_R_BASE = 0\.85[\s\S]*const WAVE_WIDTH = 170[\s\S]*const ZOOM_R = 56/,
    "canvas background animation should stay smaller and sharper",
)
assert.match(
    canvasBackground,
    /const RIPPLE_MAX_R = 220/,
    "canvas background ripples should not expand into oversized blurry bands",
)
assert.match(
    rootLayout,
    /import \{ GeistMono \} from "geist\/font\/mono"[\s\S]*GeistMono\.variable/,
    "root layout should wire the mono font variable into the app shell",
)
assert.match(
    globals,
    /--font-sans:\s*"Akt"[\s\S]*--font-mono:\s*var\(--font-geist-mono\)/,
    "global font tokens should use Akt for sans text and Geist for mono text",
)
assert.match(
    design,
    /## 1\. Visual Theme & Atmosphere[\s\S]*## 9\. Accessibility & Quality Rules/,
    "DESIGN.md should define the complete visual system in the 9-section format",
)
assert.match(
    pageFramework,
    /openCommandPalette[\s\S]*UDS\.commandTriggerSurface[\s\S]*Ctrl K/,
    "page headers should expose a visible command/search affordance connected to the command palette",
)
assert.match(
    commandPalette,
    /COMMAND_PALETTE_OPEN_EVENT[\s\S]*window\.addEventListener\(COMMAND_PALETTE_OPEN_EVENT/,
    "command palette should be openable from shared shell controls, not only the keyboard shortcut",
)
assert.match(
    mainLayout,
    /pb-\[calc\(5\.5rem\+env\(safe-area-inset-bottom\)\)\][\s\S]*<MobileDock \/>/,
    "main layout should mount the mobile dock and reserve safe-area space for it",
)
assert.match(
    mobileDock,
    /PRIMARY_DOCK_IDS[\s\S]*UDS\.mobileDockSurface[\s\S]*setOpenMobile\(true\)/,
    "mobile dock should expose primary finance routes and connect More to the existing sidebar sheet",
)
assert.match(
    authShell,
    /className="auth-shell[\s\S]*className="relative z-10 flex w-full flex-col gap-4 animate-slide-in-right"/,
    "auth flows should keep layout chrome without wrapping the form in an outer card",
)
assert.doesNotMatch(
    authShell,
    /UDS\.authPanelSurface/,
    "auth flows should not render the removed outer glass panel surface",
)
assert.doesNotMatch(
    globals,
    /--uds-edge-filter-blur|--uds-edge-outline/,
    "the redrawn UDS edge should not use old UDS-specific detached edge effects",
)
assert.match(
    globals,
    /\.uds-bg-glass[\s\S]*\.uds-backdrop[\s\S]*\.uds-shadow-panel/,
    "UDS should split glass background, blur, and shadow into independently composable classes",
)
assert.match(
    globals,
    /\.uds-shadow-panel\s*\{[\s\S]*--uds-surface-shadow:[\s\S]*0 10px 28px rgb\(0 0 0 \/ 0\.14\)[\s\S]*inset 0 0\.5px 0 rgb\(255 255 255 \/ 0\.34\);[\s\S]*\.uds-shadow-card\s*\{[\s\S]*--uds-surface-shadow:\s*0 0 0 rgb\(0 0 0 \/ 0\);[\s\S]*\.uds-shadow-subtle\s*\{[\s\S]*--uds-surface-shadow:\s*0 0 0 rgb\(0 0 0 \/ 0\);/,
    "legacy split shadow classes should stay compatible while TypeScript UDS owns the new glass card depth",
)
assert.match(
    uds,
    /UDS_CARD_SURFACE_SHADOW\s*=[\s\S]*0_10px_32px_rgba\(8,8,8,0\.055\)[\s\S]*inset_0_0\.5px_0_rgba\(255,255,255,0\.34\)/,
    "UDS card surfaces should carry visible glass depth and an old-style inset highlight",
)
assert.doesNotMatch(
    udsShadowCardBlock,
    /\.uds-shadow-card\s*\{[\s\S]*inset 0 1px 0/,
    "UDS card shadows should avoid an extra inset border while panel chrome may keep the old highlight",
)
assert.match(
    globals,
    /:where\(\.sq-border-muted, \.sq-border-soft, \.sq-border-strong\):not\(\.fixed\):not\(\.absolute\):not\(\.sticky\)[\s\S]*position:\s*relative;/,
    "explicit redrawn squircle borders should establish a containing block without overriding positioned surfaces",
)
assert.doesNotMatch(
    squircleProvider,
    /readShadowBorderPaint/,
    "squircle provider should not infer borders from box-shadow or ring paint",
)
assert.doesNotMatch(
    squircleProvider,
    /hideNativeShadow/,
    "squircle provider should not hide native shadows as part of border rendering",
)
assert.doesNotMatch(
    squircleProvider,
    /linearGradient/,
    "squircle provider should not own the native browser border paint path",
)
assert.doesNotMatch(
    squircleProvider,
    /mouseover[\s\S]*mouseout[\s\S]*pointerover[\s\S]*pointerout[\s\S]*focusin[\s\S]*focusout/,
    "squircle provider should not re-read border paint on pointer or focus state changes",
)
assert.doesNotMatch(
    uds,
    /shadow-\[var\(--selection-cell-highlight\)\]/,
    "UDS state styling should avoid detached fake border shadows",
)
assert.match(
    uds,
    /selectedControl:[\s\S]*udsSurface\(\{[\s\S]*border:\s*"strong"[\s\S]*radius:\s*"full"/,
    "manual selected UDS controls should carry squircle radius metadata instead of a raw uds-surface border",
)
assert.match(
    uds,
    /selectedRing:[\s\S]*border-primary\/40[\s\S]*ring-1[\s\S]*activeRing:[\s\S]*ring-2 ring-blue-500\/50/,
    "selection outlines should restore old UDS ring styling instead of the newer masked border tokens",
)
assert.doesNotMatch(
    squircleProvider,
    /overlay\.style\.zIndex|border\.width\s*\*\s*2/,
    "squircle borders should not use a separate runtime overlay stroke",
)
assert.doesNotMatch(
    squircleProvider,
    /translate\(\$\{inset\} \$\{inset\}\) scale/,
    "squircle borders should not render an inset path that can drift from the element corner",
)
assert.match(
    squircleProvider,
    /superellipseRingPath[\s\S]*superellipseBoundaryPoints\(width, height, radius, exponent\)[\s\S]*superellipseBoundaryPoints\(width, height, radius, exponent, inset\)\.reverse\(\)[\s\S]*setProperty\("--sq-border-clip-path"/,
    "squircle borders should use a true inward superellipse offset path so corner gaps stay constant",
)
assert.match(
    globals,
    /\*\s*\{[\s\S]*--sq-base-r:\s*0px;[\s\S]*--sq-r:\s*var\(--sq-measured-r,\s*var\(--sq-base-r\)\);[\s\S]*--sq-q:\s*0\.6;[\s\S]*--sq-scale:\s*0;[\s\S]*--sq-growth-damping:\s*1000;/,
    "squircle runtime metadata should reset at every element without imposing a global radius floor or cap",
)
assert.match(
    globals,
    /data-squircle-expand-radius="false"[\s\S]*--sq-scale:\s*0\s*!important;[\s\S]*--sq-base-r:\s*var\(--sq-static-r\)\s*!important;/,
    "squircle radius growth opt-outs should keep each utility's fixed radius in CSS too",
)
assert.match(
    registerPage,
    /<div className="flex min-h-8 items-center justify-between gap-4">[\s\S]*<label htmlFor="enableRecoveryEmail"[\s\S]*Add recovery email[\s\S]*<Checkbox[\s\S]*className="[^"]*size-5[^"]*data-\[state=checked\]:!bg-foreground[^"]*data-\[state=checked\]:!text-background[^"]*"[\s\S]*"--sq-static-r": "4px"[\s\S]*transition-\[max-height,margin-top,opacity,transform\][\s\S]*<Input[\s\S]*id="recoveryEmail"/,
    "recovery email should be a compact right-checkbox form row with a fixed-height direct input reveal",
)
assert.doesNotMatch(
    registerPage,
    /<AccordionItem value="recovery"|<Accordion[\s\S]*Recovery Email toggle/,
    "recovery email should not add an accordion container around the input",
)
assert.doesNotMatch(
    registerPage,
    /AnimatePresence|motion\.div|height:\s*"auto"|grid-template-rows/,
    "recovery email reveal should avoid height-auto or grid-row motion that causes choppy animation",
)
assert.doesNotMatch(
    registerPage,
    /id="recoveryEmail"[\s\S]{0,500}data-squircle-expand-radius="false"/,
    "recovery email input should keep the same expandable auth radius as other auth inputs",
)
assert.match(
    sqNormalUtility,
    /--sq-base-r:\s*var\(--squircle-normal\);[\s\S]*--sq-scale:\s*0;/,
    "sq-normal should expose the fixed normal squircle radius for the runtime",
)
assert.match(
    sqNormalUtility,
    /clip-path:\s*shape\(from\s+var\(--squircle-normal\)\s+0/,
    "sq-normal should keep tokenized fixed-size fallback geometry for browsers without native corner-shape",
)
assert.ok(
    sqNormalUtility.indexOf("clip-path: polygon(") < sqNormalUtility.indexOf("clip-path: shape("),
    "sq-normal should place curved geometry after the polygon fallback",
)
assert.doesNotMatch(
    sqNormalUtility,
    /clip-path:\s*shape\(from\s+10%/,
    "sq-normal first-paint fallback should not scale its visible corner size from card width",
)
assert.match(
    sqBigUtility,
    /--sq-base-r:\s*var\(--squircle-big\);[\s\S]*--sq-scale:\s*0;/,
    "sq-big should expose the fixed big squircle radius for large surfaces",
)
assert.match(
    sqBigUtility,
    /clip-path:\s*shape\(from\s+var\(--squircle-big\)\s+0/,
    "sq-big should keep tokenized fixed-size fallback geometry for browsers without native corner-shape",
)
assert.match(
    globals,
    /:where\(\.squircle-surface\)\s*\{[\s\S]*clip-path:\s*polygon\(/,
    "default squircle surfaces should use an inline deterministic squircle path",
)
assert.match(
    squircleSurfaceBlock,
    /--sq-base-r:\s*var\(--squircle-normal\);[\s\S]*--sq-scale:\s*0;/,
    "default squircle surfaces should use the fixed normal squircle radius",
)
assert.match(
    globals,
    /\.squircle-surface\.sq-full\s*\{[\s\S]*--sq-base-r:\s*9999px;[\s\S]*--sq-q:\s*1;/,
    "explicit full-radius surfaces should override the default large squircle radius",
)
assert.match(
    squircleSurfaceBlock,
    /clip-path:\s*shape\(from\s+var\(--squircle-normal\)\s+0/,
    "default squircle surfaces should keep tokenized fixed-size fallback geometry for browsers without native corner-shape",
)
assert.ok(
    squircleSurfaceBlock.indexOf("clip-path: polygon(") < squircleSurfaceBlock.indexOf("clip-path: shape("),
    "default squircle surfaces should place curved geometry after the polygon fallback",
)
assert.doesNotMatch(
    squircleSurfaceBlock,
    /clip-path:\s*shape\(from\s+10%/,
    "default squircle surfaces should not scale their visible corner size from card width",
)
assert.match(
    globals,
    /:where\(\.squircle-surface\)::before,\s*:where\(\.squircle-surface\)::after\s*\{[\s\S]*clip-path:\s*inherit;/,
    "squircle surface generated layers should inherit the same corner shape",
)
assert.match(
    globals,
    /--spotlight-rgb:\s*147 197 253;/,
    "cursor highlight should use a baby-blue spotlight color",
)
assert.match(
    spotlightProvider,
    /event\.pointerType === "touch"/,
    "spotlight should only activate from finger touch pointer events",
)
assert.doesNotMatch(
    spotlightProvider,
    /const onPointerMove = \(event: PointerEvent\) => \{\s*const surface/s,
    "spotlight should not activate from unfiltered mouse pointer movement",
)
assert.match(
    globals,
    /\.spotlight-surface:not\(\[role="dialog"\]\):not\(\[role="alertdialog"\]\)/,
    "spotlight positioning should not override fixed dialog positioning",
)
assert.match(
    loadingScreen,
    /backgroundColor:\s*"var\(--background\)"/,
    "loading screen should follow the cached resolved theme variables",
)
assert.match(
    dialog,
    /top-\[50dvh\]/,
    "dialogs should center against the visible viewport height",
)
assert.doesNotMatch(
    primitives,
    /DASHBOARD_ROW_HOVER = "spotlight-surface|InsightStat[\s\S]*spotlight-surface/,
    "inner dashboard rows and stats should not carry their own spotlight",
)
assert.match(
    chartAreaInteractive,
    /<CardHeader[\s\S]*compact[\s\S]*\? "shrink-0 flex-row items-center pb-2\.5"/,
    "compact dashboard charts should render the second toolbar inside analytics",
)
assert.match(
    chartAreaInteractive,
    /compact && "h-8 min-h-8 gap-0\.5 p-0\.5"/,
    "compact chart toolbar controls should match the analytics toggle height",
)
assert.match(
    chartAreaInteractive,
    /compact \|\| timeToggleCollapsed/,
    "compact chart toolbar should use the collapsed time control inline",
)
assert.match(
    chartAreaInteractive,
    /compact \? "flex min-h-0 flex-1 flex-col px-0 pt-3"/,
    "compact dashboard chart content should sit below the restored toolbar",
)
assert.match(
    chartDisplay,
    /\{compact && \([\s\S]*onClick=\{handleExpand\}[\s\S]*aria-label=\{expandLabel\}/,
    "compact dashboard charts should keep an expand affordance",
)
assert.match(
    chartAreaInteractive,
    /<ContextMenuContent>[\s\S]*<ContextMenuItem onClick=\{handleExpandFirstChart\}>[\s\S]*!compact && \(/,
    "compact dashboard charts should still expose expand through the context menu without full edit settings",
)

console.log("dashboard-style tests passed")
