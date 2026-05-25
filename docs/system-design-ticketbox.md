# TicketBox System Design

Tài liệu thiết kế chính hiện nằm trong [Blueprint](blueprint/README.md), được sắp theo đúng các nội dung cần thực hiện ở Phần 1 của đề bài.

Các file `system-design-ticketbox/*` là bản phân tích mở rộng theo chủ đề, dùng để tham khảo thêm khi cần chi tiết về non-functional requirements, stack công nghệ, rủi ro và lộ trình triển khai.

## Mục lục

### Blueprint bắt buộc

| Phần | Nội dung |
|---|---|
| [Blueprint README](blueprint/README.md) | Mục lục và cách đọc. |
| [1. Tài liệu thiết kế hệ thống](blueprint/01-system-design.md) | Kiến trúc tổng thể, thành phần, giao tiếp, xử lý lỗi. |
| [2. C4 Diagram](blueprint/02-c4-diagrams.md) | System Context và Container diagram. |
| [3. High-Level Architecture Diagram](blueprint/03-high-level-architecture.md) | Luồng dữ liệu và các điểm tích hợp. |
| [4. Thiết kế cơ sở dữ liệu](blueprint/04-database-design.md) | Database choice, entity/schema, ER diagram. |
| [5. Luồng nghiệp vụ quan trọng](blueprint/05-business-flows.md) | Mua vé, soát vé offline, CSV guest list. |
| [6. Kiểm soát truy cập](blueprint/06-access-control.md) | RBAC, ownership, API/admin/mobile authorization. |
| [7. Cơ chế bảo vệ hệ thống](blueprint/07-protection-mechanisms.md) | Rate limiting, circuit breaker, idempotency, caching. |

### Phân tích mở rộng

| Phần | Nội dung |
|---|---|
| [00. Overview](system-design-ticketbox/00-overview.md) | Bối cảnh thiết kế, high-level architecture, core design decisions. |
| [01. Tóm tắt bài toán](system-design-ticketbox/01-problem-summary.md) | TicketBox giải quyết gì, nhóm người dùng, rủi ro chính. |
| [02. Functional Requirements](system-design-ticketbox/02-functional-requirements.md) | Nhu cầu của khán giả, ban tổ chức, scanner, hệ thống tích hợp và các flow chính. |
| [03. Non-functional Requirements](system-design-ticketbox/03-non-functional-requirements.md) | Scalability, HA, fault tolerance, security, fairness, consistency, performance, observability. |
| [04. Kiến trúc tổng thể](system-design-ticketbox/04-architecture.md) | Thành phần hệ thống, service boundary, dữ liệu chính và các luồng nghiệp vụ. |
| [05. Công nghệ sử dụng](system-design-ticketbox/05-technology-stack.md) | Stack đề xuất, container topology, lựa chọn modular monolith/microservices, trade-off self-hosted. |
| [06. Thiết kế điểm rủi ro](system-design-ticketbox/06-risk-design.md) | Inventory/reservation, payment state machine, notification, cache, check-in offline, CSV import, AI safety. |
| [07. Giai đoạn triển khai](system-design-ticketbox/07-implementation-phases.md) | Phase 1 đến Phase 4 theo mức độ ưu tiên. |
| [08. Kết luận kiến trúc](system-design-ticketbox/08-architecture-conclusion.md) | Tóm tắt hướng kiến trúc khuyến nghị. |

## Cách đọc nhanh

- Muốn nộp Phần 1 Blueprint: đọc và dùng thư mục `blueprint/`.
- Muốn hiểu thêm quyết định kiến trúc: đọc `system-design-ticketbox/00-overview.md`, `system-design-ticketbox/03-non-functional-requirements.md`, `system-design-ticketbox/06-risk-design.md`.
