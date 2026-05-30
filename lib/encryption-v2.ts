//
//  encryption-v2.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Provides shared encryption v2 logic for Argent, centralizing domain behavior, helpers,
//  or integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
/**
 * Symmetric encryption for server-side secrets (e.g. TOTP secrets).
 *
 * AES-256-GCM authenticated encryption with:
 *   - a per-record random salt fed through scrypt to derive a unique key,
 *   - a per-record random IV,
 *   - a 16-byte authentication tag.
 *
 * Format: "v1:saltB64:ivB64:authTagB64:ciphertextB64"
 *
 * The master key lives in ENCRYPTION_MASTER_KEY (32 bytes hex). Rotating the master
 * key invalidates every previously encrypted blob — migrate by decrypt-then-re-encrypt
 * before rotating, or accept that users will need to re-enroll affected secrets.
 */

import "server-only"
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto"

const ALGORITHM = "aes-256-gcm"
const KEY_LEN = 32
const IV_LEN = 16 // GCM spec recommends 12, but Node's createCipheriv accepts 16; stick with it for compat with existing blobs.
const SALT_LEN = 32
const AUTH_TAG_LEN = 16
const SCRYPT_N = 32768
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * SCRYPT_P + 1024 * 1024
const VERSION = "v1"

function getMasterKey(): string {
  const key = process.env.ENCRYPTION_MASTER_KEY
  if (key && key.length >= 32) return key
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ENCRYPTION_MASTER_KEY must be set to at least 32 characters in production.",
    )
  }
  // Dev-only: a random per-process key. Anything encrypted last run won't decrypt.
  return randomBytes(32).toString("hex")
}

function deriveKey(salt: Buffer): Buffer {
  return scryptSync(getMasterKey(), salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  })
}

export function encrypt(plaintext: string): string {
  if (typeof plaintext !== "string") {
    throw new Error("encrypt: plaintext must be a string")
  }
  const salt = randomBytes(SALT_LEN)
  const iv = randomBytes(IV_LEN)
  const key = deriveKey(salt)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    VERSION,
    salt.toString("base64"),
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":")
}

export function decrypt(blob: string): string {
  if (typeof blob !== "string") {
    throw new Error("decrypt: input must be a string")
  }
  const parts = blob.split(":")
  if (parts.length !== 5 || parts[0] !== VERSION) {
    throw new Error("decrypt: unsupported ciphertext format")
  }
  const salt = Buffer.from(parts[1], "base64")
  const iv = Buffer.from(parts[2], "base64")
  const authTag = Buffer.from(parts[3], "base64")
  const ciphertext = Buffer.from(parts[4], "base64")

  if (salt.length !== SALT_LEN) throw new Error("decrypt: bad salt length")
  if (iv.length !== IV_LEN) throw new Error("decrypt: bad IV length")
  if (authTag.length !== AUTH_TAG_LEN) throw new Error("decrypt: bad auth tag length")

  const key = deriveKey(salt)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const out = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return out.toString("utf8")
}
