//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /forgot-password route in Argent, composing page-level layout, data
//  dependencies, and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AuthShell,
  AuthHeader,
  BackButton,
  StatusCard,
  ErrorAlert,
} from '@/components/auth'
import { useLanguage, useTranslationNamespace } from '@/components/language-provider'
import { postAuth } from '@/lib/auth-fetch'
import { useResendCooldown } from '@/hooks/use-resend-cooldown'
import { Loader2, ArrowRight, CheckCircle2, RotateCw } from 'lucide-react'

const RESEND_COOLDOWN = 30

export default function ForgotPasswordPage() {
    const { t } = useLanguage()
    const page = t.forgot_password_page
    const fe = useTranslationNamespace('forgot_password_extra')

    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const [resending, setResending] = useState(false)
    const [resendError, setResendError] = useState('')
    const [devResetUrl, setDevResetUrl] = useState('')
    const [devNotice, setDevNotice] = useState('')
    const { remaining: resendCooldown, start: startCooldown, isCoolingDown } = useResendCooldown(RESEND_COOLDOWN)

    const sendResetRequest = useCallback(async (target: string) => {
        const { ok, data } = await postAuth<{ error?: string; devResetUrl?: string; devNotice?: string }>('/api/auth/forgot-password', { email: target })
        return {
            ok,
            error: ok ? null : (data.error || (fe.error_send_failed || 'Failed to send reset email.')),
            devResetUrl: ok ? (data.devResetUrl || '') : '',
            devNotice: ok ? (data.devNotice || '') : '',
        }
    }, [fe])

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setDevResetUrl('')
        setDevNotice('')

        const normalizedEmail = email.trim()
        if (!normalizedEmail) { setError(page?.error_email_required); return }

        setEmail(normalizedEmail)
        setLoading(true)

        try {
            const { ok, error: apiError, devResetUrl: nextDevResetUrl, devNotice: nextDevNotice } = await sendResetRequest(normalizedEmail)
            if (!ok) { setError(apiError!); return }
            setDevResetUrl(nextDevResetUrl)
            setDevNotice(nextDevNotice)
            setSuccess(true)
            startCooldown()
        } catch (e) {
            setError(e instanceof Error ? e.message : (fe.error_unknown || 'Unknown error.'))
        } finally {
            setLoading(false)
        }
    }, [email, page, fe, sendResetRequest, startCooldown])

    const handleResend = useCallback(async () => {
        if (resending || isCoolingDown || !email) return
        setResending(true)
        setResendError('')
        setDevResetUrl('')
        setDevNotice('')
        try {
            const { ok, error: apiError, devResetUrl: nextDevResetUrl, devNotice: nextDevNotice } = await sendResetRequest(email)
            if (!ok) { setResendError(apiError!); return }
            setDevResetUrl(nextDevResetUrl)
            setDevNotice(nextDevNotice)
            startCooldown()
        } catch (e) {
            setResendError(e instanceof Error ? e.message : (fe.error_unknown || 'Unknown error.'))
        } finally {
            setResending(false)
        }
    }, [resending, isCoolingDown, email, fe, sendResetRequest, startCooldown])

    return (
        <AuthShell>
            {success ? (
                <StatusCard
                    tone="success"
                    icon={CheckCircle2}
                    title={page?.success_title}
                    description={
                        <>
                            {page?.success_message}
                            <span className="font-medium text-neutral-400">{email}</span>
                        </>
                    }
                >
                    <ErrorAlert message={resendError} />
                    {devNotice || devResetUrl ? (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left text-xs text-amber-700 dark:text-amber-200">
                            <p className="font-medium">Local development</p>
                            {devNotice ? <p className="mt-1">{devNotice}</p> : null}
                            {devResetUrl ? (
                                <p className="mt-2 break-all">
                                    <a href={devResetUrl} className="underline underline-offset-2">
                                        {devResetUrl}
                                    </a>
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                    <Button
                        type="button"
                        variant="glass"
                        size="lg"
                        className="w-full"
                        onClick={handleResend}
                        disabled={resending || isCoolingDown}
                    >
                        <RotateCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                        {resending
                            ? (fe.resending || 'Resending...')
                            : isCoolingDown
                                ? `${fe.resend_email || 'Resend email'} (${resendCooldown}s)`
                                : (fe.resend_email || 'Resend email')}
                    </Button>
                    <BackButton href="/login" label={page?.back_to_login} />
                </StatusCard>
            ) : (
                <>
                    <AuthHeader page="forgot_password" />

                    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8 animate-slide-in-right">
                        <ErrorAlert message={error} />

                        <Input id="email" type="email" label={page?.email_label} value={email} onChange={e => setEmail(e.target.value)} disabled={loading} required />

                        <div className="flex flex-col gap-4">
                            <Button type="submit" variant="solid" size="lg" className="w-full" disabled={loading}>
                                {loading
                                    ? <><Loader2 className="w-4 h-4 animate-spin" />{page?.sending}</>
                                    : <>{page?.send_reset_link}<ArrowRight className="w-4 h-4" /></>
                                }
                            </Button>

                            <BackButton href="/login" label={page?.back_to_login} />
                        </div>
                    </form>
                </>
            )}
        </AuthShell>
    )
}
