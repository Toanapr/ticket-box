# 09. Lộ trình và kế hoạch triển khai

Tài liệu này là roadmap theo implementation hiện tại, không phải kế hoạch greenfield. Mục tiêu còn lại là khép kín yêu cầu đề bài, đồng bộ Blueprint với code và tạo bằng chứng kiểm chứng; không thay modular monolith hoặc refactor lại các frontend đã hoạt động.

## Nguyên tắc

- Giữ ba client theo actor: Audience Web, Admin Web và Scanner Mobile.
- Giữ một NestJS Backend Runtime chứa REST API và scheduled workers trong cùng process.
- Giữ PostgreSQL làm source of truth, Redis cho cache/rate limit và local persistent file storage cho demo single-writer.
- Chỉ thêm hạ tầng khi phục vụ trực tiếp acceptance criteria; microservice, worker deployment riêng, Kafka, Kubernetes và MinIO cluster là production extension.
- Mỗi quyết định phải có traceability từ requirement đến module, database invariant và test/demo.

## Tổng quan trạng thái

| Phase | Nội dung | Trạng thái hiện tại | Việc còn lại |
|---|---|---|---|
| 0 | Foundation, auth, migration, seed, local platform | Đã có | Root README, seed đúng bốn concert đề bài, backup/restore guide. |
| 1 | Core ticketing, quota, reservation, order, payment, ticket | Đã có | Chuẩn hóa lock order webhook/sweeper và bổ sung concurrent load evidence. |
| 2 | Flash-sale hardening | Phần lớn đã có | Bounded sale admission backend; hiện đã có Redis cache, fixed-window rate limit, risk guard, idempotency, circuit breaker, bulkhead và reconciliation. |
| 3 | Event-day operations | Đã có nền tảng đầy đủ | Public-key manifest verification trên mobile và policy xử lý manifest hết TTL. |
| 4 | Admin operations | Đã có dashboard/cancel workflow | Durable audit log tối thiểu; automatic provider refund là tùy chọn. |
| 5 | Notification, CSV và AI | Đã có | Sửa CSV full-snapshot semantics, thay PDF regex extractor bằng Node PDF parser; MoMo adapter nếu rubric yêu cầu cả hai provider. |
| 6 | Verification/readiness | Chưa khép kín | Root run guide, E2E/load test, demo scripts, security checklist và runbook. |

## Phase 0 — Foundation

### Đã có

- NestJS modular monolith với Auth, Concert, Inventory, Order, Payment, Ticket, Scanner, Guest List, Notification và AI Artist Bio modules.
- Prisma/PostgreSQL migrations và Redis local bằng Docker Compose.
- JWT/RBAC, password hashing, correlation id, structured logs và health endpoint.
- Audience Web, Admin Web và Scanner Mobile.

### Cần hoàn thiện

- Root `README.md` chạy toàn bộ hệ thống theo một luồng duy nhất.
- Seed bốn concert đúng tên, ticket types, giá, poster và seating map theo đề bài.
- Hướng dẫn backup/restore PostgreSQL cùng local file storage.
- Dùng Scanner Mobile làm client soát vé chính thức để demo và chấm.

## Phase 1 — Core ticketing

### Đã có

- Public concert listing/detail và admin concert/ticket-type management.
- Reservation TTL, row lock inventory, quota ledger và expiry worker.
- Order/payment state riêng, durable idempotency records và provider-event dedupe.
- VNPAY adapter, mock provider, verified callback/IPN path và payment reconciliation.
- Ticket issuance idempotent trong transaction payment bằng unique `(order_item_id, sequence_no)`.

### Cần hoàn thiện

- Webhook/reconciliation và sweeper dùng cùng lock order `reservation -> order -> payment` hoặc conditional update tương đương.
- Concurrent test chứng minh không oversell và không vượt per-user limit.
- Late payment success sau reservation expiry phải luôn cho kết quả: payment `succeeded`, order `refund_required`, không tạo ticket.

### Done khi

- Nhiều request cùng tranh vé cuối không làm `sold + reserved > capacity`.
- Request song song từ cùng user không vượt quota.
- Duplicate payment event chỉ phát hành đúng một bộ ticket.
- Reservation expiry và payment success race không làm counter âm hoặc lệch state.

## Phase 2 — Flash-sale hardening

### Đã có

- Redis cache-aside cho concert list/detail và inventory summary.
- TTL jitter, request coalescing và bounded DB miss budget.
- Fixed-window rate limit theo IP, user và device với `429 + Retry-After`.
- Reservation risk guard và transaction inventory/quota là trust boundary cuối.
- Payment circuit breaker, in-process bulkhead, graceful degradation và reconciliation lease.

### Còn lại: bounded sale admission

- Endpoint cấp signed sale access token theo user/concert và admission limit trong Redis.
- Token TTL ngắn, reusable cho cùng user/concert để tương thích idempotent retry.
- Reservation guard chỉ yêu cầu token với concert/campaign bật admission.
- Không xây full FIFO queue, queue position, randomized admission hoặc CAPTCHA trong phạm vi demo.

### Done khi

- Public read path vẫn hoạt động khi payment provider lỗi.
- Cache lỗi không tạo DB fallback không giới hạn.
- Spam reservation bị rate/risk policy chặn trước transaction nhưng request hợp lệ vẫn được DB kiểm tra đầy đủ.
- Khi admission bật, request không có/sai/hết hạn token bị từ chối rõ ràng.

## Phase 3 — Event-day operations

### Đã có

- Scanner device/assignment theo event, concert, gate và zone.
- Manifest gồm tickets, revoked tickets và active guest-list entries.
- AsyncStorage cho assignment, manifest, pending queue, result history và local checked-in set.
- Batch sync idempotent; backend serialize theo `(event_id, ticket_ref)` và trả accepted/conflict/rejected.
- Guest-list entry dùng cùng `ticket_ref` conflict policy với e-ticket.

### Cần hoàn thiện

- Backend hiện ký manifest bằng HMAC; hướng hoàn thiện là asymmetric signature và pinned public key để mobile verify độc lập.
- Manifest TTL phải bao phủ ca/sự kiện cộng grace period; sai scope/signature mới là hard failure.
- Application-level AsyncStorage encryption và key management là production hardening; demo giảm PII và có cleanup policy.

### Done khi

- Mất mạng, app vẫn scan và giữ event qua reload/app restart trong phạm vi app shell đã tải.
- Retry cùng `client_event_id` không tạo check-in trùng.
- Hai thiết bị offline scan cùng ref dẫn tới một accepted và một conflict khi sync.
- Giới hạn không thể chặn double-entry tuyệt đối giữa hai thiết bị hoàn toàn offline được ghi rõ trong demo.

## Phase 4 — Admin operations

### Đã có

- Dashboard gross revenue, refund exposure và sold/reserved/available.
- Concert operations view và cancellation preview.
- Cancel workflow: dừng bán, expire reservation, revoke ticket, chuyển order ảnh hưởng sang `refund_required` và tạo notification.

### Cần hoàn thiện

- Một bảng/service `audit_logs` tối thiểu cho concert cancel, ticket-type mutation, guest-list publish, artist-bio publish và scanner assignment.
- Demo coi `refund_required` là queue vận hành. Gọi API refund thật và trạng thái `refunded` chỉ bổ sung nếu payment sandbox hỗ trợ ổn định.

## Phase 5 — Notification, CSV và AI

### Notification đã có

- Durable notification records, adapters `in_app`/`email`, scheduled worker và reminder trước 24 giờ.
- Channel idempotency và lỗi notification không rollback ticket.
- Automatic retry/backoff hoặc manual retry cho delivery `failed` là hardening bổ sung, không cần đổi module boundary.

### Guest list đã có và cần sửa nhỏ

- Upload, checksum idempotency, staging, error report, versioned publish, outbox và scanner projection đã có.
- Chốt CSV là full snapshot: chỉ duplicate trong cùng file là lỗi; identity ở version cũ được phép xuất hiện lại.
- Import theo lịch từ drop folder là extension; admin upload mô phỏng file nhận ban đêm trong demo.

### AI Artist Bio đã có và cần hardening

- Local file storage, checksum/pipeline-version job, lease/retry, Gemini/mock adapter, draft review/publish đã có.
- Chỉ thay implementation `extractPdfText` bằng Node PDF parser cho PDF text-based; không đổi pipeline/module.
- OCR và antivirus là production extension.

## Phase 6 — Verification và bàn giao

### Bắt buộc trước khi nộp

- Root README: prerequisites, port, env, migration, seed và thứ tự chạy từng app.
- Traceability matrix: requirement → Blueprint decision → code module → test/demo.
- Concurrent reservation/quota test và payment duplicate/timeout demo.
- Scanner offline/reload/sync/conflict demo.
- CSV valid/invalid/idempotent/full-snapshot demo.
- AI success/timeout/fallback/human-review demo.
- Sale-day/event-day runbook, backup/restore và security checklist ngắn.

### Mục tiêu tải đồ án

Traffic 80.000 user trong đề bài là production context. Bản demo đặt scaled load profile theo máy nhóm và báo cáo rõ concurrency, p95/error rate, cache hit/miss, DB lock wait và invariant sau test; không tuyên bố single-instance Docker Compose đạt production capacity.

## Ngoài phạm vi demo

- Kubernetes/autoscaling, Redis HA, PostgreSQL replica/failover, partition/sharding.
- Full virtual queue, CAPTCHA, WAF/bot platform, device fingerprint.
- Multi-region public cache và distributed tracing platform.
- Multi-replica shared object storage; local filesystem là giới hạn được chấp nhận của demo.
- Tự động refund production, chargeback/dispute và financial settlement đầy đủ.

## Kết luận

Đồ án giữ chiều sâu ở invariant, state machine, idempotency, fault isolation, offline reconciliation và extensible adapter. Phần cần hoàn thiện tập trung vào correctness gap, traceability và bằng chứng demo; không thay đổi architectural style hoặc refactor lại các ứng dụng đã có.
