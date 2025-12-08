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
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 60 seconds * 60 minutes * 24 hours * 7 days = 1 week
const SIDEBAR_WIDTH = "15rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b" // Toggle sidebar shortcut (Ctrl + B or ⌘ + B)



// ==============================================================================
// 1. STATE & CONTEXT
// ==============================================================================

// TypeScript type defining the shape of the sidebar context
// This is what every component using useSidebar() will have access to
type SidebarContextProps = {
    state: "expanded" | "collapsed"
    open: boolean
    setOpen: (open: boolean) => void            // Function to change open state

    openMobile: boolean                         // Whether mobile sheet is open
    setOpenMobile: (open: boolean) => void      // Function to change mobile state

    isMobile: boolean
    toggleSidebar: () => void                   // Toggle open/closed (works on both mobile/desktop)
}

// Create a React Context to share sidebar state across all child components. Initialized as null - will be populated by SidebarProvider
const SidebarContext = React.createContext<SidebarContextProps | null>(null)

// Custom hook to access sidebar context from any child component
function useSidebar() {
    const context = React.useContext(SidebarContext)

    // Throws an error if used outside of SidebarProvider (safety check)
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
    HTMLDivElement,                             // The ref will point to an HTMLDivElement
    React.ComponentProps<"div"> & {             // Accept all div props plus custom ones:
        defaultOpen?: boolean                   // Initial open state (uncontrolled mode)
        open?: boolean                          // Controlled open state
        onOpenChange?: (open: boolean) => void  // Callback when open changes
    }
>(
    // Render function parameters
    (
        {
            defaultOpen = true,                 // Default: sidebar starts open
            open: openProp,
            onOpenChange: setOpenProp,          // Controlled callback (optional)
            className,
            style, 
            children,                           // Child components
            ...props
        },

        ref

    ) => {
        const isMobile = useIsMobile()
        const [openMobile, setOpenMobile] = React.useState(false)

        const [_open, _setOpen] = React.useState(defaultOpen)
        const open = openProp ?? _open

        // Ref to track current open value (needed for callback in setOpen)
        const openRef = React.useRef(open)
        

        // Keep the ref in sync with the open value
        React.useEffect(() => {
            openRef.current = open
        }, [open])


        // Memoized function to update open state
        const setOpen = React.useCallback(
            (value: boolean | ((value: boolean) => boolean)) => {
                // If value is a function, call it with current state (like setState callback)
                const openState = typeof value === "function" ? value(openRef.current) : value
                
                if (setOpenProp) {
                    setOpenProp(openState)

                } else {
                    _setOpen(openState)
                }
                
                // Persist state to cookie so it survives page refreshes
                document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
            },

            [setOpenProp]  // Only recreate if setOpenProp changes
        )


        // Memoized toggle function - toggles mobile or desktop based on viewport
        const toggleSidebar = React.useCallback(() => {
            // On mobile: toggle the sheet drawer
            // On desktop: toggle the sidebar open/collapsed state
            return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open)
        }, [isMobile, setOpen, setOpenMobile])


        // Effect to register keyboard shortcut (Ctrl + B or ⌘ + B)
        React.useEffect(() => {
            const handleKeyDown = (event: KeyboardEvent) => {
                // Check if the shortcut key is pressed
                if (
                    event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
                    (event.ctrlKey || event.metaKey) // Checks for Ctrl or ⌘
                ) {
                    event.preventDefault()  	// Prevent browser default (e.g., bookmarks)
                    toggleSidebar()         	// Toggle the sidebar
                }
            }
            
            // Add listener when component mounts
            window.addEventListener("keydown", handleKeyDown)
            
            // Remove listener when component unmounts (cleanup)
            return () => window.removeEventListener("keydown", handleKeyDown)
        }, [toggleSidebar])


        // Derive state string from boolean (used in data attributes for CSS)
        const state = open ? "expanded" : "collapsed"
        
        // Memoize the context value to prevent unnecessary re-renders
        const contextValue = React.useMemo<SidebarContextProps>(
            () => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }),
            [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
        )

        // Render the provider and wrapper div
        return (
            // Provide context to all children
            <SidebarContext.Provider value={contextValue}>
                {/* TooltipProvider enables tooltips on collapsed sidebar buttons */}
                <TooltipProvider delayDuration={0}>
                    <div
                        // Set CSS custom properties for sidebar widths
                        style={
                            {
                                "--sidebar-width": SIDEBAR_WIDTH,          // Normal width
                                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON, // Collapsed width
                                ...style,  // Merge with any custom styles
                            } as React.CSSProperties
                        }
                        // Apply wrapper classes
                        className={cn(
                            // group for child targeting, min viewport height, full width
                            "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
                            className
                        )}
                        ref={ref}     // Forward the ref
                        {...props}    // Spread remaining props
                    >
                        {children}
                    </div>
                </TooltipProvider>
            </SidebarContext.Provider>
        )
    }
)
// Set display name for React DevTools
SidebarProvider.displayName = "SidebarProvider"

// ==============================================================================
// 3. MAIN COMPONENTS
// ==============================================================================

// Main Sidebar component - renders differently based on viewport and settings
const Sidebar = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<"div"> & {
        side?: "left" | "right"                    // Which side of screen
        variant?: "sidebar" | "floating" | "inset" // Visual style
        collapsible?: "offcanvas" | "icon" | "none" // How it collapses
    }
>(
    (
        {
            side = "left",              // Default: left side
            variant = "sidebar",        // Default: standard sidebar
            collapsible = "offcanvas",  // Default: slides off screen when collapsed
            className,
            children,
            ...props
        },
        ref
    ) => {
        // Get sidebar state from context
        const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

        // MODE 1: Non-collapsible sidebar (always visible, fixed width)
        if (collapsible === "none") {
            return (
                <div
                    className={cn(
                        // Fixed width, full height, column layout
                        "bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col",
                        className
                    )}
                    ref={ref}
                    {...props}
                >
                    {children}
                </div>
            )
        }

        // MODE 2: Mobile sidebar (renders as a Sheet/drawer)
        if (isMobile) {
            return (
                // Sheet is a slide-in drawer component
                <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
                    <SheetContent
                        data-sidebar="sidebar"    // Data attribute for CSS targeting
                        data-mobile="true"        // Mark as mobile version
                        className="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
                        style={
                            {
                                "--sidebar-width": SIDEBAR_WIDTH_MOBILE,  // Wider on mobile
                            } as React.CSSProperties
                        }
                        side={side}  // Which side to slide from
                    >
                        {/* Screen reader accessible header (visually hidden) */}
                        <SheetHeader className="sr-only">
                            <SheetTitle>Sidebar</SheetTitle>
                            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
                        </SheetHeader>
                        {/* Container for sidebar content */}
                        <div className="flex h-full w-full flex-col">{children}</div>
                    </SheetContent>
                </Sheet>
            )
        }

        // MODE 3: Desktop sidebar (fixed position with animations)
        return (
            <div
                ref={ref}
                // group and peer enable parent-based styling in children
                className="group peer text-sidebar-foreground hidden md:block"
                data-state={state}  // "expanded" or "collapsed" for CSS
                data-collapsible={state === "collapsed" ? collapsible : ""}  // Type of collapse
                data-variant={variant}  // Visual variant
                data-side={side}        // Left or right
            >
                {/* Gap placeholder - reserves space in the layout flow */}
                {/* This div pushes main content over when sidebar is visible */}
                <div
                    className={cn(
                        // Same width as sidebar, animates width changes
                        "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
                        // When offcanvas collapsed: shrink to 0 width
                        "group-data-[collapsible=offcanvas]:w-0",
                        // Flip for right-side sidebar
                        "group-data-[side=right]:rotate-180",
                        // When icon collapsed: shrink to icon width (with padding for floating/inset)
                        variant === "floating" || variant === "inset"
                            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
                            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
                    )}
                />
                
                {/* Actual sidebar - fixed to viewport edge */}
                <div
                    className={cn(
                        // Fixed positioning, full viewport height, animates position/width
                        "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
                        // Position based on side prop, slides off-screen when offcanvas collapsed
                        side === "left"
                            ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
                            : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
                        // Floating/inset variants have padding; standard has border
                        variant === "floating" || variant === "inset"
                            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
                            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
                        className
                    )}
                    {...props}
                >
                    {/* Inner container with background and optional border/shadow */}
                    <div
                        data-sidebar="sidebar"
                        className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
                    >
                        {children}
                    </div>
                </div>
            </div>
        )
    }
)
// Set display name for React DevTools
Sidebar.displayName = "Sidebar"

// SidebarTrigger - Button that toggles the sidebar open/closed
const SidebarTrigger = React.forwardRef<
    React.ElementRef<typeof Button>,  // Ref type matches Button component
    React.ComponentProps<typeof Button>  // Accept all Button props
>(({ className, onClick, ...props }, ref) => {
    // Get toggle function from context
    const { toggleSidebar } = useSidebar()
    
    return (
        <Button
            ref={ref}
            data-sidebar="trigger"  // Data attribute for CSS targeting
            variant="ghost"          // Transparent background
            size="icon"              // Square button sized for icons
            className={cn("size-7", className)}  // 7 units square (28px)
            onClick={(event) => {
                onClick?.(event)     // Call any passed onClick handler first
                toggleSidebar()      // Then toggle the sidebar
            }}
            {...props}
        >
            <PanelLeftIcon />  {/* Hamburger-style icon */}
            <span className="sr-only">Toggle Sidebar</span>  {/* Screen reader text */}
        </Button>
    )
})
// Set display name for React DevTools
SidebarTrigger.displayName = "SidebarTrigger"

// SidebarRail - Invisible edge that can be clicked to toggle sidebar
// Appears as a thin line on hover
const SidebarRail = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<"button">
>(({ className, ...props }, ref) => {
    // Get toggle function from context
    const { toggleSidebar } = useSidebar()
    // Get OS-aware modifier key
    const { modKey } = useOS()
    
    // Custom tooltip state
    const [showTooltip, setShowTooltip] = React.useState(false)
    const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 })
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    const handleMouseEnter = (e: React.MouseEvent) => {
        // Capture mouse position when entering
        setMousePos({ x: e.clientX, y: e.clientY })
        // Delay before showing tooltip (500ms like native)
        timeoutRef.current = setTimeout(() => {
            setShowTooltip(true)
        }, 500)
    }

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        setShowTooltip(false)
    }

    return (
        <>
            <button
                ref={ref}
                data-sidebar="rail"
                aria-label="Toggle Sidebar"
                tabIndex={-1}
                onClick={toggleSidebar}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={cn(
                    "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 sm:flex",
                    "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
                    "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
                    "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full",
                    "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
                    "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
                    className
                )}
                {...props}
            />
            {/* Custom tooltip that appears at initial mouse position */}
            {showTooltip && (
                <div
                    className="fixed z-1000 bg-foreground text-white px-3 py-1.5 text-xs rounded-md pointer-events-none"
                    style={{
                        left: mousePos.x + 12,
                        top: mousePos.y + 12,
                    }}
                >
                    Toggle Sidebar ({modKey} + B)
                </div>
            )}
        </>
    )
})
// Set display name for React DevTools
SidebarRail.displayName = "SidebarRail"

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
const SidebarInset = componentFactory("main", "bg-background relative flex w-full flex-1 flex-col md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2", "inset")

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
                default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                outline:
                    "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
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
>(({ className, showIcon = false, ...props }, ref) => {
    // Width of the text skeleton (70% of container)
    const width = "70%"

    return (
        <div
            ref={ref}
            data-sidebar="menu-skeleton"  // For CSS targeting
            className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
            {...props}
        >
            {/* Optional icon skeleton (square) */}
            {showIcon && (
                <Skeleton
                    className="size-4 rounded-md"
                    data-sidebar="menu-skeleton-icon"
                />
            )}
            {/* Text skeleton (rectangle) */}
            <Skeleton
                className="h-4 max-w-(--skeleton-width) flex-1"
                data-sidebar="menu-skeleton-text"
                style={
                    {
                        "--skeleton-width": width,  // Custom property for max-width
                    } as React.CSSProperties
                }
            />
        </div>
    )
})
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
    SidebarRail,          // Edge toggle rail
    SidebarSeparator,     // Divider line
    SidebarTrigger,       // Toggle button
    useSidebar,           // Hook to access sidebar state

}