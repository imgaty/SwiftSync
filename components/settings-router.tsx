"use client"

import { Suspense } from "react"
import { SettingsDialog } from "@/components/settings-dialog"
import { useSettings } from "@/hooks/use-settings"

function SettingsRouterInner() {
    const { isOpen, activePage, onOpenChange, setPage } = useSettings()
    return (
        <SettingsDialog
            open={isOpen}
            onOpenChange={onOpenChange}
            initialPage={activePage}
            onPageChange={setPage}
        />
    )
}

export function SettingsRouter() {
    return (
        <Suspense>
            <SettingsRouterInner />
        </Suspense>
    )
}
