//
//  postcss.config.mjs
//  Argent
//
//  Created by Hilario Ferreira on 18 November 2025 at 14:49.
//  Description: Configures PostCSS for Argent, registering the CSS processing plugins used by the
//  styling pipeline and Tailwind integration.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
