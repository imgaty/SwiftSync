//
//  permissions.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides shared permissions logic for Argent, centralizing domain behavior, helpers, or
//  integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
export type Permission =
    | "data:write"        // Create, update, delete financial data
    | "data:read"         // View financial data
    | "data:export"       // Export data
    | "data:delete"       // Delete financial data
    | "pace:manage"       // Create/edit PACE rules
    | "bank:connect"      // Connect bank accounts
