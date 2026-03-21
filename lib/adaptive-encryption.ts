// Password Hashing & Verification System
// Hashes passwords with scrypt (salt + pepper + generation evolution).

// Simulate these functions in the terminal with: npx tsx scripts/debug-encryption.ts



if (typeof window === 'undefined' && process.env.NEXT_RUNTIME) {
    require('server-only');                                                             // Throws a build error if this module is bundled into the client-side code.
}

import {
    randomBytes,                                                                        // Generates salts and pepper.
    scryptSync,                                                                         // Hashing password algorithm. Intentionally slow to make brute-force attacks harder.
    createHash,                                                                         // Creates a SHA-512 hash based on generation number.
    timingSafeEqual as cryptoTimingSafeEqual,                                           // Checks each byte of the hash to prevent timing attacks - the response time will always take the same, whether some or no characters in the password are correct or not.
} from 'crypto';



// =============================================================================
// GENERATION SYSTEM
// =============================================================================

export const GENERATION_PERIOD = 6 * 60 * 60 * 1000;                                    // How often the hashing parameters evolve (6 hours)
export const EPOCH_START = new Date('2026-01-01').getTime()                             // Arbitrary fixed point in time to calculate generations from January 1st, 2026
export const SALT_LENGTH = 32;                                                          // Length of the salt in bytes

export function getCurrentGeneration(): number {                                        /* Get current generation number */
    return Math.floor((Date.now() - EPOCH_START) / GENERATION_PERIOD) + 1;              /* current time (how many milliseconds have passed since EPOCH_START) divided by GENERATION_PERIOD (6 hours) to get how many generations have passed, plus 1 to start at 1 instead of 0 */
}

export interface GenerationDNA {
    generation: number;
    scryptN: number;
    scryptR: number;
    scryptP: number;
    pepper: string;
}

let _cachedDNAGen = -1;                                                                 // Cache: DNA only changes every 6 hours. -1 and null mean nothing has been cached yet.
let _cachedDNA: GenerationDNA | null = null;

export function getGenerationDNA(generation: number): GenerationDNA {                   // Given a generation number, return the corresponding DNA (hashing parameters). The same generation number will always produce the same DNA, and different generations will produce different DNAs.
    if (generation === _cachedDNAGen && _cachedDNA) return _cachedDNA;                  // If the current generation is the one cached, skip the calculation and return the cached DNA.

    const seed = createHash('sha512')                                                   // Create a SHA-512 hash of the generation number. This will be the seed for the generation's DNA. The string includes the generation number, so each generation will have a different seed and therefore different DNA. The text along side the generation number is for readability reasons only and has no effect on the output.
    
    .update(`SWIFT-ENCRYPTION-GENERATION-NUMBER-${generation}`)                         // Using a fixed string ensures the same generation number will always produce the same seed.
    .digest();                                                                          // Returns a 64-byte (512 bits) buffer (Node.js raw byte data type). e.g.: <Buffer 03 43 08 a1 7f 00 b2 9c 20 e3 4d 1a 6b f8 c5 22 ... >.

    _cachedDNA = {                                                                                                                                                                                                                                          // Example of the output of the current GetGenerationDNA():     // {
        generation,                                                                     // Generation number                                                                                                                                                                                                                *       generation: 227,
        scryptN: Math.pow(2, 14),                                                       // CPU cost parameter                   - How many times scrypt performs internally (16,384). More = slower = harder to crack. Doesn't change.                                                                                      *       scryptN: 16384,
        scryptR: 8,                                                                     // Block size parameter                 - The amount of memory the scrypt uses per run, in 128-byte chunks. Total RAM used ≈ 128 × N × r ≈ 16 MB. Doesn't change.                                                                   *       scryptR: 8,
        scryptP: 1 + (seed[2] % 2),                                                     // Parallelization parameter            - How many times scrypt runs the entire process (1 for even value, 2 for odd value in the array). Changes with generation.                                                                  *       scryptP: 1,
        pepper: seed.slice(6, 38).toString('hex'),                                      // Pepper (32 bytes, hex-encoded)       - Collects bytes 6 to 37 from the seed, converts each byte into a 2-digit hex string and concatenates them (64-character hex string). Changes with generation.                              *       pepper: 'bbb273647ab45b5e165d68ed9f6f5fe81532302627a2a938edfd35523b76bee7'    
    };                                                                                                                                                                                                                                                                                                                      // }

    _cachedDNAGen = generation;                                                         // Saves the GenerationDNA in the cache for the if statement in line 47.

    return _cachedDNA;                                                                  // Returns the GenerationDNA object for the requested generation. There can only be one GenerationDNA object at a time - the last one made. This can be the current generation or a past generation.
}



// =============================================================================
// PASSWORD HASHING
// =============================================================================

export function hashPassword(password: string): string {
    const generation = getCurrentGeneration();
    const dna = getGenerationDNA(generation);                                           // Calculates the generation's DNA
    const salt = randomBytes(SALT_LENGTH);                                              // Generates a random salt for this password. The salt is different for each password, but the same for each generation since it's generated using the generation's DNA as a seed. The salt is stored alongside the hash in the database, so it can be used for verification later.

    const peppered = `${password}:${dna.pepper}:GEN${generation}`;                      // Concatenates the password with the generation's pepper and generation number. This is the final string that gets hashed with scrypt. The pepper adds an extra layer of security on top of the salt, and it changes with each generation, so even if two users have the same password and salt, their hashes will be different if they are created in different generations.
    const hash = scryptSync(peppered, salt, 64, {                                       // Hashes the peppered password with scrypt, using the generation's DNA parameters. The output is a 64-byte buffer.
        N: dna.scryptN,
        r: dna.scryptR,
        p: dna.scryptP,
    });

    return [                                                                            // Returns a string that combines the generation number, salt and hash, separated by colons. This is what gets stored in the database. The generation number is needed for verification to know which DNA parameters and pepper to use. The salt is needed for verification to hash the input password in the same way. The hash is needed for verification to compare against the computed hash of the input password.
        generation.toString(),                                                          // Example output: "227:Z3VhRzVtWl9n5sX9+2QpA==:iYjH8v1qvXGQe+8m7rjv1ZsN8c3u1kL5X9fP1b6n5sX9+2QpA=="
        salt.toString('base64'),
        hash.toString('base64'),
    ].join(':');
}



export function verifyPassword(password: string, storedHash: string): boolean {         // Takes a plaintext password and the stored hash string from the database, and checks if the password is correct by re-hashing it with the same parameters and comparing the result.
    try {
        const parts = storedHash.split(':');                                            // Splits the stored hash string (e.g. "225:base64salt:base64hash") into its 3 components by the colon delimiter.
        
        if (parts.length !== 3) return false;                                           // If the stored hash doesn't have exactly 3 parts (generation, salt, hash), it's malformed — return false immediately.

        const [genStr, saltB64, hashB64] = parts;                                       // Destructures the 3 parts into named variables: generation string, base64-encoded salt, and base64-encoded hash.
        const generation = parseInt(genStr, 10);                                        // Parses the generation string back into a number (e.g. "225" → 225). This is the generation that was used when the password was originally hashed.
        const dna = getGenerationDNA(generation);                                       // Reconstructs the exact same DNA (pepper, scrypt parameters) that was used when this password was originally hashed. Since getGenerationDNA is deterministic, the same generation number always produces the same DNA.
        const salt = Buffer.from(saltB64, 'base64');                                    // Decodes the base64-encoded salt back into a raw byte buffer, so it can be used as input to scrypt.
        const storedBuf = Buffer.from(hashB64, 'base64');                               // Decodes the base64-encoded hash back into a raw byte buffer, so it can be compared byte-by-byte with the computed hash.

        const peppered = `${password}:${dna.pepper}:GEN${generation}`;                  // Concatenates the input password with the same pepper and generation label that was used during hashing. This must be identical to the peppered string created in hashPassword for the comparison to succeed.
        const computed = scryptSync(peppered, salt, 64, {                               // Hashes the peppered password with scrypt using the same salt and parameters from the original generation. If the password is correct, this will produce the exact same 64-byte hash.
            N: dna.scryptN,
            r: dna.scryptR,
            p: dna.scryptP,
        });

        return cryptoTimingSafeEqual(computed, storedBuf);                              // Compares the freshly computed hash with the stored hash using a timing-safe comparison. This prevents timing attacks — the function always takes the same amount of time regardless of where the bytes differ, so an attacker can't learn how "close" their guess is from response times.

    } catch {                                                                           // If anything throws (corrupt data, invalid base64, mismatched buffer lengths, etc.), catch the error silently.
        return false;                                                                   // Return false instead of crashing — a failed verification is treated as an incorrect password.
    }
}

// =============================================================================
// AUTO-UPGRADE
// =============================================================================

export function passwordShouldUpgrade(storedHash: string): boolean {                    // Checks if a stored password hash was created in an older generation and should be re-hashed with the current generation's parameters. Called after a successful login to keep hashes up to date.
    const storedGen = parseInt(storedHash.split(':')[0], 10);                           // Extracts the generation number from the stored hash string (the first part before the colon) and parses it into a number.
    return storedGen < getCurrentGeneration();                                          // Returns true if the stored generation is older than the current one, meaning the password should be re-hashed with the latest DNA parameters on the next successful login.
}
