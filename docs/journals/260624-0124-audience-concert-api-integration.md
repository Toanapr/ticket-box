---
title: "Audience Concert API Integration"
created: "2026-06-24"
tags: [frontend, backend, api, cache]
---

# Audience Concert API Integration

## Context

Audience concert pages silently used mock data when API configuration was missing. Backend response fields also differed from the UI model.

## What Changed

- Added a validated adapter from NestJS concert DTOs to Audience view models.
- Removed concert mock fallback and switched SSR reads to server-only `BACKEND_API_BASE_URL`.
- Added missing-poster, empty-ticket, API failure, timeout, rate-limit, and 404 handling.
- Added Vitest contract and HTTP tests.
- Fixed cold-cache `GET /concerts` 500: computed inventory summaries no longer consume the DB miss budget.

## Decisions

- Keep backend response and database schema stable.
- Default cache loaders remain budgeted; only explicitly computed values opt out.
- Keep unrelated order/payment/ticket mocks in scope for later work.

## Verification

- Audience: 17 tests, lint, type-check, production compilation passed.
- Backend: 33 tests, targeted lint, compilation passed.
- Real PostgreSQL/Redis smoke test: list/detail 200, missing detail 404.
- Browser smoke test rendered 3 database concerts and real availability values.

## Unresolved Questions

- Add a dedicated poster URL field to the backend contract in a future change.
