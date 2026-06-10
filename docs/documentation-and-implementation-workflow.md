# Hướng Dẫn Cấu Trúc Tài Liệu Và Implementation

## Mục tiêu

Tài liệu này quy định nơi lưu và thời điểm tạo Blueprint, feature spec, implementation plan, GitHub Issue, ADR, API contract, source code và tài liệu vận hành. Mục tiêu là tránh trùng lặp, giúp thành viên biết cần đọc gì trước khi code và giữ tài liệu nhất quán với implementation.

## Cấu trúc thư mục

```text
ticket-box-project/
├── blueprint/                         # Tài liệu thiết kế dùng để review/nộp bài
│   ├── README.md
│   ├── 01-system-design.md
│   ├── ...
│   ├── 10-technology-stack.md
│   ├── core-design-decisions/         # Lý do chọn thiết kế và trade-off
│   └── specs/                         # Đặc tả hành vi theo tính năng
│
├── docs/                              # Tài liệu hỗ trợ development
│   ├── decisions/                     # ADR phát sinh khi implement
│   ├── api/                           # API/event contracts nếu không sinh từ code
│   ├── operations/                    # Runbook, deploy, backup/restore
│   └── *.md                           # Hướng dẫn chung
│
├── plans/
│   ├── templates/                     # Template plan được commit
│   └── <YYMMDD-HHmm-feature>/         # Plan implementation nội bộ
│
├── src/                               # Source code
├── tests/                             # Integration/E2E tests nếu tách khỏi src
└── README.md                          # Cách cài đặt và chạy hệ thống
```

`plans/` hiện bị ignore bởi Git, ngoại trừ `plans/templates/`. Plan tạo trong `plans/` chỉ dùng nội bộ và không được push, trừ khi nhóm thay đổi `.gitignore`.

## Trách nhiệm từng loại tài liệu

| Loại | Trả lời câu hỏi | Nơi lưu | Khi tạo |
|---|---|---|---|
| Blueprint | Hệ thống được thiết kế tổng thể thế nào? | `blueprint/*.md` | Trước implementation; cập nhật khi kiến trúc thay đổi |
| Core design decision | Tại sao chọn thiết kế này, trade-off là gì? | `blueprint/core-design-decisions/` | Khi có quyết định thiết kế cốt lõi |
| Feature spec | Tính năng phải hoạt động thế nào để được xem là đúng? | `blueprint/specs/<feature>.md` | Ngay trước khi bắt đầu implement feature |
| GitHub Issue | Task nhỏ nào cần được thực hiện và ai chịu trách nhiệm? | GitHub Issues | Khi chia spec hoặc plan thành công việc 1-3 ngày |
| Implementation plan | Feature lớn được chia phase và phối hợp implementation thế nào? | `plans/<YYMMDD-HHmm-feature>/` | Khi feature phức tạp, nhiều task/phụ thuộc hoặc nhiều người làm |
| ADR | Quyết định kỹ thuật nào phát sinh hoặc thay đổi khi code? | `docs/decisions/<number>-<decision>.md` | Khi implementation cần quyết định đáng lưu lại |
| API contract | Các component giao tiếp với nhau bằng interface nào? | NestJS OpenAPI hoặc `docs/api/` | Khi thêm/thay đổi REST API, event hoặc webhook |
| Operations doc | Chạy, deploy và xử lý sự cố thế nào? | `docs/operations/` | Khi tính năng cần cấu hình hoặc vận hành |
| Source code/test | Hệ thống thực sự hoạt động thế nào? | `src/`, `tests/` | Trong implementation |

## Quan hệ giữa các tài liệu

```text
Project brief
    ↓
Blueprint + core design decisions
    ↓
Feature spec
    ↓
Implementation plan (chỉ khi cần)
    ↓
GitHub Issues / tasks
    ↓
Source code + tests + API contract
    ↓
ADR / operations docs nếu phát sinh
```

## Decision Tree

### Có cần tạo feature spec?

Tạo `blueprint/specs/<feature>.md` khi:

- Chuẩn bị implement một capability nghiệp vụ hoàn chỉnh.
- Frontend, backend hoặc QA cần thống nhất hành vi.
- Feature có nhiều trạng thái hoặc kịch bản lỗi.
- Cần acceptance criteria để viết test.

Không tạo spec riêng cho từng hàm, endpoint nhỏ hoặc chi tiết implementation.

Ví dụ phù hợp:

```text
blueprint/specs/payment.md
blueprint/specs/offline-check-in.md
blueprint/specs/guest-list-import.md
```

Ví dụ quá nhỏ:

```text
blueprint/specs/verify-payment-signature.md
blueprint/specs/create-payment-button.md
```

### Có cần tạo implementation plan?

Tạo plan khi feature:

- Kéo dài qua nhiều ngày hoặc nhiều sprint.
- Có nhiều phase hoặc dependency.
- Có nhiều thành viên cùng implement.
- Cần migration, rollout hoặc backward compatibility.
- Có rủi ro cao về dữ liệu, payment, security hoặc performance.

Không cần plan riêng cho task nhỏ có thể mô tả đầy đủ trong một GitHub Issue.

### Có cần tạo ADR?

Tạo ADR khi:

- Implementation thay đổi quyết định trong Blueprint.
- Có nhiều phương án hợp lý và cần ghi lại lý do chọn.
- Quyết định ảnh hưởng nhiều module hoặc khó đảo ngược.
- Thành viên tương lai cần biết vì sao code được xây như hiện tại.

Không tạo ADR cho tên biến, sửa lỗi nhỏ hoặc lựa chọn implementation cục bộ.

## Cách tạo feature spec

Tạo file:

```text
blueprint/specs/<feature-name>.md
```

Tên file dùng kebab-case, ví dụ `offline-check-in.md`.

Template:

```md
# Đặc tả: Tên tính năng

## Mô tả

Tính năng giải quyết vấn đề gì và actor nào sử dụng?

## Luồng chính

1. Actor thực hiện hành động.
2. Hệ thống kiểm tra điều kiện.
3. Hệ thống trả kết quả.

## Kịch bản lỗi

| Tình huống | Hành vi mong đợi |
|---|---|
| Timeout | ... |
| Request trùng | ... |

## Ràng buộc

- Bảo mật:
- Consistency:
- Hiệu năng:

## Tiêu chí chấp nhận

- [ ] Hành vi có thể kiểm thử số 1.
- [ ] Hành vi có thể kiểm thử số 2.

## Tài liệu thiết kế liên quan

- `blueprint/...`
```

Spec mô tả hành vi và kết quả mong đợi. Không lặp lại phân tích trade-off từ `core-design-decisions/` hoặc thuật toán chi tiết đã có source of truth khác.

## Cách chia spec thành task

Một spec có thể chia thành nhiều GitHub Issue nhỏ.

Ví dụ từ `blueprint/specs/payment.md`:

```text
[Payment] Tạo payment entity và migration
[Payment] Implement create payment intent
[Payment] Xử lý webhook idempotent
[Payment] Implement reconciliation worker
[Payment] Thêm circuit breaker và metrics
```

Mỗi task nên:

- Hoàn thành được trong khoảng 1-3 ngày.
- Có phạm vi rõ và ít phụ thuộc.
- Có test hoặc tiêu chí hoàn thành riêng.
- Tạo được một pull request có thể review độc lập.

Template GitHub Issue:

```md
## Mục tiêu

## Phạm vi

## Implementation notes

## Tiêu chí hoàn thành

- [ ] ...

## Phụ thuộc

## Tài liệu liên quan

- `blueprint/specs/<feature>.md`
- `blueprint/core-design-decisions/<decision>.md`
```

## Cách tạo implementation plan

Chọn template trong `plans/templates/`:

| Loại công việc | Template |
|---|---|
| Feature mới | `feature-implementation-template.md` |
| Bug phức tạp | `bug-fix-template.md` |
| Refactor lớn | `refactor-template.md` |

Cấu trúc khuyến nghị:

```text
plans/<YYMMDD-HHmm-feature-name>/
├── plan.md
├── phase-01-<name>.md          # Chỉ tạo khi phase cần giải thích riêng
└── reports/                    # Kết quả nghiên cứu/review liên quan
```

Plan mô tả cách phối hợp và thứ tự implementation. Không sao chép toàn bộ spec; chỉ liên kết đến spec và Blueprint liên quan.

## Cách tạo ADR

Tạo file:

```text
docs/decisions/<number>-<decision-name>.md
```

Ví dụ:

```text
docs/decisions/001-use-nextjs-pwa-for-scanner.md
docs/decisions/002-use-pessimistic-lock-for-inventory.md
```

Template:

```md
# ADR-001: Tên quyết định

## Trạng thái

Proposed | Accepted | Superseded

## Bối cảnh
## Quyết định
## Lý do
## Trade-off
## Hệ quả
## Tài liệu liên quan
```

Không sửa lịch sử ADR đã accepted để thay đổi quyết định. Tạo ADR mới và ghi ADR cũ đã bị superseded.

## API Và Event Contracts

- REST API: ưu tiên sinh OpenAPI từ decorator NestJS và kiểm tra contract trong CI.
- RabbitMQ event: ghi rõ event name, version, producer, consumer và payload.
- Payment webhook: ghi rõ signature verification, idempotency boundary và response.
- Khi contract thay đổi, cập nhật spec và consumer liên quan trong cùng pull request.

Nếu contract chưa được sinh từ code, lưu tại:

```text
docs/api/openapi.yaml
docs/api/event-contracts.md
docs/api/payment-webhooks.md
```

## Quy trình implement một feature

1. Đọc project brief, Blueprint và core design decision liên quan.
2. Tạo hoặc hoàn thiện `blueprint/specs/<feature>.md`.
3. Nếu feature phức tạp, tạo implementation plan từ template.
4. Chia công việc thành GitHub Issues nhỏ.
5. Implement source code, migration và tests.
6. Cập nhật OpenAPI/event contract.
7. Tạo ADR nếu implementation thay đổi quyết định kỹ thuật.
8. Cập nhật operations docs nếu cần cấu hình hoặc vận hành mới.
9. Đối chiếu code/test với acceptance criteria trước khi merge.

## Checklist Pull Request

- [ ] Code và test đã hoàn thành.
- [ ] Acceptance criteria trong spec đã được đáp ứng.
- [ ] Spec được cập nhật nếu hành vi thay đổi.
- [ ] OpenAPI/event contract đã cập nhật.
- [ ] Migration có rollback hoặc recovery strategy.
- [ ] Blueprint không bị mâu thuẫn với implementation.
- [ ] ADR đã tạo nếu có quyết định kỹ thuật mới.
- [ ] Operations docs đã cập nhật nếu cần.
- [ ] Không sao chép cùng một source of truth sang nhiều file.

## Quy tắc tránh trùng lặp

| Thông tin | Source of truth |
|---|---|
| Kiến trúc tổng thể | `blueprint/01-system-design.md`, `03-high-level-architecture.md` |
| Schema, invariant và transaction | `blueprint/04-database-design.md` |
| Lý do và trade-off | `blueprint/core-design-decisions/` |
| Hành vi và acceptance criteria | `blueprint/specs/` |
| Task và người phụ trách | GitHub Issues/Project |
| Kế hoạch phối hợp implementation | `plans/` |
| API thực tế | OpenAPI/event contract |
| Hành vi implementation thực tế | Source code và tests |

Khi thông tin đã có source of truth, tài liệu khác chỉ nên tóm tắt ngắn và liên kết đến nguồn đó.

## Quy tắc Git

- Spec, Blueprint, ADR, API contract và operations docs cần được commit.
- Plan trong `plans/` mặc định không được commit do `.gitignore`; chỉ dùng nội bộ.
- GitHub Issue không cần sao chép thành file Markdown.
- Mỗi pull request nên sửa code, tests và tài liệu liên quan trong cùng phạm vi.
- Không dùng `git add .` nếu worktree có thay đổi ngoài task đang làm.
