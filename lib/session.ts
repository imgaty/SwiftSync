const encoder = new TextEncoder()

const SESSION_FALLBACK_SECRET = "dev-insecure-session-secret-change-me"
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  SESSION_FALLBACK_SECRET

const KEY_ALGORITHM: HmacImportParams = { name: "HMAC", hash: "SHA-256" }

let cachedKeyPromise: Promise<CryptoKey> | null = null

export interface SessionPayload {
  uid: string
  iat: number
  exp: number
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
      encoder.encode(SESSION_SECRET),
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

export async function createSessionToken(userId: string, maxAgeSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    uid: userId,
    iat: now,
    exp: now + maxAgeSeconds,
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

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp <= now) return null

    return payload
  } catch {
    return null
  }
}
