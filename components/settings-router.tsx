//
//  settings-router.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Settings router React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { useSettings } from "@/hooks/use-settings"

const SettingsDialog = dynamic(
    () => import("@/components/settings-dialog").then((mod) => mod.SettingsDialog),
    { ssr: false },
)

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
