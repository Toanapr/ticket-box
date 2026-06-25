---
date: 2026-06-25
plan: plans/260624-1517-local-concert-poster-storage/plan.md
status: implemented-awaiting-environment-smoke
---

# Concert Poster Refactor

## Context

Review found broken multipart forwarding, unsafe concurrent replacement, weak publish validation, missing media fallback, and incomplete verification coverage.

## What Changed

- Preserve multipart boundary and exact request bytes through Admin BFF.
- Generate unique per-upload paths and compare-and-swap the old database key.
- Validate MIME/signature agreement, safe keys, writable storage, and real file presence before publish.
- Preserve cache validators, add media timeout, and render gradient fallback after image failure.
- Keep failed create flows recoverable with concert ID/edit link.

## Decisions

- Unique upload token preferred over process mutex: safe across concurrent requests without holding a database lock during filesystem I/O.
- Legacy seed keys remain valid; new uploads use `{concertId}-{version}-{uploadToken}.{ext}`.
- Plan stays in progress until browser smoke runs against the intended local environment.
- Seed posters now copy from `mock-ui/images`; the source files keep `.png` names but contain JPEG bytes, so seeded runtime object keys use `.jpg`.

## Verification

- Backend unit: 83 passed; poster/admin targeted rerun: 41 passed.
- Admin: 2 tests, lint, typecheck, production build passed.
- Audience: 30 tests, lint, typecheck, production build passed.
- Prisma schema valid; changed backend files lint clean; backend build passed.
- Local migration recovery completed for `phase4_concert_posters`: previous failed row marked rolled back, idempotent migration applied, `concerts_poster_object_key_key` unique index exists.
- Local seed completed with 3 published concerts and 3 JPEG poster files copied to `src/backend-api/storage/concert-posters`.

## Next

- Browser-smoke upload, replace, public list/detail/checkout, and failed-image fallback.
