'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input, OTPInput } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { OAuthButtons } from '@/components/oauth-buttons'
import { AuthShell, AuthHeader, ErrorAlert } from '@/components/auth'
import { BTN_PRIMARY, BTN_OUTLINE, DIVIDER_LINE, DIVIDER_LABEL } from '@/lib/styles'
import { useLanguage } from '@/components/language-provider'
import { Loader2, ArrowRight, ArrowLeft, RotateCw } from 'lucide-react'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

type AuthRole = 'user' | 'admin' | 'superadmin'

// Describes the JSON response from /api/auth/login.
type LoginResponse = {
    error?: string
    needs_2fa?: boolean
    tempToken?: string
    role?: AuthRole
}

async function postAuth<T>(url: string, body: unknown): Promise<{ ok: boolean; data: T }> {
    let res: Response
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: JSON_HEADERS,
            credentials: 'include',
            body: JSON.stringify(body)
        })
    } catch {
        throw new Error('network')
    }
    
    return { ok: res.ok, data: await res.json() as T }
}

export default function LoginPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const searchParams = useSearchParams()
    const page = t.login_page

    const [email, setEmail] = useState('')                          // Stores the user's email input
    const [password, setPassword] = useState('')                    // Stores the user's password input
    const [error, setError] = useState('')                          // Stores any error messages to display to the user
    const [loading, setLoading] = useState(false)                   // Prevents the user from clicking submit multiple times and shows a loading state

    const [needs2FA, setNeeds2FA] = useState(false)                 // Indicates whether to show the 2FA page
    const [tempToken, setTempToken] = useState('')                  // Stores a temporary token for 2FA
    const [twoFactorCode, setTwoFactorCode] = useState('')          // Stores the user's 2FA code input
    const [trustDevice, setTrustDevice] = useState(true)            // Indicates if the user wants to trust the current device
    const [resendCooldown, setResendCooldown] = useState(0)         // Cooldown timer for resend 2FA code button
    const [resending, setResending] = useState(false)               // Indicates if the 2FA code is being resent


    useEffect(() => {
        if (resendCooldown <= 0) return

        const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
        return () => clearTimeout(timer)
    }, [resendCooldown])


    // Send the login request to api/auth/login and return the response data. This is used by both the initial login attempt and the resend code function, since they have the same behavior when 2FA is required.
    const attemptLogin = useCallback(async () => {
        const { ok, data } = await postAuth<LoginResponse>('/api/auth/login', { email, password })
        
        if (!ok) {
            setError(data.error || page?.error_login_failed)
            return
        }

        return data
    }, [email, password, page])


    const handleResendCode = useCallback(async () => {
        if (resending || resendCooldown > 0 || !email || !password) return
        setResending(true)
        setError('')

        try {
            const data = await attemptLogin()

            if (data?.needs_2fa) {
                setTempToken(data.tempToken || '')
                setTwoFactorCode('')
                setResendCooldown(30)
            }

        } catch (e) {
            setError(e instanceof Error && e.message === 'network'
                ? page?.error_network
                : page?.error_generic)

        } finally {
            setResending(false)
        }
    }, [resending, resendCooldown, email, password, page, attemptLogin])

    const reset2FAState = useCallback(() => {
        setNeeds2FA(false)
        setTempToken('')
        setTwoFactorCode('')
        setError('')
    }, [])


    // Decides where to redirect the user after a login based on the role and the presence of a callbackUrl
    /* Diference between isAdmin and wantsAdmin is that isAdmin checks the user's role, while wantsAdmin checks if the callbackUrl is an admin page.
     * This prevents a non-admin user from being redirected to an admin page via a manipulated callbackUrl, and also prevents an admin user from being redirected to a non-admin page if the callbackUrl is not an admin page. */
    const redirectAfterAuth = useCallback((role?: AuthRole) => {
        const callbackUrl = searchParams.get('callbackUrl') || ''
        const isAdmin = role === 'admin' || role === 'superadmin'
        const wantsAdmin = callbackUrl.startsWith('/admin')

        if (isAdmin) {
            router.replace(wantsAdmin ? callbackUrl : '/admin')
            return
        }

        if (wantsAdmin) {
            router.replace('/')
            return
        }

        router.replace(callbackUrl || '/')
    }, [router, searchParams])


    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()

        if (loading) return
        setError('')
        
        if (!email || !password) { setError(page?.error_fields_required); return }
        setLoading(true)

        try {
            const data = await attemptLogin()
            
            if (!data) return

            if (data.needs_2fa) {
                setTempToken(data.tempToken || '')
                setNeeds2FA(true)
                return
            }

            redirectAfterAuth(data.role)

        } catch (e) {
            setError(e instanceof Error && e.message === 'network'
                ? page?.error_network
                : page?.error_generic)

        } finally {
            setLoading(false)
        }
    }, [loading, email, password, page, attemptLogin, redirectAfterAuth])

    // Handles the submission of the 2FA code. Sends the tempToken, 2FA code and trustDevice flag to api/auth/2fa-login and redirects on success.
    const handle2FASubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()

        if (loading) return
        setError('')

        if (!twoFactorCode) { setError(page?.error_2fa_required); return }
        setLoading(true)

        try {
            const { ok, data } = await postAuth<{ error?: string; role?: AuthRole }>('/api/auth/2fa-login', { tempToken, code: twoFactorCode, trustDevice })

            if (!ok) { setError(data.error || page?.error_2fa_invalid); return }

            redirectAfterAuth(data.role)

        } catch (e) {
            setError(e instanceof Error && e.message === 'network'
                ? page?.error_network
                : page?.error_generic)
            
        } finally {
            setLoading(false)
        }
    }, [loading, twoFactorCode, tempToken, trustDevice, page, redirectAfterAuth])


    return (
        <AuthShell>
            <form onSubmit = {needs2FA ? handle2FASubmit : handleSubmit} className = "flex flex-col gap-8 | w-full | animate-slide-in-right">
                <ErrorAlert message = {error} />

                {needs2FA ? (
                    <div className = "flex flex-col items-center gap-8">
                        <div className = "flex flex-col gap-2 | text-center">
                            <h1 className = "text-black dark:text-white text-2xl font-bold">{page?.two_factor_title}</h1>
                            <div className = "flex items-center justify-center gap-2 | text-sm whitespace-nowrap text-neutral-500 dark:text-neutral-400">
                                <p>{page?.two_factor_subtitle}</p>
                                <span>•</span>
                                <button
                                    type = "button"
                                    onClick = {handleResendCode}
                                    disabled = {resending || resendCooldown > 0}
                                    className = "flex items-center gap-1 | hover:text-black dark:hover:text-white | transition-colors disabled:opacity-40 disabled:hover:text-neutral-500 dark:disabled:hover:text-neutral-400"
                                >
                                    <RotateCw className = {`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                                    {resending
                                        ? (page?.resending_code)
                                        : resendCooldown > 0
                                            ? `${page?.resend_code} (${resendCooldown}s)`
                                            : (page?.resend_code)
                                    }
                                </button>
                            </div>
                        </div>

                        <OTPInput value = {twoFactorCode} onChange = {setTwoFactorCode} disabled = {loading} autoFocus />

                        <label className = "flex items-center gap-2 justify-center cursor-pointer select-none group">
                            <Checkbox
                                checked = {trustDevice}
                                onCheckedChange = {(v) => setTrustDevice(v === true)}
                                disabled = {loading}
                                className = "h-4 w-4 | rounded border-black/15 dark:border-white/15 data-[state=checked]:bg-black dark:data-[state=checked]:bg-white data-[state=checked]:border-transparent"
                            />
                            <span className = "text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 | transition-colors">{page?.trust_device}</span>
                        </label>
                    </div>
                ) : (
                    <div className = "flex flex-col gap-4">
                        <AuthHeader page = "login" />

                        <Input id = "email" type = "email" label = {page?.email_label} value = {email} onChange = {e => setEmail(e.target.value)} disabled = {loading} required />
                        <Input id = "password" type = "password" label = {page?.password_label} value = {password} onChange = {e => setPassword(e.target.value)} disabled = {loading} required showPasswordLabel = {page?.show_password} hidePasswordLabel = {page?.hide_password} />
                        <Link href = "/forgot-password" className = "self-end | w-fit | text-sm link-underline">{page?.forgot_password}</Link>
                    </div>
                )}

                <div className = "flex flex-col gap-4 | w-full | animate-slide-in-right">
                    <Button type = "submit" className = {BTN_PRIMARY} disabled = {loading}>
                        {loading
                            ? <><Loader2 className = "w-4 h-4 | animate-spin" />{needs2FA ? (page?.verifying) : (page?.signing_in)}</>
                            : <>{needs2FA ? (page?.verify) : (page?.sign_in)}<ArrowRight className = "w-4 h-4 | transition-transform | group-hover:translate-x-1" /></>
                        }
                    </Button>

                    {needs2FA ? (
                        <Button type = "button" variant = "outline" onClick = {reset2FAState} className = {`${BTN_OUTLINE} group/back`}>
                            <ArrowLeft className = "w-4 h-4 | transition-transform duration-200 | group-hover/back:-translate-x-1" />{page?.use_different_account}
                        </Button>
                    ) : (
                        <>
                            <div className = "flex items-center gap-4">
                                <div className = {DIVIDER_LINE} />
                                <span className = {DIVIDER_LABEL}>{t.oauth_buttons?.divider_label}</span>
                                <div className = {DIVIDER_LINE} />
                            </div>

                            <div className = "pb-2">
                                <OAuthButtons mode = "login" />
                            </div>

                            <p className = "flex items-center justify-center gap-1 | text-sm text-center text-neutral-500 dark:text-neutral-400">
                                {page?.no_account}
                                <Link href = "/register" className = "link-underline">{page?.create_one}</Link>
                            </p>
                        </>
                    )}
                </div>
            </form>
        </AuthShell>
    )
}