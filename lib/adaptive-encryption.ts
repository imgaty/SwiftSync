if (typeof window === 'undefined' && process.env.NEXT_RUNTIME) {
    require('server-only');
}

import {
    randomBytes,
    scryptSync,
    createHash,
    timingSafeEqual as cryptoTimingSafeEqual,
} from 'crypto';

export const GENERATION_PERIOD = 6 * 60 * 60 * 1000;
export const EPOCH_START = new Date('2026-01-01').getTime();
export const SALT_LENGTH = 32;

export function getCurrentGeneration(): number {
    return Math.floor((Date.now() - EPOCH_START) / GENERATION_PERIOD) + 1;
}

export interface GenerationDNA {
    generation: number;
    scryptN: number;
    scryptR: number;
    scryptP: number;
    pepper: string;
}

let _cachedDNAGen = -1;
let _cachedDNA: GenerationDNA | null = null;

export function getGenerationDNA(generation: number): GenerationDNA {
    if (generation === _cachedDNAGen && _cachedDNA) return _cachedDNA;

    const seed = createHash('sha512')
        .update(`SWIFT-ENCRYPTION-GENERATION-NUMBER-${generation}`)
        .digest();

    _cachedDNA = {
        generation,
        scryptN: Math.pow(2, 14),
        scryptR: 8,
        scryptP: 1 + (seed[2] % 2),
        pepper: seed.slice(6, 38).toString('hex'),
    };

    _cachedDNAGen = generation;
    return _cachedDNA;
}

export function hashPassword(password: string): string {
    const generation = getCurrentGeneration();
    const dna = getGenerationDNA(generation);
    const salt = randomBytes(SALT_LENGTH);

    const peppered = `${password}:${dna.pepper}:GEN${generation}`;
    const hash = scryptSync(peppered, salt, 64, {
        N: dna.scryptN,
        r: dna.scryptR,
        p: dna.scryptP,
    });

    return [
        generation.toString(),
        salt.toString('base64'),
        hash.toString('base64'),
    ].join(':');
}

export function verifyPassword(password: string, storedHash: string): boolean {
    try {
        const parts = storedHash.split(':');
        if (parts.length !== 3) return false;

        const [genStr, saltB64, hashB64] = parts;
        const generation = parseInt(genStr, 10);
        const dna = getGenerationDNA(generation);
        const salt = Buffer.from(saltB64, 'base64');
        const storedBuf = Buffer.from(hashB64, 'base64');

        const peppered = `${password}:${dna.pepper}:GEN${generation}`;
        const computed = scryptSync(peppered, salt, 64, {
            N: dna.scryptN,
            r: dna.scryptR,
            p: dna.scryptP,
        });

        return cryptoTimingSafeEqual(computed, storedBuf);
    } catch {
        return false;
    }
}

export function passwordShouldUpgrade(storedHash: string): boolean {
    const storedGen = parseInt(storedHash.split(':')[0], 10);
    return storedGen < getCurrentGeneration();
}
