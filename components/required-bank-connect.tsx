//
//  required-bank-connect.tsx
//  Argent
//
//  Created by Codex on 07 June 2026.
//  Description: Renders the required first bank connection step used during onboarding.
//
"use client"

import { useCallback, useState } from "react"
import { Building2, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorAlert } from "@/components/auth"
import { UDS } from "@/lib/UDS"
import { postAuth } from "@/lib/auth-fetch"

export function RequiredBankConnect({
    title = "Connect a bank to finish setup",
    description = "A connected bank account is required before you can use Argent.",
    returnToPath = "/connect-bank/callback?redirect=%2F",
    buttonLabel = "Connect Your Bank",
}: {
    title?: string
    description?: string
    returnToPath?: string
    buttonLabel?: string
}) {
    const [isConnectingBank, setIsConnectingBank] = useState(false)
    const [connectError, setConnectError] = useState("")

    const handleBankConnect = useCallback(async () => {
        setIsConnectingBank(true)
        setConnectError("")

        try {
            const returnTo = `${window.location.origin}${returnToPath}`
            const { ok, data } = await postAuth<{ error?: string; connectUrl?: string }>("/api/bank/connect", {
                returnTo,
                action: "connect",
            })

            if (!ok || !data.connectUrl) {
                throw new Error(data.error || "Failed to create connect session")
            }

            window.location.assign(data.connectUrl)
        } catch (err) {
            setConnectError(err instanceof Error ? err.message : "Connection failed")
            setIsConnectingBank(false)
        }
    }, [returnToPath])

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-14 items-center justify-center sq-full bg-emerald-500/10">
                    <CheckCircle2 className="size-7 text-emerald-500 dark:text-emerald-400" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">{title}</h1>
                <p className="text-base text-neutral-400">{description}</p>
            </div>

            <div className={`${UDS.surface} p-4`}>
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center sq-full bg-blue-500/10">
                        <Building2 className="size-4 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div className="text-sm">
                        <p className="font-medium text-black dark:text-white">How it works</p>
                        <ol className="mt-1.5 list-inside list-decimal space-y-1 text-neutral-400">
                            <li>You will be redirected to Salt Edge Connect</li>
                            <li>Choose your bank and log in securely</li>
                            <li>Authorize Argent to read your data</li>
                            <li>Accounts and transactions are imported automatically</li>
                        </ol>
                    </div>
                </div>
            </div>

            <div className={`${UDS.surface} border-dashed p-3 text-center text-xs text-neutral-400`}>
                <p>Your banking credentials are handled directly by your bank.</p>
                <p className="mt-1">Argent never sees or stores your login details.</p>
            </div>

            <ErrorAlert message={connectError} />

            <Button
                type="button"
                variant="solid"
                size="lg"
                className="auth-primary-button w-full gap-2"
                disabled={isConnectingBank}
                onClick={handleBankConnect}
            >
                {isConnectingBank ? (
                    <>
                        <Loader2 className="size-5 animate-spin" />
                        Connecting...
                    </>
                ) : (
                    <>
                        <Building2 className="size-5" />
                        {buttonLabel}
                    </>
                )}
            </Button>
        </div>
    )
}
