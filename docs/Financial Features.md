# **Financial Features**

<details>
  <summary><strong>Table of Contents</strong></summary>

- [Bills](#bills)
- [Budgets](#budgets)
- [Financial Goals](#financial-goals)
- [Notifications](#notifications)
- [Data Export](#data-export)

</details>

Beyond bank sync and PACE tagging, Argent includes several financial management tools. All of these are personal and user-scoped, filtered by `userId` on every query, and cascade-delete with the user.

<br>

## Bills

Bills represent recurring payments — things the user pays regularly (rent, subscriptions, utilities, loan installments). Each bill tracks:

- **`name`** — What the bill is for (e.g., `"Netflix"`, `"Rent"`, `"Electricity"`).
- **`amount`** — How much is due each cycle.
- **`dueDay`** — The day of the month (or week/year) when payment is due.
- **`frequency`** — How often it recurs: `weekly`, `monthly`, or `yearly`.
- **`category`** — A tag for grouping (e.g., `"subscriptions"`, `"housing"`).
- **`autoPay`** — Whether the bill is paid automatically (informational flag — Argent does not execute payments).
- **`status`** — Computed based on the current date and due date:
  - `paid` — Already paid for the current cycle.
  - `pending` — Due soon but not yet paid.
  - `overdue` — Past the due date and not marked as paid.
  - `upcoming` — Not yet due.

<br>

## Budgets

Budgets set spending limits per category. Each budget has:

- **`tag`** — The category tag this budget tracks (e.g., `"groceries"`, `"food_delivery"`). This matches against the `tags` array on transactions.
- **`limit`** — The maximum amount the user wants to spend in this category per period.
- **`name`** — A display-friendly label (e.g., `"Groceries Budget"`).
- **`color`** — A hex color for the UI (charts, progress bars).

The frontend calculates budget usage by summing all transactions whose `tags` array includes the budget's `tag` within the current period (month). A progress bar shows how close the user is to the limit. When the limit is exceeded, the UI highlights the overrun.

<br>

## Financial Goals

Goals represent savings targets — amounts the user wants to accumulate over time. Each goal tracks:

- **`name`** — What the user is saving for (e.g., `"Emergency Fund"`, `"Vacation"`).
- **`targetAmount`** — The total amount to reach.
- **`currentAmount`** — How much has been saved so far. Updated manually by the user.
- **`deadline`** — Optional target date. If set, the UI can calculate how much the user needs to save per month to reach the goal on time.
- **`category`** — The type of goal: `savings`, `emergency`, `investment`, `purchase`, `travel`, or `other`.
- **`status`** — `active` (in progress), `completed` (target reached), or `cancelled` (abandoned).

<br>

## Notifications

Notifications are in-app messages that alert the user to important events. Each notification has:

- **`title`** and **`message`** — The content shown to the user.
- **`type`** — The kind of event (e.g., `bill_due`, `budget_exceeded`, `goal_reached`, `general`).
- **`read`** — A boolean flag. Starts as `false`, set to `true` when the user views or dismisses it.
- **`actionUrl`** — An optional URL for deep linking. For example, a `bill overdue` notification might link directly to the bills page.

The notification button in the app header shows the count of unread notifications and polls for new ones every 5 minutes.

<br>

## Data Export

Users can export their financial data via `GET /api/export`. This allows them to download their transactions, accounts, bills, and other records for use in external tools (spreadsheets, other finance apps, or personal backups).

---

**Previous file:** [← PACE](PACE.md)

**Next file:** [Admin System](Admin%20System.md) →
