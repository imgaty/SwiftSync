# SwiftSync

A personal finance web application built with Next.js. Track bank accounts, transactions, bills, budgets, and financial goals — all in one place.

## Features

- **Bank Integration** — Connect real bank accounts via Salt Edge (Open Banking) to automatically sync transactions and balances
- **Transaction Management** — View, search, filter, and categorize transactions with automatic categorization
- **Bills & Subscriptions** — Track recurring bills with due dates, autopay status, and payment history
- **Budgets** — Create and monitor budgets by category with spending progress
- **Financial Goals** — Set savings goals and track progress over time
- **Dashboard** — Customizable dashboard with interactive charts and financial summaries
- **Multi-language** — Supports English and Portuguese
- **Accessibility** — Colorblind mode support (deuteranopia, protanopia, tritanopia)
- **Dark Mode** — Light, dark, and system theme options
- **Authentication** — Email/password with 2FA (TOTP + email codes), plus OAuth (Google, GitHub, Microsoft, Apple)
- **Admin Panel** — User management, audit logs, and system monitoring

## Tech Stack

| Layer       | Technology                                                   |
|-------------|--------------------------------------------------------------|
| Framework   | [Next.js 16](https://nextjs.org) (App Router)               |
| Language    | TypeScript                                                   |
| Database    | PostgreSQL + [Prisma ORM](https://www.prisma.io)            |
| Styling     | [Tailwind CSS 4](https://tailwindcss.com)                   |
| UI          | [Radix UI](https://www.radix-ui.com) + [shadcn/ui](https://ui.shadcn.com) |
| Charts      | [Recharts](https://recharts.org)                            |
| Email       | [Resend](https://resend.com)                                |
| Banking API | [Salt Edge](https://www.saltedge.com)                       |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/HilFerr/SwiftSync.git
cd SwiftSync

# Install dependencies
pnpm install

# Set up environment variables (see SETUP_GUIDE.md for details)
cp .env.example .env

# Set up the database
pnpm prisma generate --schema prisma/schema.prisma
pnpm prisma migrate deploy --schema prisma/schema.prisma

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Documentation

| Document | Description |
|----------|-------------|
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | Full installation, configuration, and deployment instructions |
| [TECHNICAL_README.md](TECHNICAL_README.md) | How the code works — encryption, authentication, security, and architecture |
| [docs/transaction-categorization-system.md](docs/transaction-categorization-system.md) | Transaction auto-categorization logic |
