This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

### 1. Create a hosted PostgreSQL database

You need a cloud-hosted PostgreSQL instance. Recommended providers:

| Provider | Free tier | Setup |
|----------|-----------|-------|
| [Neon](https://neon.tech) | 3 GB | Create a project → copy the connection string |
| [Supabase](https://supabase.com) | 500 MB | New project → Settings → Database → Connection string |
| [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) | 256 MB | Dashboard → Storage → Create Database |

### 2. Set environment variables on Vercel

In your Vercel project dashboard go to **Settings → Environment Variables** and add:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

Replace the value with the connection string from your provider. Make sure `sslmode=require` is included for SSL connections.

### 3. Run migrations against the hosted database

Before the first deployment, apply your Prisma migrations to the remote database:

```bash
# Set the remote DATABASE_URL locally (one-time)
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require" npx prisma migrate deploy
```

### 4. Deploy

```bash
# Push to your repository — Vercel auto-deploys on push
git push
```

The build script (`prisma generate && next build`) automatically generates the Prisma client during the Vercel build step.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
