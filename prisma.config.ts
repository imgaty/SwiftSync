//
//  prisma.config.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Configures Prisma for Argent, keeping database tooling options and schema discovery
//  aligned with the application data layer.
//  Last changed by hilario on 30 May 2026 at 19:35.
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
