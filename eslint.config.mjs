//
//  eslint.config.mjs
//  Argent
//
//  Created by hilario on 18 November 2025 at 14:49
//  Last changed by hilario on 30 May 2026 at 19:35
//  Manually Reviewed by hilario on 08 June 2026 at 14:19
//
//  Configures ESLint for Argent, used for catching code-quality issues that TypeScript may not catch
//


import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    {
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                    destructuredArrayIgnorePattern: "^_",
                },
            ],
        },
    },

    globalIgnores([                                                     // Default ignores of eslint-config-next
        ".next/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
        "scripts/**/*.js",
        "lib/generated/**",
    ]),
]);

export default eslintConfig;
