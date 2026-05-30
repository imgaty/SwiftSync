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

const primitives = readDashboardFile("dashboard-primitives.tsx")
const analyticsPanel = readDashboardFile("dashboard-analytics-panel.tsx")
const overview = readDashboardFile("dashboard-overview.tsx")
const moduleGrid = readDashboardFile("dashboard-module-grid.tsx")
const supportSidebar = readDashboardFile("dashboard-support-sidebar.tsx")
const priorityBrief = readDashboardFile("dashboard-priority-brief.tsx")
const dashboardPage = readProjectFile("app", "(main)", "page.tsx")
const sectionCards = readProjectFile("components", "section-cards.tsx")
const globals = readProjectFile("app", "globals.css")
const prism = readProjectFile("lib", "PRISM.ts")
const card = readProjectFile("components", "ui", "card.tsx")
const button = readProjectFile("components", "ui", "button.tsx")
const dialog = readProjectFile("components", "ui", "dialog.tsx")
const loadingScreen = readProjectFile("components", "loading-screen.tsx")
const spotlightProvider = readProjectFile("components", "surface-spotlight-provider.tsx")
const glassSurface = getConstBlock(primitives, "DASHBOARD_GLASS_SURFACE")
const inlineSurface = getConstBlock(primitives, "DASHBOARD_INLINE_SURFACE")
const cardSurface = getConstBlock(primitives, "DASHBOARD_CARD_SURFACE")
const iconBadge = getConstBlock(primitives, "DASHBOARD_CARD_ICON_BADGE")

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
    /PRISM\.cardSurface/,
    "dashboard surfaces should use the shared PRISM card surface",
)
assert.match(
    glassSurface,
    /spotlight-surface/,
    "dashboard card surfaces should carry the spotlight at the outer card boundary",
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
    /PRISM\.cardSurface/,
    "inline dashboard cards should match the shared PRISM card surface",
)
assert.match(
    cardSurface,
    /PRISM\.cardSurface/,
    "default dashboard cards should compose the shared PRISM card surface",
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
    /DASHBOARD_TITLE_CLASS = "truncate text-\[13px\] font-medium tracking-tight text-foreground-secondary sm:text-\[14px\]"/,
    "dashboard should expose one title style matching the analytics card title",
)
assert.match(
    primitives,
    /<h2 className=\{DASHBOARD_TITLE_CLASS\}/,
    "dashboard surface titles should use the shared dashboard title style",
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
    /PRISM\.separator/,
    "dashboard surface header divider should use the PRISM separator",
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
    /DashboardMetricCard/,
    "summary cards should use the shared dashboard metric card layout",
)
assert.match(
    sectionCards,
    /grid grid-cols-2 gap-4 @\[1320px\]\/overview:grid-cols-4/,
    "top summary cards should use a stable 2-up layout that only expands to 4-up on wide dashboard space",
)
assert.doesNotMatch(
    sectionCards,
    /auto-fit/,
    "top summary cards should not auto-fit into uneven card rows",
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
assert.doesNotMatch(
    analyticsPanel,
    /WIDE_ANALYTICS_QUERY|useMediaQuery|showCashFlowRail/,
    "analytics should not automatically inject the cash-flow rail on wide screens",
)
assert.match(
    analyticsPanel,
    /showCashFlow && "grid gap-4 2xl:grid-cols-\[minmax\(0,1fr\)_minmax\(300px,0\.42fr\)\]"/,
    "cash-flow should only split beside analytics after the user selects it",
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
    /PRISM\.separator/,
    "analytics panel should use PRISM horizontal separators",
)
assert.match(
    analyticsPanel,
    /PRISM\.separatorVertical/,
    "analytics panel should use PRISM vertical separators",
)
assert.doesNotMatch(
    analyticsPanel,
    /border-t|border-l|ANALYTICS_SOFT_TOP_EDGE|ANALYTICS_PANEL_SURFACE|ANALYTICS_STAT_CARD_SURFACE/,
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
    /@\[900px\]\/main:flex @\[900px\]\/main:h-full @\[900px\]\/main:min-h-0 @\[900px\]\/main:flex-col/,
    "dashboard support sidebar should use a full-height flex column on desktop",
)
assert.match(
    supportSidebar,
    /overflow-y-auto/,
    "dashboard sidebar content should scroll inside the sidebar instead of the page on desktop",
)
assert.match(
    supportSidebar,
    /dashboard-sidebar-scroll-wrap/,
    "dashboard sidebar scroll area should have a fade/blur overflow wrapper",
)
assert.match(
    supportSidebar,
    /data-scroll-top/,
    "dashboard sidebar should expose top fade state from measured scroll position",
)
assert.match(
    supportSidebar,
    /data-scroll-bottom/,
    "dashboard sidebar should expose bottom fade state from measured scroll position",
)
assert.match(
    globals,
    /\.dashboard-sidebar-scroll-wrap\[data-scroll-top="true"\]\s+\.dashboard-sidebar-scroll/,
    "dashboard top fade should only mask content while hidden content exists above",
)
assert.match(
    globals,
    /\.dashboard-sidebar-scroll-wrap\[data-scroll-bottom="true"\]\s+\.dashboard-sidebar-scroll/,
    "dashboard bottom fade should only mask content while hidden content exists below",
)
assert.match(
    globals,
    /\.dashboard-sidebar-scroll\s*\{[\s\S]*scrollbar-gutter:\s*stable/,
    "dashboard sidebar scrollbar should reserve stable gutter space",
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
    /showPriorityBrief/,
    "dashboard page should expose priority brief through a page-header drawer action",
)
assert.match(
    dashboardPage,
    /data-dashboard-priority-layout="drawer"/,
    "priority brief should not be coupled to the dashboard column layout",
)
assert.match(
    dashboardPage,
    /<Sheet open=\{showPriorityBrief\} onOpenChange=\{setShowPriorityBrief\}>/,
    "priority brief should render as a drawer rather than inside the dashboard grid",
)
assert.match(
    dashboardPage,
    /<SheetContent[\s\S]*id="dashboard-priority-sidebar"[\s\S]*side="right"/,
    "priority brief drawer should expose a stable controlled right-side region",
)
assert.match(
    dashboardPage,
    /data-\[state=open\]:!duration-300[\s\S]*data-\[state=closed\]:!duration-200/,
    "priority brief drawer should use short, optimized open and close durations",
)
assert.match(
    dashboardPage,
    /!fixed gap-0 overflow-hidden p-0 transform-gpu will-change-transform/,
    "priority brief drawer should override the shared relative surface and stay on the compositor path",
)
assert.doesNotMatch(
    dashboardPage,
    /isPriorityBriefPresent|priorityBriefTimerRef|requestAnimationFrame|PRIORITY_BRIEF_LAYOUT_MS|PRIORITY_BRIEF_PANEL_MS/,
    "priority brief drawer should not require manual layout/presence animation state",
)
assert.doesNotMatch(
    dashboardPage,
    /grid-template-columns,column-gap|grid-cols-\[minmax\(320px,1fr\)_320px\]|md:grid-cols-\[minmax\(320px,1fr\)_320px\]/,
    "priority brief drawer should not resize the dashboard grid",
)
assert.doesNotMatch(
    dashboardPage,
    /grid-cols-\[minmax\(320px,1fr\)_0px\]|md:grid-cols-\[minmax\(320px,1fr\)_0px\]/,
    "priority brief drawer should not keep a zero-width sidebar track in the page layout",
)
assert.match(
    dashboardPage,
    /data-dashboard-priority-sidebar/,
    "priority brief side panel should expose a stable sidebar marker",
)
assert.match(
    dashboardPage,
    /aria-controls="dashboard-priority-sidebar"/,
    "priority brief trigger should control the side panel region",
)
assert.match(
    dashboardPage,
    /aria-expanded=\{showPriorityBrief\}/,
    "priority brief trigger should report the drawer open state",
)
assert.match(
    dashboardPage,
    /SheetTitle[\s\S]*dashboard\.dashboardLabels\.priorityBrief[\s\S]*SheetDescription/,
    "priority brief drawer should provide accessible title and description content",
)
assert.match(
    dashboardPage,
    /DashboardPriorityBrief/,
    "dashboard page should render the priority brief inside the side panel",
)
assert.match(
    dashboardPage,
    /DASHBOARD_GLASS_SURFACE/,
    "priority brief side panel should use the shared dashboard glass surface",
)
assert.doesNotMatch(
    dashboardPage,
    /translate-x-\[100vw\]/,
    "priority brief side panel should not animate from a viewport-wide offset",
)
assert.match(
    priorityBrief,
    /PriorityBriefSummary/,
    "priority brief should lead with one drawer-specific summary signal",
)
assert.match(
    priorityBrief,
    /role="list"[\s\S]*PriorityBriefRow/,
    "priority brief should use a compact ranked list inside the drawer",
)
assert.match(
    priorityBrief,
    /min-h-\[70px\]/,
    "priority brief rows should use stable compact row heights",
)
assert.doesNotMatch(
    priorityBrief,
    /DashboardMetricCard/,
    "priority brief drawer should not reuse full dashboard metric cards",
)
assert.doesNotMatch(
    priorityBrief,
    /PRISM\.cardHover|group-hover|hover:bg|hover:border|hover:text/,
    "priority brief rows should not change color on hover",
)
assert.doesNotMatch(
    dashboardPage,
    /data-no-topline-style/,
    "dashboard page actions should use the shared invisible topline button styling",
)
assert.match(
    dashboardPage,
    /min-h-fit gap-4 overflow-visible[\s\S]*md:h-full md:min-h-0/,
    "dashboard page should allow mobile page scroll while keeping a full-height desktop shell",
)
assert.match(
    dashboardPage,
    /min-h-fit gap-4 overflow-visible p-3 md:h-full md:min-h-0 md:overflow-hidden md:p-4/,
    "dashboard page should keep the desktop viewport height stable without drawer-specific layout state",
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
    prism,
    /container:[\s\S]*spotlight-surface/,
    "PRISM containers should carry the spotlight treatment",
)
assert.match(
    card,
    /spotlight-surface relative/,
    "the reusable Card component should carry the spotlight treatment",
)
assert.match(
    button,
    /glass:[\s\S]*PRISM\.cardSurface[\s\S]*PRISM\.cardHover/,
    "glass buttons should compose the shared PRISM glass surface and hover treatment",
)
assert.match(
    globals,
    /--background:\s*#ffffff;/,
    "light mode should use a white page background",
)
assert.match(
    globals,
    /--surface:\s*#f3f3f3;/,
    "light mode cards should use a faded neutral gray surface",
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

console.log("dashboard-style tests passed")
