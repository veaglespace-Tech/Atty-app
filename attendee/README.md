# Veagle Attendee Attendance SaaS

Veagle Attendee is a multi-tenant attendance and workforce management platform built for organizations, team leaders, members, and super admins.

It includes organization onboarding, plan selection, payment integration, attendance tracking, team management, reporting, and role-based dashboards.

## Tech Stack

- Frontend: Next.js 16, React 19, Redux Toolkit, Tailwind CSS, Framer Motion
- Backend: Node.js, Express, Prisma
- Database: MySQL
- Payments: Razorpay
- Auth: JWT + cookie support

## Main Modules

- Public website: home, pricing, about, contact
- Authentication: login, member signup, org onboarding flow
- Organization portal: users, teams, attendance, reports, notifications, subscription
- Team leader portal: attendance, reports, team management
- Member portal: dashboard, attendance, settings
- Super admin portal: analytics, organizations, plans, payments, settings

## Project Structure

```text
attendee/
|- client/   # Next.js frontend
|- server/   # Express + Prisma backend
`- README.md
```

## Prerequisites

- Node.js 20+
- npm 10+
- MySQL database

## Environment Variables

### Server

Create `server/.env.local` for your machine-specific values. It overrides `server/.env` locally, stays out of git, and does not affect deployed environment variables.

Example:

```env
PORT=5000
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DB_NAME"
JWT_KEY="your-jwt-secret"
CLIENT_URL="http://localhost:3000"
CLIENT_ORIGINS="http://localhost:3000"

RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""

EMAIL_SERVICE="gmail"
EMAIL_USER=""
EMAIL_PASS=""

SENTRY_DSN=""
SENTRY_TRACES_SAMPLE_RATE=0
```

Optional values used by helper scripts:

```env
SUPER_ADMIN_NAME="Super Admin"
SUPER_ADMIN_EMAIL="superadmin@veagle.com"
SUPER_ADMIN_PASSWORD="password123"
SUPER_ADMIN_COUNTRY_CODE="+91"
SUPER_ADMIN_MOBILE="9999999999"
```

### Client

Create `client/.env.local` to control which API your local frontend talks to:

```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
```

If you want the local client to use the deployed backend instead, set:

```env
NEXT_PUBLIC_API_URL="https://atty.veaglespace.com/api"
```

## Installation

### 1. Install backend dependencies

```bash
cd server
npm install
```

### 2. Install frontend dependencies

```bash
cd ../client
npm install
```

## Database Setup

From `server/`:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed:plans
```

If needed, create the super admin:

```bash
npm run create:super-admin
```

## Run Locally

### Start backend

```bash
cd server
npm start
```

Backend runs on `http://localhost:5000`.

### Start frontend

```bash
cd client
npm run dev
```

Frontend runs on `http://localhost:3000` with Turbopack.

## Local Dev Without Affecting Deployment

- Use `server/.env.local` for your local database, JWT, and other secrets.
- Use `client/.env.local` to choose between the local backend and deployed backend.
- Deployment environment variables still take priority over repo files, so these local files are safe for development.

## Useful Scripts

### Client

```bash
npm run dev
npm run dev:clean
npm run build
npm run start
npm run lint
```

### Server

```bash
npm start
npm test
npm run prisma:generate
npm run prisma:migrate
npm run seed:plans
npm run create:super-admin
```

## API Areas

- `/api/auth`
- `/api/org`
- `/api/attendance`
- `/api/dashboard`
- `/api/payment`
- `/api/plans`
- `/api/super-admin`
- `/api/team-leader`
- `/api/member`

## Notes

- CORS already allows localhost frontend development by default.
- Plan data should be seeded before testing organization onboarding.
- Outgoing mail can rotate through the Hostinger mailbox pool defined in `server/.env.example`; each mailbox is capped at `EMAIL_DAILY_LIMIT` sends per day before the helper moves to the next one.
- Razorpay and email features require valid credentials to work fully.
- Prisma schema is located at `server/prisma/schema.prisma`.

## Testing

From `server/`:

```bash
npm test
```

## Repository

- Remote: `https://github.com/veaglespace-Tech/attendee.git`
- Branch: `main`
