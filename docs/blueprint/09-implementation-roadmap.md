# 9. Lộ trình triển khai và kết luận

## Phase 1: Core ticketing foundation

Mục tiêu là có luồng bán vé chạy được từ public page đến e-ticket, với phân quyền cơ bản và payment provider đầu tiên.

- Auth/RBAC.
- Concert management.
- Ticket type và quota config.
- Public concert listing/detail.
- Reservation/order/payment flow với một payment provider.
- E-ticket QR issuance.
- Email confirmation.
- Basic admin dashboard.

## Phase 2: Hardening for flash sale

Mục tiêu là bảo vệ hệ thống trước traffic spike và các lỗi payment/inventory thường gặp khi mở bán.

- Edge cache/Redis cache strategy hoàn chỉnh.
- Waiting room/virtual queue.
- Bot protection/rate limiting nhiều lớp.
- Payment reconciliation.
- Inventory stress test.
- Observability dashboard cho sale day.

## Phase 3: Event day operations

Mục tiêu là vận hành tại cổng sự kiện ổn định, kể cả khi mạng yếu.

- Scanner mobile app.
- Offline manifest.
- Local durable check-in log.
- Sync/conflict handling.
- Guest list CSV import.
- Event-day dashboard.

## Phase 4: AI and extensibility

Mục tiêu là hoàn thiện các tính năng mở rộng không nằm trên checkout critical path.

- PDF upload pipeline.
- AI Artist Bio Service.
- Notification channel abstraction.
- Zalo OA/SMS adapter.
- Advanced analytics/revenue reporting.

## Thứ tự ưu tiên kỹ thuật

| Ưu tiên | Hạng mục | Lý do |
|---|---|---|
| 1 | Reservation, quota, order/payment state machine | Đây là nơi quyết định tiền và vé, sai sẽ gây oversell hoặc khiếu nại payment. |
| 2 | Idempotency và reconciliation | Cần trước khi tích hợp payment thật vì webhook/redirect có thể retry, trễ hoặc lệch trạng thái. |
| 3 | Cache, waiting room, rate limit | Bảo vệ database và API trong giờ mở bán. |
| 4 | Scanner offline và conflict policy | Cần test sớm trên thiết bị thật vì rủi ro vận hành tại địa điểm cao. |
| 5 | Observability sale/event day | Không có metrics/log/trace thì khó vận hành và reconcile sự cố. |
| 6 | AI Artist Bio và notification channel mở rộng | Nên triển khai sau vì không nằm trên critical path mua vé. |

## Kết luận

TicketBox nên đi theo hướng self-hosted/container-based trên Kubernetes, dùng NestJS hoặc Spring Boot cho backend, PostgreSQL cho dữ liệu giao dịch, Redis cho cache/rate limit/waiting room, RabbitMQ cho workflow bất đồng bộ, MinIO cho object storage và Keycloak cho identity.

Giai đoạn đầu nên bắt đầu bằng modular monolith có boundary rõ và worker process riêng. Khi có số liệu tải thực tế, tách dần các domain nóng như Inventory, Payment và Check-in thành service độc lập.

Hai nguyên tắc triển khai quan trọng nhất là tách read-heavy path khỏi write-critical path, và mọi thao tác sinh tiền/vé/check-in phải idempotent, có state machine rõ ràng, có thể reconcile. UI, cache hoặc payment callback từ browser không bao giờ được là nguồn quyết định cuối cùng cho quyền sở hữu vé.
