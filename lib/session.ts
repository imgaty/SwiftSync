//
//  session.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Provides shared session logic for Argent, centralizing domain behavior, helpers, or
//  integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
const encoder = new TextEncoder()

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET

if (!SESSION_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is not set. Refusing to start in production without a signing secret.",
    )
  }
  // Dev-only: warn loudly so it's obvious in logs, but do not fall back to a hardcoded value
  // that would let anyone reading the source forge tokens.
  console.warn(
    "⚠️  SESSION_SECRET is not set. Using a process-lifetime random secret — all sessions will be invalidated on restart.",
  )
}

// Dev fallback: a random per-process secret so tokens don't survive a restart
// but we still don't ship with a known-plaintext default.
const EFFECTIVE_SECRET =
  SESSION_SECRET ?? Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex")

const KEY_ALGORITHM: HmacImportParams = { name: "HMAC", hash: "SHA-256" }

let cachedKeyPromise: Promise<CryptoKey> | null = null

export interface SessionPayload {
  uid: string
  iat: number
  exp: number
  sv: number
  v: 1
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64")
  }

  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"))
  }

  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function toBase64Url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? encoder.encode(input) : input
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function fromBase64Url(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/")
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  return base64ToBytes(base64 + padding)
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

async function getSigningKey(): Promise<CryptoKey> {
  if (!cachedKeyPromise) {
    cachedKeyPromise = crypto.subtle.importKey(
      "raw",
      encoder.encode(EFFECTIVE_SECRET),
      KEY_ALGORITHM,
      false,
      ["sign", "verify"]
    )
  }

  return cachedKeyPromise
}

async function signMessage(message: string): Promise<Uint8Array> {
  const key = await getSigningKey()
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message))
  return new Uint8Array(signature)
}

export async function createSessionToken(
  userId: string,
  maxAgeSeconds: number,
  sessionVersion = 0
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    uid: userId,
    iat: now,
    exp: now + maxAgeSeconds,
    sv: sessionVersion,
    v: 1,
  }

  const payloadB64 = toBase64Url(JSON.stringify(payload))
  const sig = await signMessage(payloadB64)
  const sigB64 = toBase64Url(sig)

  return `v1.${payloadB64}.${sigB64}`
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const [version, payloadB64, sigB64] = token.split(".")
    if (version !== "v1" || !payloadB64 || !sigB64) return null

    const expectedSig = await signMessage(payloadB64)
    const receivedSig = fromBase64Url(sigB64)
    if (!timingSafeEqual(expectedSig, receivedSig)) return null

    const payloadJson = new TextDecoder().decode(fromBase64Url(payloadB64))
    const payload = JSON.parse(payloadJson) as SessionPayload

    if (!payload?.uid || payload.v !== 1) return null

    const sessionVersion =
      typeof payload.sv === "number" && Number.isInteger(payload.sv) && payload.sv >= 0
        ? payload.sv
        : 0

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp <= now) return null

    return { ...payload, sv: sessionVersion }
  } catch {
    return null
  }
}

export function sessionVersionMatches(
  session: SessionPayload,
  currentSessionVersion: number | null | undefined
): boolean {
  return session.sv === (currentSessionVersion ?? 0)
}
