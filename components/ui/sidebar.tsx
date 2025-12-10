"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { PanelLeftIcon } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { useOS } from "@/hooks/use-os"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"


const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 28        // 60 seconds * 60 minutes * 24 hours * 28 days = 4 weeks

const SIDEBAR_WIDTH_DEFAULT = 240                       // Values in pixels
const SIDEBAR_WIDTH_MIN = 200
const SIDEBAR_WIDTH_MAX = 400
const SIDEBAR_WIDTH_MOBILE = 288
const SIDEBAR_WIDTH_ICON = 48
const SIDEBAR_KEYBOARD_SHORTCUT = "b"                   // Toggle sidebar shortcut (Ctrl + B or ⌘ + B)
const SIDEBAR_COLLAPSE_THRESHOLD = 120                  // Width at which sidebar auto-collapses



// ==============================================================================
// 1. STATE & CONTEXT
// ==============================================================================

// What component using useSidebar() has access to
type SidebarContextProps = {
    state: "expanded" | "collapsed"
    open: boolean
    setOpen: (open: boolean) => void                // Function to change open state

    openMobile: boolean
    setOpenMobile: (open: boolean) => void          // Function to change mobile state

    isMobile: boolean
    toggleSidebar: () => void                       // Toggle open/closed (works on both mobile/desktop)
    
    // Modular sidebar features
    side: "left" | "right"
    setSide: (side: "left" | "right") => void       // Function to change position
    
    width: number                                   // Current sidebar width (px)
    setWidth: (width: number) => void               // Function to change width (px)
    
    isResizing: boolean                             // Whether user is currently dragging to resize
    setIsResizing: (resizing: boolean) => void      // Function to set resizing state
}

// Create a React Context to share sidebar state across all child components. Initialized as null - will be populated by SidebarProvider
const SidebarContext = React.createContext<SidebarContextProps | null>(null)

// Custom hook to access sidebar context from any child component
function useSidebar() {
    const context = React.useContext(SidebarContext)

    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider.")
    }

    return context
}



// ==============================================================================
// 2. PROVIDER
// ==============================================================================

// SidebarProvider - The wrapper component that manages all sidebar state
// forwardRef allows parent components to get a ref to the underlying div
const SidebarProvider = React.forwardRef<
    HTMLDivElement,                                     // The ref will point to an HTMLDivElement
    React.ComponentProps<"div"> & {                     // Accept all div props plus custom ones:
        defaultOpen?: boolean
        open?: boolean                                  // Controlled open state
        onOpenChange?: (open: boolean) => void          // Callback when open changes

        defaultSide?: "left" | "right"
        defaultWidth?: number
        showRail?: boolean                              // Whether to show the resize rail
    }
>(
    // Render function parameters
    (
        {
            defaultOpen = true,
            open: openProp,
            onOpenChange: setOpenProp,                  // Controlled callback (optional)

            defaultSide = "left",
            defaultWidth = SIDEBAR_WIDTH_DEFAULT,
            showRail = false,
            
            className,
            style,
            children,
            ...props
        },

        ref

    ) => {
        const isMobile = useIsMobile()
        const [openMobile, setOpenMobile] = React.useState(false)
        const [_open, _setOpen] = React.useState(defaultOpen)
        const open = openProp ?? _open
        const openRef = React.useRef(open)              // Ref to track current open value (needed for callback in setOpen)
        
        // Modular sidebar state (defaults come from server-side cookie reading in layout.tsx)
        const [side, setSide] = React.useState<"left" | "right">(defaultSide)
        const [width, setWidth] = React.useState(defaultWidth)
        const [isResizing, setIsResizing] = React.useState(false)
        const widthSaveTimeout = React.useRef<NodeJS.Timeout | null>(null)
        
        const setCookie = (name: string, value: string | number) => {
            document.cookie = `${name}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
        }

        React.useEffect(() => { openRef.current = open }, [open]) // Keep the ref in sync with the open value
        
        // Persist side preference to cookie
        const handleSetSide = React.useCallback((newSide: "left" | "right") => {
            setSide(newSide)
            setCookie("sidebar_side", newSide)
        }, [])
        
        // Persist width to cookie
        const handleSetWidth = React.useCallback((newWidth: number) => {
            const clampedWidth = Math.max(SIDEBAR_WIDTH_MIN, Math.min(SIDEBAR_WIDTH_MAX, newWidth))
            setWidth(clampedWidth)

            if (widthSaveTimeout.current) clearTimeout(widthSaveTimeout.current)
            widthSaveTimeout.current = setTimeout(() => setCookie("sidebar_width", clampedWidth), 100)
        }, [])

        // Set open state with cookie persistence
        const setOpen = React.useCallback(
            (value: boolean | ((value: boolean) => boolean)) => {
                const openState = typeof value === "function" ? value(openRef.current) : value
                setOpenProp ? setOpenProp(openState) : _setOpen(openState)
                
                // Persist state to cookie to survive page refresh
                setCookie(SIDEBAR_COOKIE_NAME, String(openState))
            },
            [setOpenProp]
        )

        const toggleSidebar = React.useCallback(() => {
            return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open)
        }, [isMobile, setOpen, setOpenMobile])

        // Check if the shortcut keys are pressed (Ctrl + B or ⌘ + B)
        React.useEffect(() => {
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault()              // Prevent default browser shortcut
                    toggleSidebar()                     // Toggle the sidebar
                }
            }

            window.addEventListener("keydown", handleKeyDown)
            return () => window.removeEventListener("keydown", handleKeyDown) // Cleanup on unmount
        }, [toggleSidebar])

        const state = open ? "expanded" : "collapsed"   // Boolean (used in data attributes for CSS)

        // Create a cached object containing all the sidebar state
        const contextValue = React.useMemo<SidebarContextProps>(
            () => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar,
                     side, setSide: handleSetSide, width, setWidth: handleSetWidth, isResizing, setIsResizing }),
            [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar, 
             side, handleSetSide, width, handleSetWidth, isResizing]
        )
        
        const railPosition = open ? width : SIDEBAR_WIDTH_ICON

        return (
            <SidebarContext.Provider value = {contextValue}> {/* Provides context to all children */}
                <TooltipProvider delayDuration = {0}> {/* TooltipProvider for collapsed sidebar buttons */}
                    <div
                        ref = {ref}
                        data-side = {side}
                        className = {cn( "group/sidebar-wrapper | relative flex | w-full min-h-screen | has-data-[variant=inset]:bg-sidebar", className )}
                        style = {{ "--sidebar-width": `${width}px`, "--sidebar-width-icon": `${SIDEBAR_WIDTH_ICON}px`, ...style } as React.CSSProperties}
                        {...props}
                    >
                        {children}

                        {showRail && !isMobile && (
                            <SidebarRailInternal railPosition = {railPosition} />
                        )}
                    </div>
                </TooltipProvider>
            </SidebarContext.Provider>
        )
    }
)

// React DevTools display name
SidebarProvider.displayName = "SidebarProvider"



// ==============================================================================
// 3. MAIN COMPONENTS
// ==============================================================================

const Sidebar = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<"div"> & {
        variant?: "sidebar" | "floating" | "inset"          // Visual style
        collapsible?: "offcanvas" | "icon" | "none"         // How it collapses
    }
>(
    (
        {
            variant = "sidebar",                            // Default: standard sidebar
            collapsible = "icon",                           // Default: collapses to icon mode
            className,
            children,
            ...props
        },

        ref

    ) => {
        const { isMobile, state, openMobile, setOpenMobile, side, isResizing } = useSidebar()

        // DISPLAY MODE 1: Non-collapsible sidebar (always visible, fixed width)
        if (collapsible === "none") {
            return (
                <div ref = {ref} className = {cn( "flex flex-col | w-(--sidebar-width) h-full | bg-sidebar | text-sidebar-foreground", className )} {...props}>
                    {children}
                </div>
            )
        }

        // DISPLAY MODE 2: Mobile sidebar (renders as a drawer)
        if (isMobile) {
            return (
                <Sheet open = {openMobile} onOpenChange = {setOpenMobile} {...props}>
                    <SheetContent
                        data-sidebar = "sidebar" data-mobile = "true"
                        className = "p-0 | w-(--sidebar-width) | bg-sidebar | text-sidebar-foreground | [&>button]:hidden"
                        style = {{ "--sidebar-width": `${SIDEBAR_WIDTH_MOBILE}px` } as React.CSSProperties}
                        side = {side}
                    >
                        {/* Accessibility description for screen readers */}
                        <SheetHeader className = "sr-only">
                            <SheetTitle>Sidebar</SheetTitle>
                            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
                        </SheetHeader>

                        <div className = "flex flex-col | w-full h-full">{children}</div>
                    </SheetContent>
                </Sheet>
            )
        }

        // DISPLAY MODE 3: Desktop sidebar
        return (
            <div
                ref = {ref}
                data-state = {state}
                data-collapsible = {state === "collapsed" ? collapsible : ""}
                data-variant = {variant}
                data-side = {side}
                className = {cn(
                    "sticky hidden md:flex flex-col self-start top-0 | group peer",
                    "shrink-0 | w-(--sidebar-width) h-svh | bg-sidebar | text-sidebar-foreground",

                    side === "left" ? "order-first" : "order-last",

                    !isResizing && "transition-[width] duration-200 ease-linear", // Animate unless resizing
                    state === "collapsed" && collapsible === "offcanvas" && "w-0 overflow-hidden",
                    state === "collapsed" && collapsible === "icon" && "w-(--sidebar-width-icon)",
                    
                    variant === "floating" && "m-2 | border rounded-lg shadow-sm",
                    variant === "inset" && "rounded-lg",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        )
    }
)

// React DevTools display name
Sidebar.displayName = "Sidebar"



const SidebarTrigger = React.forwardRef<
    React.ElementRef<typeof Button>,
    React.ComponentProps<typeof Button>

>(({ className, onClick, ...props }, ref) => {
    const { toggleSidebar } = useSidebar()
    
    return (
        <Button
            ref = {ref}
            data-sidebar = "trigger"
            variant = "ghost"                           // Transparent background
            size = "icon"
            className = {cn("size-7", className)}       // Padding around the sidebar button (28px)
            onClick = {(event) => {
                onClick?.(event)                        // Call any passed onClick handler first
                toggleSidebar()                         // Then toggle the sidebar
            }}
            {...props}
        >
            <PanelLeftIcon />

            <span className = "sr-only">Toggle Sidebar</span>
        </Button>
    )
})

// React DevTools display name
SidebarTrigger.displayName = "SidebarTrigger"



// SidebarRailInternal - Internal component rendered at provider level
// Positioned absolutely within the provider wrapper for proper z-index stacking
function SidebarRailInternal({ railPosition }: { railPosition: number }) {
    const { side, width, setWidth, open, setOpen, isResizing, setIsResizing } = useSidebar()
    const { modKey } = useOS()
    
    const [tooltip, setTooltip] = React.useState({ show: false, x: 0, y: 0 })
    const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 })
    const tooltipRef = React.useRef<HTMLDivElement>(null)
    const tooltipTimeout = React.useRef<NodeJS.Timeout | null>(null)
    
    const dragState = React.useRef({ startX: 0, startWidth: 0, isDragging: false, wasCollapsed: false })
    const refs = React.useRef({ side, open, width })
    React.useEffect(() => { refs.current = { side, open, width } }, [side, open, width])

    // Cleanup tooltip timeout on unmount
    React.useEffect(() => () => { if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current) }, [])
    
    // Calculate optimal tooltip position when it becomes visible
    React.useEffect(() => {
        if (!tooltip.show || !tooltipRef.current) return
        
        const rect = tooltipRef.current.getBoundingClientRect()
        const padding = 8           // Distance from cursor
        const margin = 16           // Minimum distance from viewport edge
        
        let x = tooltip.x + padding
        let y = tooltip.y + padding
        

        if (x + rect.width > window.innerWidth - margin) { // Check right edge - shift to left of cursor if needed
            x = tooltip.x - rect.width - padding
        }
        

        if (y + rect.height > window.innerHeight - margin) { // Check bottom edge - shift above cursor if needed
            y = tooltip.y - rect.height - padding
        }
        
        if (x < margin) x = margin // Ensure not off left edge
        
        if (y < margin) y = margin // Ensure not off top edge
        
        setTooltipPos({ x, y })
    }, [tooltip.show, tooltip.x, tooltip.y])


    const handleMouseEnter = React.useCallback((e: React.MouseEvent) => {
        if (isResizing) return
        tooltipTimeout.current = setTimeout(() => setTooltip({ show: true, x: e.clientX, y: e.clientY }), 500)
    }, [isResizing])


    const handleMouseLeave = React.useCallback(() => {
        if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
        setTooltip(t => t.show ? { ...t, show: false } : t)
    }, [])
    

    const handleMouseMove = React.useCallback((e: MouseEvent) => {
        dragState.current.isDragging = true
        const delta = refs.current.side === "left" 
            ? e.clientX - dragState.current.startX 
            : dragState.current.startX - e.clientX
        const newWidth = dragState.current.startWidth + delta
        
        if (newWidth < SIDEBAR_COLLAPSE_THRESHOLD) { setOpen(false); return }

        setOpen(true)
        setWidth(Math.max(SIDEBAR_WIDTH_MIN, Math.min(SIDEBAR_WIDTH_MAX, newWidth)))
    }, [setWidth, setOpen])
    

    const handleMouseUp = React.useCallback(() => {
        setIsResizing(false)
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.body.style.userSelect = ""
        document.body.style.cursor = ""
        
        if (!dragState.current.isDragging) {
            if (dragState.current.wasCollapsed) { setWidth(SIDEBAR_WIDTH_MIN); setOpen(true) }
            else { setOpen(false) }
        }

        dragState.current.isDragging = false
    }, [handleMouseMove, setOpen, setWidth, setIsResizing])
    

    const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        dragState.current = {
            startX: e.clientX,
            startWidth: refs.current.open ? refs.current.width : SIDEBAR_WIDTH_ICON,
            isDragging: false,
            wasCollapsed: !refs.current.open,
        }
        
        setIsResizing(true)
        setTooltip(t => t.show ? { ...t, show: false } : t)
        document.addEventListener("mousemove", handleMouseMove)
        document.addEventListener("mouseup", handleMouseUp)
        document.body.style.userSelect = "none"
        document.body.style.cursor = "grabbing"
    }, [handleMouseMove, handleMouseUp, setIsResizing])


    // Position styles based on sidebar side
    // Rail is centered on main content's border: sidebar_width + margin(8px) - half_rail_width(8px)
    const positionStyle = side === "left" 
        ? { left: `${railPosition}px` }   // Centers on main's left border
        : { right: `${railPosition}px` }  // Centers on main's right border


    return (
        <>
            <button
                data-sidebar="rail"
                aria-label="Toggle Sidebar"
                tabIndex={-1}
                onMouseDown={handleMouseDown}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={cn(
                    "absolute top-0 bottom-0 z-50 hidden w-4 sm:flex cursor-grab",
                    isResizing && "pointer-events-none",
                    !isResizing && "transition-[left,right] duration-200 ease-linear",
                    "after:absolute after:top-7 after:bottom-7 after:left-px after:w-0.5 after:-translate-x-1/2 after:rounded-full",
                    "after:bg-transparent hover:after:bg-[rgba(0,0,0,0.125)]",
                    isResizing && "after:bg-[rgba(0,0,0,0.25)]"
                )}
                style={positionStyle}
            />
            {tooltip.show && !isResizing && (
                <div
                    ref={tooltipRef}
                    className="fixed z-1000 bg-foreground text-white px-3 py-1.5 text-xs rounded-md pointer-events-none whitespace-nowrap"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    Drag to resize • Click to toggle ({modKey} + B)
                </div>
            )}
        </>
    )
}



// ==============================================================================
// 4. COMPONENT FACTORY
// ==============================================================================

// Factory function to generate simple styled sidebar components
// Reduces boilerplate by creating consistent components with shared patterns
function componentFactory<T extends React.ElementType>(
    Tag: T,                // The element type to render (e.g., "div", "ul", Input)
    defaultClasses: string, // Default Tailwind classes to apply
    dataSidebar: string    // Value for data-sidebar attribute
) {
    // Create a forwardRef component
    const Component = React.forwardRef<any, any>(
        ({ className, asChild = false, ...props }, ref) => {
            // If asChild is true, render the child element instead of Tag
            // Slot forwards all props to the child element
            const Comp = asChild ? Slot : Tag
            
            return (
                <Comp
                    ref={ref}
                    data-sidebar={dataSidebar}  // For CSS targeting
                    className={cn(defaultClasses, className)}  // Merge classes
                    {...props}
                />
            )
        }
    )
    
    // Generate display name like "SidebarHeader", "SidebarContent", etc.
    Component.displayName = `Sidebar${dataSidebar.charAt(0).toUpperCase() + dataSidebar.slice(1)}`
    
    // Return with proper typing
    return Component as React.ForwardRefExoticComponent<
        React.ComponentPropsWithoutRef<T> & React.RefAttributes<any> & { asChild?: boolean }
    >
}

// ==============================================================================
// 5. GENERATED COMPONENTS
// ==============================================================================

// Main content area next to sidebar - adjusts margin when sidebar is inset
// Uses order-1 as middle value so sidebar can be order-first (0) or order-last (2)
// Full margin on all sides ensures shadow renders without clipping
const SidebarInset = componentFactory("main", "bg-background relative flex w-full flex-1 flex-col order-1 h-svh overflow-y-auto md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:h-[calc(100svh-16px)] md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow md:peer-data-[variant=inset]:border md:peer-data-[side=right]:peer-data-[variant=inset]:ml-2 md:peer-data-[side=right]:peer-data-[variant=inset]:mr-0", "inset")

// Search/filter input styled for sidebar
const SidebarInput = componentFactory(Input, "bg-background h-8 w-full shadow-none", "input")

// Top section of sidebar (usually logo, title)
const SidebarHeader = componentFactory("div", "flex flex-col gap-2 p-2", "header")

// Bottom section of sidebar (usually user menu)
const SidebarFooter = componentFactory("div", "flex flex-col gap-2 p-2", "footer")

// Horizontal divider line
const SidebarSeparator = componentFactory(Separator, "bg-sidebar-border mx-2 w-auto", "separator")

// Scrollable content area between header and footer
const SidebarContent = componentFactory("div", "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden", "content")

// Group container for related menu items
const SidebarGroup = componentFactory("div", "relative flex w-full min-w-0 flex-col p-2", "group")

// Content wrapper inside a group
const SidebarGroupContent = componentFactory("div", "w-full text-sm", "group-content")

// Unordered list for menu items
const SidebarMenu = componentFactory("ul", "flex w-full min-w-0 flex-col gap-1", "menu")

// List item wrapper for menu buttons
const SidebarMenuItem = componentFactory("li", "group/menu-item relative", "menu-item")

// Badge displayed next to menu item (e.g., notification count)
const SidebarMenuBadge = componentFactory("div", "text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground peer-data-[size=sm]/menu-button:top-1 peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 group-data-[collapsible=icon]:hidden", "menu-badge")

// Nested submenu list (indented with left border)
const SidebarMenuSub = componentFactory("ul", "border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5 group-data-[collapsible=icon]:hidden", "menu-sub")

// List item wrapper for submenu buttons
const SidebarMenuSubItem = componentFactory("li", "group/menu-sub-item relative", "menu-sub-item")

// ==============================================================================
// 6. COMPLEX COMPONENTS
// ==============================================================================

// Label/title for a group of menu items - fades out when collapsed
const SidebarGroupLabel = componentFactory("div", "text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0", "group-label")

// Action button in group header (e.g., "Add new")
const SidebarGroupAction = componentFactory("button", "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 after:absolute after:-inset-2 md:after:hidden group-data-[collapsible=icon]:hidden", "group-action")

// Class Variance Authority config for menu button variants
// Creates consistent button styles with size and variant options
const sidebarMenuButtonVariants = cva(
    // Base classes for all menu buttons
    "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
    {
        // Variant options
        variants: {
            // Visual style variants
            variant: {
                default: "",  // Uses base hover styles
                outline: "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
            },
            // Size variants
            size: {
                default: "h-8 text-sm",    // Normal height
                sm: "h-7 text-xs",         // Small height
                lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",  // Large height
            },
        },
        // Default variant values
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

// SidebarMenuButton - Main clickable menu item
// Supports tooltips when sidebar is collapsed to icon mode
const SidebarMenuButton = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<"button"> & {
        asChild?: boolean      // Render child element instead of button
        isActive?: boolean     // Highlight as active/selected
        tooltip?: string | React.ComponentProps<typeof TooltipContent>  // Tooltip content
    } & VariantProps<typeof sidebarMenuButtonVariants>  // Accept variant props
>(
    (
        {
            asChild = false,        // Default: render as button
            isActive = false,       // Default: not active
            variant = "default",    // Default variant
            size = "default",       // Default size
            tooltip,                // Optional tooltip
            className,
            ...props
        },
        ref
    ) => {
        // Use Slot if asChild, otherwise button
        const Comp = asChild ? Slot : "button"
        
        // Get sidebar state for tooltip logic
        const { isMobile, state } = useSidebar()

        // Create the button element
        const button = (
            <Comp
                ref={ref}
                data-sidebar="menu-button"  // For CSS targeting
                data-size={size}            // For CSS targeting
                data-active={isActive}      // For CSS targeting active state
                className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
                {...props}
            />
        )

        // If no tooltip, just return the button
        if (!tooltip) {
            return button
        }

        // Convert string tooltip to object format
        if (typeof tooltip === "string") {
            tooltip = {
                children: tooltip,
            }
        }

        // Only show tooltip when collapsed (icon mode) and not on mobile
        if (state !== "collapsed" || isMobile) {
            return button
        }

        // Wrap button in Tooltip when collapsed
        return (
            <Tooltip>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent
                    side="right"    // Show to the right of icon
                    align="center"  // Vertically centered
                    {...tooltip}    // Spread tooltip props
                />
            </Tooltip>
        )
    }
)
// Set display name for React DevTools
SidebarMenuButton.displayName = "SidebarMenuButton"

// SidebarMenuAction - Secondary action button within a menu item
// Usually for quick actions like delete, edit, etc.
const SidebarMenuAction = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<"button"> & {
        asChild?: boolean       // Render child element instead of button
        showOnHover?: boolean   // Only show when hovering menu item
    }
>(
    (
        {
            className,
            asChild = false,
            showOnHover = false,
            ...props
        },
        ref
    ) => {
        // Use Slot if asChild, otherwise button
        const Comp = asChild ? Slot : "button"

        return (
            <Comp
                ref={ref}
                data-sidebar="menu-action"  // For CSS targeting
                className={cn(
                    // Base styles: positioned absolutely in menu item
                    "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
                    // Larger touch target on mobile
                    "after:absolute after:-inset-2 md:after:hidden",
                    // Position based on menu button size
                    "peer-data-[size=sm]/menu-button:top-1",
                    "peer-data-[size=default]/menu-button:top-1.5",
                    "peer-data-[size=lg]/menu-button:top-2.5",
                    // Hide when sidebar is collapsed to icons
                    "group-data-[collapsible=icon]:hidden",
                    // If showOnHover, hide by default and show on hover/focus
                    showOnHover &&
                    "peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0",
                    className
                )}
                {...props}
            />
        )
    }
)
// Set display name for React DevTools
SidebarMenuAction.displayName = "SidebarMenuAction"

// SidebarMenuSkeleton - Loading placeholder for menu items
const SidebarMenuSkeleton = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<"div"> & {
        showIcon?: boolean  // Whether to show icon skeleton
    }
>(({ className, showIcon = false, ...props }, ref) => (
    <div
        ref={ref}
        data-sidebar="menu-skeleton"  // For CSS targeting
        className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
        {...props}
    >
        {/* Optional icon skeleton (square) */}
        {showIcon && <Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />}
        {/* Text skeleton (rectangle) */}
        <Skeleton
            className="h-4 max-w-(--skeleton-width) flex-1"
            data-sidebar="menu-skeleton-text"
            style={{ "--skeleton-width": "70%" } as React.CSSProperties}  // Custom property for max-width
        />
    </div>
))
// Set display name for React DevTools
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

// SidebarMenuSubButton - Button for nested/sub menu items
// Styled as a link by default (renders as <a>)
const SidebarMenuSubButton = React.forwardRef<
    HTMLAnchorElement,
    React.ComponentProps<"a"> & {
        asChild?: boolean       // Render child element instead of anchor
        size?: "sm" | "md"      // Size variant
        isActive?: boolean      // Highlight as active/selected
    }
>(
    (
        {
            asChild = false,
            size = "md",        // Default: medium size
            isActive = false,
            className,
            ...props
        },
        ref
    ) => {
        // Use Slot if asChild, otherwise anchor
        const Comp = asChild ? Slot : "a"

        return (
            <Comp
                ref={ref}
                data-sidebar="menu-sub-button"  // For CSS targeting
                data-size={size}                 // For CSS targeting
                data-active={isActive}           // For CSS targeting
                className={cn(
                    // Base styles: interactive states, icon sizing
                    "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
                    // Active state styling
                    "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
                    // Size-specific text size
                    size === "sm" && "text-xs",
                    size === "md" && "text-sm",
                    // Hide when collapsed to icons
                    "group-data-[collapsible=icon]:hidden",
                    className
                )}
                {...props}
            />
        )
    }
)
// Set display name for React DevTools
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

// ==============================================================================
// 7. EXPORTS
// ==============================================================================

// Export all components and the useSidebar hook for use in other files
export {
    Sidebar,              // Main sidebar container
    SidebarContent,       // Scrollable content area
    SidebarFooter,        // Bottom section
    SidebarGroup,         // Group container
    SidebarGroupAction,   // Action button in group header
    SidebarGroupContent,  // Content wrapper in group
    SidebarGroupLabel,    // Label/title for group
    SidebarHeader,        // Top section
    SidebarInput,         // Search input
    SidebarInset,         // Main content area next to sidebar
    SidebarMenu,          // Menu list
    SidebarMenuAction,    // Secondary action in menu item
    SidebarMenuBadge,     // Badge next to menu item
    SidebarMenuButton,    // Main menu button
    SidebarMenuItem,      // Menu item wrapper
    SidebarMenuSkeleton,  // Loading placeholder
    SidebarMenuSub,       // Submenu list
    SidebarMenuSubButton, // Submenu button
    SidebarMenuSubItem,   // Submenu item wrapper
    SidebarProvider,      // Context provider (wrap your app)
    SidebarSeparator,     // Divider line
    SidebarTrigger,       // Toggle button
    useSidebar,           // Hook to access sidebar state

}