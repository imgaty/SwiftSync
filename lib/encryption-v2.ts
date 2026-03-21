import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'crypto';

const CURRENT_VERSION = 3;

const VERSION_CONFIGS: Record<number, VersionConfig> = {
  1: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    saltLength: 32,
    scryptN: 16384,
    scryptR: 8,
    scryptP: 1,
    pepper: process.env.ENCRYPTION_PEPPER_V1 || '',
  },
  2: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    saltLength: 64,
    scryptN: 32768,
    scryptR: 8,
    scryptP: 1,
    pepper: process.env.ENCRYPTION_PEPPER_V2 || '',
  },
  3: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    saltLength: 64,
    scryptN: 32768,
    scryptR: 8,
    scryptP: 1,
    pepper: (process.env.ENCRYPTION_PEPPER_V3 || '') + getRotatingPepper(),
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

function getRotatingPepper(): string {
  const date = new Date();
  const period = `${date.getFullYear()}-${Math.floor(date.getMonth() / 1)}`;
  return createHash('sha256').update(period).digest('hex').substring(0, 16);
}

function getMasterKey(): string {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) throw new Error('ENCRYPTION_MASTER_KEY is not set');
  return key;
}

function deriveKey(salt: Buffer, version: number): Buffer {
  const config = VERSION_CONFIGS[version];
  if (!config) throw new Error(`Unknown encryption version: ${version}`);

  const masterKey = getMasterKey();
  const keyMaterial = `${masterKey}:${config.pepper}`;

  return scryptSync(keyMaterial, salt, config.keyLength, {
    N: config.scryptN,
    r: config.scryptR,
    p: config.scryptP,
    maxmem: 128 * config.scryptN * config.scryptR * config.scryptP + (1024 * 1024),
  });
}

export function encrypt(plaintext: string): string {
  const version = CURRENT_VERSION;
  const config = VERSION_CONFIGS[version];

  const salt = randomBytes(config.saltLength);
  const iv = randomBytes(config.ivLength);
  const key = deriveKey(salt, version);

  const cipher = createCipheriv(config.algorithm as 'aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    version.toString(),
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

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

  const key = deriveKey(salt, version);

  const decipher = createDecipheriv(config.algorithm as 'aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

export function needsUpgrade(ciphertext: string): boolean {
  const version = parseInt(ciphertext.split(':')[0], 10);
  return version < CURRENT_VERSION;
}

export function upgrade(ciphertext: string): string {
  if (!needsUpgrade(ciphertext)) {
    return ciphertext;
  }

  const plaintext = decrypt(ciphertext);
  return encrypt(plaintext);
}

export function getVersion(ciphertext: string): number {
  return parseInt(ciphertext.split(':')[0], 10);
}

export function hashPassword(password: string): string {
  const version = CURRENT_VERSION;
  const config = VERSION_CONFIGS[version];

  const salt = randomBytes(config.saltLength);
  const pepperedPassword = `${password}:${config.pepper}`;

  const hash = scryptSync(pepperedPassword, salt, 64, {
    N: config.scryptN,
    r: config.scryptR,
    p: config.scryptP,
  });

  return [
    version.toString(),
    salt.toString('base64'),
    hash.toString('base64'),
  ].join(':');
}

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

    const pepperedPassword = `${password}:${config.pepper}`;

    const computedHash = scryptSync(pepperedPassword, salt, 64, {
      N: config.scryptN,
      r: config.scryptR,
      p: config.scryptP,
    });

    return timingSafeEqual(computedHash, storedHashBuffer);
  } catch {
    return false;
  }
}

export function passwordNeedsUpgrade(storedHash: string): boolean {
  const version = parseInt(storedHash.split(':')[0], 10);
  return version < CURRENT_VERSION;
}

export function upgradePassword(password: string, storedHash: string): string | null {
  if (!verifyPassword(password, storedHash)) {
    return null;
  }
  return hashPassword(password);
}

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

export function isOldEncryption(data: string): boolean {
  if (/^\d+:/.test(data)) return false;
  return /^[QWERTYUIOPASDFGH]+$/.test(data);
}

export function migrateFromOldSystem(
  oldCiphertext: string,
  oldDecryptFn: (s: string) => string
): string {
  const plaintext = oldDecryptFn(oldCiphertext);
  return encrypt(plaintext);
}
