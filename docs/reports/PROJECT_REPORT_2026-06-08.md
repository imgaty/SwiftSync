# Argent Project Report - 2026-06-08

## Scope

This report reviews the Argent repository from three angles:

- The Codex review reports in `codex-review-reports/`.
- The project documentation in `README.md`, `DESIGN.md`, `FILE_CHECKLIST.md`, `docs/`, `commits/`, and `security-audit-2026-06-07.md`.
- The current source code in `app/`, `components/`, `hooks/`, `lib/`, `prisma/`, `scripts/`, and the project configuration files.

The current worktree is not a clean commit. It contains a large set of modified files, deleted files, and untracked additions. This matters because several security-sensitive changes are present only in the working tree: email-based two-factor login, Salt Edge onboarding, secret validation, password rehash tooling, and the latest documentation edits.

## Executive Summary

Argent is a serious personal finance web application built on Next.js, React, TypeScript, PostgreSQL, Prisma, Tailwind, Radix UI primitives, TanStack Query, Recharts, Resend, and Salt Edge. It is not a small dashboard. The codebase covers user authentication, password reset, email two-factor login, bank connection and transaction import, budgeting, bills, goals, notification workflows, import/export, user-owned spreadsheets, PACE categorization, structured rules, admin operations, audit logs, internationalization, and a custom visual system.

The project has a clear product center: it wants to be a private financial cockpit that ingests bank data, normalizes it into usable financial objects, and helps the user understand spending, planning, goals, bills, and transactions. The strongest parts of the codebase are the breadth of implemented product workflows, consistent user scoping in most API routes, a strong password hashing story, a mature dashboard UI direction, and increasingly thoughtful bank-import validation.

The current branch is in a transitional but buildable state. Static verification is good: tests, typecheck, lint, and production build all pass in the current environment. The dependency audit does not pass. The largest unresolved risks are security and operational hardening items rather than basic compilation failures.

The main concerns are:

- Dependency vulnerabilities remain active, including one high-severity advisory through `exceljs` and several moderate advisories through `protobufjs`, `uuid`, and `hono`.
- Email two-factor login stores pending login sessions in a process-local `Map`, so pending challenges are lost on restart and do not work reliably across horizontally scaled instances.
- Rate limiting is also process-local, which is acceptable for local development but weak for production abuse prevention.
- Salt Edge account and transaction upserts use globally unique provider IDs and should enforce local tenant ownership before update branches.
- Documentation is out of sync with the latest implementation in several important places, especially email 2FA, password pepper environment variables, goal accounts, and the current PACE engine.
- The onboarding gate only checks for any `BankAccount` row, not whether the bank connection is healthy, active, or actually imported usable data.
- CSV export formula protection is present but incomplete because it only checks the first character, not leading whitespace or control characters.

## Verification Performed

The following commands pass on the current worktree:

- `pnpm run test`
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run build`

The production build completed successfully with Prisma Client generation, Turbopack compilation, TypeScript validation, page-data collection, and static-page generation for 71 pages.

The following command fails:

- `pnpm audit --audit-level moderate`

The audit failure reports 8 vulnerabilities:

- High: `tmp <0.2.6`, currently pulled through `exceljs`.
- Moderate: `protobufjs <=7.5.7`, currently pulled through `@huggingface/transformers` and `onnxruntime-web`.
- Moderate: `uuid <11.1.1`, currently pulled through `exceljs` and also through the Resend/Svix dependency chain.
- Moderate: multiple `hono <4.12.21` advisories, currently tied to Prisma development dependencies. The current override pins `hono` to `4.12.19`, which is still below the patched threshold.

I did not start a local browser session for this report. Some earlier Codex reports were blocked by sandbox port-listening or Turbopack runtime issues, but the current environment was able to run a successful production build.

## Current Repository State

The repository is heavily changed relative to `HEAD`. This is not inherently bad, but it raises the review burden because the current behavior is spread across committed history and uncommitted work.

Notable modified areas include:

- Authentication pages and auth API route.
- Admin pages and admin API routes.
- Bank connection account import route.
- Main app layout and many finance pages.
- Dashboard and table components.
- Spreadsheet components.
- Settings and rules UI.
- UI primitives and squircle/UDS styling.
- Documentation under `docs/`.
- Prisma schema and generated client output.
- Password/session/security helpers.
- Proxy/middleware and Next configuration.

Notable deleted files include:

- Legacy app-based 2FA API routes under `app/api/auth/2fa/`.
- Legacy auth background/style files.
- Some UI primitives such as `accordion`, the old OTP input, and `switch`.
- Legacy encryption helper `lib/encryption-v2.ts`.
- Older public icon/template assets.

Notable untracked additions include:

- `app/(auth)/connect-bank/`.
- `components/bank-callback-importer.tsx`.
- `components/required-bank-connect.tsx`.
- `instrumentation.ts`.
- `lib/email-two-factor.ts`.
- `lib/onboarding.ts`.
- `lib/secrets-check.ts`.
- `lib/salt-edge-account-import.ts`.
- `lib/salt-edge-account-import.test.mjs`.
- New Prisma migrations for removing old 2FA and adding email 2FA.
- `scripts/rehash-user-password.ts`.
- `security-audit-2026-06-07.md`.

`FILE_CHECKLIST.md` is useful because it records the intended review surface and explicitly excludes generated or operational files such as `.next`, `node_modules`, `lib/generated`, `.agents`, `commits`, and `codex-review-reports`. The checklist itself was refreshed on 2026-06-08.

## Project Identity

Argent is positioned as a personal finance operating surface. The README describes it as a web application for centralizing, organizing, and interpreting financial information from multiple bank accounts. The implementation supports that positioning: it is built around connected accounts, transactions, goals, bills, budgets, categorization rules, user-specific dashboards, and financial exports.

The app is not merely a display layer over bank data. It has application-owned objects that sit on top of bank imports:

- User-defined tags.
- Counterparties and cached counterparty classifications.
- Structured categorization rules.
- Legacy PACE rules.
- Bills and due-date status.
- Budgets and monthly pressure states.
- Financial goals and linked reserved accounts.
- Notifications.
- Spreadsheet documents and spreadsheet logs.
- Admin audit logs and system announcements.

That model gives the product room to become more than account aggregation. It can become a finance workspace with analysis, planning, review, and control loops.

## Technology Stack

The stack is modern and relatively ambitious:

- Runtime and framework: Next.js 16.2.6 with App Router, React 19.2, TypeScript, Turbopack.
- Database: PostgreSQL via Prisma 7.8.0 and `@prisma/adapter-pg`.
- Styling: Tailwind CSS 4 plus local design-system tokens in `lib/UDS.ts`.
- UI primitives: Radix UI packages, custom UI components, lucide icons, and a custom squircle system.
- State and data fetching: TanStack Query.
- Charts and visualization: Recharts.
- Email: Resend.
- Bank integration: Salt Edge API v6.
- AI/categorization: `@huggingface/transformers` with the Xenova multilingual MiniLM feature-extraction pipeline.
- Spreadsheet import/export support: `exceljs`, `papaparse`, `xlsx`, and internal spreadsheet schemas.
- Authentication: custom HMAC-signed cookie session and custom password hashing.
- Testing: Node-based `.mjs` tests plus TypeScript, ESLint, and production build checks.

The project is not using NextAuth. It owns its session, password, auth, admin, and banking boundaries directly.

## Application Architecture

The main shape is:

- `app/(auth)/`: login, registration, password reset, required bank-connect onboarding, and callback flows.
- `app/(main)/`: user-facing finance app pages.
- `app/(admin)/`: admin console pages.
- `app/api/`: server mutation/query routes.
- `components/`: shared UI and product surfaces.
- `hooks/`: client-side state and data hooks.
- `lib/`: server logic, domain helpers, categorization, auth, import/export, Salt Edge, spreadsheet schema, UDS tokens.
- `prisma/`: schema and migrations.
- `docs/`: product, setup, security, API, schema, design, and feature documentation.
- `codex-review-reports/`: historical review outputs.
- `commits/`: human-readable commit summaries.

The server boundary is mostly clean. API routes load the authenticated user, validate input, scope database operations by `userId`, and use helper functions for repeated concerns. The main layout blocks unauthenticated access and now also gates first-run users into the bank-connect flow.

`proxy.ts` handles page-level redirects and security headers. API routes still self-protect, which is the correct pattern because middleware-only auth is not sufficient for mutation safety.

## Data Model

The Prisma schema is broad but coherent. `User` is the root tenant boundary. Most domain models include `userId`, and most routes query through that boundary.

Core identity and auth fields on `User` include:

- `email`, `password`, `dateOfBirth`, `recoveryEmail`.
- `role` and `status`.
- `lastLoginAt`, `lastLoginIp`.
- `resetToken`, `resetTokenExpiry`.
- `sessionVersion`.
- `emailVerified`.
- `emailTwoFactorEnabled`, `emailTwoFactorCode`, `emailTwoFactorCodeExpiry`.
- `saltEdgeCustomerId`.

Banking models include:

- `SaltEdgeConnection`, keyed by provider connection ID.
- `Bank`, keyed by provider code.
- `BankAccount`, keyed by Salt Edge account ID and linked to user, bank, and connection.
- `Transaction`, keyed by Salt Edge transaction ID when imported.

Finance models include:

- `Bill`.
- `Budget`.
- `FinancialGoal`.
- `FinancialGoalAccount`.
- `Notification`.
- `Tag`.
- `Counterparty`.

Automation and categorization models include:

- `Rule`, the newer structured rule model.
- `PACERule`, the older pattern-based rule model.

Workspace and admin models include:

- `SpreadsheetDocument`.
- `SpreadsheetLog`.
- `AuditLog`.
- `SystemAnnouncement`.

Important schema strengths:

- Many relationships cascade on user deletion.
- The schema uses indexes for common user/date/status/account lookups.
- Transactions have a GIN index for tag search.
- Goal reserved accounts are first-class rather than derived from an amount field only.

Important schema concerns:

- `BankAccount.saltEdgeAccountId`, `Transaction.saltEdgeId`, and `SaltEdgeConnection.connectionId` are globally unique. That is fine if Salt Edge guarantees global uniqueness, but update paths must still verify local ownership before mutating an existing row.
- `saltEdgeCustomerId` on `User` is not unique. That may be intentional if not guaranteed by provider semantics, but it should be documented because it is central to bank-scoping trust.
- Current schema docs should be checked against removed security models outside historical migrations.

## Authentication And Sessions

Authentication is custom and reasonably rigorous.

`lib/password.ts` implements server-only password hashing with:

- scrypt v2.
- 32-byte random salts.
- 64-byte derived keys.
- `N=131072`, `r=8`, `p=1`.
- Versioned pepper support.
- Maximum password length enforcement.
- Legacy v1 rejection.

The format is:

```text
scrypt$v2$<pepperVersion>$<saltB64>$<hashB64>
```

Pepper configuration is environment-driven:

- `PASSWORD_PEPPER_ACTIVE`.
- `PASSWORD_PEPPER_P1`.
- `PASSWORD_PEPPER_P2`, and so on.

`passwordNeedsRehash` detects when a stored hash uses an older pepper version. The login flow can rehash a user after successful verification when the pepper changes.

`lib/session.ts` implements custom signed session tokens. Tokens are HMAC-SHA256 signed and include:

- User id.
- Issued-at time.
- Expiration time.
- Session version.
- Token version.

The token shape is `v1.payload.signature`. Verification checks format, signature, expiration, and session version. This gives the app a strong global logout lever through `sessionVersion`.

Production secret validation exists in `lib/secrets-check.ts` and is invoked by `instrumentation.ts`. It currently validates the session secret and active password pepper.

The page-level `proxy.ts` is also security-aware:

- It skips API/static/internal asset paths.
- It sets CSP with a per-request nonce.
- It sets HSTS, frame denial, no-sniff, referrer policy, and permissions policy headers.
- It verifies auth cookies before routing protected pages.
- It redirects unauthenticated page requests to `/login?callbackUrl=...`.
- It clears stale cookies when a token is invalid.

## Email Two-Factor Login

The current branch replaces older app-based second-factor login with email-based second-factor login.

The implemented flow is:

1. User submits email and password.
2. Password is verified.
3. If `emailTwoFactorEnabled` is true, the server generates a six-digit code.
4. The code is hashed before storage.
5. Code hash and expiry are stored on the user.
6. A pending login session is stored in a process-local `Map`.
7. The server sends the code through Resend.
8. The client receives `needs_2fa`.
9. The client submits the temporary token and code to `2fa-login`.
10. The server verifies token, user, expiry, and code hash.
11. On success, the email 2FA fields are cleared and a normal session cookie is issued.

The helper in `lib/email-two-factor.ts` is well structured for local behavior:

- Codes are six digits.
- TTL is five minutes.
- Attempt count is capped.
- Code hashes are HMAC-based rather than plaintext.
- Expired pending sessions can be cleaned up.

The main weakness is durability. The pending challenge state is process-local. In production this creates several problems:

- Restarting the server invalidates pending challenges.
- Multiple server instances cannot share pending challenges.
- Serverless instances may not handle the follow-up request on the same process.
- Attempt counts are not globally reliable.

The user table already stores the code hash and expiry, so the remaining pending-session state should move to durable storage as well. A database table or Redis/Upstash-backed store would be more production-appropriate.

There is also a subtle abuse-control concern in the login flow. The account login rate limiter is reset after correct password verification before the 2FA step. That makes sense for normal successful logins, but for 2FA-enabled users it may make repeated email-code sending easier if the attacker knows the password. The resend route has its own limiter, but the login route can still mint new challenges.

## Password Reset And Sensitive Profile Updates

Password reset is implemented with token hashing and expiry. Reset flows clear email 2FA challenge fields, which is good because a credential reset should invalidate pending second-factor state.

Sensitive profile updates require the current password. The code treats these as sensitive:

- Email changes.
- Recovery email changes.
- Password changes.
- Email 2FA toggle changes.

Password changes increment `sessionVersion`, which invalidates existing sessions. That is the right behavior.

## Authorization And User Scoping

The code has a consistent tenant boundary in many routes:

- `lib/auth-helpers.ts` resolves the current authenticated user.
- `lib/data-access.ts` provides scoping helpers.
- User routes generally query with `where: { id, userId }` or update via `updateMany` with both `id` and `userId`.
- Account reassignment routes verify that the destination account belongs to the current user.
- Admin routes use a separate admin auth helper and role checks.

This is one of the stronger architectural choices in the project. The code generally avoids accepting a bare object ID and operating on it without a user check.

The biggest exception area is provider-backed upsert logic. When external IDs are globally unique, code often reaches for Prisma `upsert` by the provider ID. That is convenient but must be handled carefully because the update branch can mutate an existing row. For Salt Edge account and transaction imports, the routes should explicitly verify that any row found by provider ID belongs to the authenticated user before allowing an update.

## Bank Integration

The bank integration is Salt Edge-based and is one of the project's core product pillars.

The major pieces are:

- `lib/salt-edge.ts`: typed Salt Edge API client.
- `app/api/bank/connect/route.ts`: creates connect, reconnect, or refresh sessions.
- `app/api/bank/providers/route.ts`: lists providers.
- `app/api/bank/connections/route.ts`: lists local connections.
- `app/api/bank/connections/[id]/route.ts`: connection detail/delete.
- `app/api/bank/connections/[id]/accounts/route.ts`: imports selected or just-connected accounts.
- `app/api/bank/connections/[id]/sync/route.ts`: syncs accounts and transactions for a connection.
- `app/api/bank/lookup/route.ts`: card/IBAN lookup.
- `app/api/bank/sync/route.ts`: older simulated sync flow.

`createSaltEdgeConnectionSession` is careful with return URLs. It validates `returnTo` against the request origin and configured app URL, which helps avoid redirect abuse after bank connection.

`getOrCreateCustomer` persists a Salt Edge customer id on the user record. That is important because the Salt Edge customer id becomes a second scoping boundary in addition to the local user id.

`lib/salt-edge-account-import.ts` is a positive security addition. It prepares account imports by checking requested account IDs against the authoritative provider-side account list. It does not trust client-supplied account payloads. The test confirms that foreign account ids are rejected and tampered client fields are ignored.

The required-bank onboarding flow is also new:

- Register creates the account.
- Registration then attempts to start bank connection.
- The main app layout checks whether the user has imported a bank account.
- Users without imported accounts are redirected to `/connect-bank`.
- The callback page runs `BankCallbackImporter`.
- The importer posts to the account import route, invalidates finance/bank query caches, and redirects into the app.

This is product-coherent. If Argent's value depends on bank data, first-run bank connection is the correct path.

However, the current onboarding predicate is weak. `hasImportedBankAccount` only checks for any `BankAccount` row for the user. It does not check:

- Whether the bank account is active.
- Whether the Salt Edge connection is active.
- Whether transactions were imported.
- Whether the account is usable for the dashboard.

For onboarding, this may be enough to unblock the UI, but for production it should be made more intentional.

## Finance Features

Accounts are currently intended to come from Salt Edge rather than manual account creation. `POST /api/accounts` returns 405 with manual account creation disabled.

Transactions support:

- Scoped list, create, update, delete.
- Bank-account ownership checks.
- Tags.
- Counterparty fields.
- PACE and structured categorization.
- Recategorization.
- Tag propagation.

Bills support:

- Name, amount, due day, frequency, category, autopay, account.
- Status computation based on the current cycle and due date.
- Account ownership validation on creation.

Budgets support:

- Name, amount, category, period.
- Monthly spend calculations from transaction tags.
- Status computation based on usage pressure.

Goals are more sophisticated than the older docs imply. The code now creates a linked `FinancialGoalAccount` for each goal. Goal progress can be derived from linked account balances rather than only a static `currentAmount` field. This is a stronger model because it lets the product represent reserved money, transfers, and progress as financial state rather than just a number on the goal.

Notifications support:

- CRUD by user.
- Scheduled or generated financial alerts.
- Completion notifications for goals.
- Admin notification views.

The dashboard pulls these domains together through `useFinanceData` and dashboard-specific modules. It computes account filters, monthly snapshots, budget pressure, upcoming bills, recent activity, financial focus, and priority items.

## PACE And Categorization

PACE has evolved beyond parts of the documentation.

The older `PACERule` system still exists and supports:

- Pattern matching.
- Match fields.
- Tags.
- Priority.
- ReDoS-oriented pattern safety checks.

`lib/PACE.ts` includes protection against dangerous regex patterns:

- Pattern length limit.
- Suspicious nested quantifier heuristics.
- Safe compile behavior.

The newer structured `Rule` system is more powerful:

- Filters can target counterparty, description, amount, and transaction type.
- Operators include structured matching rather than only raw regex.
- Rules can add tag slugs.
- Rules have priorities.
- Validation is zod-backed.

`lib/PACE.server.ts` adds another layer:

- Loads enabled structured rules and user tags.
- Normalizes counterparties.
- Caches counterparty tag decisions.
- Builds categorization for Salt Edge imports.
- Recategorizes stored transactions.
- Uses Salt Edge category data when present.
- Falls back to local structured rules.
- Falls back to cached counterparty tag data.
- Falls back to embedding similarity against user tags.

The embedding fallback uses `@huggingface/transformers` with `Xenova/paraphrase-multilingual-MiniLM-L12-v2`. This is a notable feature: the system can infer likely tags even when explicit rules do not match.

The docs are behind this implementation. `docs/PACE.md` still describes a much simpler description-only regex/keyword process and says there is no fuzzy or confidence system. `docs/PACE Engine.md` and `docs/Future Implementation.md` describe several items as planned that are partly implemented in current code.

## Import And Export

`app/api/import/route.ts` is a serious data import route. It supports multipart upload, max file size enforcement, dry-run behavior, schema validation, and a transactional commit path.

Supported backup domains include:

- Accounts.
- Tags.
- Transactions.
- Bills.
- Budgets.
- Goals.
- Structured rules.
- Legacy PACE rules.
- Spreadsheets.

The import path does useful work:

- Detects Argent backup format.
- Parses CSV and structured JSON.
- Normalizes rows.
- Computes duplicate keys.
- Creates placeholder accounts when imports refer to missing accounts.
- Infers tags.
- Creates goals with reserved accounts.
- Validates spreadsheet content.
- Runs commit work inside a database transaction with a timeout.

`app/api/export/route.ts` supports JSON backup and CSV/JSON export modes. The JSON backup appears to be the more complete and product-specific path.

The main export concern is formula injection. `csvCell` does prefix a quote for cells beginning with `=`, `+`, `-`, or `@`, but this misses values that begin with whitespace or control characters before a formula character. A robust guard should trim or scan leading ASCII whitespace/control bytes before deciding whether to quote.

There is also a small naming issue: non-backup export filenames still use `swift_*`, which appears to be legacy naming and should be renamed to `argent_*` for product consistency.

## Spreadsheet Module

The spreadsheet module is a substantial embedded tool, not just a table view.

Important pieces include:

- `app/api/spreadsheets/route.ts`.
- `app/api/spreadsheets/[id]/route.ts`.
- `app/api/spreadsheets/[id]/logs/route.ts`.
- `lib/spreadsheet-schema.ts`.
- `hooks/use-spreadsheet.tsx`.
- `components/spreadsheet-workspace.tsx`.
- `components/spreadsheet-home.tsx`.
- Formatting, border, color picker, find/replace, and logs components.

The schema code enforces limits around:

- Maximum rows.
- Maximum sheets.
- Maximum cell lengths.
- Content shape.

The hook and UI support a mini-workbook experience:

- Multiple sheets.
- Grid state.
- Cell editing.
- Formatting.
- Formulas.
- Selection.
- Clipboard interactions.
- Undo/redo.
- Autosave.
- Linked finance data.

This is a meaningful differentiator. It lets Argent act as both a finance tracker and a lightweight finance workspace.

## Admin System

The admin system is broad and has a reasonable permission model.

Admin capabilities include:

- User listing, filtering, sorting, and pagination.
- User detail pages with counts and recent records.
- User status changes.
- Force password reset.
- Role changes.
- Soft deletion.
- Health metrics.
- Stats.
- Audit log views.
- System announcements.
- Admin settings.

`lib/admin-auth.ts` checks the session cookie, user status, session version, and admin role. It can require superadmin for sensitive actions.

`app/api/admin/users/[id]/route.ts` enforces important boundaries:

- Admins cannot modify themselves through that route.
- Non-superadmins cannot change roles.
- Non-superadmins cannot modify superadmins.
- Role changes are superadmin-only.
- Force reset does not return the raw token to the admin after sending the email.

The admin audit logger is a good pattern, but its current implementation stringifies `details` before writing to a Prisma `Json` column. The docs describe structured details. Storing actual JSON objects would be cleaner for querying and display.

## Visual Design And UI System

The design direction is unusually explicit for an app codebase.

`DESIGN.md`, `docs/Visual Identity & Styling.md`, and `docs/Squircles.md` describe Argent as:

- A compact finance cockpit.
- UDS-based, with high-opacity glass surfaces.
- Neutral and readable.
- Built around continuous squircle geometry.
- Avoidant of decorative cards, ornamental gradients, and noisy backgrounds.
- Tuned for dense financial scanning rather than marketing-page presentation.

The implementation follows this through:

- `lib/UDS.ts` centralizes design tokens.
- `components/squircle-provider.tsx` handles native `corner-shape` support or measured superellipse fallback.
- UI components use squircle-aware shapes and UDS surfaces.
- Dashboard primitives centralize display surfaces.
- Dashboard style tests enforce some visual conventions through source assertions.

The design system has a clear thesis: dense, polished, finance-oriented surfaces with soft continuous geometry. That is a strength because it prevents the app from becoming a random collection of component-library defaults.

The branch also includes a lot of UI churn. Many components have been touched. That makes visual regression testing important before shipping, especially because several review reports mention browser/runtime verification being blocked in earlier environments.

## Internationalization And Preferences

The app includes language files in `public/lang/en.json` and `public/lang/pt.json`, plus language and currency providers. This matches the user's Portugal timezone/environment and gives the product a path toward localized finance UX.

The providers mounted in `app/layout.tsx` include:

- Theme provider.
- Language provider.
- Currency provider.
- Colorblind provider.
- Auth provider.
- Loading provider.
- Query provider.
- Squircle provider.
- Surface spotlight provider.

That is a lot of global client context, but it reflects the app's breadth: financial formatting, accessibility preferences, auth, loading, data fetching, and visual system all matter globally.

## Routing Observations

The build route table shows both lowercase auth routes and capitalized main routes:

- `/login`, `/register`, `/forgot-password`, `/reset-password`.
- `/connect-bank`, `/connect-bank/callback`.
- `/Dashboard`, `/Accounts`, `/Transactions`, `/Bills`, `/Budgets`, `/Goals`, `/Calendar`, `/Notifications`, `/Spreadsheets`.

There is also the root route `/`, which is protected and appears to be the main dashboard entry.

Capitalized product routes are functional but unusual on the web. They may be intentional branding or legacy route names. If the product expects public URL polish, normal lowercase paths would be more conventional.

## Documentation Assessment

The docs are extensive and useful, but several files are out of sync with current code.

Strong documentation areas:

- The README gives a clear product summary and links out to deeper docs.
- Technical documentation explains stack, architecture, and route structure.
- Setup guide covers local, VPS, and Vercel deployment paths.
- Admin docs explain role boundaries.
- Bank synchronization docs explain Salt Edge concepts and connection flow.
- Visual identity docs are unusually detailed and align with the UI system.
- Commit docs provide useful historical context.
- Review reports provide a strong running quality log.

Important doc drift:

- `docs/Authentication & Security.md` says login sets a session directly after password verification, but current code may require email 2FA.
- The same docs do not fully reflect `PASSWORD_PEPPER_ACTIVE` and password pepper version variables.
- `docs/API Reference.md` does not list `2fa-login` and `2fa-resend` under the current action route.
- `docs/Technical Documentation.md` still references an encryption helper file that no longer exists in the active code.
- `docs/PACE.md`, `docs/PACE Engine.md`, and `docs/Future Implementation.md` do not accurately describe the current structured-rule and embedding-backed categorization behavior.
- `docs/Financial Features.md` simplifies goals as static `currentAmount`, while the current code uses linked `FinancialGoalAccount` records.
- Setup documentation should include the current required password pepper variables.

The docs are not useless; they are just lagging the active branch. The most important fix is to align security/setup docs with the actual production secret requirements before deployment.

## Codex Review Report Synthesis

The `codex-review-reports/` directory contains many reports from 2026-05-30 through 2026-06-08. Together they tell a useful story of the project.

Major repeated themes:

- The app has moved through a dashboard and UDS visual-system redesign.
- The finance model gained goal reserved accounts and richer import/export paths.
- The bank connection flow has been evolving, especially around Salt Edge account import.
- Authentication has changed significantly, with old app-based second-factor code removed and email 2FA added.
- Static gates have generally been the most reliable verification signal.
- Runtime/browser verification has often been blocked by environment constraints in the review sandbox.
- Generated Prisma output causes review noise and should stay out of human-focused diffs where possible.
- Documentation frequently lags code after major feature branches.

The latest reports converge on the same high-value concerns:

- Email 2FA pending state should not be process-local.
- The onboarding gate should be stricter than "any bank account row exists."
- Password pepper docs and setup docs need alignment.
- Runtime smoke testing should be repeated in an environment that can actually run the app.

The security audit from 2026-06-07 adds the dependency audit issue and highlights in-memory rate limiting, Salt Edge tenant-ownership checks, and CSV formula injection hardening.

## Historical Commit Context

The commit summaries under `commits/` show several large waves of work:

- A dashboard command-center redesign with UDS UI surfaces and finance API updates.
- Import workflows, goal reserved accounts, and broader finance workflow improvements.
- Documentation replacement and deployment-related cleanup.
- Auth/session hardening and admin functionality.

These commit notes matter because the current tree builds on those changes. The project has been moving in large feature batches rather than tiny isolated patches. That can be efficient, but it also makes regression testing and documentation synchronization more important.

## Strengths

The project has several real strengths:

- Product scope is coherent. Banking, transactions, budgets, bills, goals, rules, dashboards, spreadsheets, and admin tools all support the same finance-cockpit idea.
- The data model is broad but understandable. Most tables have a clear owner and role.
- User scoping is handled consistently in many routes.
- Password hashing is strong and versioned.
- Sessions are HMAC-signed and include a session-version revocation mechanism.
- Password reset stores token hashes rather than raw reset tokens.
- Security headers and nonce-based CSP are handled centrally.
- Salt Edge return URLs are origin-validated.
- Bank account import now validates requested account IDs against provider data.
- Import/export is unusually comprehensive.
- PACE has evolved into a multi-layer categorization engine.
- Spreadsheet functionality is deeper than expected for a personal finance app.
- Admin operations have role checks and audit logging.
- The visual system has a clear identity and implementation guidance.
- Tests cover meaningful security and domain behavior, not just snapshots.
- The current production build succeeds.

## Risks And Gaps

### 1. Dependency Audit Failure

This is the most concrete current red flag because it is directly reproducible.

The project should not ship with `pnpm audit --audit-level moderate` failing unless there is a documented exception with compensating controls. The vulnerable paths are not all equally exposed, but the result still matters operationally.

Recommended actions:

- Update or override `hono` to at least `4.12.21`.
- Investigate whether `exceljs` has a patched dependency path for `tmp` and `uuid`.
- Investigate whether `@huggingface/transformers` or `onnxruntime-web` can move to a patched `protobufjs`.
- If a dependency cannot be fixed immediately, document the advisory, exposure path, and planned upgrade.

### 2. Process-Local Email 2FA Pending Sessions

The email 2FA code hash is durable, but pending session metadata is process-local. This should be changed before production scale or serverless deployment.

Recommended actions:

- Add a database table for pending email 2FA login challenges, or use a shared low-latency store such as Redis.
- Store token hash, user id, expiry, attempt count, created IP/user-agent fingerprint if desired, and consumed state.
- Delete or mark consumed challenges on success.
- Keep code hashes short-lived.
- Avoid plaintext code storage.

### 3. Process-Local Rate Limiting

`lib/rate-limit.ts` explicitly notes that the limiter is in-memory and per-process. This is acceptable for development, but production needs shared rate limiting for login, reset, resend, and other sensitive endpoints.

Recommended actions:

- Move sensitive limiters to Redis/Upstash or another durable/shared backend.
- Keep the same API shape so route code remains clean.
- Include account-keyed and IP-keyed throttles for login and reset flows.

### 4. Salt Edge Tenant Ownership On Upsert

Provider IDs are globally unique in the schema. Existing-row update branches should still assert that the row belongs to the authenticated user before mutating it.

Recommended actions:

- Before upserting a `BankAccount` by `saltEdgeAccountId`, check whether an existing row exists and whether `userId` matches.
- Before upserting a `Transaction` by `saltEdgeId`, check whether an existing row exists and whether `userId` and account ownership match.
- Before updating a `SaltEdgeConnection` by provider connection id, confirm ownership through local row or provider `customer_id`.
- Add tests for cross-user provider-ID collision attempts.

### 5. Documentation And Secret Drift

The docs and startup validation must stay aligned about required secrets.

Recommended actions:

- Add `PASSWORD_PEPPER_ACTIVE` and at least one active pepper variable to all environment templates.
- Document email 2FA routes and behavior.

### 6. Onboarding Gate Is Too Shallow

The current onboarding gate checks only for a bank account row.

Recommended actions:

- Decide the intended "onboarded" state.
- Consider requiring an active account with an active connection.
- Consider requiring a successful initial import or at least account metadata import.
- Consider a recovery path if a user has a stale failed connection and no usable finance data.

### 7. CSV Formula Injection Guard Is Incomplete

The CSV guard catches direct formula prefixes but not leading whitespace/control characters before a formula prefix.

Recommended actions:

- Treat cells as formula-risky if the first non-control, non-whitespace character is `=`, `+`, `-`, or `@`.
- Preserve current quoting/escaping behavior.
- Add tests for `" =SUM(1,1)"`, tab-prefixed formulas, carriage-return-prefixed formulas, and normal negative numbers if those should remain safe or be quoted intentionally.

### 8. Runtime Visual Regression Coverage

The build passes, but earlier reports repeatedly noted runtime/browser verification blockers. Given the size of the UI changes, screenshots and interaction checks are still needed.

Recommended actions:

- Start the app in an environment with database and required env configured.
- Smoke test login, register, connect-bank, dashboard, transactions, spreadsheets, settings, and admin.
- Capture desktop and mobile screenshots for the major surfaces.
- Check that squircle fallback behavior does not produce layout shifts or clipped content.

### 9. Admin Audit Details Are Stringified

`AuditLog.details` is a JSON column, but `logAdminAction` stringifies the details object.

Recommended actions:

- Store JSON as JSON.
- Normalize old string values if needed.
- Update admin audit display code to handle both old string and new object values during transition.

### 10. Typecheck Hermeticity

Earlier review reports mention that typecheck could depend on generated `.next/types` state. In this pass `pnpm run typecheck` passes, and `pnpm run build` also passes, but the project should keep typecheck reproducible from a clean checkout.

Recommended actions:

- Keep generated Next types out of assumptions for standalone typecheck if possible.
- In CI, run typecheck after the same generation steps used locally, or document the required order.

## Recommended Priority Plan

1. Fix the dependency audit failure or document temporary exceptions.
2. Move email 2FA pending sessions out of process memory.
3. Move sensitive rate limiting out of process memory.
4. Harden Salt Edge upsert update branches with explicit tenant-ownership checks.
5. Align setup/security/API/schema/PACE docs with the current code.
6. Strengthen the onboarding predicate.
7. Patch CSV formula injection edge cases and add tests.
8. Run browser smoke tests across auth, onboarding, dashboard, transactions, spreadsheets, and admin.
9. Clean up legacy naming such as `swift_*` export filenames.
10. Decide whether generated Prisma client output should remain tracked or be excluded from review noise.

## Suggested Immediate Engineering Tasks

### Dependency audit

- Update the `hono` override to a patched version.
- Check whether Prisma now allows the patched Hono version.
- Update `exceljs` if a version exists that removes vulnerable `tmp` and `uuid` paths.
- Update or pin transformer/runtime packages if patched `protobufjs` is available.
- Re-run `pnpm audit --audit-level moderate`.

### Email 2FA durability

- Add a Prisma model such as `EmailTwoFactorChallenge`.
- Store only token hashes and code hashes.
- Include `expiresAt`, `attempts`, `consumedAt`, and `createdAt`.
- Replace the module-level `Map`.
- Add tests for restart-independent lookup behavior at the helper level.

### Salt Edge ownership checks

- Add helper functions for external ID ownership assertions.
- Use those helpers before provider-ID upserts.
- Add tests that simulate provider ID collision with another user.
- Keep the existing authoritative-provider-account validation.

### Documentation sweep

- Update `docs/Authentication & Security.md`.
- Update `docs/Setup Guide.md`.
- Update `docs/API Reference.md`.
- Update `docs/Database Schema.md`.
- Update `docs/PACE.md`.
- Update `docs/PACE Engine.md`.
- Update `docs/Future Implementation.md`.
- Update `docs/Financial Features.md`.
- Update `docs/Technical Documentation.md`.

## File And Module Notes

### `app/api/auth/[action]/route.ts`

This is a large multi-action auth route. It handles login, email 2FA verification, email 2FA resend, registration, email check, logout, profile retrieval, profile update, and account deletion. It is security-sensitive and should remain heavily tested.

Key notes:

- Correctly uses dummy hash verification for missing-user login timing resistance.
- Handles account status checks.
- Rehashes passwords when pepper version changes.
- Generates email 2FA challenges when enabled.
- Requires current password for sensitive profile changes.
- Increments session version on password change.
- Should avoid resetting login throttles too early for 2FA-enabled accounts.

### `lib/password.ts`

This is one of the stronger security files. It is intentionally server-only, uses modern scrypt parameters, has versioned pepper support, and rejects legacy hashes. The docs should be updated to match it precisely.

### `lib/session.ts`

The session implementation is compact and solid. It signs tokens, checks expiration, and supports session-version invalidation. The main operational issue is not the session format; it is secret management and surrounding auth flows.

### `proxy.ts`

This is responsible for page protection and security headers. The nonce CSP is good. API routes still perform their own auth, which is correct.

### `lib/salt-edge.ts`

This is the provider client and centralizes Salt Edge API behavior. It should remain the only low-level Salt Edge HTTP caller where practical.

### `app/api/bank/connections/[id]/accounts/route.ts`

This route is important because it imports provider data into local records. The authoritative account validation helper is a strong improvement. The remaining ownership concern is around provider-ID upsert update branches.

### `app/api/bank/connections/[id]/sync/route.ts`

This route syncs existing connections and has similar ownership requirements. It should share hardening helpers with the account import route.

### `lib/PACE.ts` and `lib/PACE.server.ts`

These files represent the categorization engine. They have moved beyond legacy docs and should be documented as the current source of truth.

### `app/api/import/route.ts`

This route is broad and powerful. Because it can create many object types, it deserves dedicated regression tests for each domain and cross-domain references.

### `app/api/export/route.ts`

This route is useful but needs CSV injection hardening and naming cleanup.

### `hooks/use-spreadsheet.tsx`

This hook is large and product-critical for the spreadsheet experience. It is likely worth targeted tests around formula evaluation, undo/redo, autosave conflict behavior, and content-size limits.

### `lib/admin-audit.ts`

The audit pattern is good, but JSON should be stored as JSON rather than a stringified object.

## Product Opportunities

Argent already has enough foundations for several product directions:

- A daily finance review workflow built from priority items, recent activity, and upcoming bills.
- Rule suggestions based on repeated counterparty/tag corrections.
- Goal funding workflows using linked goal accounts and transfer references.
- Import review screens with dry-run summaries and duplicate resolution.
- Spreadsheet templates connected to live finance data.
- Admin health and security dashboards for production operations.
- Bank connection health monitoring and reconnection prompts.
- Explainable categorization, showing why a transaction got a tag.

The PACE engine is especially promising if the app exposes confidence and rationale to the user instead of silently applying tags.

## Deployment Readiness

The app is close to deployment-ready in the sense that it builds and has serious security foundations. It is not fully production-hardened until the known operational issues are handled.

Deployment blockers or near-blockers:

- Dependency audit failure.
- Process-local email 2FA pending challenges.
- Process-local rate limiting.
- Setup docs not matching required secrets.
- Need for runtime smoke testing against a real configured database and bank/email sandbox.

Deployment cautions:

- Salt Edge upsert ownership checks should be fixed before real multi-user data.
- CSV formula injection should be fixed before encouraging exports.
- Admin audit JSON should be cleaned up before audit logs become operationally important.
- Documentation should clearly distinguish required, optional, and legacy environment variables.

## Overall Assessment

Argent is a substantial and coherent product codebase. It has a strong financial domain model, a custom security stack, real bank-provider integration, import/export, categorization, spreadsheets, admin operations, and a deliberate visual language. The project has moved beyond prototype stage in breadth and architecture.

The current branch is best described as a large integration branch that is mostly healthy from a build/test perspective but still needs security and documentation hardening. The most important work is not to rewrite the app. It is to finish the operational edges created by the recent auth and onboarding changes:

- Make email 2FA and rate limiting durable.
- Fix dependency advisories.
- Tighten Salt Edge provider-ID update paths.
- Bring docs into alignment with code.
- Re-run browser smoke tests.

Once those are handled, the project will be in a much stronger position for real users and production deployment.
