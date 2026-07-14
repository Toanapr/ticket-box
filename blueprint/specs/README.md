# Feature Specifications

Thư mục này là mục lục các đặc tả hành vi theo từng tính năng của TicketBox. Mỗi spec xác định tính năng phải hoạt động như thế nào để frontend, backend và QA có cùng cơ sở triển khai, kiểm thử và nghiệm thu.

Spec tập trung vào actor, luồng chính, kịch bản lỗi, ràng buộc và tiêu chí chấp nhận. Kiến trúc tổng thể, schema và phân tích trade-off vẫn thuộc các tài liệu Blueprint hoặc Core Design Decisions tương ứng.

## Danh sách đặc tả

| Tính năng | Phạm vi |
|---|---|
| [Mua vé](ticket-purchase.md) | Reservation, quota, order, thanh toán và phát hành e-ticket. |
| [Thanh toán](payment.md) | Payment intent, provider callback/webhook, idempotency và reconciliation. |
| [Soát vé offline](offline-check-in.md) | Manifest, scan offline, durable local queue, đồng bộ và xử lý conflict. |
| [Import guest list CSV](guest-list-import.md) | Upload CSV, validation, dedupe và publish version theo cơ chế all-or-nothing. |
| [Quản lý concert](concert-management.md) | Concert lifecycle, ticket type, seating map, publish flow và cache invalidation. |
| [AI Artist Bio](ai-artist-bio.md) | Upload PDF, xử lý AI bất đồng bộ, human review và publish bio. |

## Cách sử dụng

- Trước khi triển khai, đọc spec của tính năng cùng các tài liệu được liệt kê trong mục **Tài liệu thiết kế liên quan**.
- Dùng **Tiêu chí chấp nhận** làm cơ sở chia task và xây dựng integration/E2E test.
- Khi hành vi nghiệp vụ thay đổi, cập nhật spec trong cùng pull request với implementation.
- Nếu thay đổi ảnh hưởng kiến trúc, schema hoặc trade-off cốt lõi, cập nhật source of truth tương ứng và chỉ liên kết từ spec để tránh lặp nội dung.

## Cấu trúc mỗi spec

```md
# Đặc tả: Tên tính năng

## Mô tả
## Luồng chính
## Kịch bản lỗi
## Ràng buộc
## Tiêu chí chấp nhận
## Tài liệu thiết kế liên quan
```

Tên file dùng kebab-case và mô tả một capability nghiệp vụ hoàn chỉnh, không tách spec cho từng endpoint hoặc hàm nhỏ.

## Tài liệu liên quan

- [TicketBox Blueprint](../README.md)
- [Core Design Decisions](../core-design-decisions/README.md)
- [Quy trình tài liệu và implementation](../../docs/documentation-and-implementation-workflow.md)
