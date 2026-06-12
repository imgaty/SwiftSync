# Argent Security Audit - 2026-06-07

## Scope

This audit reviewed the local Argent repository at `/Users/hilarioferreira/Argent` as of 2026-06-07. Coverage included:

- 55 API route handlers under `app/api`
- Authentication, session, password reset, email 2FA, OAuth callback, and admin authorization paths
- User data access scoping for accounts, transactions, bills, budgets, goals, tags, rules, spreadsheets, imports, and exports
- Salt Edge bank connection, account import, and transaction sync flows
- Secret handling, local `.env` tracking status, CSP/security headers, dependency advisories, and common injection sinks
- Existing test, lint, typecheck, dependency audit, and targeted secret-pattern checks

Limitations:

- This was a local source audit, not a live deployment penetration test.
- No sub-agent delegation was used because explicit approval for sub-agents was not provided.
- Local secret values were not printed or copied. The audit only checked whether `.env` is tracked or present in git history.

## Executive Summary

Argent has several strong baseline controls: HMAC-signed stateless sessions, production secret checks, scrypt password hashing with a server-side pepper, scoped data-access helpers, a nonce-based CSP, origin validation for bank return URLs, and security-focused tests for auth, password hashing, import, and bank-account import boundaries.

The admin soft-delete behavior was reviewed and confirmed intentional: normal `admin` users can soft-delete non-superadmin users, while admins cannot delete themselves and non-superadmins cannot modify or delete superadmins. Role changes remain `superadmin` only. Dependency audit currently fails with one high and seven moderate advisories. The remaining findings are production hardening issues around distributed rate limiting, tenant guardrails on Salt Edge upserts, and CSV formula mitigation edge cases.

## Findings

| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| SEC-001 | Informational | Normal admins can soft-delete non-superadmin users by design; role changes remain superadmin-only | Confirmed intended behavior |
| SEC-002 | High | Dependency audit reports 8 vulnerable transitive packages | Confirmed |
| SEC-003 | Medium | Auth rate limiting is in-memory and per-process | Confirmed |
| SEC-004 | Medium | Salt Edge unique-ID upserts should enforce tenant ownership before update branches | Defense-in-depth |
| SEC-005 | Low | CSV formula guard misses leading whitespace/control-character formula prefixes | Confirmed hardening gap |

## SEC-001 - Admin Soft-Delete Behavior

Severity: Informational

The admin policy intentionally permits normal admins to soft-delete non-superadmin users. The docs should describe this separately from role changes:

- `docs/Admin System.md:19-22` defines `admin` and `superadmin` capabilities.
- `docs/Admin System.md:24-30` explains that role changes and superadmin-account modifications need an extra `role === "superadmin"` check.
- `docs/Admin System.md:79-85` describes user actions: soft delete is available to admins and superadmins, while role changes are `Superadmin only`.

The implementation matches that policy:

- `app/api/admin/users/[id]/route.ts:155-181` calls `requireAdmin()` and blocks non-superadmins only for `change_role`.
- `app/api/admin/users/[id]/route.ts:192-198` prevents a normal admin from modifying a `superadmin`.
- `app/api/admin/users/[id]/route.ts:351-356` soft-deletes the target user by setting `status = "deleted"`.

Impact:

This is intended administrative behavior, not an authorization bug. Normal admins can soft-delete users except themselves and superadmins. Role changes remain superadmin-only.

Recommended remediation:

1. Keep docs explicit that delete is a soft delete available to admins and superadmins.
2. Keep docs explicit that admins cannot act on themselves and non-superadmin admins cannot modify or delete superadmins.
3. Keep docs explicit that role changes are superadmin-only.

## SEC-002 - Vulnerable Dependency Tree

Severity: High

`pnpm audit --audit-level moderate` fails with 8 advisories:

- High: `tmp <0.2.6`, path `. > exceljs > tmp`, GHSA-ph9p-34f9-6g65
- Moderate: `protobufjs <=7.5.7`, path `. > @huggingface/transformers > onnxruntime-web > protobufjs`, GHSA-jggg-4jg4-v7c6
- Moderate: `uuid <11.1.1`, paths `. > exceljs > uuid` and `. > resend > svix > uuid`, GHSA-w5hq-g745-h8pq
- Moderate: `hono <4.12.21`, path `. > prisma > @prisma/dev > hono`, GHSA-xrhx-7g5j-rcj5
- Moderate: `hono <4.12.21`, GHSA-3hrh-pfw6-9m5x
- Moderate: `hono <4.12.21`, GHSA-f577-qrjj-4474
- Moderate: `hono <4.12.21`, GHSA-2gcr-mfcq-wcc3

Relevant dependency references:

- `package.json:36` includes `@huggingface/transformers`.
- `package.json:58` includes `exceljs`.
- `package.json:66` includes `resend`.
- `package.json:80` includes `prisma`.
- `package.json:94-108` already uses `pnpm.overrides`, but the current `hono@<4.12.18` override pins to `4.12.19`, which is still below the audited patched version `4.12.21`.

Impact:

The `tmp` issue is the highest priority because it is high severity and reachable through `exceljs`. Actual exploitability depends on how Excel import/export functionality invokes affected `tmp` APIs. The Hono advisories appear to be in Prisma dev tooling, so production exposure may be lower if that tooling is never served in production, but audit still fails and supply-chain hygiene is below target.

Recommended remediation:

1. Upgrade direct dependencies where patched releases resolve transitive advisories.
2. Add or update `pnpm.overrides` where compatible:
   - `tmp@>=0.2.6`
   - `protobufjs@>=7.5.8`
   - `uuid@>=11.1.1`
   - `hono@>=4.12.21`
3. Run `pnpm install`, inspect lockfile changes, then rerun `pnpm audit --audit-level moderate`.
4. Run the full validation suite after dependency changes.

## SEC-003 - Rate Limiting Is Per-Process Only

Severity: Medium

The shared rate limiter stores counters in a local `Map`:

- `lib/rate-limit.ts:10-16` explicitly notes it is per-process only and should be replaced before production traffic on multi-instance deploys.
- `lib/rate-limit.ts:20` stores buckets in memory.

Authentication paths depend on this limiter:

- `app/api/auth/[action]/route.ts:213-243` applies IP and per-account login throttles.
- `app/api/auth/[action]/route.ts:317-327` applies email 2FA verification throttling.

Impact:

On Vercel, serverless, or horizontally scaled deployments, an attacker can multiply allowed attempts across instances. Function cold starts also reset counters. This weakens brute-force protection for login, reset, and 2FA flows.

Recommended remediation:

1. Move rate limit state to Redis, Upstash, or another shared low-latency store.
2. Keep both dimensions for login: client IP and normalized email/account target.
3. Add tests for independent scopes, reset behavior, and fail-closed behavior if the shared limiter is unavailable.

## SEC-004 - Salt Edge Upserts Need Tenant Ownership Guardrails

Severity: Medium

Salt Edge connection ownership checks are good before account import:

- `app/api/bank/connections/[id]/accounts/route.ts:119-134` verifies the existing local connection belongs to the caller or that the Salt Edge `customer_id` matches the caller's customer.
- `app/api/bank/connections/[id]/accounts/route.ts:136-144` resolves requested account IDs against authoritative Salt Edge account data.

However, account and transaction upserts use provider IDs as global unique keys:

- `prisma/schema.prisma:76-80` makes `SaltEdgeConnection.connectionId` globally unique.
- `prisma/schema.prisma:95-99` makes `BankAccount.saltEdgeAccountId` globally unique.
- `prisma/schema.prisma:126-129` makes `Transaction.saltEdgeId` globally unique.
- `app/api/bank/connections/[id]/sync/route.ts:88-109` upserts bank accounts by `saltEdgeAccountId`; the update branch does not assert `userId === ctx.userId`.
- `app/api/bank/connections/[id]/sync/route.ts:141-165` upserts transactions by `saltEdgeId`; the update branch does not assert `userId === ctx.userId`.
- `app/api/bank/connections/[id]/accounts/route.ts:176-199` and `app/api/bank/connections/[id]/accounts/route.ts:250-274` have the same pattern during import.

Impact:

If Salt Edge IDs are globally unique and immutable across all customers and environments, this is likely safe in normal operation. If IDs are ever reused across environments, tenants, migrations, fixtures, or stale rows, a valid sync/import by one user could update a row owned by another user because Prisma's unique upsert cannot include `userId` in the `where` clause.

Recommended remediation:

1. Before each provider-ID upsert, `findUnique` the existing row and reject if `existing.userId !== ctx.userId`.
2. Prefer compound tenant-scoped uniqueness where possible, for example `(userId, saltEdgeAccountId)` and `(userId, saltEdgeId)`, then use compound unique keys for upserts.
3. Add regression tests that seed a provider-ID row for user A and prove user B cannot update or reassign it.

## SEC-005 - CSV Formula Guard Has Edge-Case Gaps

Severity: Low

The CSV export helper neutralizes direct formula prefixes:

- `app/api/export/route.ts:16-22` prefixes a leading `=`, `+`, `-`, or `@` value with a single quote.

The check is anchored to the first character only:

```ts
const safe = /^[=+\-@]/.test(val) ? `'${val}` : val
```

Impact:

Some spreadsheet applications treat cells with leading tab, carriage return, newline, or whitespace before a formula operator as formulas after import. User-controlled descriptions, names, categories, tags, and institutions can reach CSV exports at `app/api/export/route.ts:167-235`.

Recommended remediation:

1. Treat leading whitespace/control characters followed by `=`, `+`, `-`, or `@` as formula-like.
2. Consider always quoting CSV cells and prefixing a single quote for values matching `/^[\s\t\r\n]*[=+\-@]/`.
3. Add a CSV export test for values such as `=1+1`, `\t=1+1`, ` @SUM(1,1)`, and normal negative currency values.

## Positive Controls Observed

Authentication and sessions:

- Session tokens are HMAC-SHA256 signed and verified with a timing-safe comparison in `lib/session.ts:100-149`.
- Production startup fails when no session signing secret is present in `lib/session.ts:15-19`.
- `auth-token` lookup checks active user status and session version in `lib/auth-helpers.ts:18-35`.
- Password hashing uses scrypt with per-hash salt and a server-side pepper in `lib/password.ts:46-115`.
- Password verification uses `timingSafeEqual` in `lib/password.ts:152-159`.
- Critical secret validation covers session secrets and active password pepper in `lib/secrets-check.ts:148-174`.

Auth routes:

- Login uses generic invalid-credential errors and dummy hash verification for nonexistent users in `app/api/auth/[action]/route.ts:245-255`.
- Login uses both IP and per-account throttles in `app/api/auth/[action]/route.ts:213-243`.
- Email 2FA stores hashed codes, uses temporary pending sessions, and clears codes after use in `app/api/auth/[action]/route.ts:269-296` and `app/api/auth/[action]/route.ts:375-391`.

Authorization and data scoping:

- Shared helpers generate user-scoped filters and create data in `lib/data-access.ts:22-35`.
- Most personal-data API routes use `getAuthContext()` plus `scopeFilter`, `scopeRecordFilter`, `updateMany`, or `deleteMany` with ownership checks.
- Import route enforces authentication, permission hooks, file size limit, dry-run default, schema validation, and user-scoped writes in `app/api/import/route.ts:46-83`.
- Backup import schemas set concrete max lengths and enum constraints in `lib/data-import.ts:158-274`.

Bank integration:

- Bank connection return URLs are origin-validated in `app/api/bank/connect/route.ts:30-41`.
- Salt Edge account import verifies connection ownership and resolves requested accounts against authoritative Salt Edge account lists in `app/api/bank/connections/[id]/accounts/route.ts:119-144`.
- Existing security test `lib/salt-edge-account-import.test.mjs` covers the account import boundary.

Headers and browser controls:

- CSP is nonce-based for scripts in `proxy.ts:39-54`.
- `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, and `object-src 'none'` are present in `proxy.ts:50-53`.
- Unauthenticated page redirects use only the request pathname for `callbackUrl` in `proxy.ts:83-90`, reducing open-redirect risk.

Secrets:

- `.gitignore:38-39` ignores `.env*`.
- Local `.env` exists but is not tracked.
- `git log --all --format='%H' -- .env` returned zero commits.
- Tracked-file secret-pattern scanning produced code references and variable names, not literal committed credentials.

## Verification Commands

Passed:

```bash
pnpm run typecheck
pnpm run lint
pnpm test
```

`pnpm test` ran:

- `test:auth-security`
- `test:bank-import-security`
- `test:password`
- `test:import`
- `test:dashboard`

Failed as expected due dependency advisories:

```bash
pnpm audit --audit-level moderate
```

Result:

- 8 vulnerabilities found
- 1 high
- 7 moderate

Secret tracking checks:

```bash
git ls-files --error-unmatch .env
git log --all --format='%H' -- .env
```

Result:

- `.env` is not tracked.
- `.env` has no git history in this repository.

## Suggested Remediation Order

1. Update vulnerable dependencies and rerun `pnpm audit --audit-level moderate`.
2. Replace in-memory auth rate limiting before production or multi-instance deployment.
3. Add tenant ownership prechecks around Salt Edge provider-ID upserts.
4. Harden CSV formula detection and add export tests.
