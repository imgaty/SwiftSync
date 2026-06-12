# **API Reference**

<details>
  <summary><strong>Table of Contents</strong></summary>

- [How the frontend uses these routes](#how-the-frontend-uses-these-routes)
- [Authentication](#authentication)
- [Banking](#banking)
- [Data Management](#data-management)
- [Spreadsheets](#spreadsheets)
- [Admin](#admin)

</details>

All API routes live under `app/api/`. Every authenticated route starts by verifying the user. Admin routes additionally verify role. Responses are JSON.

## How the frontend uses these routes

Most data-driven screens consume these endpoints through **TanStack Query / React Query**. In Argent, `components/query-provider.tsx` installs a shared `QueryClientProvider` near the root layout, so components can call `useQuery()` and `useMutation()` instead of manually wiring `fetch`, `loading`, `error`, caching, and refetch logic for every screen.

This means the API routes below are not just plain endpoints — they are commonly used as cached data sources for the UI.

## Authentication

| Endpoint                              | Method | What it does                                         | Auth required | Source                                                                                                     |
| :------------------------------------ | :----- | :--------------------------------------------------- | :------------ | :--------------------------------------------------------------------------------------------------------- |
| `/api/auth/register`                  | `POST` | Register a new user (hashes password with scrypt)    | No            | [View](https://github.com/HilFerr/Argent/blob/main/app/api/auth/%5Baction%5D/route.ts)                  |
| `/api/auth/login`                     | `POST` | Verify credentials, set session cookies              | No            | [View](https://github.com/HilFerr/Argent/blob/main/app/api/auth/%5Baction%5D/route.ts)                  |
| `/api/auth/verify`                    | `GET`  | Check if the current session is valid                | Yes           | [View](https://github.com/HilFerr/Argent/blob/main/app/api/auth/%5Baction%5D/route.ts)                  |
| `/api/auth/logout`                    | `POST` | Clear session cookies                                | Yes           | [View](https://github.com/HilFerr/Argent/blob/main/app/api/auth/%5Baction%5D/route.ts)                  |
| `/api/auth/forgot-password`           | `POST` | Generate reset token and send email via Resend       | No            | [View](https://github.com/HilFerr/Argent/blob/main/app/api/auth/forgot-password/route.ts)               |
| `/api/auth/reset-password`            | `POST` | Verify token and set new password                    | No            | [View](https://github.com/HilFerr/Argent/blob/main/app/api/auth/reset-password/route.ts)                |
| `/api/auth/oauth/[provider]`          | `GET`  | Redirect to OAuth provider consent screen            | No            | [View](https://github.com/HilFerr/Argent/blob/main/app/api/auth/oauth/%5Bprovider%5D/route.ts)          |
| `/api/auth/oauth/[provider]/callback` | `GET`  | Handle OAuth callback, create/link user, set cookies | No            | [View](https://github.com/HilFerr/Argent/blob/main/app/api/auth/oauth/%5Bprovider%5D/callback/route.ts) |

<br>

## Banking

| Endpoint                | Method | What it does                                                          | Source                                                                                   |
| :---------------------- | :----- | :-------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| `/api/bank/connect`     | `POST` | Create Salt Edge customer + connect session, return redirect URL      | [View](https://github.com/HilFerr/Argent/blob/main/app/api/bank/connect/route.ts)     |
| `/api/bank/connections` | `GET`  | List the user's bank connections with status and last sync time       | [View](https://github.com/HilFerr/Argent/blob/main/app/api/bank/connections/route.ts) |
| `/api/bank/sync`        | `POST` | Fetch latest accounts and transactions from Salt Edge, upsert locally | [View](https://github.com/HilFerr/Argent/blob/main/app/api/bank/sync/route.ts)        |
| `/api/bank/providers`   | `GET`  | List available banking providers from Salt Edge                       | [View](https://github.com/HilFerr/Argent/blob/main/app/api/bank/providers/route.ts)   |
| `/api/bank/lookup`      | `POST` | Offline card/IBAN validation and bank identification                  | [View](https://github.com/HilFerr/Argent/blob/main/app/api/bank/lookup/route.ts)      |
| `/api/bank/connections/[id]`         | `GET / DELETE` | Get or remove a specific bank connection                   | [View](https://github.com/HilFerr/Argent/blob/main/app/api/bank/connections/%5Bid%5D/route.ts)          |
| `/api/bank/connections/[id]/accounts`| `GET`          | List accounts under a specific connection                  | [View](https://github.com/HilFerr/Argent/blob/main/app/api/bank/connections/%5Bid%5D/accounts/route.ts) |
| `/api/bank/connections/[id]/sync`    | `POST`         | Trigger manual sync for a specific connection              | [View](https://github.com/HilFerr/Argent/blob/main/app/api/bank/connections/%5Bid%5D/sync/route.ts)     |

<br>

## Data Management

| Endpoint             | Method        | What it does                                                            |
| :------------------- | :------------ | :---------------------------------------------------------------------- |
| `/api/transactions`  | `GET`         | List all transactions for the user, ordered by date descending          |
| `/api/transactions`  | `POST`        | Create a transaction (runs PACE if `usePACE: true` or no tags provided) |
| `/api/accounts`      | `GET / POST`  | Bank account CRUD                                                       |
| `/api/bills`         | `GET / POST`  | Bill management                                                         |
| `/api/budgets`       | `GET / POST`  | Budget management                                                       |
| `/api/goals`         | `GET / POST`  | Financial goal management                                               |
| `/api/notifications` | `GET / PATCH` | Notifications (list, mark as read)                                      |
| `/api/PACE-rules`    | `GET / POST`  | PACE rule CRUD                                                          |
| `/api/export`        | `GET`         | Export user financial data                                              |

<br>

## Spreadsheets

| Endpoint                          | Method              | What it does                                         |
| :-------------------------------- | :------------------ | :--------------------------------------------------- |
| `/api/spreadsheets`               | `GET / POST`        | List spreadsheet documents or create a new one       |
| `/api/spreadsheets/[id]`          | `GET / PATCH / DELETE` | Get, update, or delete a spreadsheet document     |
| `/api/spreadsheets/[id]/logs`     | `GET`               | Get change history for a spreadsheet                 |

<br>

## Admin

All admin routes require `admin` or `superadmin` role. User deletion is an admin-side soft delete: normal admins can soft-delete non-superadmin users, but admins cannot delete themselves and non-superadmins cannot modify or delete superadmins. Role changes remain `superadmin` only.

| Endpoint                   | Method       | What it does                                            | Source                                                                                       |
| :------------------------- | :----------- | :------------------------------------------------------ | :------------------------------------------------------------------------------------------- |
| `/api/admin/users`         | `GET`        | List users with filters and pagination                  | [View](https://github.com/HilFerr/Argent/blob/main/app/api/admin/users/route.ts)          |
| `/api/admin/users/[id]`    | `GET`        | Detailed user profile                                   | [View](https://github.com/HilFerr/Argent/blob/main/app/api/admin/users/%5Bid%5D/route.ts) |
| `/api/admin/users/[id]`    | `PATCH`      | Suspend, ban, unsuspend, delete, change role            | [View](https://github.com/HilFerr/Argent/blob/main/app/api/admin/users/%5Bid%5D/route.ts) |
| `/api/admin/audit-log`     | `GET`        | Paginated audit log with filters                        | [View](https://github.com/HilFerr/Argent/blob/main/app/api/admin/audit-log/route.ts)      |
| `/api/admin/health`        | `GET`        | System health snapshot (DB latency, counts, runtime)    | [View](https://github.com/HilFerr/Argent/blob/main/app/api/admin/health/route.ts)         |
| `/api/admin/announcements` | `GET / POST` | List or create system announcements                     | [View](https://github.com/HilFerr/Argent/blob/main/app/api/admin/announcements/route.ts)  |

---

**Previous file:** [← Admin System](Admin%20System.md)

**Next file:** [Future Implementation](Future%20Implementation.md) →
