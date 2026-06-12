//
//  secrets-check.ts
//
//  Created by hilario on 06 June 2026 at 15:52.
//  Last changed by hilario on 07 Jun 2026 at __:__.
//  Revised by hilario on 07 Jun 2026 at __:__.
//
//  Centralizes validation for production-critical server secrets.
//


type Env = Record<string, string | undefined>

export interface SecretValidationIssue {
    variable: string
    message: string
}

export const SESSION_SECRET_ENV_NAMES = ["SESSION_SECRET", "AUTH_SECRET", "NEXTAUTH_SECRET"] as const
export const PASSWORD_PEPPER_MIN_LEN = 32
export const PASSWORD_PEPPER_VERSION_REGEX = /^p\d+$/i
export const DEFAULT_PASSWORD_PEPPER_VERSION = "p1"                                             // Default first pepper version so new installs do not need PASSWORD_PEPPER_ACTIVE.

const PASSWORD_PEPPER_ACTIVE_ENV_NAME = "PASSWORD_PEPPER_ACTIVE"

function issue(variable: string, message: string): SecretValidationIssue {
    return { variable, message }
}

function hasValue(value: string | undefined): value is string {
    return value !== undefined && value.length > 0
}

function validateMinLengthSecret(
    env: Env,
    variable: string,
    minLength: number,
    missingMessage: string,
    tooShortMessage: string,
): SecretValidationIssue[] {
    // Shared length validation keeps env-backed secret checks consistent.
    const value = env[variable]

    if (value === undefined) {
        return [issue(variable, missingMessage)]
    }

    if (value.length < minLength) {
        return [issue(variable, tooShortMessage)]
    }

    return []
}

function normalizePasswordPepperVersionOrUndefined(version: string) {
    // Non-throwing normalization lets validators report all startup issues together.
    const normalizedVersion = version.trim().toLowerCase()
    return isPasswordPepperVersion(normalizedVersion) ? normalizedVersion : undefined
}

function passwordPepperActiveError(version: string) {
    return `${PASSWORD_PEPPER_ACTIVE_ENV_NAME} must match /^p\\d+$/i, got: ${version}`
}

function passwordPepperEnvNameForNormalizedVersion(version: string) {
    return `PASSWORD_PEPPER_${version.toUpperCase()}`
}

export function getSessionSigningSecret(env: Env = process.env) {
    // Respect common auth-library fallback names while preferring SESSION_SECRET.
    for (const name of SESSION_SECRET_ENV_NAMES) {
        const value = env[name]
        if (hasValue(value)) return value
    }

    return undefined
}

export function validateSessionSigningSecret(env: Env = process.env): SecretValidationIssue[] {
    if (getSessionSigningSecret(env)) return []

    return [
        issue(
            SESSION_SECRET_ENV_NAMES.join(" || "),
            "Session signing secret is required: set SESSION_SECRET, AUTH_SECRET, or NEXTAUTH_SECRET.",
        ),
    ]
}

export function isPasswordPepperVersion(version: string) {
    return PASSWORD_PEPPER_VERSION_REGEX.test(version)
}


export function normalizePasswordPepperVersion(version: string): string {
    // Normalizes pepper tags before they are stored in hashes or mapped to env names.
    const normalizedVersion = normalizePasswordPepperVersionOrUndefined(version)
    if (!normalizedVersion) {
        throw new Error(`Invalid pepper version tag: ${version}`)
    }

    return normalizedVersion
}


export function getActivePasswordPepperVersion(env: Env = process.env): string {
    // Defaults to p1 so the first configured pepper works without an extra env var.
    const activePepperVersion = env[PASSWORD_PEPPER_ACTIVE_ENV_NAME] ?? DEFAULT_PASSWORD_PEPPER_VERSION
    const pepperVersion = normalizePasswordPepperVersionOrUndefined(activePepperVersion)

    if (!pepperVersion) {
        throw new Error(passwordPepperActiveError(activePepperVersion))
    }

    return pepperVersion
}


export function getPasswordPepperEnvName(version: string) {
    return passwordPepperEnvNameForNormalizedVersion(normalizePasswordPepperVersion(version))
}

export function validateActivePasswordPepper(env: Env = process.env): SecretValidationIssue[] {
    // Validate directly instead of throwing so critical-secret checks can return every issue.
    const activePepperVersion = env[PASSWORD_PEPPER_ACTIVE_ENV_NAME] ?? DEFAULT_PASSWORD_PEPPER_VERSION
    const pepperVersion = normalizePasswordPepperVersionOrUndefined(activePepperVersion)

    if (!pepperVersion) {
        return [
            issue(
                PASSWORD_PEPPER_ACTIVE_ENV_NAME,
                passwordPepperActiveError(activePepperVersion),
            ),
        ]
    }

    const pepperEnvName = passwordPepperEnvNameForNormalizedVersion(pepperVersion)

    return validateMinLengthSecret(
        env,
        pepperEnvName,
        PASSWORD_PEPPER_MIN_LEN,
        `${pepperEnvName} is required in production.`,
        `${pepperEnvName} must be at least ${PASSWORD_PEPPER_MIN_LEN} characters.`,
    )
}

export function validateCriticalSecrets(env: Env = process.env): SecretValidationIssue[] {
    return [
        ...validateSessionSigningSecret(env),
        ...validateActivePasswordPepper(env),
    ]
}

export function formatSecretValidationIssues(issues: SecretValidationIssue[]) {
    if (issues.length === 0) return ""
    if (issues.length === 1) return issues[0].message

    return [
        "Critical secret validation failed:",
        ...issues.map((validationIssue) => `- ${validationIssue.message}`),
    ].join("\n")
}

export function assertSecretsPresent(env: Env = process.env) {
    const issues = validateCriticalSecrets(env)
    if (issues.length === 0) return

    const message = formatSecretValidationIssues(issues)
    if (env.NODE_ENV === "production") {
        throw new Error(message)
    }

    console.warn(message)
}
