'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input, OTPInput } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { OAuthButtons } from '@/components/oauth-buttons'
import { AuthShell, AuthHeader, BackButton, ErrorAlert, BTN_PRIMARY } from '@/components/auth'
import { PRISM } from '@/lib/PRISM'
import { useLanguage, useTranslationNamespace } from '@/components/language-provider'
import { postAuth as postAuthBase } from '@/lib/auth-fetch'
import { useResendCooldown } from '@/hooks/use-resend-cooldown'
import { Loader2, ArrowRight, RotateCw } from 'lucide-react'

type AuthRole = 'user' | 'admin' | 'superadmin'

// Describes the JSON response from /api/auth/login.
type LoginResponse = {
    error?: string
    needs_2fa?: boolean
    tempToken?: string
    dev2FACode?: string
    role?: AuthRole
}

// Login flow always sends cookies (session token returned in cookie response).
const postAuth = <T,>(url: string, body: unknown) => postAuthBase<T>(url, body, { withCredentials: true })

export default function LoginPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const searchParams = useSearchParams()
    const page = t.login_page
    const le = useTranslationNamespace('login_page_extra')

    const [email, setEmail] = useState('')                          // Stores the user's email input
    const [password, setPassword] = useState('')                    // Stores the user's password input
    const [error, setError] = useState('')                          // Stores any error messages to display to the user
    const [loading, setLoading] = useState(false)                   // Prevents the user from clicking submit multiple times and shows a loading state

    const [needs2FA, setNeeds2FA] = useState(false)                 // Indicates whether to show the 2FA page
    const [tempToken, setTempToken] = useState('')                  // Stores a temporary token for 2FA
    const [dev2FACode, setDev2FACode] = useState('')                // Local fallback code when email delivery is unavailable
    const [twoFactorCode, setTwoFactorCode] = useState('')          // Stores the user's 2FA code input
    const [trustDevice, setTrustDevice] = useState(true)            // Indicates if the user wants to trust the current device
    const { remaining: resendCooldown, start: startResendCooldown, isCoolingDown } = useResendCooldown(30)
    const [resending, setResending] = useState(false)               // Indicates if the 2FA code is being resent

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
        if (resending || isCoolingDown || !email || !password) return
        setResending(true)
        setError('')

        try {
            const data = await attemptLogin()

            if (data?.needs_2fa) {
                setTempToken(data.tempToken || '')
                setDev2FACode(data.dev2FACode || '')
                setTwoFactorCode('')
                startResendCooldown()
            }

        } catch (e) {
            setError(e instanceof Error ? e.message : (le.error_resend_unknown || 'Unknown error while resending code.'))

        } finally {
            setResending(false)
        }
    }, [resending, isCoolingDown, email, password, attemptLogin, startResendCooldown, le])

    const reset2FAState = useCallback(() => {
        setNeeds2FA(false)
        setTempToken('')
        setDev2FACode('')
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
    }, [searchParams, router])

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
                setDev2FACode(data.dev2FACode || '')
                setNeeds2FA(true)
                return
            }

            redirectAfterAuth(data.role)

        } catch (e) {
            setError(e instanceof Error ? e.message : (le.error_login_unknown || 'Unknown error during login.'))

        } finally {
            setLoading(false)
        }
    }, [loading, email, password, attemptLogin, redirectAfterAuth, page, le])

    // Handles the submission of the 2FA code. Sends the tempToken, 2FA code and trustDevice flag to api/auth/2fa-login and redirects on success.
    const handle2FASubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()

        if (loading) return
        setError('')

        if (!twoFactorCode) { setError(page?.error_2fa_required); return }
        setLoading(true)

        try {
            const { ok, data } = await postAuth<LoginResponse>('/api/auth/2fa-login', { tempToken, code: twoFactorCode, trustDevice })

            if (!ok) { setError(data.error || page?.error_2fa_invalid); return }

            redirectAfterAuth(data.role)

        } catch (e) {
            setError(e instanceof Error ? e.message : (le.error_2fa_unknown || 'Unknown error during 2FA verification.'))
            
        } finally {
            setLoading(false)
        }
    }, [loading, twoFactorCode, tempToken, trustDevice, page, redirectAfterAuth, le])


    return (
        <AuthShell>
            <form onSubmit = {needs2FA ? handle2FASubmit : handleSubmit} noValidate className = "flex flex-col gap-8 | w-full | animate-slide-in-right">
                <ErrorAlert message={error} />

                {needs2FA ? (
                    <div className = "flex flex-col items-center gap-8">
                        <div className = "flex flex-col gap-2 | text-center">
                            <h1 className = "text-black dark:text-white text-2xl font-bold">{page?.two_factor_title}</h1>
                            <div className = "flex items-center justify-center gap-2 | text-sm whitespace-nowrap text-neutral-400">
                                <p>{page?.two_factor_subtitle}</p>
                                <span>•</span>
                                <button
                                    type = "button"
                                    onClick = {handleResendCode}
                                    disabled = {resending || isCoolingDown}
                                    className = "flex items-center gap-1 | hover:text-black dark:hover:text-white | transition-colors disabled:opacity-40 disabled:hover:text-neutral-400 dark:disabled:hover:text-neutral-400"
                                >
                                    <RotateCw className = {`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                                    {resending
                                        ? (page?.resending_code)
                                        : isCoolingDown
                                            ? `${page?.resend_code} (${resendCooldown}s)`
                                            : (page?.resend_code)
                                    }
                                </button>
                            </div>
                        </div>

                        <OTPInput value = {twoFactorCode} onChange = {setTwoFactorCode} disabled = {loading} autoFocus />

                        {dev2FACode ? (
                            <div className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left text-xs text-amber-200">
                                <p className="font-medium">Local development fallback</p>
                                <p className="mt-1">Use this temporary code: <span className="font-mono tracking-[0.2em]">{dev2FACode}</span></p>
                            </div>
                        ) : null}

                        <label className = "flex items-center gap-2 justify-center cursor-pointer select-none group">
                            <Checkbox
                                checked = {trustDevice}
                                onCheckedChange = {(v) => setTrustDevice(v === true)}
                                disabled = {loading}
                                className = "h-4 w-4 | rounded border-black/15 dark:border-white/15 data-[state=checked]:bg-black dark:data-[state=checked]:bg-white data-[state=checked]:border-transparent"
                            />
                            <span className = "text-xs text-neutral-400 group-hover:text-neutral-400 dark:group-hover:text-neutral-400 | transition-colors">{page?.trust_device}</span>
                        </label>
                    </div>
                ) : (
                    <div className = "flex flex-col gap-4">
                        <AuthHeader page = "login" />

                        <Input id = "email" type = "email" label = {page?.email_label} value = {email} onChange = {e => setEmail(e.target.value)} disabled = {loading} required />
                        <Input id = "password" type = "password" label = {page?.password_label} value = {password} onChange = {e => setPassword(e.target.value)} disabled = {loading} required showPasswordLabel = {page?.show_password} hidePasswordLabel = {page?.hide_password} />
                        <Link href = "/forgot-password" className = "self-end | w-fit | text-sm">{page?.forgot_password}</Link>
                    </div>
                )}

                <div className = "flex flex-col gap-4 | w-full | animate-slide-in-right">
                    <Button type = "submit" variant = "solid" size="lg" className = {BTN_PRIMARY} disabled = {loading}>
                        {loading
                            ? <><Loader2 className = "w-4 h-4 | animate-spin" />{needs2FA ? (page?.verifying) : (page?.signing_in)}</>
                            : <>{needs2FA ? (page?.verify) : (page?.sign_in)}<ArrowRight className = "w-4 h-4" /></>
                        }
                    </Button>

                    {needs2FA ? (
                        <BackButton onClick={reset2FAState} label={page?.use_different_account || 'Use a different account'} />
                    ) : (
                        <>
                            <div className = "flex items-center gap-4">
                                <div className = {PRISM.dividerLine} />
                                <span className = {PRISM.dividerLabel}>{t.oauth_buttons?.divider_label}</span>
                                <div className = {PRISM.dividerLine} />
                            </div>

                            <div className = "pb-2">
                                <OAuthButtons mode = "login" />
                            </div>

                            <p className = "flex items-center justify-center gap-1 | text-sm text-center text-neutral-400">
                                {page?.no_account}
                                <Link href = "/register">{page?.create_one}</Link>
                            </p>
                        </>
                    )}
                </div>
            </form>
        </AuthShell>
    )
}
