//
//  prisma.config.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05
//  Last changed by hilario on 30 May 2026 at 19:35
//  Manually Reviewed by hilario on 09 June 2026 at
//
//  Configures Prisma for Argent, keeping database tooling options and schema discovery aligned with the application data layer.
//


import "dotenv/config";
import { defineConfig } from "prisma/config";


export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: process.env["DATABASE_URL"],
    },
});
