# Prisma Migrations Runbook

This project now uses a baseline migration history under `prisma/migrations/0_init`.

## Current baseline

- Baseline migration folder: `prisma/migrations/0_init`
- Baseline was marked as applied on the existing online PostgreSQL database with:

```powershell
npx prisma migrate resolve --applied 0_init
```

## Day-to-day commands

Check migration status:

```powershell
npm run prisma:migrate:status
```

Apply pending migrations:

```powershell
npm run prisma:migrate:deploy
```

Create a new development migration after schema changes:

```powershell
npm run prisma:migrate:dev -- --name <change_name>
```

Generate Prisma client:

```powershell
npm run prisma:generate
```

Seed the database explicitly:

```powershell
npm run db:seed
```

## Baseline workflow for an existing database

If a database already exists and cannot be reset, use Prisma baselining:

1. Create `prisma/migrations/0_init/migration.sql` from the current schema.
2. Mark the baseline as applied:

```powershell
npx prisma migrate resolve --applied 0_init
```

3. Verify status:

```powershell
npm run prisma:migrate:status
```

## Note

- For Neon or other PgBouncer-based providers, prefer `DIRECT_DATABASE_URL` for Prisma Migrate.
- `DATABASE_URL` can stay on the pooled endpoint for normal application traffic.
- Prisma currently warns that `package.json#prisma` seed configuration is deprecated and will be removed in Prisma 7.
- The backend still works on the current Prisma version.
- When upgrading Prisma, move seed configuration to `prisma.config.ts`.
