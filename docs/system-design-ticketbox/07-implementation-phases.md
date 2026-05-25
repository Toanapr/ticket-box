# 7. Khuyến nghị triển khai theo giai đoạn

## Phase 1: Core ticketing foundation

- Auth/RBAC.
- Concert management.
- Ticket type và quota config.
- Public concert listing/detail.
- Reservation/order/payment flow với một payment provider.
- E-ticket QR issuance.
- Email confirmation.
- Basic admin dashboard.

## Phase 2: Hardening for flash sale

- Edge cache/Redis cache strategy hoàn chỉnh.
- Waiting room/virtual queue.
- Bot protection/rate limiting nhiều lớp.
- Payment reconciliation.
- Inventory stress test.
- Observability dashboard cho sale day.

## Phase 3: Event day operations

- Scanner mobile app.
- Offline manifest.
- Local durable check-in log.
- Sync/conflict handling.
- Guest list CSV import.
- Event-day dashboard.

## Phase 4: AI and extensibility

- PDF upload pipeline.
- AI Artist Bio Service.
- Notification channel abstraction.
- Zalo OA/SMS adapter.
- Advanced analytics/revenue reporting.
