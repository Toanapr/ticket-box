---
title: "Audience Flash-Sale UX Implementation"
date: "2026-06-25"
branch: "plan/person3-audience-flash-sale-ux"
plan: "plans/260625-1025-person3-audience-flash-sale-ux/plan.md"
---

# Audience Flash-Sale UX Implementation

## Context

Implemented Person 3 plan for Audience Web flash-sale UX. Backend remains source of truth for reservation, inventory, sale admission, and payment result.

## What Happened

- Added typed checkout transient errors for `429`, `503`, sale-token required/expired, idempotency conflict, and payment uncertainty codes.
- Added stable checkout intent storage in `sessionStorage`; retry same intent reuses reservation/order idempotency keys.
- Added sale access token storage and forwarding through BFF header `x-sale-access-token`.
- Added waiting-room banner states: waiting, admitted, expired, unavailable.
- Added inventory freshness metadata support for `cachedAt`, `staleAt`, and `inventoryState`.
- Added payment display model for pending, degraded, reconciliation, failed, expired, paid, and issued.
- Removed production-facing mock payment success action from order status UI.

## Decisions

- Use `sessionStorage`, not local storage, for sale access token and checkout intent.
- Keep `x-sale-access-token` / `x-sale-access-expires-at` isolated in BFF/client API until backend contract is final.
- Show ticket link only when backend status is `TICKET_ISSUED` and a `ticketId` exists.
- Build required escalated permissions because sandbox blocked Turbopack helper process/port binding.

## Verification

- `cd src/audience-web && pnpm test` passed: 10 files, 45 tests.
- `cd src/audience-web && pnpm lint` passed.
- `cd src/audience-web && pnpm build` passed with escalated permissions.

## Next

- Confirm final waiting-room endpoint/header names with Person 1/4.
- Confirm exact payment degraded/reconciliation lowercase values with Person 2.
- Confirm final inventory metadata names with Person 1.
