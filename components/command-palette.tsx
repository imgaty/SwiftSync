//
//  command-palette.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Command palette React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import {
    LayoutDashboard,
    ArrowLeftRight,
    PiggyBank,
    Receipt,
    Wallet,
    Calendar,
    Moon,
    Sun,
    Monitor,
    Target,
} from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { useLanguage } from "@/components/language-provider"
import { LANGUAGE_OPTIONS, type Language } from "@/lib/languages"

const COMMAND_PALETTE_OPEN_EVENT = "argent-command-palette:open"

export function openCommandPalette() {
    if (typeof window === "undefined") return
    window.dispatchEvent(new Event(COMMAND_PALETTE_OPEN_EVENT))
}

export function CommandPalette() {
    const [open, setOpen] = React.useState(false)
    const router = useRouter()
    const { setTheme } = useTheme()
    const { t, setLanguage, language } = useLanguage()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    React.useEffect(() => {
        const handleOpen = () => setOpen(true)
        window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, handleOpen)
        return () => window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, handleOpen)
    }, [])

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder={t.command_palette?.placeholder || "Type a command or search..."} />
            <CommandList>
                <CommandEmpty>{t.command_palette?.no_results || "No results found."}</CommandEmpty>
                
                <CommandGroup heading={t.command_palette?.navigation || "Navigation"}>
                    <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
                        <LayoutDashboard className="mr-2" />
                        {t.command_palette?.go_to_dashboard || "Go to Dashboard"}
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/Transactions"))}>
                        <ArrowLeftRight className="mr-2" />
                        {t.command_palette?.go_to_transactions || "Go to Transactions"}
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/Budgets"))}>
                        <PiggyBank className="mr-2" />
                        {t.command_palette?.go_to_budgets || "Go to Budgets"}
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/Bills"))}>
                        <Receipt className="mr-2" />
                        {t.command_palette?.go_to_bills || "Go to Bills"}
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/Accounts"))}>
                        <Wallet className="mr-2" />
                        {t.command_palette?.go_to_accounts || "Go to Accounts"}
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/Calendar"))}>
                        <Calendar className="mr-2" />
                        {t.command_palette?.go_to_calendar || "Go to Calendar"}
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/Goals"))}>
                        <Target className="mr-2" />
                        {t.command_palette?.go_to_goals || "Go to Goals"}
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading={t.command_palette?.theme || "Theme"}>
                    <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
                        <Sun className="mr-2" />
                        {t.command_palette?.light_mode || "Light Mode"}
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
                        <Moon className="mr-2" />
                        {t.command_palette?.dark_mode || "Dark Mode"}
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
                        <Monitor className="mr-2" />
                        {t.command_palette?.system_theme || "System Theme"}
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading={t.command_palette?.language || "Language"}>
                    {LANGUAGE_OPTIONS.map((option) => (
                        <CommandItem key={option.value} onSelect={() => runCommand(() => setLanguage(option.value as Language))}>
                            {option.label}
                            {language === option.value && <CommandShortcut>✓</CommandShortcut>}
                        </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}
