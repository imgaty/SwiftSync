//
//  instrumentation.ts
//  Argent
//
//  Created by hilario on 06 June 2026 at 15:52
//  Last changed by hilario on 06 June 2026 at 15:52
//  Manually Reviewed by hilario on 08 June 2026 at 06:44
//
//  Next.js instrumentation file. Verifies all required secret are present on server startup
//


export async function register() {                                                  // Especial Next.js function that runs only once on server startup.
    if (process.env.NEXT_RUNTIME !== "nodejs") return

    const { assertSecretsPresent } = await import("./lib/secrets-check.ts")
    assertSecretsPresent()
}
