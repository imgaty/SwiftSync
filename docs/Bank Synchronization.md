# **Bank Synchronization**

<details>
  <summary><strong>Table of Contents</strong></summary>

- [What is Open Banking](#what-is-open-banking)
- [What is Salt Edge](#what-is-salt-edge)
- [Connection Flow](#connection-flow)
- [Transaction Sync](#transaction-sync)
- [Card & IBAN Lookup](#card--iban-lookup)
  - [Card Validation](#card-validation)
  - [IBAN Validation](#iban-validation)

</details>

<br>

Argent connects to real bank accounts through [Salt Edge](https://www.saltedge.com), an Open Banking aggregator. Argent never sees or stores the user's bank credentials — authentication happens entirely within Salt Edge's hosted widget.

<br>

#### What is Open Banking

Open Banking is a regulatory framework (PSD2 in Europe) that requires banks to provide secure APIs for third-party applications to access account data with the account holder's explicit consent. Instead of screen-scraping bank websites, Open Banking uses standardized, bank-approved APIs.

Argent does not connect to banks directly. It uses **Salt Edge** as an intermediary. Salt Edge handles the complexity of integrating with hundreds of different banks across multiple countries, and exposes a single unified API. Argent talks to Salt Edge; Salt Edge talks to the banks.

<br>

#### What is Salt Edge

Salt Edge is a licensed account information service provider (AISP). It provides:
- A **hosted widget** — A secure, bank-branded interface where the user enters their bank credentials. Argent never sees or handles these credentials.
- A **unified API** — A single set of endpoints for fetching accounts, transactions, and balances, regardless of which bank the user connected.
- **Provider coverage** — Support for banks across many European countries, including Portuguese banks.

The integration uses Salt Edge API v6. Three environment variables configure the connection: `SALT_EDGE_APP_ID`, `SALT_EDGE_SECRET`, and `SALT_EDGE_BASE_URL`.

<br>

## Connection Flow

1. The user clicks "Connect Bank" in the app.
2. The frontend calls `POST /api/bank/connect`.
3. The server checks if a Salt Edge **customer** already exists for this user. A Salt Edge customer is a representation of the Argent user on Salt Edge's side. If none exists, the server creates one via the Salt Edge API.
4. The server creates a **connect session** — this is a temporary, one-time-use URL that opens Salt Edge's hosted widget.
5. The frontend redirects the user to the widget URL.
6. Inside the widget, the user selects their bank, enters their bank credentials, and authorizes access. Argent never sees this interaction.
7. After authorization, Salt Edge redirects back to Argent with a `connectionId`.
8. The server stores a new `SaltEdgeConnection` record in the database, linking the `connectionId` to the user. The connection record tracks:
   - `providerCode` and `providerName` — Which bank.
   - `countryCode` — Which country.
   - `status` — Whether the connection is active, disabled, or expired.
   - `lastSyncAt` — When data was last fetched.

<br>

## Transaction Sync

Once a connection is established, Argent can fetch the user's accounts and transactions.

1. `POST /api/bank/sync` is called — either manually by the user clicking "Sync" or automatically.
2. The server loads the user's `SaltEdgeConnection` records from the database.
3. For each connection, the server calls Salt Edge's API to fetch:
   - **Accounts** — Checking accounts, savings accounts, credit cards, etc. Each account has a balance, currency, name, and a unique `saltEdgeAccountId`.
   - **Transactions** — Individual payments, transfers, purchases, etc. Each transaction has an amount, currency, description, date, and a unique `saltEdgeId`.
4. Accounts are upserted locally — matched by `saltEdgeAccountId`. If the account already exists, its balance is updated. If it's new, it's created.
5. Transactions are upserted locally — matched by `saltEdgeId`. The unique constraint on `saltEdgeId` prevents duplicate imports. If a transaction was already imported in a previous sync, it is skipped.
6. Account balances are updated to reflect the latest data from the bank.
7. The `lastSyncAt` timestamp on the connection is updated.

Only the owning authenticated user can access or trigger a sync for their connections. Deleting a connection cascades — all linked accounts and their transactions are also deleted.

> [!NOTE]
> A simulated sync mode is available for development and testing. It generates fake accounts and transactions without requiring a real bank connection or Salt Edge credentials.

<br>

## Card & IBAN Lookup

This is a completely separate feature from bank sync. Given a card number or IBAN, the lookup endpoint validates the input and identifies the likely bank or card network **offline**, without contacting any external service.

<br>

#### Card Validation

When a card number is submitted:

1. **Luhn check** — The [Luhn algorithm](https://en.wikipedia.org/wiki/Luhn_algorithm) is a checksum formula used to validate credit card numbers. It works by doubling every second digit from the right, summing all digits, and checking if the total is divisible by 10. This catches accidental typos — if even one digit is wrong, the check fails.
2. **Network detection** — The first 1–6 digits of a card number are called the **BIN** (Bank Identification Number). Different card networks use different BIN ranges:
   - Visa: starts with `4`
   - Mastercard: starts with `51`–`55` or `2221`–`2720`
   - American Express: starts with `34` or `37`
   - Discover: starts with `6011`, `644`–`649`, or `65`
   - Maestro: starts with `5018`, `5020`, `5038`, `5893`, `6304`, `6759`, `6761`, `6762`, or `6763`
   - Visa Electron: starts with `4026`, `417500`, `4508`, `4844`, `4913`, or `4917`
3. **Bank identification** — For known BIN ranges (Portuguese and European issuers), the server maps the BIN to a specific bank name from a local lookup table.

<br>

#### IBAN Validation

When an IBAN is submitted:

1. **Structure check** — The IBAN must start with a two-letter country code, followed by two check digits, followed by a country-specific bank account number.
2. **Checksum validation** — The IBAN is rearranged (country code and check digits moved to the end), letters are converted to numbers (A=10, B=11, ..., Z=35), and the resulting number is checked modulo 97. If the remainder is 1, the IBAN is valid. This is the [ISO 13616](https://en.wikipedia.org/wiki/International_Bank_Account_Number#Validating_the_IBAN) standard.
3. **Bank identification** — The country code and bank code extracted from the IBAN are looked up in a local table. For Portugal, this covers 13 banks identified by codes `0033` through `0269` (Millennium BCP, CGD, Novo Banco, BPI, Santander Totta, ActivoBank, Bankinter, Montepio, Crédito Agrícola, EuroBic, Banco CTT, Banco Best, and Novo Banco dos Açores). For other countries, 11 European countries are covered with their major banks.

This is purely local and offline. It returns metadata only (valid/invalid, network, bank name) and never fetches balances, transactions, or any live account data. That requires a full Open Banking consent flow through Salt Edge.

---

**Previous file:** [← Authentication & Security](Authentication%20%26%20Security.md)

**Next file:** [PACE](PACE.md) →
