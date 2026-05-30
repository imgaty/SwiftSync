//
//  error-state.tsx
//  Argent
//
//  Created by Hilario Ferreira on 08 December 2025 at 19:38.
//  Description: Implements the Error state React component for Argent, encapsulating reusable interface
//  structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { AlertCircle, FileQuestion, Ban } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export const AppErrors = {
    FILE_NOT_FOUND: {
        key: "file_not_found",
        icon: FileQuestion
    },
    EMPTY_DATA: {
        key: "empty_data",
        icon: Ban
    },
    UNKNOWN: {
        key: "unknown",
        icon: AlertCircle
    }
} as const

interface ErrorStateProps {
    type?: keyof typeof AppErrors
    className?: string
    details?: string
    fileName?: string
}

export function ErrorState({ type, className, details: _details, fileName }: ErrorStateProps) {
    const { t } = useLanguage()
    
    // Determine configuration based on type or default to UNKNOWN
    const config = type ? AppErrors[type] : AppErrors.UNKNOWN
    const errorTranslation = t.errors[config.key as keyof typeof t.errors]
    
    const Icon = config.icon

    const messageParts = errorTranslation.message.split('%fileName')

    return (
        <Card className = {cn("justify-center items-center gap-3 | text-neutral-400 text-center animate-fade-in", className)}>
            <Icon className = "w-10 h-10 opacity-25 animate-pulse"/>
            <div className="animate-fade-in-up stagger-1"> 
                <h3 className = "text-foreground">{errorTranslation.title}</h3>
                <p className = "text-sm">
                    {messageParts.map((part, i) => (
                        <span key={i}>
                            {part}
                            {i < messageParts.length - 1 && fileName && (
                                <code className = "px-1.5 py-0.5 | bg-muted rounded | font-mono text-xs font-medium">
                                    {fileName}
                                </code>
                            )}
                        </span>
                    ))}
                </p>
            </div>
        </Card>
    )
}
