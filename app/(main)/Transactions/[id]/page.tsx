//
//  page.tsx
//  Argent
//
//  Description: Renders the dedicated transaction detail route.
//
"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowLeft,
    ArrowUpRight,
    Building2,
    CalendarDays,
    ClipboardCopy,
    Clock3,
    Hash,
    Landmark,
    ReceiptText,
    Tag,
    UserRound,
} from "lucide-react"

import { PageHeader, PageSection, PageShell } from "@/components/page-framework"
import { useCurrency } from "@/components/currency-provider"
import { useLanguage } from "@/components/language-provider"
import { TagPill, useAvailableTags } from "@/components/tag-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { notify } from "@/lib/notify"
import { getTranslations } from "@/lib/translation-utils"
import { cn } from "@/lib/utils"
import { UDS } from "@/lib/UDS"

type TransactionDetail = {
    id: string
    date: string
    type: "in" | "out"
    amount: number
    description: string
    tags: string[]
    accountId: string
    saltEdgeId: string | null
    counterpartyRaw: string | null
    createdAt: string
    updatedAt: string
    account: {
        id: string
        name: string
        type: string
        institution: string
        color: string
        currency: string
        iban: string | null
    }
    counterparty: {
        id: string
        displayName: string
        normalizedKey: string
    } | null
}

function formatDate(value: string, locale: string, long = true) {
    const date = new Date(`${value}T00:00:00`)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString(locale, long
        ? { weekday: "long", year: "numeric", month: "long", day: "numeric" }
        : { year: "numeric", month: "short", day: "numeric" })
}

function formatDateTime(value: string, locale: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

function OverviewCell({
    label,
    value,
    detail,
}: {
    label: string
    value: React.ReactNode
    detail?: React.ReactNode
}) {
    return (
        <div className="min-w-0 px-4 py-3 md:px-5">
            <p className="text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">{label}</p>
            <div className="mt-1 min-w-0 truncate text-sm font-semibold text-foreground">{value}</div>
            {detail && <div className="mt-0.5 min-w-0 truncate text-xs text-muted-foreground">{detail}</div>}
        </div>
    )
}

function InfoRow({
    icon,
    label,
    value,
    detail,
}: {
    icon: React.ReactNode
    label: string
    value: React.ReactNode
    detail?: React.ReactNode
}) {
    return (
        <div className="grid min-w-0 grid-cols-[1.75rem_minmax(7rem,0.38fr)_minmax(0,1fr)] items-center gap-3 px-4 py-3.5 max-sm:grid-cols-[1.75rem_1fr] md:px-5">
            <div className="flex size-7 items-center justify-center text-muted-foreground">{icon}</div>
            <p className="text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground max-sm:col-start-2">{label}</p>
            <div className="min-w-0 text-sm font-medium text-foreground max-sm:col-span-2 max-sm:col-start-2">
                <div className="min-w-0 truncate">{value}</div>
                {detail && <div className="mt-0.5 min-w-0 truncate text-xs font-normal text-muted-foreground">{detail}</div>}
            </div>
        </div>
    )
}

function RecordRow({
    label,
    value,
}: {
    label: string
    value: React.ReactNode
}) {
    return (
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 px-4 py-3 text-sm">
            <p className="text-xs text-muted-foreground">{label}</p>
            <div className="flex min-w-0 items-center justify-end text-right font-medium text-foreground">{value}</div>
        </div>
    )
}

function TransactionDetailSkeleton() {
    return (
        <PageSection stagger={2}>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-4">
                    <Card className="overflow-hidden p-0">
                        <div className="space-y-6 p-5 md:p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-3">
                                    <Skeleton className="h-6 w-24 sq-full" />
                                    <Skeleton className="h-9 w-72 max-w-full" />
                                    <Skeleton className="h-4 w-56 max-w-full" />
                                </div>
                                <Skeleton className="h-12 w-36" />
                            </div>
                        </div>
                        <div className={cn("grid border-t md:grid-cols-3 md:divide-x", UDS.cardDivider, UDS.divideLine)}>
                            {Array.from({ length: 3 }).map((_, index) => (
                                <div key={index} className="px-5 py-4">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="mt-2 h-4 w-28" />
                                </div>
                            ))}
                        </div>
                    </Card>
                    <Card className="overflow-hidden p-0">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Skeleton key={index} className="mx-5 my-4 h-8" />
                        ))}
                    </Card>
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-40 sq-normal" />
                    <Skeleton className="h-52 sq-normal" />
                </div>
            </div>
        </PageSection>
    )
}

export default function TransactionDetailPage() {
    const params = useParams<{ id: string }>()
    const id = params.id
    const { t } = useLanguage()
    const { formatCurrency } = useCurrency()
    const locale = t.config?.locale || "en-US"
    const finance = t.finance || {}
    const detailCopy = React.useMemo(() => getTranslations(t, "transaction_detail"), [t])
    const common = React.useMemo(() => getTranslations(t, "common"), [t])
    const tags = useAvailableTags()
    const tagsBySlug = React.useMemo(() => new Map(tags.map((tag) => [tag.slug, tag])), [tags])

    const [transaction, setTransaction] = React.useState<TransactionDetail | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [error, setError] = React.useState("")

    const copy = React.useMemo(() => ({
        transaction: detailCopy.transaction || "Transaction",
        transactions: finance.transactions || "Transactions",
        back: common.back || detailCopy.back || "Back",
        income: detailCopy.income || "Income",
        expense: detailCopy.expense || "Expense",
        amount: detailCopy.amount || "Amount",
        date: detailCopy.date || "Date",
        type: detailCopy.type || "Type",
        account: detailCopy.account || "Account",
        institution: detailCopy.institution || "Institution",
        counterparty: detailCopy.counterparty || "Counterparty",
        noCounterparty: detailCopy.no_counterparty || "No counterparty",
        tags: detailCopy.tags || "Tags",
        noTags: detailCopy.no_tags || "No tags",
        source: detailCopy.source || "Source",
        imported: detailCopy.imported || "Imported",
        manual: detailCopy.manual || "Manual",
        bankSync: detailCopy.bank_sync || "Bank sync",
        createdInArgent: detailCopy.created_in_argent || "Created in Argent",
        details: detailCopy.details || "Details",
        classification: detailCopy.classification || "Classification",
        record: detailCopy.record || "Record",
        created: detailCopy.created || "Created",
        updated: detailCopy.updated || "Updated",
        identifier: detailCopy.identifier || "Identifier",
        copyId: detailCopy.copy_id || "Copy ID",
        notFound: detailCopy.not_found || "Transaction not found",
        notFoundDescription: detailCopy.not_found_description || "This transaction may have been removed or is not available for your account.",
        copied: detailCopy.copied || "ID copied",
        failedLoad: detailCopy.failed_load || "Failed to load transaction",
    }), [common.back, detailCopy, finance.transactions])

    const loadTransaction = React.useCallback(async () => {
        if (!id) return
        setIsLoading(true)
        setError("")
        try {
            const response = await fetch(`/api/transactions/${encodeURIComponent(id)}`)
            if (!response.ok) {
                const body = await response.json().catch(() => ({}))
                throw new Error(body.error || `${copy.failedLoad} (${response.status})`)
            }
            setTransaction(await response.json() as TransactionDetail)
        } catch (err) {
            setTransaction(null)
            setError(err instanceof Error ? err.message : copy.failedLoad)
        } finally {
            setIsLoading(false)
        }
    }, [copy.failedLoad, id])

    React.useEffect(() => {
        loadTransaction()
    }, [loadTransaction])

    const handleCopyId = React.useCallback(() => {
        if (!transaction) return
        navigator.clipboard.writeText(transaction.id)
        notify.success({ title: copy.copied, message: transaction.id, transient: true })
    }, [copy.copied, transaction])

    const currentLabel = copy.transaction
    const isIncome = transaction?.type === "in"
    const counterparty = transaction?.counterparty?.displayName || transaction?.counterpartyRaw || copy.noCounterparty
    const sourceValue = transaction?.saltEdgeId ? copy.imported : copy.manual
    const sourceDetail = transaction?.saltEdgeId ? copy.bankSync : copy.createdInArgent

    return (
        <PageShell className="gap-4 overflow-x-hidden">
            <PageHeader
                breadcrumbs={[
                    { label: t.sidebar_dashboard || "Dashboard", href: "/" },
                    { label: copy.transactions, href: "/Transactions" },
                    { label: currentLabel, href: `/Transactions/${id}` },
                ]}
                isLoading={isLoading}
            />

            {isLoading ? (
                <TransactionDetailSkeleton />
            ) : !transaction ? (
                <PageSection stagger={2} glass>
                    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
                        <div className={`${UDS.iconSurface} flex size-12 items-center justify-center text-muted-foreground`}>
                            <AlertTriangle className="size-5" />
                        </div>
                        <div className="max-w-md space-y-1">
                            <h1 className="text-xl font-semibold text-foreground">{copy.notFound}</h1>
                            <p className="text-sm text-muted-foreground">{error || copy.notFoundDescription}</p>
                        </div>
                        <Button asChild variant="glass" size="sm">
                            <Link href="/Transactions">
                                <ArrowLeft className="size-4" />
                                {copy.back}
                            </Link>
                        </Button>
                    </div>
                </PageSection>
            ) : (
                <PageSection stagger={2}>
                    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
                        <div className="min-w-0 space-y-4">
                            <Card className="overflow-hidden p-0">
                                <div className="p-4 md:p-5">
                                    <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-start md:justify-between">
                                        <div className="min-w-0 space-y-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button asChild variant="glass" size="sm">
                                                    <Link href="/Transactions">
                                                        <ArrowLeft className="size-4" />
                                                        {copy.back}
                                                    </Link>
                                                </Button>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "h-8 w-auto gap-1.5 sq-lg px-2.5",
                                                        isIncome
                                                            ? UDS.semanticBadge.positive
                                                            : UDS.destructiveBadge,
                                                    )}
                                                >
                                                    {isIncome
                                                        ? <ArrowUpRight className="size-3.5" />
                                                        : <ArrowDownRight className="size-3.5" />}
                                                    {isIncome ? copy.income : copy.expense}
                                                </Badge>
                                            </div>

                                            <div className="min-w-0 space-y-2">
                                                <h1 className="max-w-3xl text-2xl font-semibold leading-tight text-foreground [overflow-wrap:anywhere] md:text-3xl">
                                                    {transaction.description}
                                                </h1>
                                                <p className="text-sm text-muted-foreground">{formatDate(transaction.date, locale)}</p>
                                            </div>
                                        </div>

                                        <div className="min-w-0 shrink-0 md:text-right">
                                            <p className="text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">{copy.amount}</p>
                                            <p
                                                className={cn(
                                                    "mt-1 max-w-full break-words text-4xl font-semibold leading-none tabular-nums md:text-5xl",
                                                    isIncome
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : "text-red-600 dark:text-red-400",
                                                )}
                                            >
                                                {isIncome ? "+" : "-"}{formatCurrency(transaction.amount)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={cn("grid border-t md:grid-cols-3 md:divide-x", UDS.cardDivider, UDS.divideLine)}>
                                    <OverviewCell
                                        label={copy.account}
                                        value={
                                            <span className="inline-flex min-w-0 items-center gap-2">
                                                <span
                                                    className="size-2 shrink-0 sq-full"
                                                    style={{ backgroundColor: transaction.account.color || "var(--muted-foreground)" }}
                                                />
                                                <span className="truncate">{transaction.account.name}</span>
                                            </span>
                                        }
                                        detail={transaction.account.institution}
                                    />
                                    <OverviewCell
                                        label={copy.counterparty}
                                        value={counterparty}
                                        detail={transaction.counterparty?.normalizedKey}
                                    />
                                    <OverviewCell
                                        label={copy.source}
                                        value={sourceValue}
                                        detail={sourceDetail}
                                    />
                                </div>
                            </Card>

                            <Card className="overflow-hidden p-0">
                                <div className="flex items-center gap-2 px-4 py-3.5 md:px-5">
                                    <ReceiptText className="size-4 text-muted-foreground" />
                                    <h2 className="text-sm font-semibold text-foreground">{copy.details}</h2>
                                </div>
                                <div className={cn("divide-y border-t", UDS.cardDivider, UDS.divideLine)}>
                                    <InfoRow
                                        icon={<CalendarDays className="size-4" />}
                                        label={copy.date}
                                        value={formatDate(transaction.date, locale)}
                                        detail={formatDate(transaction.date, locale, false)}
                                    />
                                    <InfoRow
                                        icon={<ReceiptText className="size-4" />}
                                        label={copy.type}
                                        value={isIncome ? copy.income : copy.expense}
                                        detail={isIncome ? copy.income : copy.expense}
                                    />
                                    <InfoRow
                                        icon={<Landmark className="size-4" />}
                                        label={copy.account}
                                        value={transaction.account.name}
                                        detail={transaction.account.iban || transaction.account.currency}
                                    />
                                    <InfoRow
                                        icon={<Building2 className="size-4" />}
                                        label={copy.institution}
                                        value={transaction.account.institution}
                                        detail={transaction.account.type}
                                    />
                                    <InfoRow
                                        icon={<UserRound className="size-4" />}
                                        label={copy.counterparty}
                                        value={counterparty}
                                        detail={transaction.counterparty?.normalizedKey}
                                    />
                                </div>
                            </Card>
                        </div>

                        <aside className="min-w-0 space-y-4 lg:self-start">
                            <Card className="overflow-hidden p-0">
                                <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <Tag className="size-4 shrink-0 text-muted-foreground" />
                                        <h2 className="truncate text-sm font-semibold text-foreground">{copy.classification}</h2>
                                    </div>
                                    <span className={cn("shrink-0 px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums", UDS.pillSurface)}>
                                        {transaction.tags.length}
                                    </span>
                                </div>
                                <div className={cn("border-t px-4 py-4", UDS.cardDivider)}>
                                    {transaction.tags.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {transaction.tags.map((slug) => {
                                                const tag = tagsBySlug.get(slug)
                                                return (
                                                    <TagPill
                                                        key={slug}
                                                        slug={slug}
                                                        name={tag?.name}
                                                        color={tag?.color}
                                                        className="h-6 px-2.5 text-xs"
                                                    />
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">{copy.noTags}</p>
                                    )}
                                </div>
                            </Card>

                            <Card className="overflow-hidden p-0">
                                <div className="flex items-center gap-2 px-4 py-3.5">
                                    <Clock3 className="size-4 text-muted-foreground" />
                                    <h2 className="text-sm font-semibold text-foreground">{copy.record}</h2>
                                </div>
                                <div className={cn("divide-y border-t", UDS.cardDivider, UDS.divideLine)}>
                                    <RecordRow
                                        label={copy.identifier}
                                        value={
                                            <span className="flex min-w-0 items-center justify-end gap-1.5">
                                                <span className="truncate font-mono text-xs">{transaction.id}</span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    aria-label={copy.copyId}
                                                    onClick={handleCopyId}
                                                    className="shrink-0"
                                                >
                                                    <ClipboardCopy className="size-3.5" />
                                                </Button>
                                            </span>
                                        }
                                    />
                                    <RecordRow
                                        label={copy.source}
                                        value={
                                            <span className="flex min-w-0 items-center justify-end gap-1.5">
                                                <Hash className="size-3.5 shrink-0 text-muted-foreground" />
                                                <span className="truncate">{sourceValue}</span>
                                            </span>
                                        }
                                    />
                                    <RecordRow label={copy.created} value={formatDateTime(transaction.createdAt, locale)} />
                                    <RecordRow label={copy.updated} value={formatDateTime(transaction.updatedAt, locale)} />
                                </div>
                            </Card>
                        </aside>
                    </div>
                </PageSection>
            )}
        </PageShell>
    )
}
