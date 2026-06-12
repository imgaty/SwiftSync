//
//  postcss.config.mjs
//  Argent
//
//  Created by hilario on 18 November 2025 at 14:49
//  Last changed by hilario on 30 May 2026 at 19:35
//  Manually Reviewed by hilario on 08 June 2026 at 16:45
//
//  Configures PostCSS for Argent, registering the CSS processing plugins used by the styling pipeline and Tailwind integration.
//


const config = {
    plugins: {
        "@tailwindcss/postcss": {},
    }
};

export default config;
