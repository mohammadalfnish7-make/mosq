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

## Development Auth

The MVP uses a server-side auth helper. During development it falls back to the first active user matching the required role.

To force a user in API calls, send:

```txt
x-user-id: <uuid>
```

Seeded users:

- Admin: `00000000-0000-0000-0000-000000000010`
- Teacher: `00000000-0000-0000-0000-000000000011`

## Core API

```txt
GET /api/teacher/session-form?circleId=&date=&periodCode=
POST /api/teacher/sessions/bulk-save
POST /api/admin/circles
POST /api/admin/teachers
POST /api/admin/students
POST /api/admin/criteria
POST /api/admin/options
```

The teacher bulk-save endpoint validates tenant ownership, teacher assignment, student-circle membership, criterion type, and option ownership before writing in a transaction.
