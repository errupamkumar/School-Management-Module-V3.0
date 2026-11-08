# Vidyalaya School Management System — Free Cloud Deployment Guide
**Zero Payment Details Required • Free for 30+ Days (or Forever)**

> **Outdated:** this guide describes PostgreSQL on Neon, but the app now uses MySQL (Prisma `provider = "mysql"` plus MySQL-specific queries). For the current production setup on Vercel with TiDB Cloud, follow [deployment/DEPLOYMENT_VERCEL_TIDB.md](deployment/DEPLOYMENT_VERCEL_TIDB.md).

---

## 1. Executive Summary & Recommended Architecture

The Vidyalaya School Management System is built on:
- **Application Engine:** Next.js 14 (App Router)
- **Database:** PostgreSQL (with Prisma ORM)
- **Authentication:** NextAuth.js (JWT session tokens)

To deploy this stack **completely free with ZERO credit card or payment details asked**, here is the best architecture:

```
┌────────────────────────────────────────────────────────┐
│               100% FREE CLOUD ARCHITECTURE             │
│                                                        │
│   [ User Browser / Mobile ]                            │
│              │                                         │
│              ▼ HTTPS (Free SSL)                        │
│   [ Vercel Hobby Tier (Free Forever) ]                 │
│      - Hosts Next.js 14 App & All 64 Routes            │
│      - Built-in Global Edge CDN                        │
│      - Zero Credit Card Required (GitHub Login)        │
│              │                                         │
│              ▼ Secure Connection String                │
│   [ Neon.tech Serverless PostgreSQL (Free Forever) ]   │
│      - 0.5 GB Free Storage                             │
│      - Native Prisma ORM Connection Pooling            │
│      - Zero Credit Card Required (GitHub Login)        │
└────────────────────────────────────────────────────────┘
```

---

## 2. Comparison of Free Hosting Providers (No Card Required)

| Platform Combo | Web / Next.js Host | Database Host | Credit Card Asked? | Free Duration | Performance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Option 1: Vercel + Neon (Recommended 🌟)** | **Vercel** | **Neon.tech** | ❌ **NO** | **Free Forever** | ⚡ Ultra-fast (Global CDN, 0s cold start) |
| **Option 2: Render.com** | Render Web Service | Render PostgreSQL | ❌ **NO** | Free for 90 Days | ⏱️ 30s cold start if idle for 15 mins |
| **Option 3: Cloudflare Tunnel (Instant Demo)** | Local PC | Local PostgreSQL | ❌ **NO** | **Free Forever** | 🚀 2 mins setup, uses existing local data |

---

## 3. Step-by-Step Guide: Option 1 (Vercel + Neon.tech) — Recommended

### Step 1: Create Free PostgreSQL Database on Neon.tech (2 Minutes)
1. Go to **[neon.tech](https://neon.tech)**.
2. Click **"Sign Up"** and choose **"Continue with GitHub"** *(No credit card asked)*.
3. Click **"Create Project"**:
   - **Project Name:** `vidyalaya-db`
   - **Postgres Version:** 16 (Default)
   - **Region:** Choose `Asia Pacific (Singapore)` or `AWS Mumbai (ap-south-1)` for lowest latency in India.
4. Click **"Create Project"**.
5. You will see your **Connection String**.
   - Select the dropdown: **"Prisma"**.
   - Copy the `DATABASE_URL` (it looks like `postgresql://user:password@ep-xyz-pooler.ap-south-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true`).

---

### Step 2: Push Database Schema & Seed Data to Neon (1 Minute)
On your local computer in PowerShell:
```powershell
# In d:\demoProject\school-ms
# Temporarily set your DATABASE_URL to your new Neon URL:
$env:DATABASE_URL="YOUR_NEON_POSTGRES_CONNECTION_STRING"

# Push the schema to Neon:
npx prisma db push

# Seed initial admin accounts and sample classes:
npx prisma db seed
```
*(Now your free cloud database is initialized with all tables, super admin accounts, and academic classes!)*

---

### Step 3: Push Your Code to GitHub (2 Minutes)
If not already pushed to GitHub:
1. Open **[github.com](https://github.com)** and create a new repository named `school-ms` (Private or Public).
2. In your terminal:
```powershell
git init
git add .
git commit -m "feat: complete school management system with all 64 pages"
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/school-ms.git
git push -u origin main
```

---

### Step 4: Deploy on Vercel (3 Minutes)
1. Open **[vercel.com](https://vercel.com)**.
2. Click **"Sign Up"** and select **"Continue with GitHub"** *(No payment details required)*.
3. Click **"Add New..."** -> **"Project"**.
4. Select your `school-ms` repository from GitHub and click **"Import"**.
5. In the **"Environment Variables"** section, add the following:

| Key | Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://...@ep-xyz...neon.tech/neondb?sslmode=require` | Your Neon connection string |
| `NEXTAUTH_SECRET` | `a9f8b2c4d6e8f1a3b5c7d9e2f4a6b8c0d2e4f6a8b1c3d5e7` | Any random 32+ character string |
| `NEXTAUTH_URL` | `https://your-project-name.vercel.app` | Leave blank or set your Vercel URL |
| `NEXT_PUBLIC_APP_NAME` | `Vidyalaya - School Management System` | School display name |

6. Click **"Deploy"**.
7. Vercel will install dependencies, run `prisma generate`, bundle all 64 routes, and in ~90 seconds give you a live HTTPS link:
   👉 **`https://school-ms-xyz.vercel.app`**

---

## 4. Alternative Option 2: Render.com (All-in-One)

1. Sign up at **[render.com](https://render.com)** using GitHub *(Zero card asked)*.
2. **Create Database:**
   - Click **"New +"** -> **"PostgreSQL"**.
   - Name: `school-db`, Region: `Singapore` or `Frankfurt`.
   - Select the **"Free"** plan ($0/month).
   - Copy the **Internal Database URL**.
3. **Create Web Service:**
   - Click **"New +"** -> **"Web Service"**.
   - Connect your GitHub `school-ms` repository.
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm run start`
   - Plan: **Free** ($0/month).
   - Add Environment Variables: `DATABASE_URL` and `NEXTAUTH_SECRET`.
   - Click **"Create Web Service"**.

---

## 5. Alternative Option 3: Cloudflare Tunnel (Share Live in 60 Seconds from your PC)

If you want your current running instance and database to be accessible over the internet **right now** on mobile phones and external laptops without deploying to the cloud:

1. Install Cloudflare Tunnel (Free, no account needed):
```powershell
winget install Cloudflare.cloudflared
```
2. Run tunnel to your local port 3000:
```powershell
cloudflared tunnel --url http://localhost:3000
```
3. Cloudflare will output a public URL like:
   👉 `https://random-name.trycloudflare.com`
4. Anyone in the world can open that URL in their phone or browser and log in directly to your school app!

---

## 6. Default Login Credentials for Deployment

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@school.com` | `Admin@123` | Full control across all 64 pages & settings |
| **Teacher** | `teacher@school.com` | `Teacher@123` | Attendance, Marks, Timetable, LMS |
| **Parent** | `parent@school.com` | `Parent@123` | Child progress, Fee dues, Report cards |
| **Student** | `student@school.com` | `Student@123` | Classes, Homework, Results, ID Card |
