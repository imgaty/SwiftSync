import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"



// ==============================================================================
// WRAPPER COMPONENT
// ==============================================================================

// Generic wrapper that shows skeleton or children based on loading state
export function WithSkeleton({
    loading,
    skeleton,
    children,
}: {
    loading: boolean
    skeleton: React.ReactNode
    children: React.ReactNode
}) {
    return loading ? <>{skeleton}</> : <>{children}</>
}



// ==============================================================================
// CARD SKELETONS
// ==============================================================================

// Single stat card skeleton (matches section-cards.tsx style exactly)
export function StatCardSkeleton({ className }: { className?: string }) {
    return (
        <Card className={cn("@container/card flex-1 gap-4 | min-w-full md:min-w-[45%] xl:min-w-[20%] | p-6", className)}>
            {/* Header with label and badge */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Skeleton className="size-2 rounded-[2px]" />
                    <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            
            {/* Main value */}
            <Skeleton className="h-8 w-32" />
            
            {/* Footer */}
            <Skeleton className="h-4 w-40" />
        </Card>
    )
}

// Grid of stat card skeletons (matches SectionCards layout)
export function SectionCardsSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("flex flex-wrap gap-6", className)}>
            {Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
            ))}
        </div>
    )
}

// Generic card skeleton
export function CardSkeleton({ className }: { className?: string }) {
    return (
        <Card className={cn("@container/card", className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="size-4 rounded" />
            </CardHeader>
            <CardContent className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-40" />
            </CardContent>
        </Card>
    )
}

// Grid of card skeletons
export function CardGridSkeleton({ 
    count = 4, 
    className 
}: { 
    count?: number
    className?: string 
}) {
    return (
        <div className={cn("grid gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4", className)}>
            {Array.from({ length: count }).map((_, i) => (
                <CardSkeleton key={i} />
            ))}
        </div>
    )
}



// ==============================================================================
// CHART SKELETONS
// ==============================================================================

// Chart with header skeleton
export function ChartSkeleton({ className }: { className?: string }) {
    return (
        <Card className={cn("@container/chart", className)}>
            <CardHeader className="flex flex-col gap-2 pb-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-9 w-32 rounded-lg" />
                </div>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <Skeleton className="h-[250px] w-full rounded-lg" />
            </CardContent>
        </Card>
    )
}

// Simple chart area skeleton (no card wrapper)
export function ChartAreaSkeleton({ 
    height = 250,
    className 
}: { 
    height?: number
    className?: string 
}) {
    return <Skeleton className={cn("w-full rounded-lg", className)} style={{ height }} />
}



// ==============================================================================
// TABLE SKELETONS
// ==============================================================================

// Table row skeleton
export function TableRowSkeleton({ 
    columns = 5,
    className 
}: { 
    columns?: number
    className?: string 
}) {
    return (
        <div className={cn("flex items-center gap-4 px-4 py-3 border-b", className)}>
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton 
                    key={i} 
                    className={cn(
                        "h-4",
                        i === 0 ? "w-8" : "flex-1"  // First column narrow (checkbox/id)
                    )} 
                />
            ))}
        </div>
    )
}

// Full table skeleton
export function TableSkeleton({ 
    rows = 5, 
    columns = 5,
    showHeader = true,
    className 
}: { 
    rows?: number
    columns?: number
    showHeader?: boolean
    className?: string 
}) {
    return (
        <Card className={cn("overflow-hidden", className)}>
            {/* Table header */}
            {showHeader && (
                <div className="flex items-center gap-4 px-4 py-3 border-b bg-muted/50">
                    {Array.from({ length: columns }).map((_, i) => (
                        <Skeleton 
                            key={i} 
                            className={cn(
                                "h-4",
                                i === 0 ? "w-8" : "flex-1"
                            )} 
                        />
                    ))}
                </div>
            )}
            
            {/* Table rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <TableRowSkeleton key={i} columns={columns} />
            ))}
        </Card>
    )
}



// ==============================================================================
// SIDEBAR SKELETONS
// ==============================================================================

// Menu item skeleton (matches sidebar dimensions)
export function MenuItemSkeleton({ 
    showIcon = true,
    className 
}: { 
    showIcon?: boolean
    className?: string 
}) {
    return (
        <div className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}>
            {showIcon && <Skeleton className="size-4 rounded-md" />}
            <Skeleton className="h-4 flex-1 max-w-[70%]" />
        </div>
    )
}

// Menu group skeleton
export function MenuGroupSkeleton({ 
    items = 4, 
    showLabel = true,
    showIcons = true,
    className 
}: { 
    items?: number
    showLabel?: boolean
    showIcons?: boolean
    className?: string 
}) {
    return (
        <div className={cn("flex flex-col gap-1 p-2", className)}>
            {showLabel && <Skeleton className="h-4 w-20 mb-2 ml-2" />}
            {Array.from({ length: items }).map((_, i) => (
                <MenuItemSkeleton key={i} showIcon={showIcons} />
            ))}
        </div>
    )
}



// ==============================================================================
// TEXT SKELETONS
// ==============================================================================

// Paragraph skeleton
export function TextSkeleton({ 
    lines = 3,
    className 
}: { 
    lines?: number
    className?: string 
}) {
    return (
        <div className={cn("space-y-2", className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton 
                    key={i} 
                    className="h-4" 
                    style={{ width: i === lines - 1 ? "60%" : "100%" }}  // Last line shorter
                />
            ))}
        </div>
    )
}

// Title + subtitle skeleton
export function HeaderSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("space-y-2", className)}>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
        </div>
    )
}



// ==============================================================================
// PAGE SKELETONS
// ==============================================================================

// Dashboard page skeleton (cards + chart + table)
export function DashboardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("flex flex-col gap-4 p-4 md:gap-6 md:p-6", className)}>
            <CardGridSkeleton count={4} />
            <ChartSkeleton />
            <TableSkeleton rows={5} columns={6} />
        </div>
    )
}

// Settings/form page skeleton
export function FormPageSkeleton({ 
    fields = 5,
    className 
}: { 
    fields?: number
    className?: string 
}) {
    return (
        <Card className={cn("p-6", className)}>
            <div className="space-y-6">
                <HeaderSkeleton />
                <div className="space-y-4">
                    {Array.from({ length: fields }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2">
                    <Skeleton className="h-10 w-20 rounded-md" />
                    <Skeleton className="h-10 w-24 rounded-md" />
                </div>
            </div>
        </Card>
    )
}

// List page skeleton
export function ListPageSkeleton({ 
    items = 8,
    className 
}: { 
    items?: number
    className?: string 
}) {
    return (
        <div className={cn("flex flex-col gap-4 p-4", className)}>
            {/* Search/filter bar */}
            <div className="flex gap-4">
                <Skeleton className="h-10 flex-1 max-w-sm rounded-md" />
                <Skeleton className="h-10 w-32 rounded-md" />
            </div>
            
            {/* List items */}
            <div className="space-y-2">
                {Array.from({ length: items }).map((_, i) => (
                    <Card key={i} className="p-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="size-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                            <Skeleton className="h-8 w-20 rounded-md" />
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
