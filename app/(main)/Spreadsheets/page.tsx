"use client"

import * as React from "react"

import { PageHeader, PageSection, PageShell } from "@/components/page-framework"
import { SpreadsheetHome } from "@/components/spreadsheet-home"
import { SpreadsheetWorkspace } from "@/components/spreadsheet-workspace"
import { SpreadsheetLogs } from "@/components/spreadsheet-logs"
import { useLanguage } from "@/components/language-provider"
import { useFinanceData } from "@/hooks/use-finance-data"
import type { SpreadsheetDocument, SpreadsheetSheetTab } from "@/lib/types"

type View =
    | { screen: "home" }
    | { screen: "workspace"; doc?: SpreadsheetDocument; templateSheets?: SpreadsheetSheetTab[]; templateName?: string }
    | { screen: "logs"; doc: SpreadsheetDocument }

export default function SpreadsheetsPage() {
    const { t } = useLanguage()
    const sp = (t as any).spreadsheets || {} as Record<string, string>
    const { data, isLoading } = useFinanceData()
    const [view, setView] = React.useState<View>({ screen: "home" })

    const handleNew = React.useCallback(() => setView({ screen: "workspace" }), [])
    const handleOpen = React.useCallback((doc: SpreadsheetDocument) => setView({ screen: "workspace", doc }), [])
    const handleNewTemplate = React.useCallback((sheets: SpreadsheetSheetTab[], name: string) => setView({ screen: "workspace", templateSheets: sheets, templateName: name }), [])
    const handleBack = React.useCallback(() => setView({ screen: "home" }), [])
    const handleShowLogs = React.useCallback((doc: SpreadsheetDocument) => setView({ screen: "logs", doc }), [])

    if (view.screen === "workspace") {
        return (
            <PageShell className="gap-3 min-h-0 overflow-hidden">
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
            <PageShell>
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
        <PageShell>
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
