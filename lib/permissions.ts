export type Permission =
    | "data:write"        // Create, update, delete financial data
    | "data:read"         // View financial data
    | "data:export"       // Export data
    | "data:delete"       // Delete financial data
    | "pace:manage"       // Create/edit PACE rules
    | "bank:connect"      // Connect bank accounts
