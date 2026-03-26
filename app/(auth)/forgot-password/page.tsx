'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthShell, AuthHeader, ErrorAlert } from '@/components/auth'
import { BTN_PRIMARY, BTN_OUTLINE, ICON_BADGE } from '@/lib/styles'
import { useLanguage } from '@/components/language-provider'
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function postAuth<T>(url: string, body: unknown): Promise<{ ok: boolean; data: T }> {
    let res: Response
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: JSON_HEADERS,
            body: JSON.stringify(body),
        })
    } catch {
        throw new Error('Network error — check your internet connection.')
    }

    let data: T
    try {
        data = await res.json() as T
    } catch {
        throw new Error(`Server returned ${res.status} with no JSON body.`)
    }

    return { ok: res.ok, data }
}

export default function ForgotPasswordPage() {
    const { t } = useLanguage()
    const page = t.forgot_password_page

    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!email) { setError(page?.error_email_required); return }
        setLoading(true)

        try {
            const { ok, data } = await postAuth<{ error?: string }>('/api/auth/forgot-password', { email })

            if (!ok) { setError(data.error || 'Failed to send reset email.'); return }
            setSuccess(true)

        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error.')

        } finally {
            setLoading(false)
        }
    }, [email, page])

    return (
        <AuthShell>
            {success ? (
                <div className = "flex flex-col gap-8 | animate-slide-in-right">
                    <div className = "flex flex-col items-center gap-8">
                        <div className = {`${ICON_BADGE} bg-emerald-500/10 border border-emerald-500/20`}>
                            <CheckCircle2 className = "w-8 h-8 text-emerald-500" />
                        </div>

                        <div className = "flex flex-col gap-2 | text-center">
                            <h3 className = "text-2xl font-semibold text-black dark:text-white">{page?.success_title}</h3>
                            <p className = "text-sm text-center text-neutral-500 dark:text-neutral-400 max-w-xs">
                                {page?.success_message}
                                <span className = "font-medium text-neutral-700 dark:text-neutral-300">{email}</span>
                            </p>
                        </div>
                    </div>

                    <Link href = "/login" className = "block">
                        <Button variant = "outline" className = {`${BTN_OUTLINE} group/back`}>
                            <ArrowLeft className = "w-4 h-4 mr-2 | transition-transform duration-200 | group-hover/back:-translate-x-1" />
                            {page?.back_to_login}
                        </Button>
                    </Link>
                </div>

            ) : (
                <>
                    <AuthHeader page = "forgot_password" />

                    <form onSubmit = {handleSubmit} noValidate className = "flex flex-col gap-8 | animate-slide-in-right">
                        <ErrorAlert message = {error} />

                        <Input id = "email" type = "email" label = {page?.email_label} value = {email} onChange = {e => setEmail(e.target.value)} disabled = {loading} required />

                        <div className = "flex flex-col gap-4">
                            <Button type = "submit" className = {BTN_PRIMARY} disabled = {loading}>
                                {loading
                                    ? <><Loader2 className = "w-4 h-4 | animate-spin" />{page?.sending}</>
                                    : <>{page?.send_reset_link}<ArrowRight className = "w-4 h-4 | transition-transform group-hover:translate-x-1" /></>
                                }
                            </Button>

                            <Link href = "/login" className = "block">
                                <Button type = "button" variant = "outline" className = {`${BTN_OUTLINE} group/back`}>
                                    <ArrowLeft className = "w-4 h-4 | transition-transform duration-200 | group-hover/back:-translate-x-1" />
                                    {page?.back_to_login}
                                </Button>
                            </Link>
                        </div>
                    </form>
                </>
            )}
        </AuthShell>
    )
}
