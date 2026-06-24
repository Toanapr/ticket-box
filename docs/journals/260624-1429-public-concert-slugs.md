---
title: Public Concert Slugs
date: 2026-06-24
status: completed
---

# Public Concert Slugs

## Context

Audience concert URLs exposed long UUIDs. Public URLs needed readable identifiers without weakening database identity.

## What Happened

- Added unique persisted `Concert.slug` and deterministic data migration.
- Generated Vietnamese-safe ASCII slugs on create; numeric suffix resolves collisions.
- Kept slugs stable when concert title changes.
- Switched public Audience links to slug and added permanent UUID compatibility redirects.
- Preserved UUID in checkout/reservation contracts.

## Reflection

Slug is presentation identity, not relational identity. Separating both avoids FK churn and preserves existing transactional invariants.

## Decisions

- UUID remains PK/FK and admin/transaction identifier.
- Slug immutable after creation.
- Backend accepts slug plus legacy UUID; Audience canonicalizes to slug.

## Next

- Commit feature after user approval.

## Unresolved Questions

- None.
