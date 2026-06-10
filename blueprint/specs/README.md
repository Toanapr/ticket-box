# Feature Specifications

Thư mục này lưu đặc tả hành vi theo từng tính năng khi bắt đầu implementation. Mỗi spec cần mô tả luồng chính, kịch bản lỗi, ràng buộc và tiêu chí chấp nhận; không lặp lại kiến trúc hoặc quyết định đã có trong các tài liệu Blueprint khác.

Quy trình đầy đủ để tạo spec, implementation plan, GitHub Issue, ADR và API contract: [documentation-and-implementation-workflow.md](../../docs/documentation-and-implementation-workflow.md).

## Specs dự kiến

| Spec | Phạm vi |
|---|---|
| `ticket-purchase.md` | Reservation, quota, order và phát hành vé. |
| `payment.md` | Payment intent, webhook, idempotency và reconciliation. |
| `offline-check-in.md` | Manifest, scan offline, sync và conflict. |
| `guest-list-import.md` | Import CSV, validation, dedupe và publish version. |
| `concert-management.md` | Quản lý concert, ticket type và publish flow. |
| `ai-artist-bio.md` | Upload PDF, xử lý AI, review và publish bio. |

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
