# Argent — Setup & Deployment Guide

> Complete instructions for running Argent on any device, deploying it to a server, or setting it up on a local machine.

<details>
  <summary><strong>Table of Contents</strong></summary>

- [Prerequisites](#prerequisites)
- [1. Local Development Setup](#1-local-development-setup)
  - [1.1. Install Required Software](#11-install-required-software)
  - [1.2. Clone the Repository](#12-clone-the-repository)
  - [1.3. Install Dependencies](#13-install-dependencies)
  - [1.4. Configure Environment Variables](#14-configure-environment-variables)
  - [1.5. Set Up the Database](#15-set-up-the-database)
  - [1.6. Run the Development Server](#16-run-the-development-server)
- [2. Environment Variables Reference](#2-environment-variables-reference)
- [3. External Services Setup](#3-external-services-setup)
  - [3.1. PostgreSQL Database](#31-postgresql-database)
  - [3.2. Resend (Email Service)](#32-resend-email-service)
  - [3.3. Salt Edge (Banking API)](#33-salt-edge-banking-api)
  - [3.4. OAuth Providers (Optional)](#34-oauth-providers-optional)
- [4. Production Build](#4-production-build)
- [5. Server Deployment](#5-server-deployment)
  - [5.1. Deploy on a VPS / Dedicated Server](#51-deploy-on-a-vps--dedicated-server)
  - [5.2. Deploy on Vercel (Cloud)](#52-deploy-on-vercel-cloud)
- [6. Troubleshooting](#6-troubleshooting)

</details>

---

## Prerequisites

| Software         | Minimum Version | Purpose                                |
| :--------------- | :-------------- | :------------------------------------- |
| Node.js          | 20.0 or higher  | JavaScript runtime                     |
| npm (or pnpm)    | npm 10 / pnpm 9 | Package manager (either works)         |
| PostgreSQL       | 14 or higher    | Database                               |
| Git              | 2.0 or higher   | Version control / cloning              |

> The repository ships with `pnpm-lock.yaml`, so `pnpm install` is the canonical install command and is what CI / Vercel use. For day-to-day script execution (`run dev`, `run build`, etc.) either `npm` or `pnpm` works.

---

## 1. Local Development Setup

### 1.1. Install Required Software

#### Node.js

Download and install Node.js from [https://nodejs.org](https://nodejs.org) (LTS version recommended).

- **Windows:** Download the `.msi` installer and run it.
- **macOS:** Download the `.pkg` installer, or use Homebrew:
  ```bash
  brew install node
  ```
- **Linux (Ubuntu/Debian):**
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

Verify installation:
```bash
node -v
```

#### Package manager (pnpm recommended, npm also supported)

npm ships with Node.js, so no extra step is required to use it. To install pnpm globally (recommended for installs because the lockfile is `pnpm-lock.yaml`):

```bash
npm install -g pnpm
```

Verify installation:
```bash
npm -v
pnpm -v   # optional
```

#### PostgreSQL

- **Windows:** Download from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/) and run the installer. During installation, remember the password you set for the `postgres` user.
- **macOS:** Use Homebrew:
  ```bash
  brew install postgresql@16
  brew services start postgresql@16
  ```
- **Linux (Ubuntu/Debian):**
  ```bash
  sudo apt-get install postgresql postgresql-contrib
  sudo systemctl start postgresql
  sudo systemctl enable postgresql
  ```

#### Git

- **Windows:** Download from [https://git-scm.com/download/win](https://git-scm.com/download/win).
- **macOS:** Included with Xcode Command Line Tools, or install via Homebrew:
  ```bash
  brew install git
  ```
- **Linux (Ubuntu/Debian):**
  ```bash
  sudo apt-get install git
  ```

---

### 1.2. Clone the Repository

```bash
git clone https://github.com/HilFerr/Argent.git
cd Argent
```

---

### 1.3. Install Dependencies

Recommended (uses the committed `pnpm-lock.yaml`):

```bash
pnpm install
```

Alternatively, with npm:

```bash
npm install
```

This installs all the project dependencies defined in `package.json`.

> **Note on commands in this guide.** The examples below use `pnpm` (the canonical installer for this repo). If you prefer npm, the equivalents are:
>
> - `pnpm <script>` → `npm run <script>` (e.g. `pnpm dev` → `npm run dev`, `pnpm build` → `npm run build`).
> - `pnpm prisma ...` → `npx prisma ...`.
> - `pnpm tsx <file>` → `npx tsx <file>`.
>
> Either form works; pick one and be consistent within a session.

---

### 1.4. Configure Environment Variables

Create a file named `.env` in the root of the project (`Argent/.env`) with the following content:

```env
# ─── Database ────────────────────────────────────────────────
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/argent"

# ─── Security ────────────────────────────────────────────────
SESSION_SECRET="generate-a-random-64-character-hex-string"
PASSWORD_PEPPER_ACTIVE="p1"
PASSWORD_PEPPER_P1="generate-a-random-64-character-hex-string"
# PASSWORD_PEPPER_P2="generate-a-random-64-character-hex-string"

# ─── Email (Resend) ─────────────────────────────────────────
RESEND_API_KEY="re_your_resend_api_key"
RESEND_FROM_EMAIL="Argent <onboarding@resend.dev>"

# ─── Banking API (Salt Edge) ────────────────────────────────
SALT_EDGE_APP_ID="your_salt_edge_app_id"
SALT_EDGE_SECRET="your_salt_edge_secret"

# ─── OAuth Providers (optional) ─────────────────────────────
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# ─── App URL ────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

#### Generating Secret Keys

To generate secure random values for `SESSION_SECRET` and `PASSWORD_PEPPER_P1`, run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this command **twice** — once for each secret. Each will produce a 64-character hex string. `PASSWORD_PEPPER_ACTIVE` is a version tag such as `p1`, not a random secret.

> **Important:** Never share these keys or commit them to version control. The `.env` file should already be listed in `.gitignore`.

---

### 1.5. Set Up the Database

#### Create the Database

Connect to PostgreSQL and create the database:

```bash
# On macOS/Linux
psql -U postgres

# On Windows (use the SQL Shell that comes with PostgreSQL)
```

Then run:
```sql
CREATE DATABASE argent;
\q
```

#### Run Migrations

Apply the database schema:

```bash
pnpm prisma migrate deploy --schema prisma/schema.prisma
```

#### Generate Prisma Client

```bash
pnpm prisma generate --schema prisma/schema.prisma
```

#### Seed the Database (Optional)

To populate the database with a default test user:

```bash
pnpm tsx prisma/seed.ts
```

This creates a user with the email `hilariobferreira@icloud.com` and the password `password`.

---

### 1.6. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- To **register a new account**, go to [http://localhost:3000/register](http://localhost:3000/register).
- To **log in**, go to [http://localhost:3000/login](http://localhost:3000/login).

The development server supports hot reloading — any code changes will automatically update the page.

---

## 2. Environment Variables Reference

| Variable                  | Required | Description                           | Default Value                       |
| :------------------------ | :------- | :------------------------------------ | :---------------------------------- |
| `DATABASE_URL`            | Yes      | PostgreSQL connection string          | —                                   |
| `SESSION_SECRET`          | Yes      | Secret key for signing session tokens | —                                   |
| `PASSWORD_PEPPER_ACTIVE`  | Yes      | Active password pepper version        | `p1`                                |
| `PASSWORD_PEPPER_P1`      | Yes      | Server-side password pepper           | —                                   |
| `PASSWORD_PEPPER_P2`      | No       | Optional pepper used during rotation  | —                                   |
| `RESEND_API_KEY`          | Yes      | API key from your Resend account      | —                                   |
| `RESEND_FROM_EMAIL`       | No       | Sender email for outgoing emails      | `Argent <onboarding@resend.dev>` |
| `SALT_EDGE_APP_ID`        | Yes*     | Salt Edge application ID              | —                                   |
| `SALT_EDGE_SECRET`        | Yes*     | Salt Edge secret key                  | —                                   |
| `NEXT_PUBLIC_APP_URL`     | No       | Public URL of the application         | `http://localhost:3000`             |
| `GOOGLE_CLIENT_ID`        | No       | Google OAuth client ID                | —                                   |
| `GOOGLE_CLIENT_SECRET`    | No       | Google OAuth client secret            | —                                   |
| `GITHUB_CLIENT_ID`        | No       | GitHub OAuth client ID                | —                                   |
| `GITHUB_CLIENT_SECRET`    | No       | GitHub OAuth client secret            | —                                   |

> \* Required for the bank connection features to work. The app will function without them, but Open Banking integration will be unavailable.

---

## 3. External Services Setup

### 3.1. PostgreSQL Database

Argent uses PostgreSQL as its database. You need a running PostgreSQL instance with a database created.

**Connection string format:**
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

**Examples:**
- Local: `postgresql://postgres:mypassword@localhost:5432/argent`
- Remote: `postgresql://user:password@db.example.com:5432/argent`

**Managed database providers (for production):**
- [Neon](https://neon.tech) — Free tier available
- [Supabase](https://supabase.com) — Free tier available
- [Railway](https://railway.app) — Free tier available
- [Amazon RDS](https://aws.amazon.com/rds/) — Paid

---

### 3.2. Resend (Email Service)

Resend is used to send password reset emails and optional email two-factor login codes.

1. Create an account at [https://resend.com](https://resend.com)
2. Go to **API Keys** in the dashboard
3. Create a new API key
4. Copy it into your `.env` file as `RESEND_API_KEY`

The free tier provides 3,000 emails per month, which is sufficient for development and small-scale use.

---

### 3.3. Salt Edge (Banking API)

Salt Edge provides Open Banking integration — it allows Argent to connect to real bank accounts and fetch transactions automatically.

1. Create an account at [https://www.saltedge.com](https://www.saltedge.com)
2. Register your application in the Salt Edge dashboard
3. Get your **App ID** and **Secret** from the dashboard
4. Copy them into your `.env` file as `SALT_EDGE_APP_ID` and `SALT_EDGE_SECRET`

> **Note:** For development and testing, Salt Edge provides a test/sandbox environment with fake bank providers.

---

### 3.4. OAuth Providers (Optional)

OAuth allows users to log in with their existing Google or GitHub accounts. Each provider requires registering an application in their developer console.

#### Google

1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services → Credentials**
4. Create an **OAuth 2.0 Client ID**
5. Set the **Authorized redirect URI** to: `http://localhost:3000/api/auth/oauth/google/callback` (for local development)
6. Copy the **Client ID** and **Client Secret** to your `.env`

#### GitHub

1. Go to [https://github.com/settings/developers](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Set the **Authorization callback URL** to: `http://localhost:3000/api/auth/oauth/github/callback`
4. Copy the **Client ID** and **Client Secret** to your `.env`

> **Note:** For production, replace `http://localhost:3000` with your actual domain in all redirect URIs.

---

## 4. Production Build

To build the application for production:

```bash
pnpm build
```

This compiles the TypeScript code, optimizes assets, and generates a production-ready bundle in the `.next/` folder.

To start the production server locally:

```bash
pnpm start
```

The app will be available on [http://localhost:3000](http://localhost:3000).

---

## 5. Server Deployment

### 5.1. Deploy on a VPS / Dedicated Server

Argent runs on **Ubuntu/Debian Linux**, compatible with any cloud provider: AWS EC2, DigitalOcean, Hetzner, OVH, etc.

#### Step 1: Connect to Your Server

```bash
ssh user@your-server-ip
```

#### Step 2: Install Required Software

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Git
sudo apt-get install -y git
```

#### Step 3: Set Up PostgreSQL

```bash
# Switch to the postgres user
sudo -u postgres psql

# Inside the PostgreSQL shell:
CREATE USER argent WITH PASSWORD 'choose-a-strong-password';
CREATE DATABASE argent OWNER argent;
GRANT ALL PRIVILEGES ON DATABASE argent TO argent;
\q
```

#### Step 4: Clone and Configure the Project

```bash
# Clone the repository
cd /opt
sudo git clone https://github.com/HilFerr/Argent.git
cd Argent

# Install dependencies
sudo pnpm install

# Create the environment file
sudo nano .env
```

Paste the environment variables (see [Section 1.4](#14-configure-environment-variables)), adjusting:
- `DATABASE_URL` to: `postgresql://argent:choose-a-strong-password@localhost:5432/argent`
- `NEXT_PUBLIC_APP_URL` to: `https://yourdomain.com` (or your server's IP)
- Generate fresh secrets for `SESSION_SECRET` and `PASSWORD_PEPPER_P1`

#### Step 5: Set Up the Database and Build

```bash
# Generate Prisma client
pnpm prisma generate --schema prisma/schema.prisma

# Run database migrations
pnpm prisma migrate deploy --schema prisma/schema.prisma

# Seed the database (optional)
pnpm tsx prisma/seed.ts

# Build for production
pnpm build
```

#### Step 6: Set Up a Process Manager

Use **PM2** to keep the application running in the background and restart it if it crashes:

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start Argent with PM2
pm2 start pnpm --name "argent" -- start

# Save the PM2 process list so it starts on boot
pm2 save
pm2 startup
```

Useful PM2 commands:
```bash
pm2 status          # View running processes
pm2 logs argent  # View application logs
pm2 restart argent  # Restart the application
pm2 stop argent     # Stop the application
```

#### Step 7: Set Up Nginx as a Reverse Proxy

Nginx forwards requests from port 80/443 (HTTP/HTTPS) to the application running on port 3000.

```bash
# Install Nginx
sudo apt install -y nginx

# Create the site configuration
sudo nano /etc/nginx/sites-available/argent
```

Paste the following configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/argent /etc/nginx/sites-enabled/
sudo nginx -t        # Test the configuration
sudo systemctl restart nginx
```

#### Step 8: Set Up HTTPS with Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install the SSL certificate
sudo certbot --nginx -d yourdomain.com
```

Certbot will automatically configure Nginx to use HTTPS and set up auto-renewal.

After this step, your application will be accessible at `https://yourdomain.com`.

---

### 5.2. Deploy on Vercel (Cloud)

Vercel is the easiest deployment option — it's made by the creators of Next.js.

#### Step 1: Create a Vercel Account

Go to [https://vercel.com](https://vercel.com) and sign up (free tier available).

#### Step 2: Connect Your Repository

1. Click **"New Project"** in the Vercel dashboard
2. Import the `Argent` repository from GitHub
3. Vercel will automatically detect it as a Next.js project

#### Step 3: Configure Environment Variables

In the Vercel project settings, go to **Settings → Environment Variables** and add all the variables from [Section 2](#2-environment-variables-reference).

> **Important:** For `NEXT_PUBLIC_APP_URL`, set it to your Vercel domain (e.g., `https://argent.vercel.app`) or your custom domain.

#### Step 4: Set Up Your Database

Since Vercel doesn't provide PostgreSQL, use a managed database service:
- **Neon** (recommended, free tier) — [https://neon.tech](https://neon.tech)
- **Supabase** (free tier) — [https://supabase.com](https://supabase.com)

Create a database and copy the connection string to the `DATABASE_URL` environment variable in Vercel.

#### Step 5: Deploy

Click **Deploy**. Vercel will:
1. Install dependencies
2. Build the project
3. Run Prisma migrations (if configured in the build command)
4. Deploy the application

To ensure database migrations run on every deployment, set the **Build Command** in Vercel to:
```
pnpm prisma generate --schema prisma/schema.prisma && pnpm prisma migrate deploy --schema prisma/schema.prisma && pnpm build
```

#### Step 6: Custom Domain (Optional)

In the Vercel project settings, go to **Domains** and add your custom domain. Vercel will automatically configure HTTPS.

---

## 6. Troubleshooting

### Common Issues

| Problem                                 | Solution                                                                                                      |
| :-------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `pnpm: command not found`               | Run `npm install -g pnpm` to install pnpm globally.                                                           |
| `prisma: command not found`             | Run `pnpm install` first, then use `pnpm prisma` instead of `prisma` directly.                                |
| Database connection refused             | Ensure PostgreSQL is running: `sudo systemctl start postgresql`.                                              |
| Session or password pepper secret error | Generate 64-character secrets for `SESSION_SECRET` and the active `PASSWORD_PEPPER_P<N>` value.               |
| Port 3000 already in use                | Kill the existing process with `lsof -ti:3000 \| xargs kill -9`, or use a different port: `pnpm dev -p 3001`. |
| OAuth redirect error                    | Check that the redirect URI in your OAuth provider matches `NEXT_PUBLIC_APP_URL` plus the callback path.      |
| Prisma migration failed                 | Ensure `DATABASE_URL` is correct and the database exists.                                                     |
| `Module not found` errors after cloning | Run `pnpm install` and then `pnpm prisma generate --schema prisma/schema.prisma`.                             |

### Checking Logs

- **Development:** Errors appear directly in the terminal running `pnpm dev`
- **Production (PM2):** Run `pm2 logs argent`
- **Production (Vercel):** Check the **Logs** tab in your Vercel project dashboard

### Resetting the Database

If you need to start with a clean database:

```bash
# Drop and recreate the database
psql -U postgres -c "DROP DATABASE argent;"
psql -U postgres -c "CREATE DATABASE argent;"

# Run migrations again
pnpm prisma migrate deploy --schema prisma/schema.prisma

# Optionally re-seed
pnpm tsx prisma/seed.ts
```

---

**Previous file:** [← Future Implementation](Future%20Implementation.md)

**Next file:** —
