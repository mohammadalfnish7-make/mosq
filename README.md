# Mosq MVP

Next.js MVP for a mobile-first mosque circle management and evaluation system.

## Stack

- Next.js App Router + TypeScript
- PostgreSQL
- Prisma
- Tailwind CSS
- Zod validation

## Run Locally

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

Open `http://localhost:3000`.

## Auth

Login and registration are enabled with email + password.

- **Login:** `/login`
- **Register mosque:** `/register` (creates a tenant + admin account)
- **Logout:** `POST /api/auth/logout`

Set `AUTH_SECRET` in `.env` (at least 32 characters).

Seeded dev accounts (password: `password123`):

- Admin: `admin@mosq.local`
- Teacher: `teacher@mosq.local`

## Core API

```txt
GET /api/teacher/session-form?circleId=&date=&periodCode=
POST /api/teacher/sessions/bulk-save
GET /api/teacher/memorization?studentId=&circleId=
PUT /api/teacher/memorization
POST /api/admin/circles
POST /api/admin/teachers
POST /api/admin/students
POST /api/admin/criteria
POST /api/admin/options
```

The teacher bulk-save endpoint validates tenant ownership, teacher assignment, student-circle membership, criterion type, and option ownership before writing in a transaction.
