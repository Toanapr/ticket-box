# TicketBox Blueprint

Blueprint này là tài liệu thiết kế cho Phần 1 của đồ án TicketBox. Cấu trúc được chia theo đúng nhóm yêu cầu trong `docs/project-brief-ticketbox.md`, nhưng không ràng buộc theo template OpenSpec.

## Mục lục

| Phần | File | Nội dung |
|---|---|---|
| 1 | [01-system-design.md](01-system-design.md) | Kiến trúc tổng thể, thành phần chính, cách giao tiếp và ảnh hưởng khi lỗi. |
| 2 | [02-c4-diagrams.md](02-c4-diagrams.md) | C4 Level 1 - System Context và Level 2 - Container. |
| 3 | [03-high-level-architecture.md](03-high-level-architecture.md) | Sơ đồ kiến trúc tổng quan, luồng dữ liệu và các điểm tích hợp. |
| 4 | [04-database-design.md](04-database-design.md) | Lựa chọn database, nhóm dữ liệu chính, schema/entity quan trọng. |
| 5 | [05-business-flows.md](05-business-flows.md) | Luồng mua vé, soát vé offline, nhập guest list CSV và xử lý lỗi. |
| 6 | [06-access-control.md](06-access-control.md) | Mô hình RBAC, quyền theo vai trò, kiểm tra quyền ở API/admin/mobile. |
| 7 | [07-protection-mechanisms.md](07-protection-mechanisms.md) | Rate limiting, circuit breaker, idempotency key và caching. |

## Cách đọc

- Đọc nhanh toàn cảnh: `01-system-design.md`, `02-c4-diagrams.md`, `03-high-level-architecture.md`.
- Triển khai backend: `04-database-design.md`, `05-business-flows.md`, `06-access-control.md`.
- Xử lý rủi ro hệ thống: `07-protection-mechanisms.md`.

