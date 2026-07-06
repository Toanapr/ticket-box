---
title: Public Ticket Type Slugs
date: 2026-06-24
status: completed
---

# Public Ticket Type Slugs

## Context

Concert URLs were readable, but ticket selection still exposed UUID through `ticketType` query parameters.

## What Happened

- Added immutable ticket type slug with per-concert uniqueness.
- Added deterministic migration backfill and collision suffix generation.
- Switched detail, seating map, sidebar, and checkout links to ticket type slug.
- Added UUID compatibility redirect and preserved unknown-query fallback.
- Kept reservation, inventory, order, and payment identity on UUID.

## Reflection

Ticket type names repeat across concerts, so global uniqueness would create noisy slugs. Scoping uniqueness to concert matches the public URL hierarchy and business identity.

## Decisions

- Ticket type slug unique by `(concertId, slug)`.
- Slug generated from name and immutable after create.
- Public query uses slug; transactional payload uses UUID.

## Next

- Commit after user request.

## Unresolved Questions

- None.
