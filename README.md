# TicketBox

TicketBox is a demo ticketing system with four apps under `src/`:

- `backend-api`: NestJS API, Prisma, PostgreSQL, Redis, local file storage, mock/VNPAY payment, notifications, scanner APIs.
- `admin-web`: Next.js admin console for organizers.
- `audience-web`: Next.js audience storefront for concert discovery, reservation, checkout, and e-ticket access.
- `scanner-mobile`: Expo React Native scanner app for offline check-in.

The root Docker flow covers `backend-api`, `admin-web`, and `audience-web`. `scanner-mobile` runs separately through Expo.

## Prerequisites

- Node.js 22.x
- Docker Desktop 4+ with Compose v2
- PowerShell 7+ on Windows
- Optional for local installs: `corepack` (bundled with Node.js 22)

## Tech Stack

| App | Stack | Main libraries |
|---|---|---|
| `backend-api` | NestJS + TypeScript | Prisma, PostgreSQL, Redis, class-validator, class-transformer, Nodemailer, QR code generation, Jest |
| `admin-web` | Next.js 16 + React 19 | TypeScript, Tailwind CSS 4, Next route handlers, Node test |
| `audience-web` | Next.js 16 + React 19 | TypeScript, Tailwind CSS 4, Vitest, `qrcode.react` |
| `scanner-mobile` | Expo 54 + React Native 0.81 | React Navigation, NativeWind, AsyncStorage, Expo Camera, Expo Haptics, Zustand |

## Local Setup

### Backend API

```powershell
cd src/backend-api
corepack pnpm install
corepack pnpm prisma:generate
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm test
```

Backend defaults:

- API: `http://localhost:3000`
- PostgreSQL: `postgresql://ticketbox:ticketbox123@localhost:5433/ticketbox?schema=public`
- Redis: `redis://localhost:6379/0`

### Admin Web

```powershell
cd src/admin-web
npm install
npm test
npm run dev
```

Open `http://localhost:3000` in dev mode.

### Audience Web

```powershell
cd src/audience-web
npm install
npm test
npm run dev
```

Open `http://localhost:3000` in dev mode.

### Scanner Mobile

```powershell
cd src/scanner-mobile
npm install
npm run web
```

Expo can also be started with `npm run android` or `npm run ios` on a compatible machine.

## Docker Demo

This is the recommended clone-and-run path.

```powershell
docker compose up --build
```

The compose file starts:

- PostgreSQL on `localhost:5433`
- Redis on `localhost:6379`
- Backend API on `http://localhost:3000`
- Audience Web on `http://localhost:3001`
- Admin Web on `http://localhost:3002`

Run the smoke test after the services report healthy:

```powershell
pwsh .\scripts\smoke-all.ps1
```

The smoke script checks:

- backend health
- admin and audience proxy health
- backend login for organizer and audience
- admin and audience auth routes
- public concert catalog
- reservation -> order -> mock payment -> issued ticket flow

## Demo Accounts

Seeded credentials:

- Organizer: `organizer@ticketbox.local` / `Password123!`
- Audience 1: `audience.one@ticketbox.local` / `Password123!`
- Audience 2: `audience.two@ticketbox.local` / `Password123!`
- Audience 3: `audience.three@ticketbox.local` / `Password123!`

Scanner demo credentials from the seed:

- VIP scanner device: `DEV-DEMO-VIP-001`
- VIP scanner token: `scanner:12121212-1212-4212-8212-121212121212`
- Guest scanner device: `DEV-DEMO-GUEST-001`
- Guest scanner token: `scanner:13131313-1313-4313-8313-131313131313`

Seeded concerts:

- `Anh Trai Say Hi`
- `Chị Đẹp Đạp Gió Rẽ Sóng`
- `Anh Trai Vượt Ngàn Chông Gai`
- `Em Xinh Say Hi`

## Environment

For local Docker demo, sensible defaults are baked into `docker-compose.yml`:

- `MOCK_PAYMENT_MODE=success`
- Redis and PostgreSQL run locally in containers
- SMTP, VNPAY, Gemini, and Google API keys can stay blank for the demo

If you want to reuse a real backend `.env`, place it at the repo root as `./.env` before running `docker compose up --build`. The backend container reads that file and still overrides container-specific values like PostgreSQL and Redis hostnames.

The following keys in your sample env are currently not used by backend code and can be left in place without affecting startup:

- `PAYMENT_PROVIDER`
- `VNPAY_TEST_MODE`
- `VNPAY_IPN_URL`

If you want to override values, edit `docker-compose.yml` or export environment variables before `docker compose up`.

## Troubleshooting

- If `pnpm` is missing locally, run `corepack enable` first or use `corepack pnpm ...`.
- If backend startup fails, check that PostgreSQL and Redis containers are healthy.
- If demo checkout hangs on payment, ensure `MOCK_PAYMENT_MODE=success`.
- If the backend cannot seed posters or PDFs, confirm the repo still contains `docs/test-data` and `mock-ui/images`.
- If ports are already in use, change the published ports in `docker-compose.yml`.
- If a web app build fails because of stale modules, remove that app's `node_modules` and reinstall.

## Notes

- The backend uses local disk storage for uploaded assets in the demo. No S3/MinIO is required for the clone-and-run path.
- Redis is required for the full backend cache/rate-limit experience, but the demo compose already starts it.
- SMTP, VNPAY, and AI keys are optional for the base demo path and can be left empty.
