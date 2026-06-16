# 09. Lộ trình và kế hoạch triển khai

## Nguyên tắc triển khai

Ưu tiên luồng tiền và vé trước, sau đó tối ưu tải, bảo vệ công bằng khi mở bán, và hoàn thiện vận hành ngày sự kiện. TicketBox nên đi theo modular monolith có boundary rõ; chỉ tách service khi có dữ liệu tải hoặc boundary vận hành đủ rõ.

## Phase đề xuất

| Phase | Mục tiêu | Kết quả chính | Phụ thuộc |
|---|---|---|---|
| 0 | Foundation | Repo, môi trường chạy, migration, auth skeleton. | Không |
| 1 | Core ticketing | Admin tối thiểu để tạo concert/ticket type, quota, reservation, order, payment, e-ticket. | Phase 0 |
| 2 | Flash-sale hardening | Cache, waiting room, rate limit, idempotency hardening, payment reconciliation, metrics. | Phase 1 |
| 3 | Event-day operations | Scanner app/API, offline manifest, offline check-in queue, sync, guest list CSV. | Phase 1, một phần Phase 2 |
| 4 | Admin operations | Dashboard doanh thu/vé, audit log, refund/cancel workflow. | Phase 1 |
| 5 | AI and extensibility | PDF pipeline, AI Artist Bio, notification adapter. | Phase 1, Phase 4 |
| 6 | Verification and operations readiness | Load test, security review, logs/metrics dashboard, backup/restore guide, runbook. | Phase 2, 3, 4 |

## Thứ tự ưu tiên kỹ thuật

1. Reservation, quota, order/payment state machine.
2. Idempotency và reconciliation.
3. Cache, waiting room, rate limit, fairness control.
4. Offline scanner và conflict policy.
5. Logs, health checks và business metrics cho sale day và event day.
6. AI Artist Bio và notification channel mở rộng.

## Phase 0: Foundation

### Scope

- Backend skeleton theo module: `auth`, `concert`, `inventory`, `order`, `payment`, `ticket`, `check-in`, `notification`, `guest-import`, `ai-artist-bio`.
- PostgreSQL migration baseline.
- Redis, RabbitMQ, MinIO/object storage cho local environment.
- Logging, config validation, request correlation id.

### Done khi

- Developer mới clone repo có thể chạy hệ thống local.
- Có ít nhất một endpoint public và một endpoint protected hoạt động.
- Seed data demo chạy được.

## Phase 1: Core ticketing

### Scope

- Admin tối thiểu cho organizer tạo/cập nhật concert phục vụ bán vé.
- Ticket type, sale window, capacity, per-user quota.
- Public listing/detail API.
- Reservation transaction với TTL.
- Order/payment state machine.
- Webhook idempotent.
- Ticket QR issuance sau payment success.
- Email/in-app notification cơ bản.

### Done khi

- Không oversell trong test concurrent cơ bản.
- Một user không vượt quota bằng request song song.
- Một payment success chỉ phát hành ticket đúng một lần.
- Notification lỗi không rollback ticket đã phát hành.

## Phase 2: Flash-sale hardening

### Scope

- Public/API cache cho concert list/detail.
- Redis inventory summary TTL ngắn.
- Rate limit theo IP, user, device hoặc session.
- Waiting room, sale access token, risk checks trong Backend API, CAPTCHA optional theo risk score.
- Payment circuit breaker.
- Payment reconciliation job.
- Metrics sale day, queue depth, DLQ, inventory remaining.

### Done khi

- Public concert page không đánh trực tiếp DB cho mọi request.
- Payment gateway lỗi không làm sập read path.
- Inventory summary có thể stale ngắn, nhưng checkout luôn kiểm tra DB.
- Reservation failure reason và payment pending được quan sát qua metrics.

## Phase 3: Event-day operations

### Scope

- Scanner API và scanner app.
- Device assignment theo event, gate, zone.
- Signed manifest cho ticket, guest list, revoked list.
- Durable local storage cho scanner; encryption hoặc device binding nếu feasible trên PWA target.
- Offline check-in queue bắt buộc.
- Batch sync idempotent.
- Conflict policy: accepted, conflict, rejected.
- Guest list CSV import với staging, validation, dedupe, publish version.

### Done khi

- App phải cho phép ghi nhận soát vé tạm thời khi không có mạng.
- App phải tự đồng bộ lại khi kết nối được phục hồi.
- Sync phải trả kết quả rõ cho từng event hoặc batch.
- CSV lỗi không ghi đè guest list production.

### Rủi ro cần chấp nhận

- Không thể chặn tuyệt đối double-scan giữa hai thiết bị hoàn toàn offline.
- Backend là nguồn quyết định cuối cùng khi sync lại.

## Phase 4: Admin operations

### Scope

- Dashboard theo concert.
- Sold, reserved, available theo ticket type.
- Payment status và pending reconciliation view.
- Audit log cho action nhạy cảm.
- Cancel concert workflow.
- Refund workflow hoặc mock tùy mức hỗ trợ payment provider.

### Done khi

- Organizer chỉ thấy concert thuộc organization của mình.
- Mọi action nhạy cảm có audit trail.
- Dashboard không ảnh hưởng transaction reservation.

## Phase 5: AI and extensibility

### Scope

- PDF upload vào object storage.
- PDF text extraction.
- AI Artist Bio job async.
- Prompt/model version tracking.
- Admin review, edit, publish bio.
- Notification adapter abstraction.

### Done khi

- Admin upload PDF và nhận draft bio để review.
- AI lỗi không ảnh hưởng concert page và checkout.
- Có thể thêm channel notification mới mà không sửa core ticketing flow.

## Phase 6: Verification and operations readiness

### Scope

- Load test sale day và read spike.
- Security review cho auth, QR, webhook, file upload.
- Backup/restore database và object storage.
- Logs/metrics dashboard tối thiểu và cảnh báo thủ công cần theo dõi.
- Runbook sale day và event day.

### Done khi

- Có số liệu để đánh giá bottleneck thực tế.
- Có chỉ số/log rõ cho payment pending, queue depth, DLQ, check-in conflict.
- Team có thể diễn tập ngày mở bán và ngày diễn.

## Quy tắc chuyển phase

- Không làm Phase 2 nếu Phase 1 chưa có reservation, payment và ticket idempotent.
- Không làm Phase 3 nếu ticket QR và ticket status chưa ổn định.
- Offline check-in là scope bắt buộc của Phase 3, không được hạ xuống nice-to-have.
- Không làm AI Artist Bio trước khi core ticketing chạy được.
- Chỉ tách microservice khi có dữ liệu tải hoặc boundary vận hành rõ.

## Ưu tiên MVP nếu thiếu thời gian

Nếu thời gian đồ án hạn chế, ưu tiên theo thứ tự:

1. Phase 0 foundation.
2. Phase 1 core ticketing.
3. Phase 2 tối thiểu: rate limit, idempotency, reconciliation, metrics cơ bản.
4. Phase 3 với offline check-in bắt buộc và guest list CSV an toàn.
5. Phase 4 dashboard tối thiểu.
6. Phase 5 AI làm bản tối giản khi thiếu thời gian: upload PDF, extract text, AI adapter configurable/mock, admin review trước publish.

## Kết luận

Hai nguyên tắc quan trọng nhất là:

- tách read-heavy path khỏi write-critical path;
- mọi thao tác sinh tiền, vé và check-in phải idempotent, có state machine rõ ràng và có thể reconcile.

UI, cache hoặc browser redirect không bao giờ là nguồn quyết định cuối cùng cho quyền sở hữu vé hoặc trạng thái check-in.
