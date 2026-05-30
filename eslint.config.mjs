//
//  eslint.config.mjs
//  Argent
//
//  Created by Hilario Ferreira on 18 November 2025 at 14:49.
//  Description: Configures ESLint for Argent, combining Next.js and TypeScript rules so source files can
//  be checked consistently during development.
//  Last changed by hilario on 30 May 2026 at 19:35.
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
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**/*.js",
    "lib/generated/**",
  ]),
]);

export default eslintConfig;
