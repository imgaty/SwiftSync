# **Argent Technical Documentation**
Last update: 30.05.2026

<br>

<details>
  <summary><strong>Table of Contents</strong></summary>

#

- [What Is Argent](#what-is-argent)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Client Data Fetching](#client-data-fetching)
- [Data Model](#data-model)
  - [Cascade Delete](#cascade-delete)
  - [Entity Map](#entity-map)
  - [Notable Fields](#notable-fields)

#

</details>

<br>

## What Is Argent

Argent is a finance application that connects to bank accounts, imports transactions, and gives users practical tools to manage their finances more efficiently.

Its core capabilities include:

- **Bank sync** — Links to real bank accounts through Salt Edge (Open Banking) and imports transactions automatically.
- **Transaction tagging** — A rule engine called PACE automatically categorizes transactions based on user-defined patterns.
- **Bills, budgets, and goals** — Helps users track recurring payments, control spending, and work toward savings targets.
- **Spreadsheets** — Built-in workbook editor for manual data entry and linked financial data views.
- **Admin panel** — Provides user management, audit logging, system health monitoring, and announcements.

All financial data is scoped to the authenticated user. The admin panel operates through a separate role-based access layer.

<br>

## Tech Stack

Argent is built on a TypeScript-first stack designed for secure finance workflows and maintainable full-stack development.

> **Frontend**  
> `Next.js 16` · `TypeScript` · `Tailwind CSS 4` · `shadcn/ui`

> **Data Layer**  
> `PostgreSQL` · `Prisma 7` · `TanStack Query`

> **Security & Services**  
> custom `HMAC` sessions · `Salt Edge API v6` · `Resend`

> **Tooling**  
> `pnpm` (canonical, lockfile committed) · `npm` (also supported for local dev)

<br>

## Project Structure

The project follows the Next.js App Router convention. Server logic in `lib/` and `app/api/`. Client pages and components in `app/` route groups and `components/`.

```text
lib/                                    # Server-side logic (never sent to the browser)
  ├── prisma.ts                         #   Prisma client singleton using the PostgreSQL adapter
  ├── session.ts                        #   HMAC session token creation & verification
  ├── auth-helpers.ts                   #   getAuthUserId() — extracts user from cookies
  ├── auth-backup-codes.ts              #   2FA backup-code hashing and verification
  ├── auth-pending-2fa.ts               #   Short-lived pending 2FA login state
  ├── auth-redirect.ts                  #   Auth callback/redirect normalization
  ├── password.ts                       #   Password hashing and rehash checks
  ├── encryption-v2.ts                  #   Server-only encryption helpers
  ├── salt-edge.ts                      #   Salt Edge Open Banking API client
  ├── bank-api.ts                       #   Card/IBAN lookup (Luhn, BIN, IBAN parsing)
  ├── PACE.ts                           #   Shared PACE rule types and evaluators
  ├── PACE.server.ts                    #   Server-side PACE execution against Prisma data
  ├── PRISM.ts                          #   Shared overlay styling tokens (glass morphism)
  ├── data-access.ts                    #   Personal user-scoping helpers
  ├── permissions.ts                    #   Permission labels used by route guards
  ├── spreadsheet-utils.ts              #   Spreadsheet calculation engine and cell utilities
  ├── spreadsheet-schema.ts             #   Spreadsheet content validation
  ├── spreadsheet-clipboard.ts          #   Spreadsheet clipboard serialization
  ├── spreadsheet-number-format.ts      #   Spreadsheet number format helpers
  ├── admin-auth.ts                     #   requireAdmin() — role-based access guard
  ├── admin-audit.ts                    #   Audit log writer (logAdminAction)
  ├── email.ts                          #   Resend integration (password reset emails)
  ├── query-keys.ts                     #   TanStack Query key helpers
  ├── query-utils.ts                    #   API fetch and cache helpers
  ├── validation.ts                     #   Shared request/input validation
  └── types.ts                          #   Shared finance domain types

app/
  ├── (auth)/                           # Public pages: login, register, forgot/reset password
  ├── (main)/                           # Authenticated pages: dashboard, accounts, transactions, etc.
  ├── (admin)/admin/                    # Admin panel pages (requires admin/superadmin role)
  ├── api/
  │   ├── auth/                         #   Auth endpoints (login, register, 2FA, OAuth, password reset)
  │   ├── bank/                         #   Banking (connect, sync, providers, lookup)
  │   ├── admin/                        #   Admin operations (users, audit log, health, announcements)
  │   ├── PACE-rules/                   #   PACE rule CRUD
  │   ├── spreadsheets/                 #   Spreadsheet document CRUD and logs
  │   ├── accounts/                     #   Bank account CRUD
  │   ├── transactions/                 #   Transaction CRUD (triggers PACE on create)
  │   ├── bills/                        #   Bill management
  │   ├── budgets/                      #   Budget management
  │   ├── goals/                        #   Financial goal management
  │   ├── notifications/                #   Notification management
  │   └── export/                       #   Data export

components/
  ├── ui/                               # shadcn/ui primitives (Button, Dialog, Table, etc.)
  ├── admin/                            # Admin-specific components
  └── auth/                             # Auth-specific components (OAuth buttons, login forms)

prisma/
  ├── schema.prisma                     # Database schema (all models, relations, indexes)
  └── migrations/                       # Committed migration history

proxy.ts                                # Route protection (redirects based on auth state)
```

#

<br>

**Notable Boundaries**

- `lib/` contains server-only modules and shared pure helpers. Sensitive server modules use `import "server-only"` to prevent accidental bundling into client code.
- `app/api/` routes are the only entry points for data mutations. Every route starts by calling `getAuthUserId()` (or `requireAdmin()` for admin routes) and returns 401 if the user is not authenticated.
- `proxy.ts` handles route-level redirects (page access), but does not protect API routes, they protect themselves.
- Route groups `(auth)`, `(main)`, and `(admin)` share the same layout system but are logically separated by access level.
- `lib/generated/` is not source-owned. It is regenerated from `prisma/schema.prisma` by `prisma generate` during `pnpm run build`.

<br>

## Client Data Fetching

Argent uses **TanStack Query** (commonly still called **React Query**) for client-side API data. It is a library that fetches server data, caches it, retries failed requests, and keeps the UI in sync without every component re-implementing the same `useEffect` + `useState` boilerplate.

The shared setup lives in `components/query-provider.tsx`:

- `makeQueryClient()` creates the app's query manager with default rules such as `staleTime`, retries, and refetch-on-focus behavior.
- `getQueryClient()` returns a **fresh client on the server** and a **reused singleton in the browser**. This prevents request data from leaking between users on the server while still keeping one shared cache in the client.
- `QueryProvider` wraps the application in `QueryClientProvider`, which makes that shared query client available to any child component using `useQuery()` or `useMutation()`.

This wrapper does **not** render visible UI. Its purpose is to provide a shared data layer to the component tree.

### Why this approach

This project uses a provider-based query client because it gives a single, consistent place to manage API behavior across the whole app:

- **Caching** — repeated requests for the same data can reuse cached results instead of refetching every time.
- **Less boilerplate** — components can ask for data declaratively instead of managing loading, error, retry, and refetch logic manually.
- **Consistency** — all API-driven screens follow the same freshness and retry rules.
- **Better UX** — data can stay visible while background refetches happen, instead of flickering between empty/loading states.
- **Correct client/server behavior** — the provider ensures hooks know which query client and cache they belong to.

In short, `QueryProvider` is the app-wide bridge between the UI and TanStack Query's shared cache.

<br>

## Data Model

All models are defined in `prisma/schema.prisma`. The database is `PostgreSQL`, managed through **Prisma** — a type-safe ORM (Object-Relational Mapping) that generates TypeScript types from the schema, so every database query is type-checked at compile time.

<br>

### Cascade Delete

Every user-owned model has a `userId` foreign key with `onDelete: Cascade`. This means that when a user is deleted from the database, all rows in related tables that reference that user are automatically deleted too. For example, deleting a user also deletes all their transactions, bank accounts, bills, budgets, goals, notifications, PACE rules, OAuth accounts, trusted devices, Salt Edge connections, spreadsheet documents, and spreadsheet logs, all in a single database operation. No orphaned data is left behind.

### Entity Map

```text
User
 ├── BankAccount[]              — Bank accounts linked to Salt Edge
 ├── Transaction[]              — Financial transactions with tags[]
 ├── Bill[]                     — Recurring bills and subscriptions
 ├── Budget[]                   — Spending limits per category
 ├── FinancialGoal[]            — Savings targets with progress tracking
 ├── Notification[]             — In-app notifications
 ├── PACERule[]                 — Custom tagging rules for the PACE system
 ├── SpreadsheetDocument[]      — Workbook documents with JSON content
 │    └── SpreadsheetLog[]      — Change history per document
 ├── OAuthAccount[]             — Linked OAuth providers (Google, etc.)
 ├── TrustedDevice[]            — Devices that can skip 2FA
 └── SaltEdgeConnection[]       — Open Banking connections
       └── BankAccount[]        — Accounts imported from this connection
```

<br>

### Notable Fields

| Field                                                               | Description                                                                                                                                                                |
| :------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User.role` / `User.status`                                         | These fields control permissions and account lifecycle. They determine who can access the admin area and whether an account is active, suspended, banned, or soft-deleted. |
| `Transaction.tags` / `Transaction.saltEdgeId`                       | These power categorization and deduplication. Tags are stored as a PostgreSQL string array, while `saltEdgeId` prevents duplicate imported transactions.                   |
| `BankAccount.saltEdgeAccountId` / `SaltEdgeConnection.connectionId` | These link local records back to Salt Edge so the correct accounts and sync connections can be updated reliably.                                                           |
| `PACERule.priority` / `AuditLog`                                    | These support rule ordering and admin traceability. PACE rules can be evaluated by priority, and audit records preserve important administrative actions.                  |

<br>

> [!TIP]
> For the detailed explanation, see [Database Schema](Database%20Schema.md).


<br>

## Following Documentation

| #   | Document                                                        | Focus                                                                         |
| :-: | :-------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| 1   | **Technical Documentation**                                     | Product summary, tech stack, project structure, and high-level data model.    |
| 2   | [Database Schema](Database%20Schema.md)                         | Model-by-model breakdown, relations, field meanings, and delete behavior.     |
| 3   | [Authentication & Security](Authentication%20%26%20Security.md) | AES, sessions, 2FA, OAuth, and password recovery.                             |
| 4   | [Bank Synchronization](Bank%20Synchronization.md)               | Salt Edge, connection flow, sync behavior, and card/IBAN lookup.              |
| 5   | [PACE](PACE.md)                                                 | Automatic transaction categorization, matching logic, rules, and limitations. |
| 6   | [Financial Features](Financial%20Features.md)                   | Bills, budgets, goals, notifications, and export.                             |
| 7   | [Admin System](Admin%20System.md)                               | Roles, audit logging, health metrics, and announcements.                      |
| 8   | [API Reference](API%20Reference.md)                             | Endpoint overview for auth, banking, data, spreadsheets, and admin routes. |
| 9   | [Future Implementation](Future%20Implementation.md)             | Planned improvements and currently unimplemented items.                       |
| 10  | [Setup Guide](Setup%20Guide.md)                                 | Local setup and environment configuration.                                    |
| 11  | [Visual Identity & Styling](Visual%20Identity%20%26%20Styling.md) | Design system, PRISM tokens, button variants, and glass morphism guide.     |
| 12  | [Squircles](Squircles.md)                                      | Global squircle corner geometry, fallback behavior, and usage rules.         |

<br>

#

<div align=right>

  **Next Document →**  
  [Database Schema](Database%20Schema.md)
</div>
