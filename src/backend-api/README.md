<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## TicketBox backend

### Concert poster storage

Concert posters are stored on backend local disk. Set `CONCERT_POSTER_STORAGE_DIR` to a writable persistent directory; it defaults to `storage/concert-posters` relative to the backend working directory. Run `pnpm exec prisma migrate deploy` and `pnpm run seed` after provisioning the directory.

Organizer uploads use `PUT /admin/concerts/:id/poster` with multipart field `poster`. JPEG, PNG, and WebP are accepted up to 5 MB. Publishing requires the referenced poster file to exist. Public bytes are served from `/media/concert-posters/:objectKey` with immutable cache headers.

Local seed posters are copied from `mock-ui/images`. Those source files use `.png` names but contain JPEG bytes, so seeded object keys intentionally use `.jpg`.

Local storage supports a single backend writer. Mount the directory on persistent storage and back it up together with PostgreSQL; restoring only the database leaves dangling poster keys. Multi-replica deployments require migration to shared object storage.

### AI Artist Bio storage and queue

Artist bio PDF uploads are stored in MinIO/S3-compatible object storage. PostgreSQL stores only the object key, checksum, pipeline version and job state; it never stores PDF bytes.

AI jobs are published to RabbitMQ after metadata is persisted. The `artist-bio` module declares a durable queue, exchange and DLQ:

- queue: `ARTIST_BIO_QUEUE_NAME` (default `artist-bio.jobs`)
- exchange: `ARTIST_BIO_EXCHANGE_NAME` (default `artist-bio.jobs`)
- DLQ: `ARTIST_BIO_DLQ_NAME` (default `artist-bio.jobs.dlq`)

Start the required local infrastructure:

```bash
docker compose up -d postgres redis rabbitmq minio
```

RabbitMQ management UI is available at `http://localhost:15672` with `ticketbox/ticketbox123`. MinIO console is available at `http://localhost:9001` with `ticketbox/ticketbox123`.

Relevant environment variables are listed in `.env.example`, including `ARTIST_BIO_RABBITMQ_URL`, `ARTIST_BIO_S3_ENDPOINT`, `ARTIST_BIO_S3_BUCKET`, and MinIO credentials.

PDF text extraction uses `pdf-parse` against the PDF text layer, then sanitizes and truncates the extracted content before calling the AI adapter. Vietnamese text with valid Unicode/text-layer mapping is supported. Scan-only PDFs still require OCR and will fail clearly as unreadable.

### Audience authentication

`POST /auth/register` accepts `fullName`, `email`, and `password`. `POST /auth/login` returns the same user shape plus a Bearer access token. Authenticated clients can resolve the current active profile with `GET /auth/me`.

Apply pending Prisma migrations after pulling schema changes:

```bash
pnpm exec prisma migrate deploy
```

The backend uses PostgreSQL through Prisma for source-of-truth data and Redis for Phase 2 cache/rate-limit protection.

### Cache and rate limit configuration

Start Redis with the backend compose file before running the API locally:

```bash
docker compose up -d redis
```

Relevant environment variables are listed in `.env.example`:

- `REDIS_URL`: Redis connection URL, for example `redis://localhost:6379/0`.
- `PUBLIC_CONCERT_CACHE_TTL_SECONDS`: TTL for public concert list/detail cache.
- `INVENTORY_SUMMARY_CACHE_TTL_SECONDS`: short TTL for display-only ticket availability summaries.
- `CACHE_TTL_JITTER_RATIO`: spreads cache expirations to reduce stampedes.
- `CACHE_MISS_QUERY_BUDGET`: limits concurrent DB-backed loads when public cache misses happen. Cache values computed from data already loaded by the current request do not consume this budget.

Public `GET /concerts` and `GET /concerts/:slug` use cache-aside reads; legacy concert UUID identifiers remain accepted for compatibility. Concert and ticket type records expose immutable slugs for public Audience URLs, while reservation and payment contracts continue using UUIDs. Ticket availability summaries are cached for display only; reservation and payment flows still read and update PostgreSQL inside transactions. Admin concert/ticket-type updates, reservation changes, expiry cleanup, and payment success invalidate affected cache keys.

Rate-limited endpoints return `429` with `Retry-After`. Rejections are logged with the request correlation id. If Redis is unavailable, the guard falls back to a bounded in-memory counter so reservation throttling remains active instead of failing open.

### Payment resilience

Create the provider intent with `POST /payments/:paymentId/intent`, authenticated by an audience Bearer token and a durable `Idempotency-Key`. The user identity is always read from the token `sub` claim; client-provided identity headers are not trusted. A successful mock call returns the same checkout URL on replay. An ambiguous timeout returns `202` with `status: pending_reconciliation`; an open circuit returns `503`, `degraded: true`, and `Retry-After`. Never create another intent for an uncertain payment.

Payment statuses are `created`, `pending`, `pending_reconciliation`, `succeeded`, `failed`, and `expired`. Order remains `pending_payment` while payment outcome is uncertain. Only a verified webhook or reconciliation result finalizes payment and issues tickets.

`WEBHOOK_SIGNING_SECRET` is required outside test mode. Webhook events are durably deduplicated by provider and event id; payload hashes are retained for audit. Reconciliation claims due rows with a database lease, calls the provider outside database transactions, and uses the same transactional finalization path as webhook handling.

Operational logs include `payment_provider_call`, `payment_circuit_transition`, `payment_pending_reconciliation`, `payment_reconciliation_batch`, and `payment_reconciliation_result`. They contain order/payment correlation and pending age, but no webhook secret or raw payload.

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
