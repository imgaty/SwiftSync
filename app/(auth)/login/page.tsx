//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /login route in Argent, composing page-level layout, data dependencies, and
//  feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input, OTPInput } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { OAuthButtons } from '@/components/oauth-buttons'
import { AuthShell, AuthHeader, BackButton, ErrorAlert } from '@/components/auth'
import { PRISM } from '@/lib/PRISM'
import { useLanguage, useTranslationNamespace } from '@/components/language-provider'
import { postAuth as postAuthBase } from '@/lib/auth-fetch'
import { isAdminPath, safeRedirectPath } from '@/lib/auth-redirect'
import { Loader2, ArrowRight } from 'lucide-react'

type AuthRole = 'user' | 'admin' | 'superadmin'

// Describes the JSON response from /api/auth/login.
type LoginResponse = {
    error?: string
    needs_2fa?: boolean
    tempToken?: string
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
    const [twoFactorCode, setTwoFactorCode] = useState('')          // Stores the user's 2FA code input
    const [backupCode, setBackupCode] = useState('')
    const [useBackupCode, setUseBackupCode] = useState(false)
    const [trustDevice, setTrustDevice] = useState(false)           // Indicates if the user wants to trust the current device

    // Send the login request to api/auth/login and return the response data.
    const attemptLogin = useCallback(async () => {
        const { ok, data } = await postAuth<LoginResponse>('/api/auth/login', { email, password })
        if (!ok) {
            setError(data.error || page?.error_login_failed)
            return
        }
        
        return data
    }, [email, password, page])


    const reset2FAState = useCallback(() => {
        setNeeds2FA(false)
        setTempToken('')
        setTwoFactorCode('')
        setBackupCode('')
        setUseBackupCode(false)
        setError('')
    }, [])

    // Decides where to redirect the user after a login based on the role and the presence of a callbackUrl
    /* Difference between isAdmin and wantsAdmin is that isAdmin checks the user's role, while wantsAdmin checks if the callbackUrl is an admin page.
     * This prevents a non-admin user from being redirected to an admin page via a manipulated callbackUrl, and also prevents an admin user from being redirected to a non-admin page if the callbackUrl is not an admin page. */
    const redirectAfterAuth = useCallback((role?: AuthRole) => {
        const callbackUrl = safeRedirectPath(searchParams.get('callbackUrl'))
        const isAdmin = role === 'admin' || role === 'superadmin'
        const wantsAdmin = isAdminPath(callbackUrl)

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
                setTwoFactorCode('')
                setBackupCode('')
                setUseBackupCode(false)
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

        const submittedCode = (useBackupCode ? backupCode : twoFactorCode).trim()
        if (!submittedCode) { setError(page?.error_2fa_required); return }
        setLoading(true)

        try {
            const { ok, data } = await postAuth<LoginResponse>('/api/auth/2fa-login', { tempToken, code: submittedCode, trustDevice })

            if (!ok) { setError(data.error || page?.error_2fa_invalid); return }

            redirectAfterAuth(data.role)

        } catch (e) {
            setError(e instanceof Error ? e.message : (le.error_2fa_unknown || 'Unknown error during 2FA verification.'))
            
        } finally {
            setLoading(false)
        }
    }, [loading, useBackupCode, backupCode, twoFactorCode, tempToken, trustDevice, page, redirectAfterAuth, le])


    return (
        <AuthShell>
            <form onSubmit = {needs2FA ? handle2FASubmit : handleSubmit} noValidate className = "flex flex-col gap-7 | w-full | animate-slide-in-right">
                <ErrorAlert message={error} />

                {needs2FA ? (
                    <div className = "flex flex-col items-center gap-7">
                        <div className = "flex flex-col gap-2 | text-center">
                            <h1 className = "text-foreground text-[1.75rem] font-semibold leading-tight tracking-tight">{page?.two_factor_title}</h1>
                            <p className = "text-sm leading-5 text-muted-foreground">
                                {useBackupCode
                                    ? (le.backup_code_subtitle || 'Enter one of your saved backup codes')
                                    : page?.two_factor_subtitle}
                            </p>
                        </div>

                        {useBackupCode ? (
                            <Input
                                id="backup-code"
                                type="text"
                                label={le.backup_code || 'Backup code'}
                                value={backupCode}
                                onChange={(e) => setBackupCode(e.target.value)}
                                disabled={loading}
                                autoComplete="one-time-code"
                                autoFocus
                                className="w-full"
                            />
                        ) : (
                            <OTPInput
                                value = {twoFactorCode}
                                onChange = {setTwoFactorCode}
                                disabled = {loading}
                                autoFocus
                                ariaLabel = {page?.two_factor_hint || 'Verification code'}
                            />
                        )}

                        <Button variant="ghost"
                            type="button"
                            onClick={() => {
                                setUseBackupCode((value) => !value)
                                setError('')
                            }}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
                        >
                            {useBackupCode
                                ? (le.use_authenticator_code || 'Use authenticator code')
                                : (le.use_backup_code || 'Use backup code')}
                        </Button>

                        <label className = "group flex w-full cursor-pointer select-none items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2.5 transition-colors hover:border-[color:var(--border-strong)]">
                            <Checkbox
                                checked = {trustDevice}
                                onCheckedChange = {(v) => setTrustDevice(v === true)}
                                disabled = {loading}
                                className = "h-4 w-4 rounded-[5px]"
                            />
                            <span className = "text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">{page?.trust_device}</span>
                        </label>
                    </div>
                ) : (
                    <div className = "flex flex-col gap-4">
                        <AuthHeader page = "login" />

                        <Input id = "email" type = "email" label = {page?.email_label} value = {email} onChange = {e => setEmail(e.target.value)} disabled = {loading} required />
                        <Input id = "password" type = "password" label = {page?.password_label} value = {password} onChange = {e => setPassword(e.target.value)} disabled = {loading} required showPasswordLabel = {page?.show_password} hidePasswordLabel = {page?.hide_password} />
                        <Link href = "/forgot-password" className = "self-end | w-fit | text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">{page?.forgot_password}</Link>
                    </div>
                )}

                <div className = "flex flex-col gap-4 | w-full | animate-slide-in-right">
                    <Button type = "submit" variant = "solid" size="lg" className = "w-full" disabled = {loading}>
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

                            <p className = "flex items-center justify-center gap-1 | text-sm text-center text-muted-foreground">
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
