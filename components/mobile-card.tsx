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
    DropdownShell,
    DropdownItem,
    DropdownTrigger,
} from "@/components/ui/app-dropdown"


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
}

export function MobileCard<T>({
    item,
    id,
    title,
    subtitle,
    badge,
    fields,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    icon,
    index = 0
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
                            <p className="auto-scroll mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    
                    {/* Actions menu */}
                    {(onEdit || onDelete) && (
                        <Dropdown>
                            <DropdownTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8 shrink-0">
                                    <MoreVertical className="size-4" />
                                </Button>
                            </DropdownTrigger>
                            <DropdownShell align="end">
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
                            </DropdownShell>
                        </Dropdown>
                    )}
                </CardHeader>
                
                <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-2">
                        {fields.map((field, i) => (
                            <div key={i} className={cn("space-y-0.5", field.className)}>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">{field.label}</p>
                                <p className="text-sm font-medium">{field.value}</p>
                            </div>
                        ))}
                    </div>
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
        <div className={cn("flex flex-col gap-3", className)}>
            <AnimatePresence mode="popLayout">
                {children}
            </AnimatePresence>
        </div>
    )
}

// Hook to detect if we're on mobile
export function useIsMobileView(breakpoint: number = 768) {
    const [isMobile, setIsMobile] = React.useState(false)

    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < breakpoint)
        }
        
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [breakpoint])

    return isMobile
}
