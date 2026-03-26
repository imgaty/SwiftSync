// Centralized error logger — logs detailed error info to the terminal
// including the file, function, and line where the error occurred.

type ErrorContext = {
    file: string
    function: string
    error: unknown
}

function getErrorDetails(err: unknown): { name: string; message: string; stack?: string; code?: string } {
    if (err instanceof Error) {
        const code = (err as unknown as Record<string, unknown>).code as string | undefined
        return { name: err.name, message: err.message, stack: err.stack, code }
    }
    return { name: 'UnknownError', message: String(err) }
}

function formatError(ctx: ErrorContext): string {
    const { name, message, stack, code } = getErrorDetails(ctx.error)
    const timestamp = new Date().toISOString()

    // Extract the line number from the stack trace if available
    let location = `${ctx.file} → ${ctx.function}`
    if (stack) {
        // Find the first line in the stack that points to the project source (not node_modules)
        const lines = stack.split('\n').slice(1)
        const projectLine = lines.find(l => l.includes('/SwiftSync/') && !l.includes('node_modules'))
        if (projectLine) {
            const match = projectLine.match(/\((.+)\)/) || projectLine.match(/at\s+(.+)/)
            if (match) location += ` | ${match[1].trim()}`
        }
    }

    const codeStr = code ? ` (code: ${code})` : ''
    const divider = '═'.repeat(70)
    return `\n${divider}\n❌ ERROR [${timestamp}]\n   Location: ${location}\n   ${name}: ${message}${codeStr}${stack ? `\n   Stack:\n${stack.split('\n').slice(1, 5).map(l => `      ${l.trim()}`).join('\n')}` : ''}\n${divider}\n`
}

export function logError(file: string, fn: string, error: unknown): void {
    console.error(formatError({ file, function: fn, error }))
}

export function logWarn(file: string, fn: string, error: unknown): void {
    const { message } = getErrorDetails(error)
    const timestamp = new Date().toISOString()
    console.warn(`\n⚠️  WARNING [${timestamp}] ${file} → ${fn}\n   ${message}\n`)
}

/**
 * Returns a user-safe error message.
 * Shows the real error for known safe error types, otherwise returns the fallback.
 * Includes the error class/type so users can report it.
 */
export function safeErrorMessage(error: unknown, fallback: string): string {
    const { name, message, code } = getErrorDetails(error)

    // Prisma-specific: translate common codes to human-readable messages
    if (name === 'PrismaClientInitializationError' || code === 'P1001' || code === 'P1017') {
        return `${fallback}: Database connection failed`
    }
    if (code === 'P2002') {
        return `${fallback}: A record with that value already exists`
    }
    if (code === 'P2025') {
        return `${fallback}: Record not found`
    }
    if (code === 'P2003') {
        return `${fallback}: Cannot delete — record is referenced by other data`
    }
    if (name === 'PrismaClientKnownRequestError' && code) {
        return `${fallback} (database error ${code})`
    }
    if (name === 'PrismaClientValidationError') {
        return `${fallback}: Invalid data provided`
    }

    // Connection errors
    if (message.includes('ECONNREFUSED')) {
        return `${fallback}: Database connection refused — is the database running?`
    }
    if (message.includes('ETIMEDOUT') || message.includes('timeout')) {
        return `${fallback}: Request timed out`
    }

    // Generic safe errors (no internal detail leakage)
    if (message && !message.includes('prisma') && !message.includes('/') && message.length < 200) {
        return `${fallback}: ${message}`
    }

    return fallback
}
