/**
 * Versioned Adaptive Security System
 * 
 * This system evolves over time:
 * - Each encryption version uses different algorithms/parameters
 * - Data is tagged with its version
 * - When accessed, old versions are automatically upgraded to the latest
 * - Cracking one version doesn't help with others
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'crypto';

// =============================================================================
// CONFIGURATION - Change these to "evolve" the encryption
// =============================================================================

const CURRENT_VERSION = 3; // Increment this when you change encryption parameters

// Each version has different parameters - like DNA mutations
const VERSION_CONFIGS: Record<number, VersionConfig> = {
  1: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    saltLength: 32,
    scryptN: 16384,      // CPU/memory cost
    scryptR: 8,          // Block size
    scryptP: 1,          // Parallelization
    pepper: 'SwiftSync-V1-2026',
  },
  2: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    saltLength: 64,       // Longer salt
    scryptN: 32768,       // Higher cost
    scryptR: 8,
    scryptP: 2,           // More parallelization
    pepper: 'SwiftSync-V2-Evolved-2026',
  },
  3: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    saltLength: 64,
    scryptN: 65536,       // Even higher cost (slows down brute force)
    scryptR: 8,
    scryptP: 4,
    pepper: 'SwiftSync-V3-Adaptive-2026-' + getRotatingPepper(),
  },
};

interface VersionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  scryptN: number;
  scryptR: number;
  scryptP: number;
  pepper: string;
}

// Pepper rotates based on time period (changes monthly)
function getRotatingPepper(): string {
  const date = new Date();
  const period = `${date.getFullYear()}-${Math.floor(date.getMonth() / 1)}`; // Monthly
  return createHash('sha256').update(period).digest('hex').substring(0, 16);
}

// Get the master key from environment (NEVER hardcode in production!)
function getMasterKey(): string {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) {
    // For development only - in production, this should throw an error
    console.warn('⚠️  ENCRYPTION_MASTER_KEY not set! Using development fallback.');
    return 'dev-only-key-change-in-production-32ch';
  }
  return key;
}

// =============================================================================
// ENCRYPTION ENGINE
// =============================================================================

/**
 * Derive a unique key for each piece of data using scrypt
 * Even with the same master key, each encryption gets a unique derived key
 */
function deriveKey(salt: Buffer, version: number): Buffer {
  const config = VERSION_CONFIGS[version];
  if (!config) throw new Error(`Unknown encryption version: ${version}`);
  
  const masterKey = getMasterKey();
  const keyMaterial = `${masterKey}:${config.pepper}`;
  
  return scryptSync(keyMaterial, salt, config.keyLength, {
    N: config.scryptN,
    r: config.scryptR,
    p: config.scryptP,
  });
}

/**
 * Encrypt data with the current version
 * Format: VERSION:SALT:IV:AUTH_TAG:CIPHERTEXT (all base64)
 */
export function encrypt(plaintext: string): string {
  const version = CURRENT_VERSION;
  const config = VERSION_CONFIGS[version];
  
  // Generate random salt and IV (unique per encryption!)
  const salt = randomBytes(config.saltLength);
  const iv = randomBytes(config.ivLength);
  
  // Derive unique key for this encryption
  const key = deriveKey(salt, version);
  
  // Encrypt with AES-256-GCM (authenticated encryption)
  const cipher = createCipheriv(config.algorithm as 'aes-256-gcm', key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // Combine all parts with version prefix
  return [
    version.toString(),
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/**
 * Decrypt data from any version
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 5) {
    throw new Error('Invalid encrypted data format');
  }
  
  const [versionStr, saltB64, ivB64, authTagB64, encryptedB64] = parts;
  const version = parseInt(versionStr, 10);
  
  const config = VERSION_CONFIGS[version];
  if (!config) throw new Error(`Unknown encryption version: ${version}`);
  
  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');
  
  // Derive the same key that was used for encryption
  const key = deriveKey(salt, version);
  
  // Decrypt
  const decipher = createDecipheriv(config.algorithm as 'aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  
  return decrypted.toString('utf8');
}

/**
 * Check if data needs to be upgraded to the current version
 */
export function needsUpgrade(ciphertext: string): boolean {
  const version = parseInt(ciphertext.split(':')[0], 10);
  return version < CURRENT_VERSION;
}

/**
 * Upgrade encrypted data to the current version
 * This is the "self-evolving" part!
 */
export function upgrade(ciphertext: string): string {
  if (!needsUpgrade(ciphertext)) {
    return ciphertext; // Already current
  }
  
  // Decrypt with old version, re-encrypt with current version
  const plaintext = decrypt(ciphertext);
  return encrypt(plaintext);
}

/**
 * Get the version of encrypted data
 */
export function getVersion(ciphertext: string): number {
  return parseInt(ciphertext.split(':')[0], 10);
}

// =============================================================================
// PASSWORD HASHING (One-way - cannot be reversed!)
// =============================================================================

/**
 * Hash a password (for storage)
 * Uses scrypt with version-specific parameters
 */
export function hashPassword(password: string): string {
  const version = CURRENT_VERSION;
  const config = VERSION_CONFIGS[version];
  
  const salt = randomBytes(config.saltLength);
  
  // Add pepper to password before hashing
  const pepperedPassword = `${password}:${config.pepper}`;
  
  const hash = scryptSync(pepperedPassword, salt, 64, {
    N: config.scryptN,
    r: config.scryptR,
    p: config.scryptP,
  });
  
  // Format: VERSION:SALT:HASH
  return [
    version.toString(),
    salt.toString('base64'),
    hash.toString('base64'),
  ].join(':');
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    
    const [versionStr, saltB64, hashB64] = parts;
    const version = parseInt(versionStr, 10);
    
    const config = VERSION_CONFIGS[version];
    if (!config) return false;
    
    const salt = Buffer.from(saltB64, 'base64');
    const storedHashBuffer = Buffer.from(hashB64, 'base64');
    
    // Hash the provided password with the same parameters
    const pepperedPassword = `${password}:${config.pepper}`;
    
    const computedHash = scryptSync(pepperedPassword, salt, 64, {
      N: config.scryptN,
      r: config.scryptR,
      p: config.scryptP,
    });
    
    // Constant-time comparison to prevent timing attacks
    return timingSafeEqual(computedHash, storedHashBuffer);
  } catch {
    return false;
  }
}

/**
 * Check if a password hash needs to be upgraded
 */
export function passwordNeedsUpgrade(storedHash: string): boolean {
  const version = parseInt(storedHash.split(':')[0], 10);
  return version < CURRENT_VERSION;
}

/**
 * Upgrade a password hash (requires the plaintext password)
 * Call this after successful login if passwordNeedsUpgrade() returns true
 */
export function upgradePassword(password: string, storedHash: string): string | null {
  // First verify the password is correct
  if (!verifyPassword(password, storedHash)) {
    return null; // Wrong password, can't upgrade
  }
  
  // Re-hash with current version
  return hashPassword(password);
}

// Constant-time comparison to prevent timing attacks
function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// =============================================================================
// MIGRATION HELPERS
// =============================================================================

/**
 * Check if a string is encrypted with the old system
 * Old system used hex substitution (only contains Q,W,E,R,T,Y,U,I,O,P,A,S,D,F,G,H)
 */
export function isOldEncryption(data: string): boolean {
  // New format starts with version number and colon
  if (/^\d+:/.test(data)) return false;
  
  // Old format only contains these characters
  return /^[QWERTYUIOPASDFGH]+$/.test(data);
}

/**
 * Migrate from old encryption system
 * Requires the old decryption function to be available
 */
export function migrateFromOldSystem(
  oldCiphertext: string, 
  oldDecryptFn: (s: string) => string
): string {
  const plaintext = oldDecryptFn(oldCiphertext);
  return encrypt(plaintext);
}
