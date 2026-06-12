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
import { Input } from '@/components/ui/input'
import { OAuthButtons } from '@/components/oauth-buttons'
import { AuthShell, AuthHeader, BackButton, ErrorAlert } from '@/components/auth'
import { UDS } from '@/lib/UDS'
import { useLanguage, useTranslationNamespace } from '@/components/language-provider'
import { postAuth as postAuthBase } from '@/lib/auth-fetch'
import { isAdminPath, safeRedirectPath } from '@/lib/auth-redirect'
import { Loader2, ArrowRight, RotateCw } from 'lucide-react'

type AuthRole = 'user' | 'admin' | 'superadmin'

// Describes the JSON response from /api/auth/login.
type LoginResponse = {
    error?: string
    success?: boolean
    needs_2fa?: boolean
    tempToken?: string
    message?: string
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
    const [tempToken, setTempToken] = useState('')
    const [verificationCode, setVerificationCode] = useState('')
    const [error, setError] = useState('')                          // Stores any error messages to display to the user
    const [loading, setLoading] = useState(false)                   // Prevents the user from clicking submit multiple times and shows a loading state
    const [resending, setResending] = useState(false)

    // Send the login request to api/auth/login and return the response data.
    const attemptLogin = useCallback(async () => {
        const { ok, data } = await postAuth<LoginResponse>('/api/auth/login', { email, password })
        if (!ok) {
            setError(data.error || page?.error_login_failed)
            return
        }
        
        if (data.needs_2fa && data.tempToken) {
            setTempToken(data.tempToken)
            setVerificationCode('')
        }

        return data
    }, [email, password, page])


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
            if (data.needs_2fa) return

            redirectAfterAuth(data.role)

        } catch (e) {
            setError(e instanceof Error ? e.message : (le.error_login_unknown || 'Unknown error during login.'))

        } finally {
            setLoading(false)
        }
    }, [loading, email, password, attemptLogin, redirectAfterAuth, page, le])

    const handleVerifySubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()

        if (loading) return
        setError('')
        if (!verificationCode.trim()) { setError(le.error_2fa_required || 'Please enter your verification code'); return }

        setLoading(true)
        try {
            const { ok, data } = await postAuth<LoginResponse>('/api/auth/2fa-login', {
                tempToken,
                code: verificationCode.trim(),
            })

            if (!ok) {
                setError(data.error || le.error_2fa_invalid || 'Invalid verification code. Please try again.')
                return
            }

            setTempToken('')
            setVerificationCode('')
            redirectAfterAuth(data.role)
        } catch (e) {
            setError(e instanceof Error ? e.message : (le.error_login_unknown || 'Unknown error during login.'))
        } finally {
            setLoading(false)
        }
    }, [loading, tempToken, verificationCode, redirectAfterAuth, le])

    const handleResend = useCallback(async () => {
        if (resending || loading || !tempToken) return
        setError('')
        setResending(true)
        try {
            const { ok, data } = await postAuth<LoginResponse>('/api/auth/2fa-resend', { tempToken })
            if (!ok) {
                setError(data.error || 'Could not resend the code. Please try again.')
                return
            }
            setVerificationCode('')
        } catch (e) {
            setError(e instanceof Error ? e.message : (le.error_login_unknown || 'Unknown error during login.'))
        } finally {
            setResending(false)
        }
    }, [resending, loading, tempToken, le])

    const handleBackToLogin = useCallback(() => {
        setTempToken('')
        setVerificationCode('')
        setError('')
    }, [])

    if (tempToken) {
        return (
            <AuthShell cornerHighlight={false}>
                <form onSubmit={handleVerifySubmit} noValidate className="flex flex-col gap-7 | w-full | animate-slide-in-right">
                    <ErrorAlert message={error} />

                    <div className="flex flex-col gap-4">
                        <AuthHeader page="login" />
                        <Input
                            id="email-login-code"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            label={le.email_two_factor_code || 'Login code'}
                            value={verificationCode}
                            onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            disabled={loading}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="flex flex-col gap-3 | w-full | animate-slide-in-right">
                        <Button type="submit" variant="solid" size="lg" className="auth-primary-button w-full" disabled={loading || verificationCode.length !== 6}>
                            {loading
                                ? <><Loader2 className="w-4 h-4 | animate-spin" />{le.verifying || 'Verifying...'}</>
                                : <>{le.verify || 'Verify'}<ArrowRight className="w-4 h-4" /></>
                            }
                        </Button>
                        <BackButton onClick={handleBackToLogin} label={le.back_to_login || 'Back'} disabled={loading || resending} />
                        <Button type="button" variant="glass" size="lg" className="w-full" onClick={handleResend} disabled={loading || resending}>
                            {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                            {le.resend_code || 'Resend code'}
                        </Button>
                    </div>
                </form>
            </AuthShell>
        )
    }

    return (
        <AuthShell cornerHighlight={false}>
            <form onSubmit = {handleSubmit} noValidate className = "flex flex-col gap-7 | w-full | animate-slide-in-right">
                <ErrorAlert message={error} />

                <div className = "flex flex-col gap-4">
                    <AuthHeader page = "login" />

                    <Input id = "email" type = "email" label = {page?.email_label} value = {email} onChange = {e => setEmail(e.target.value)} disabled = {loading} required />
                    <Input id = "password" type = "password" label = {page?.password_label} value = {password} onChange = {e => setPassword(e.target.value)} disabled = {loading} required showPasswordLabel = {page?.show_password} hidePasswordLabel = {page?.hide_password} />
                    <Link href = "/forgot-password" className = "self-end | w-fit | text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{page?.forgot_password}</Link>
                </div>

                <div className = "flex flex-col gap-4 | w-full | animate-slide-in-right">
                    <Button type = "submit" variant = "solid" size="lg" className = "auth-primary-button w-full" disabled = {loading}>
                        {loading
                            ? <><Loader2 className = "w-4 h-4 | animate-spin" />{page?.signing_in}</>
                            : <>{page?.sign_in}<ArrowRight className = "w-4 h-4" /></>
                        }
                    </Button>

                    <div className = "flex items-center gap-4">
                        <div className = {UDS.dividerLine} />
                        <span className = {UDS.dividerLabel}>{t.oauth_buttons?.divider_label}</span>
                        <div className = {UDS.dividerLine} />
                    </div>

                    <div className = "pb-2">
                        <OAuthButtons mode = "login" />
                    </div>

                    <p className = "flex items-center justify-center gap-1 | text-sm text-center text-muted-foreground">
                        {page?.no_account}
                        <Link href = "/register">{page?.create_one}</Link>
                    </p>
                </div>
            </form>
        </AuthShell>
    )
}
