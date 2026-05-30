//
//  mobile-card.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Mobile card React component for Argent, encapsulating reusable interface
//  structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, MoreVertical } from "lucide-react"
import {
    Dropdown,
    DropdownContent,
    DropdownItem,
    DropdownTrigger,
} from "@/components/ui/dropdown"


interface MobileCardField {
    label: string
    value: React.ReactNode
    className?: string
}

interface MobileCardProps<T> {
    item: T
    id: string | number
    title: React.ReactNode
    subtitle?: React.ReactNode
    badge?: {
        label: string
        variant?: "default" | "secondary" | "destructive" | "outline"
        className?: string
    }
    fields: MobileCardField[]
    isSelected?: boolean
    onSelect?: (checked: boolean) => void
    onEdit?: () => void
    onDelete?: () => void
    icon?: React.ReactNode
    index?: number
    fieldLayout?: "grid" | "carousel"
}

export function MobileCard<T>({
    item: _item,
    id: _id,
    title,
    subtitle,
    badge,
    fields,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    icon,
    index = 0,
    fieldLayout = "grid",
}: MobileCardProps<T>) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ 
                duration: 0.2,
                delay: index * 0.05
            }}
        >
            <Card className={cn(
                "relative overflow-hidden transition-all",
                isSelected && "ring-2 ring-primary"
            )}>
                <CardHeader className="flex flex-row items-start gap-3 pb-2">
                    {/* Selection checkbox */}
                    {onSelect && (
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={onSelect}
                            className="mt-1"
                        />
                    )}
                    
                    {/* Icon */}
                    {icon && (
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-black/5 dark:bg-white/5 shrink-0">
                            {icon}
                        </div>
                    )}
                    
                    {/* Title & subtitle */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="auto-scroll flex-1 min-w-0 font-semibold text-sm">{title}</h3>
                            {badge && (
                                <Badge 
                                    variant={badge.variant || "secondary"}
                                    className={cn("shrink-0", badge.className)}
                                >
                                    {badge.label}
                                </Badge>
                            )}
                        </div>
                        {subtitle && (
                            <p className="auto-scroll mt-0.5 text-xs text-neutral-400">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    
                    {/* Actions menu */}
                    {(onEdit || onDelete) && (
                        <Dropdown>
                            <DropdownTrigger asChild>
                                <Button variant="ghost" size="icon" className="shrink-0">
                                    <MoreVertical className="size-4" />
                                </Button>
                            </DropdownTrigger>
                            <DropdownContent align="end">
                                {onEdit && (
                                    <DropdownItem onClick={onEdit}>
                                        <Pencil className="mr-2 size-4" />
                                        Edit
                                    </DropdownItem>
                                )}
                                {onDelete && (
                                    <DropdownItem 
                                        onClick={onDelete}
                                        className="text-red-500 focus:text-red-500"
                                    >
                                        <Trash2 className="mr-2 size-4" />
                                        Delete
                                    </DropdownItem>
                                )}
                            </DropdownContent>
                        </Dropdown>
                    )}
                </CardHeader>
                
                <CardContent className="pt-0">
                    {fieldLayout === "carousel" ? (
                        <div className="-mx-1 flex items-stretch gap-2 overflow-x-auto px-1 pb-0.5 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {fields.map((field, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "min-w-[148px] max-w-[80vw] snap-start rounded-lg border border-black/6 bg-black/3 px-2.5 py-2 dark:border-white/8 dark:bg-white/4",
                                        field.className,
                                    )}
                                >
                                    <p className="text-[11px] text-neutral-400">{field.label}</p>
                                    <p className="mt-0.5 text-sm font-medium auto-scroll">{field.value}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {fields.map((field, i) => (
                                <div key={i} className={cn("space-y-0.5", field.className)}>
                                    <p className="text-xs text-neutral-400">{field.label}</p>
                                    <p className="text-sm font-medium">{field.value}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}

interface MobileCardListProps {
    children: React.ReactNode
    className?: string
}

export function MobileCardList({ children, className }: MobileCardListProps) {
    return (
        <div className={cn("flex flex-col gap-4", className)}>
            <AnimatePresence mode="popLayout">
                {children}
            </AnimatePresence>
        </div>
    )
}

// Re-export the canonical mobile hook for backwards compatibility
export { useIsMobile as useIsMobileView } from "@/hooks/use-mobile"
