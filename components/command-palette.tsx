"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
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
    Settings,
    Search,
    Target,
    Download,
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
                    <CommandItem onSelect={() => runCommand(() => setLanguage("en"))}>
                        🇬🇧 {t.command_palette?.switch_to_english || "English"}
                        {language === "en" && <CommandShortcut>✓</CommandShortcut>}
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => setLanguage("pt"))}>
                        🇵🇹 {t.command_palette?.switch_to_portuguese || "Português"}
                        {language === "pt" && <CommandShortcut>✓</CommandShortcut>}
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}
