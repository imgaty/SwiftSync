//
//  page.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Renders the /Spreadsheets route in Argent, composing page-level layout, data
//  dependencies, and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"

import { PageHeader, PageSection, PageShell } from "@/components/page-framework"
import { SpreadsheetHome } from "@/components/spreadsheet-home"
import { SpreadsheetWorkspace } from "@/components/spreadsheet-workspace"
import { SpreadsheetLogs } from "@/components/spreadsheet-logs"
import { useLanguage } from "@/components/language-provider"
import { useFinanceData } from "@/hooks/use-finance-data"
import type { SpreadsheetDocument, SpreadsheetSheetTab } from "@/lib/types"
import { getTranslations } from "@/lib/translation-utils"

type View =
    | { screen: "home" }
    | { screen: "workspace"; doc?: SpreadsheetDocument; templateSheets?: SpreadsheetSheetTab[]; templateName?: string }
    | { screen: "logs"; doc: SpreadsheetDocument }

export default function SpreadsheetsPage() {
    const { t } = useLanguage()
    const sp = getTranslations(t, "spreadsheets")
    const { data, isLoading } = useFinanceData()
    const [view, setView] = React.useState<View>({ screen: "home" })

    const handleNew = React.useCallback(() => setView({ screen: "workspace" }), [])
    const handleOpen = React.useCallback((doc: SpreadsheetDocument) => setView({ screen: "workspace", doc }), [])
    const handleNewTemplate = React.useCallback((sheets: SpreadsheetSheetTab[], name: string) => setView({ screen: "workspace", templateSheets: sheets, templateName: name }), [])
    const handleBack = React.useCallback(() => setView({ screen: "home" }), [])
    const handleShowLogs = React.useCallback((doc: SpreadsheetDocument) => setView({ screen: "logs", doc }), [])

    if (view.screen === "workspace") {
        return (
            <PageShell className="min-h-full gap-4 overflow-x-hidden overflow-y-visible p-3 md:p-4">
                <SpreadsheetWorkspace
                    data={data}
                    isLoading={isLoading}
                    initialDoc={view.doc}
                    initialTemplateSheets={view.templateSheets}
                    initialTemplateName={view.templateName}
                    onBack={handleBack}
                />
            </PageShell>
        )
    }

    if (view.screen === "logs") {
        return (
            <PageShell className="gap-4 p-3 md:p-4">
                <PageHeader
                    breadcrumbs={[
                        { label: t.sidebar_dashboard || "Dashboard", href: "/" },
                        { label: sp.title || "Spreadsheets", href: "/Spreadsheets" },
                        { label: view.doc.name, href: "#" },
                        { label: sp.logs || "Logs", href: "#" },
                    ]}
                    isLoading={false}
                />
                <PageSection stagger={1}>
                    <SpreadsheetLogs doc={view.doc} onBack={handleBack} />
                </PageSection>
            </PageShell>
        )
    }

    return (
        <PageShell className="gap-4 p-3 md:p-4">
            <PageHeader
                breadcrumbs={[
                    { label: t.sidebar_dashboard || "Dashboard", href: "/" },
                    { label: sp.title || "Spreadsheets", href: "/Spreadsheets" },
                ]}
                isLoading={isLoading}
            />

            <PageSection stagger={1}>
                <SpreadsheetHome
                    onNew={handleNew}
                    onOpen={handleOpen}
                    onNewTemplate={handleNewTemplate}
                    onShowLogs={handleShowLogs}
                />
            </PageSection>
        </PageShell>
    )
}
