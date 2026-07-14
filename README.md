# TicketBox

TicketBox is a demo ticketing system with four applications under `src/`:

- `backend-api`: NestJS API, Prisma, PostgreSQL, Redis, local file storage, mock/VNPAY payment, notifications, and scanner APIs.
- `admin-web`: Next.js organizer console.
- `audience-web`: Next.js storefront for concert discovery, reservation, checkout, and e-ticket access.
- `scanner-mobile`: Expo React Native application for online/offline check-in.

The root Docker Compose flow starts PostgreSQL, Redis, Backend API, Admin Web, and Audience Web. Scanner Mobile runs separately through Expo because it needs a physical Android/iOS device or emulator.

## Tech Stack

| Application | Platform | Main libraries |
|---|---|---|
| `backend-api` | NestJS, TypeScript, Node.js 22 | Prisma, PostgreSQL, Redis, class-validator, Nodemailer, Jest |
| `admin-web` | Next.js 16, React 19 | TypeScript, Tailwind CSS 4, Next route handlers, `qrcode.react` |
| `audience-web` | Next.js 16, React 19 | TypeScript, Tailwind CSS 4, Vitest, `qrcode.react` |
| `scanner-mobile` | Expo 54, React Native 0.81 | React Navigation, NativeWind, Zustand, AsyncStorage, Expo Camera, Expo Haptics |

## Quick Start

For a fresh clone, the base demo does not require SMTP, VNPAY, Redis, or AI credentials. Compose provides PostgreSQL, Redis, demo secrets, mock payment, migrations, and seed data.

### Prerequisites

Required for the Docker web demo:

- Git.
- Docker Desktop 4+ with Docker Compose v2.
- PowerShell 5.1+ or PowerShell 7+ on Windows.

Additionally required for Scanner Mobile or local development:

- Node.js 22.x.
- Expo Go on a physical phone, or a compatible Android/iOS emulator.
- Phone and development machine connected to the same LAN for physical-device testing.

### Start the Docker demo

From the repository root:

```powershell
docker compose up -d --build
docker compose ps
```

Wait until all five services report `healthy`, then open:

| Service | Address |
|---|---|
| Backend API | `http://localhost:3000` |
| Audience Web | `http://localhost:3001` |
| Admin Web | `http://localhost:3002` |
| PostgreSQL | `localhost:5433` |
| Redis | `localhost:6379` |

Backend startup automatically runs:

```text
prisma migrate deploy -> seed if database is empty -> start API
```

Existing demo data is not reseeded on every container rebuild. To intentionally recreate a clean seeded database, see [Reset the demo](#reset-the-demo).

### Run the automated smoke test

Windows PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\smoke-all.ps1
```

PowerShell 7:

```powershell
pwsh .\scripts\smoke-all.ps1
```

The script verifies:

- Backend, Admin proxy, and Audience proxy health.
- Organizer and audience authentication.
- Public concert catalog.
- Reservation and order creation.
- Mock payment success.
- Issued e-ticket lookup.

The smoke test uses a real PostgreSQL database but mock payment, so SMTP and VNPAY credentials are not required.

## Demo Accounts

All seeded web accounts use password `Password123!`:

| Role | Email |
|---|---|
| Organizer | `organizer@ticketbox.local` |
| Audience | `audience.one@ticketbox.local` |
| Audience | `audience.two@ticketbox.local` |
| Audience | `audience.three@ticketbox.local` |

Seeded scanner credentials:

| Scope | Device code | Bearer token |
|---|---|---|
| VIP | `DEV-DEMO-VIP-001` | `scanner:12121212-1212-4212-8212-121212121212` |
| Guest | `DEV-DEMO-GUEST-001` | `scanner:13131313-1313-4313-8313-131313131313` |

Seeded concerts include:

- `Anh Trai Say Hi`
- `Chị Đẹp Đạp Gió Rẽ Sóng`
- `Anh Trai Vượt Ngàn Chông Gai`
- `Em Xinh Say Hi`

## Scanner Mobile Demo

The following scanner flow has been tested on the current project: provision device, scan setup QR, load assignment, download manifest, scan offline, persist pending events, reconnect, sync, and reject duplicate check-in.

### 1. Find the backend LAN IPv4

Run `ipconfig` and use the IPv4 address of the active Wi-Fi/Ethernet adapter. For example, if the machine address is `192.168.2.7`, the Scanner API URL is:

```text
http://192.168.2.7:3000/scanner
```

Do not use `localhost` on a physical phone. On the phone, `localhost` means the phone itself.

Confirm connectivity by opening this address in the phone browser:

```text
http://192.168.2.7:3000/health
```

Replace `192.168.2.7` with the current machine IPv4.

### 2. Start Scanner Mobile

```powershell
cd src/scanner-mobile
npm install
npm start
```

Scan the Expo QR with Expo Go, or use:

```powershell
npm run android
```

### 3. Provision and configure by QR

1. Sign in to Admin Web at `http://localhost:3002`.
2. Open `http://localhost:3002/admin/scanners`.
3. Select `Provision New Device`.
4. In the one-time provision result, replace the default Scanner API URL with `http://<LAN-IP>:3000/scanner`.
5. Keep the provision result open. The access token and setup QR disappear when it is closed.
6. In Scanner Mobile, open `Setup` and select `Scan Setup QR`.
7. Grant camera permission and scan the Admin QR.

The app validates the versioned QR payload, fills API URL/device code/token, and requests the current assignment automatically. The database stores only the token hash; the raw token is shown only in the provision response.

### 4. Assign and download the manifest

1. In Admin Web, assign the device to a concert, gate, and zone.
2. In Scanner Mobile, refresh/load the assignment.
3. Select `Download Manifest`.
4. Verify concert, gate, zone, manifest version, and ticket count.

The signed manifest is the scanner's offline source of truth. Assignment and manifest are persisted locally.

### 5. Test offline check-in and sync

1. Disable Wi-Fi/mobile data on the scanner phone.
2. Scan a valid ticket included in the manifest.
3. Verify that one event appears in the pending queue.
4. Scan the same QR again. Expected result: `duplicate_local_scan`, and the queue count must not increase.
5. Fully close and reopen Scanner Mobile while offline. The pending event must still exist in AsyncStorage.
6. Restore the network and select `Sync`.
7. Verify an `accepted` ACK and removal of the acknowledged event from the queue.
8. Verify the backend ticket status changes from `issued` to `checked_in`.

If another scanner syncs the same ticket, only the first event is accepted. The later event receives `ticket_already_checked_in` and references the winning check-in event.

## Blueprint Coverage

| Blueprint flow | Verification |
|---|---|
| Clone, migrate, seed, and start web system | `docker compose up -d --build` |
| Health, auth, catalog, checkout, payment, ticket | `scripts/smoke-all.ps1` |
| Account quota under concurrent requests | Backend checkout E2E tests |
| No oversell of the last ticket | Backend checkout E2E tests |
| Admin scanner provision QR | Tested through Admin Web |
| Scanner assignment and manifest | Tested through Admin + Scanner Mobile |
| Offline queue, restart persistence, sync, and conflict | Tested through Scanner Mobile and backend sync tests |

Detailed evidence and raw logs:

- `docs/test-evidence-2026-07-14.md`
- `docs/test-evidence/logs/checkout-concurrency-2026-07-14.log`
- `docs/test-evidence/logs/checkout-smoke-2026-07-14.log`
- `docs/test-evidence/logs/order-payment-ticket-records-2026-07-14.log`

Regenerate checkout/concurrency evidence with:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\capture-core-test-evidence.ps1 -EvidenceDate 2026-07-14
```

## Environment

No env file is required for the base Docker demo. Container-safe PostgreSQL, Redis, JWT, scanner signing, storage, and mock-payment defaults are defined in `docker-compose.yml`.

To supply backend overrides, create or edit:

```text
src/backend-api/.env
```

This is the optional file read by the root Compose service. Compose still overrides container-specific settings such as `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `PORT`, and `MOCK_PAYMENT_MODE`.

Useful backend variables include:

| Variable | Base demo requirement |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Supplied by Compose |
| `REDIS_URL` | Supplied by Compose |
| `JWT_SECRET` | Supplied with a demo-only value |
| `SCANNER_MANIFEST_SIGNING_SECRET` | Supplied with a demo-only value |
| `SMTP_*` | Optional; notification workers are disabled in the base demo |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL` | Optional; only required for real VNPAY testing |
| `VNPAY_IPN_URL` | Operational/portal configuration; use a public HTTPS URL for real callbacks |
| `GEMINI_API_KEY`, `GOOGLE_API_KEY` | Optional |

`VNPAY_TEST_MODE` and `VNPAY_IPN_URL` are not currently read to select the provider endpoint in backend code. Sandbox checkout is selected through `VNPAY_PAYMENT_URL`, which defaults to the VNPAY sandbox URL. The real VNPAY flow also requires valid merchant credentials and portal configuration; test card information alone is not sufficient.

Never commit production JWT, SMTP, VNPAY, scanner signing, or API secrets.

## Local Development

The Docker quick start is recommended. For local application development, first start only the infrastructure:

```powershell
docker compose up -d postgres redis
```

### Backend API

```powershell
cd src/backend-api
corepack enable
corepack pnpm install
corepack pnpm prisma:generate
corepack pnpm prisma:migrate:deploy
corepack pnpm db:seed:if-empty
corepack pnpm start:dev
```

Backend: `http://localhost:3000`.

### Admin Web

In another terminal:

```powershell
cd src/admin-web
npm install
$env:NEXT_PUBLIC_API_BASE_URL="http://localhost:3000"
npm run dev -- -p 3002
```

Admin Web: `http://localhost:3002`.

### Audience Web

In another terminal:

```powershell
cd src/audience-web
npm install
$env:BACKEND_API_BASE_URL="http://localhost:3000"
npm run dev -- -p 3001
```

Audience Web: `http://localhost:3001`.

### Tests

```powershell
cd src/backend-api
corepack pnpm test

cd ..\admin-web
npm test

cd ..\audience-web
npm test

cd ..\scanner-mobile
npm test
npx tsc --noEmit
```

## Operations

### View status and logs

```powershell
docker compose ps
docker compose logs -f backend-api
docker compose logs -f admin-web audience-web
```

### Stop without deleting data

```powershell
docker compose down
```

### Reset the demo

This deletes the demo PostgreSQL and uploaded-file volumes, then recreates migrations and seed data:

```powershell
docker compose down -v
docker compose up -d --build
```

Do not use `down -v` on an environment containing data that must be retained.

## Troubleshooting

### A container is not healthy

```powershell
docker compose ps
docker compose logs backend-api
docker compose logs postgres redis
```

Confirm Docker Desktop has enough memory and ports `3000`, `3001`, `3002`, `5433`, and `6379` are not already in use.

### Smoke test returns `quota_exceeded`

The smoke script creates a successful order, so repeatedly using the same seeded audience account eventually reaches its per-user ticket quota. Use another seeded audience account:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\smoke-all.ps1 -AudienceEmail audience.three@ticketbox.local
```

Alternatively, reset the demo volume when retaining data is not required.

### Scanner phone cannot reach backend

- Use `http://<machine-LAN-IP>:3000/scanner`, not `localhost` and not a Docker `172.x` address.
- Confirm phone and machine are on the same LAN and client isolation is disabled on the Wi-Fi network.
- Open `http://<machine-LAN-IP>:3000/health` in the phone browser.
- Allow inbound TCP port `3000` through Windows Firewall for the active private network.
- If the LAN IP changes, update the Scanner API URL in the provision QR or Setup screen.

### Scanner returns `invalid_ticket_payload`

- Download a fresh manifest after assigning the device.
- Confirm the ticket belongs to the assigned concert and zone.
- Scan the actual ticket QR token, not an order ID or ticket display label.
- Confirm Admin, Backend, and Scanner Mobile are running the current build.

### VNPAY shows `Không tìm thấy website`

Verify that `VNPAY_TMN_CODE` belongs to the same sandbox environment as `VNPAY_HASH_SECRET` and that the merchant website is active in the VNPAY portal. A localhost IPN cannot receive callbacks from VNPAY; use a public HTTPS endpoint for full integration testing.

### Rebuild after source changes

```powershell
docker compose up -d --build backend-api admin-web audience-web
```

Scanner Mobile is not a Docker image. Restart Expo and reload/rebuild the mobile application after scanner source changes.
