# VenueOps Backend

This folder scaffolds the first production-ready backend foundation for VenueOps ERP using:

- NestJS
- Prisma ORM
- PostgreSQL
- Redis + BullMQ

## What is included

- Modular NestJS app structure
- Prisma schema for users, customers, venues, spaces, bookings, payments, and audit logs
- Starter modules for `auth`, `customers`, `bookings`, `reports`, and `health`
- Docker Compose infrastructure for PostgreSQL and Redis at the project root in `docker-compose.backend.yml`

## Suggested setup flow

1. Copy `.env.example` to `.env`
2. Start PostgreSQL and Redis:

```powershell
docker compose -f ..\docker-compose.backend.yml up -d
```

3. Install backend dependencies:

```powershell
npm install
```

4. Generate Prisma client:

```powershell
npm run prisma:generate
```

5. Run the first database migration:

```powershell
npm run prisma:migrate -- --name init
```

6. Start the backend:

```powershell
npm run start:dev
```

The API will default to `http://localhost:3001/api`.

## Next implementation step

The frontend currently reads and writes bookings through browser `localStorage`. The next step after this scaffold is to:

- build the real booking endpoints
- connect `App.tsx` to `GET /bookings`
- replace `localStorage.setItem(...)` writes with `POST`, `PATCH`, and `DELETE` API calls
- introduce login, users, and role-based access
