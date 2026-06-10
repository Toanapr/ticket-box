# TicketBox Blueprint

Blueprint này là nguồn tài liệu thiết kế chính cho đồ án TicketBox. Nội dung bao phủ bài toán, yêu cầu chức năng, yêu cầu phi chức năng, kiến trúc, dữ liệu, luồng nghiệp vụ, phân quyền, cơ chế bảo vệ và lộ trình triển khai.

## Nguồn tài liệu chính

| Nguồn | Vai trò |
|---|---|
| `docs/blueprint/` | Source of truth cho thiết kế hệ thống TicketBox. |
| [`../project-brief-ticketbox.md`](../project-brief-ticketbox.md) | Bối cảnh đề bài và phạm vi đồ án. |

## Mục lục Blueprint

| Phần | File | Nội dung |
|---|---|---|
| 1 | [01-system-design.md](01-system-design.md) | Kiến trúc tổng thể, thành phần chính, cách giao tiếp và ảnh hưởng khi lỗi. |
| 2 | [02-c4-diagrams.md](02-c4-diagrams.md) | C4 System Context và logical Container boundaries. |
| 3 | [03-high-level-architecture.md](03-high-level-architecture.md) | Domain dependency, critical path, điểm tích hợp và topology triển khai. |
| 4 | [04-database-design.md](04-database-design.md) | Source of truth cho schema, invariant và transaction dữ liệu quan trọng. |
| 5 | [05-business-flows.md](05-business-flows.md) | Luồng mua vé, soát vé offline, nhập guest list CSV và xử lý lỗi. |
| 6 | [06-access-control.md](06-access-control.md) | Mô hình RBAC, quyền theo vai trò, kiểm tra quyền ở API/admin/mobile. |
| 7 | [07-protection-mechanisms.md](07-protection-mechanisms.md) | Lớp bảo vệ ở biên/dependency: admission control, rate limit, circuit breaker, idempotency và caching. |
| 8 | [08-requirements.md](08-requirements.md) | Yêu cầu chức năng theo nhóm người dùng và yêu cầu phi chức năng. |
| 9 | [09-implementation-roadmap.md](09-implementation-roadmap.md) | Source of truth cho roadmap, phase, scope, checklist, tiêu chí hoàn thành và kết luận. |
| 10 | [10-technology-stack.md](10-technology-stack.md) | Lựa chọn công nghệ, nhược điểm, phương án thay thế và trade-off. |

## Tài liệu giải thích chuyên sâu

| Nhóm tài liệu | Nội dung |
|---|---|
| [Core design decisions](core-design-decisions/README.md) | Giải thích từng quyết định thiết kế cốt lõi, lý do chọn, trade-off, phương án không chọn và cách kiểm chứng. |

## Cách đọc

- Đọc nhanh toàn cảnh: `01-system-design.md`, `02-c4-diagrams.md`, `03-high-level-architecture.md`.
- Hiểu lý do và trade-off của thiết kế: `core-design-decisions/`.
- Triển khai backend: `04-database-design.md`, `05-business-flows.md`, `06-access-control.md`.
- Xử lý rủi ro hệ thống: `07-protection-mechanisms.md`, `08-requirements.md`.
- Chọn công nghệ và lên kế hoạch triển khai: `09-implementation-roadmap.md`, `10-technology-stack.md`.
