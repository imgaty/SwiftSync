// DONE

"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { PanelLeftIcon } from "lucide-react"
import { useOS } from "@/hooks/use-os"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, useCursorTooltip, SmartTooltip } from "@/components/ui/tooltip"
import { useLanguage } from "@/components/language-provider"


const SIDEBAR = {
    COOKIE_NAME: "sidebarState",
    COOKIE_MAX_AGE: 60 * 60 * 24 * 7 * 52,                                          // 60 seconds * 60 minutes * 24 hours * 7 days * 52 weeks = 1 year
    WIDTH: { DEFAULT: 240, MIN: 200, MAX: 400, MOBILE: 288, COLLAPSED: 48 },        // Values in pixels
    KEYBOARD_SHORTCUT: "b",                                                         // Toggle sidebar shortcut (Ctrl B or ⌘ B)
    COLLAPSE_THRESHOLD: 120,                                                        // Width at which sidebar auto-collapses
} as const

function setCookie(name: string, value: string | number) {
    document.cookie = `${name}=${value}; path=/; max-age=${SIDEBAR.COOKIE_MAX_AGE}`
}

const MOBILE_SIDEBAR_STYLE = { "--sidebar-width": `${SIDEBAR.WIDTH.MOBILE}px` } as React.CSSProperties



// ==============================================================================
// 1. STATE & CONTEXT
// ==============================================================================

// Components using useSidebar() have access to
type SidebarContextProps = {
    state: "expanded" | "collapsed"
    open: boolean
    setOpen: (open: boolean) => void

    openMobile: boolean
    setOpenMobile: (open: boolean) => void

    isMobile: boolean
    toggleSidebar: () => void
    
    side: "left" | "right"                          // Position of the sidebar  
    setSide: (side: "left" | "right") => void
    
    width: number
    setWidth: (width: number) => void
   
    isResizing: boolean                             // If the sidebar is being resized
    setIsResizing: (resizing: boolean) => void
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
    HTMLDivElement,                                                                 // The ref will point to an HTMLDivElement
    React.ComponentProps<"div"> & {                                                 // Accept all div props plus custom ones:
        defaultOpen?: boolean
        open?: boolean
        onOpenChange?: (open: boolean) => void                                      // Callback when open changes
        defaultSide?: "left" | "right"
        defaultWidth?: number
        showRail?: boolean                                                          // Whether to show the resize rail
    }
>(
    ({
        defaultOpen = true, open: openProp, onOpenChange: setOpenProp, defaultSide = "left", 
        defaultWidth = SIDEBAR.WIDTH.DEFAULT, showRail = false, className, style, children, ...props 
    }, ref) => {

        const isMobile = useIsMobile()
        const [openMobile, setOpenMobile] = React.useState(false)
        const [_open, _setOpen] = React.useState(defaultOpen)
        const open = openProp ?? _open
        const openRef = React.useRef(open)                                          // Ref to track current open value (needed for callback in setOpen)
        
        // Modular sidebar state (defaults come from server-side cookie reading in layout.tsx)
        const [side, setSide] = React.useState<"left" | "right">(defaultSide)
        const [width, setWidth] = React.useState(defaultWidth)
        const [isResizing, setIsResizing] = React.useState(false)
        const widthSaveTimeout = React.useRef<NodeJS.Timeout | null>(null)
        
        React.useEffect(() => { openRef.current = open }, [open])                   // Keep the ref in sync with the open value
        
        // Cleanup timeout on unmount
        React.useEffect(() => {
            return () => {
                if (widthSaveTimeout.current) clearTimeout(widthSaveTimeout.current)
            }
        }, [])
        

        // Persist side preference to cookie
        const handleSideCookie = React.useCallback((newSide: "left" | "right") => {
            setSide(newSide)
            setCookie("sidebar_side", newSide)
        }, [])
        
        // Persist width to cookie
        const handleWidthCookie = React.useCallback((newWidth: number) => {
            const clampedWidth = Math.max(SIDEBAR.WIDTH.MIN, Math.min(SIDEBAR.WIDTH.MAX, newWidth))
            setWidth(clampedWidth)

            if (widthSaveTimeout.current) clearTimeout(widthSaveTimeout.current)
            widthSaveTimeout.current = setTimeout(() => setCookie("sidebar_width", clampedWidth), 100)
        }, [])

        
        // Set open state with cookie persistence
        const setOpen = React.useCallback(
            (value: boolean | ((value: boolean) => boolean)) => {
                const openState = typeof value === "function" ? value(openRef.current) : value
                setOpenProp ? setOpenProp(openState) : _setOpen(openState)
                
                setCookie(SIDEBAR.COOKIE_NAME, String(openState))                   // Save openState to cookie to survive page refresh
            },
            [setOpenProp]
        )


        const toggleSidebar = React.useCallback(() => {
            return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open)
        }, [isMobile, setOpen, setOpenMobile])

        
        // Check if the shortcut keys are pressed (Ctrl B or ⌘ B)
        React.useEffect(() => {
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === SIDEBAR.KEYBOARD_SHORTCUT && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault()                                          // Prevent default browser shortcut
                    toggleSidebar()                                                 // Toggle the sidebar
                }
            }

            window.addEventListener("keydown", handleKeyDown)
            return () => window.removeEventListener("keydown", handleKeyDown)       // Cleanup on unmount
        }, [toggleSidebar])


        const state = open ? "expanded" : "collapsed"

        
        // Create a cached object containing all the sidebar state
        const contextValues = React.useMemo<SidebarContextProps>(
            () => ({
                state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar,
                side, setSide: handleSideCookie, width, setWidth: handleWidthCookie, isResizing, setIsResizing}),

            [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar, side, handleSideCookie, width, handleWidthCookie, isResizing]
        )
        
        const railPosition = open ? width : SIDEBAR.WIDTH.COLLAPSED

        const sidebarStyle = React.useMemo(() => ({
            "--sidebar-width": `${width}px`,
            "--sidebar-width-icon": `${SIDEBAR.WIDTH.COLLAPSED}px`,
            ...style
        } as React.CSSProperties), [width, style])

        return (
            <SidebarContext.Provider value = {contextValues}>       {/* Provides context to all children */}
                <TooltipProvider delayDuration = {0}>               {/* TooltipProvider for collapsed sidebar buttons */}
                    <div
                        ref = {ref}
                        data-side = {side}
                        className = {cn(
                            "relative | flex | w-full min-h-screen",
                            "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar", className )}
                        
                        style = {sidebarStyle}
                        {...props}
                    >
                        {children}

                        {showRail && !isMobile && (
                            <SidebarRail railPosition = {railPosition} />
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
    ({ variant = "sidebar", collapsible = "icon", className, children, ...props }, ref) => {
        
        const { isMobile, state, openMobile, setOpenMobile, side, isResizing } = useSidebar()

        // DISPLAY MODE 1: Non-collapsible sidebar (always visible, fixed width)
        if (collapsible === "none") {
            return (
                <div ref = {ref} className = {cn( "flex flex-col | w-(--sidebar-width) h-full || bg-sidebar | text-sidebar-foreground", className )} {...props}>
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
                        className = {cn(
                            "p-0 | w-(--sidebar-width)",
                            "bg-sidebar | text-sidebar-foreground ",
                            "[&>button]:hidden",
                            "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar", className )}
                        
                        style = {MOBILE_SIDEBAR_STYLE}
                        side = {side}
                    >
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
                    "sticky top-0 | md:flex flex-col self-start shrink-0 | w-(--sidebar-width) h-svh",
                    "bg-sidebar | text-sidebar-foreground",
                    "group peer",

                    side === "left" ? "order-first" : "order-last",

                    !isResizing && "transition-[width] duration-200 ease-linear", // Animate unless resizing
                    state === "collapsed" && collapsible === "offcanvas" && "w-0 overflow-hidden",
                    state === "collapsed" && collapsible === "icon" && "w-(--sidebar-width-icon)",

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



// Button that toggles the sidebar
const SidebarTrigger = React.forwardRef<
    React.ElementRef<typeof Button>,
    React.ComponentProps<typeof Button>
>(
    ({ className, onClick, ...props }, ref) => {

    const { toggleSidebar, open } = useSidebar()
    const { modKey } = useOS()
    const { t } = useLanguage()

    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        toggleSidebar()
    }, [onClick, toggleSidebar])

    const tooltipText = open 
        ? (t.sidebar?.toggle_collapse || 'Collapse Sidebar (%shortcut)').replace("%shortcut", `${modKey} B`)
        : (t.sidebar?.toggle_expand || 'Expand Sidebar (%shortcut)').replace("%shortcut", `${modKey} B`)

    return (
        <SmartTooltip text={tooltipText} group="sidebar">
            <Button
                ref = {ref}
                data-sidebar = "trigger"
                variant = "ghost"
                size = "icon"
                className = {cn("size-7", className)}
                onClick = {handleClick}
                {...props}
            >
                <PanelLeftIcon />
                <span className = "sr-only">Toggle Sidebar</span>
            </Button>
        </SmartTooltip>
    )
})

// React DevTools display name
SidebarTrigger.displayName = "SidebarTrigger"



// Rail to resize the sidebar by drag
function SidebarRail({ railPosition }: { railPosition: number }) {
    const { side, width, setWidth, open, setOpen, isResizing, setIsResizing } = useSidebar()
    const { modKey } = useOS()
    const { t } = useLanguage()
    const tooltip = useCursorTooltip({ disabled: isResizing })
    
    const dragState = React.useRef({ startX: 0, startWidth: 0, isDragging: false, wasCollapsed: false })
    const refs = React.useRef({ side, open, width })
    React.useEffect(() => { refs.current = { side, open, width } }, [side, open, width])
    

    // Handles the sidebar drag resizing logic
    const handleSidebarDrag = React.useCallback((e: MouseEvent) => {
        dragState.current.isDragging = true
        const delta = refs.current.side === "left" 
            ? e.clientX - dragState.current.startX 
            : dragState.current.startX - e.clientX
        const newWidth = dragState.current.startWidth + delta
        
        if (newWidth < SIDEBAR.COLLAPSE_THRESHOLD) { setOpen(false); return }

        setOpen(true)
        setWidth(Math.max(SIDEBAR.WIDTH.MIN, Math.min(SIDEBAR.WIDTH.MAX, newWidth)))
    }, [setWidth, setOpen])
    

    const handleMouseUp = React.useCallback(() => {
        setIsResizing(false)
        document.removeEventListener("mousemove", handleSidebarDrag)
        document.removeEventListener("mouseup", handleMouseUp)
        document.body.style.userSelect = ""
        document.body.style.cursor = ""
        
        if (!dragState.current.isDragging) {
            if (dragState.current.wasCollapsed) { setWidth(SIDEBAR.WIDTH.MIN); setOpen(true) }
            else { setOpen(false) }
        }

        dragState.current.isDragging = false
    }, [handleSidebarDrag, setOpen, setWidth, setIsResizing])
    

    const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        dragState.current = {
            startX: e.clientX,
            startWidth: refs.current.open ? refs.current.width : SIDEBAR.WIDTH.COLLAPSED,
            isDragging: false,
            wasCollapsed: !refs.current.open,
        }
        
        setIsResizing(true)
        tooltip.hide()

        document.addEventListener("mousemove", handleSidebarDrag)
        document.addEventListener("mouseup", handleMouseUp)
        document.body.style.userSelect = "none"
        document.body.style.cursor = "grabbing"
    }, [handleSidebarDrag, handleMouseUp, setIsResizing, tooltip])

    // Cleanup event listeners on unmount
    React.useEffect(() => {
        return () => {
            document.removeEventListener("mousemove", handleSidebarDrag)
            document.removeEventListener("mouseup", handleMouseUp)
        }
    }, [handleSidebarDrag, handleMouseUp])

    // Position of the sidebar rail
    const finalRailPosition = React.useMemo(() => 
        side === "left" 
            ? { left: `${railPosition}px` }
            : { right: `${railPosition}px` }
    , [side, railPosition])

    const tooltipStyle = React.useMemo(() => ({
        left: tooltip.position.x,
        top: tooltip.position.y
    }), [tooltip.position.x, tooltip.position.y])


    return (
        <>
            <button
                data-sidebar = "rail"
                aria-label = "Toggle Sidebar"
                tabIndex = {-1}

                onMouseDown = {handleMouseDown}
                onMouseEnter = {tooltip.onMouseEnter}
                onMouseLeave = {tooltip.onMouseLeave}

                className = {cn(
                    "absolute top-0 bottom-0 | cursor-grab | z-50",
                    "after:absolute after:top-6 after:bottom-6 | after:w-0.5 | after:rounded-full",

                    "hover:after:bg-[rgba(0,0,0,0.125)]",
                    isResizing && "after:bg-[rgba(0,0,0,0.25)]",

                    isResizing && "pointer-events-none",
                    !isResizing && "transition-[left,right] duration-200 ease-linear",

                    side === "left" 
                        ? "after:left-px after:-translate-x-1/2" 
                        : "after:right-px after:translate-x-1/2"
                )}

                style = {finalRailPosition}
            />
            {tooltip.isVisible && (
                <div
                    ref = {tooltip.ref}
                    className = {cn(
                        "fixed | px-3 py-1.5",
                        "bg-foreground rounded-md | text-white text-xs whitespace-nowrap pointer-events-none",
                        "z-1000"
                    )}

                    style = {tooltipStyle}
                >
                    {open 
                        ? t.sidebar.resize_tooltip_collapse.replace("%shortcut", `${modKey} B`)
                        : t.sidebar.resize_tooltip_expand.replace("%shortcut", `${modKey} B`)
                    }
                </div>
            )}
        </>
    )
}



// ==============================================================================
// 4. COMPONENT FACTORY
// ==============================================================================

// Factory function to generate simple styled sidebar components
// Reduces boilerplate by creating consistent components
function componentFactory<T extends React.ElementType>(
    Tag: T,                                                             // The element type to render (e.g. div, ul, input)
    defaultClasses: string | string[],                                  // Default Tailwind classes
    dataSidebar: string                                                 // Value for data-sidebar attribute

) {
    const Component = React.forwardRef<any, any>(
        ({ className, asChild = false, ...props }, ref) => {
            const Comp = asChild ? Slot : Tag
            
            return (
                <Comp
                    ref = {ref}
                    data-sidebar = {dataSidebar}
                    className = {cn(defaultClasses, className)}
                    {...props}
                />
            )
        }
    )
    
    Component.displayName = `Sidebar${dataSidebar.charAt(0).toUpperCase() + dataSidebar.slice(1)}` // Generate display name such as "SidebarHeader", "SidebarContent", etc.
    
    return Component as React.ForwardRefExoticComponent<
        React.ComponentPropsWithoutRef<T> & React.RefAttributes<any> & { asChild?: boolean }
    >
}



// ==============================================================================
// 5. GENERATED COMPONENTS
// ==============================================================================

const SidebarInset = componentFactory("main", [
    "relative | flex flex-col flex-1 | w-full h-svh",
    "text-foreground | order-1 | overflow-y-auto",

    "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 | md:peer-data-[variant=inset]:h-[calc(100svh-16px)]",
    "md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
    "md:peer-data-[side=right]:peer-data-[variant=inset]:ml-2 md:peer-data-[side=right]:peer-data-[variant=inset]:mr-0"
], "inset")

const SidebarInput = componentFactory(Input, "h-8 w-full | bg-background shadow-none", "input")                 // Search/filter input for sidebar
const SidebarHeader = componentFactory("div", "flex flex-col gap-2 | p-2", "header")
const SidebarFooter = componentFactory("div", "flex flex-col gap-2 | p-2", "footer")
const SidebarSeparator = componentFactory(Separator, "mx-2 | w-auto | bg-sidebar-border", "separator")

const SidebarContent = componentFactory("div", [
    "flex flex-col gap-2 flex-1 | min-h-0 | overflow-auto",

    "group-data-[collapsible=icon]:overflow-hidden"
], "content")

const SidebarGroup = componentFactory("div", "relative | flex flex-col | w-full min-w-0 | p-2", "group")        // Group container for related menu items
const SidebarGroupContent = componentFactory("div", "w-full | text-sm", "group-content")                        // Content wrapper inside a group
const SidebarMenu = componentFactory("ul", "flex flex-col gap-1 | w-full min-w-0", "menu")                      // Unordered list for menu items
const SidebarMenuItem = componentFactory("li", "group/menu-item | relative", "menu-item")                       // List item wrapper for menu buttons

const SidebarMenuBadge = componentFactory("div", [                                                              // Badge displayed next to menu item (e.g., notification count)
    "absolute right-1 | flex items-center justify-center | px-1 | min-w-5 h-5",
    "rounded-md | text-sidebar-foreground text-xs font-medium tabular-nums select-none pointer-events-none",

    "group-data-[collapsible=icon]:hidden",
    "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
    "peer-data-[size=sm]/menu-button:top-1 peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5"
], "menu-badge")

const SidebarMenuSub = componentFactory("ul", [                                                                 // Nested submenu list (indented with left border)
    "flex flex-col gap-1 | px-2.5 py-0.5 | mx-3.5 min-w-0",
    "border-sidebar-border border-l | translate-x-px",

    "group-data-[collapsible=icon]:hidden"
], "menu-sub")

const SidebarMenuSubItem = componentFactory("li", "group/menu-sub-item | relative", "menu-sub-item")            // List item wrapper for submenu buttons

const SidebarGroupLabel = componentFactory("div", [
    " flex items-center shrink-0 | px-2 | h-8",
    "rounded-md ring-sidebar-ring focus-visible:ring-2 outline-hidden | text-sidebar-foreground/70 text-xs font-medium",
    "transition-[margin,opacity] duration-200 ease-linear",

    "[&>svg]:size-4 [&>svg]:shrink-0",
    "group-data-[collapsible=icon]:-mt-8 | group-data-[collapsible=icon]:opacity-0"
], "group-label")

const SidebarGroupAction = componentFactory("button", [                                                         // Action button in group header (e.g., "Add new")
    "absolute top-3.5 right-3 | flex items-center justify-center aspect-square | p-0 | w-5",
    "rounded-md ring-sidebar-ring focus-visible:ring-2 outline-hidden hover:bg-sidebar-accent | text-sidebar-foreground hover:text-sidebar-accent-foreground",
    "transition-transform",
    "after:absolute after:-inset-2 md:after:hidden",

    "[&>svg]:size-4 [&>svg]:shrink-0",
    "group-data-[collapsible=icon]:hidden",
], "group-action")



// ==============================================================================
// 6. CUSTOM COMPONENTS
// ==============================================================================

// Creates consistent button styles with size and variant options
const sidebarMenuButtonVariants = cva(
    [
        "peer/menu-button | flex items-center gap-2 | p-2 | w-full",
        "rounded-md ring-sidebar-ring outline-hidden focus-visible:ring-2 hover:bg-sidebar-accent active:bg-sidebar-accent | text-sm text-left hover:text-sidebar-accent-foreground active:text-sidebar-accent-foreground disabled:pointer-events-none",
        "transition-all duration-150 | disabled:opacity-50 | overflow-hidden",

        "[&>span:last-child]:auto-scroll [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:transition-transform [&>svg]:duration-150",
        "data-[active=true]:bg-sidebar-accent | data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium",
        "group-data-[collapsible=icon]:size-8! | group-data-[collapsible=icon]:p-2! group-has-data-[sidebar=menu-action]/menu-item:pr-8",
        "data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground",
        "hover:[&>svg]:scale-110"
    ],
    
    {
        variants: {
            variant: {
                default: "",
                outline: "bg-background | shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
            },

            size: {
                default: "h-8 | text-sm",
                sm: "h-7 | text-xs",
                lg: "h-12 | text-sm | group-data-[collapsible=icon]:p-0!",
            },
        },

        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)



// CollapsedTooltip - Wraps each button in a tooltip if the sidebar is collapsed. Else, returns as a button.
const CollapsedTooltip = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<"button"> & {
        asChild?: boolean                                                       // Render child element instead of button 
        isActive?: boolean                                                      // Highlight as active/selected
        tooltip?: string | React.ComponentProps<typeof TooltipContent>          // Tooltip content
    } & VariantProps<typeof sidebarMenuButtonVariants>                          // Accept variant props
>(
    ({ asChild = false, isActive = false, variant = "default", size = "default", tooltip, className, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        const { isMobile, state } = useSidebar()

        const button = (
            <Comp
                ref = {ref}
                data-sidebar = "menu-button"
                data-size = {size}
                data-active = {isActive}
                className = {cn(sidebarMenuButtonVariants({ variant, size }), className)}
                {...props}
            />
        )

        const tooltipProps = React.useMemo(() => 
            typeof tooltip === "string" ? { children: tooltip } : tooltip
        , [tooltip])

        if (!tooltip || state !== "collapsed" || isMobile) return button        // Only show tooltip when collapsed, has tooltip content, and is not on mobile

        // Wrap button in Tooltip when collapsed
        return (
            <Tooltip>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side = "right" align = "center" {...tooltipProps} />
            </Tooltip>
        )
    }
)

// React DevTools display name
CollapsedTooltip.displayName = "CollapsedTooltip"



// SidebarActionDropdown - Action button inside menu item (delete, more options, share, etc.)
const SidebarActionDropdown = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<"button"> & {
        asChild?: boolean           // Render child element instead of button
        showOnHover?: boolean       // Only show when hovering menu item
    }
>(
    ({ className, asChild = false, showOnHover = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"

        return (
            <Comp
                ref = {ref}
                data-sidebar = "menu-action"
                className = {cn(
                    "absolute top-1.5 right-1 | flex items-center justify-center aspect-square | p-0 | w-5",
                    "rounded-md outline-hidden ring-sidebar-ring hover:bg-sidebar-accent focus-visible:ring-2 | text-sidebar-foreground hover:text-sidebar-accent-foreground",
                    "transition-transform",
                    "after:absolute md:after:hidden after:-inset-2",            // Larger touch target on mobile
                    
                    "[&>svg]:shrink-0 [&>svg]:size-4",
                    "peer-data-[size=sm]/menu-button:top-1",
                    "peer-data-[size=default]/menu-button:top-1.5",
                    "peer-data-[size=lg]/menu-button:top-2.5",
                    "group-data-[collapsible=icon]:hidden",                     // Hide when sidebar is collapsed to icons
                    
                    showOnHover && "peer-data-[active=true]/menu-button:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground",
                    showOnHover && "md:opacity-0 data-[state=open]:opacity-100 group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100",
                    className
                )}
                {...props}
            />
        )
    }
)

// React DevTools display name
SidebarActionDropdown.displayName = "SidebarActionDropdown"



// SidebarMenuSubButton - Button for dropdowns. Prints as a link <a>
const SidebarMenuSubButton = React.forwardRef<
    HTMLAnchorElement,
    React.ComponentProps<"a"> & {
        asChild?: boolean
        size?: "sm" | "md"
        isActive?: boolean
    }
>(
    ({ asChild = false, size = "md", isActive = false, className, ...props }, ref) => {
        const Comp = asChild ? Slot : "a"
        return (
            <Comp
                ref = {ref}
                data-sidebar = "menu-sub-button"
                data-size = {size}
                data-active = {isActive}
                className = {cn(
                    "flex items-center gap-2 | px-2 | min-w-0 h-7",
                    "rounded-md ring-sidebar-ring focus-visible:ring-2 outline-hidden hover:bg-sidebar-accent active:bg-sidebar-accent disabled:opacity-50 | text-sidebar-foreground hover:text-sidebar-accent-foreground active:text-sidebar-accent-foreground aria-disabled:opacity-50 disabled:pointer-events-none aria-disabled:pointer-events-none",
                    "-translate-x-px | overflow-hidden",

                    "[&>span:last-child]:auto-scroll [&>svg]:shrink-0 [&>svg]:size-4 [&>svg]:text-sidebar-accent-foreground",
                    "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
                    "group-data-[collapsible=icon]:hidden",                     // Hide when sidebar is collapsed to icons

                    size === "sm" ? "text-xs" : "text-sm",
                    className
                )}
                {...props}
            />
        )
    }
)

// React DevTools display name
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"



// ==============================================================================
// 7. EXPORTS
// ==============================================================================

export {
    Sidebar,                    // Main sidebar container
    SidebarContent,             // Scrollable content area
    SidebarFooter,              // Bottom section
    SidebarGroup,               // Group container
    SidebarGroupAction,         // Action button in group header
    SidebarGroupContent,        // Content wrapper in group
    SidebarGroupLabel,          // Label/title for group
    SidebarHeader,              // Top section
    SidebarInput,               // Search input
    SidebarInset,               // Main content area next to sidebar
    SidebarMenu,                // Menu list
    SidebarActionDropdown,          // Secondary action in menu item
    SidebarMenuBadge,           // Badge next to menu item
    CollapsedTooltip,           // Main menu button
    SidebarMenuItem,            // Menu item wrapper
    SidebarMenuSub,             // Submenu list
    SidebarMenuSubButton,       // Submenu button
    SidebarMenuSubItem,         // Submenu item wrapper
    SidebarProvider,            // Context provider (wrap your app)
    SidebarSeparator,           // Divider line9
    SidebarTrigger,             // Toggle button
    useSidebar,                 // Hook to access sidebar state
}