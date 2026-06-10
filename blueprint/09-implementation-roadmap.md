# 9. Lộ trình và kế hoạch triển khai

## Tổng quan

Tài liệu này là source of truth duy nhất cho lộ trình, số thứ tự, scope, checklist, tiêu chí hoàn thành và rủi ro của từng phase.

Hướng triển khai mặc định là Next.js cho audience web, admin web và scanner PWA; NestJS modular monolith và NestJS worker process riêng; PostgreSQL, Redis, RabbitMQ, MinIO và Keycloak. Các module vẫn giữ boundary rõ để có thể tách service sau này nếu có tải thật.

| Phase | Mục tiêu | Kết quả chính | Phụ thuộc |
|---|---|---|---|
| 0 | Foundation | Repo, môi trường chạy, coding standard, database migration, auth skeleton. | Không |
| 1 | Core ticketing | Concert, ticket type, quota, reservation, order, payment mock/provider, e-ticket. | Phase 0 |
| 2 | Flash-sale hardening | Cache, waiting room, rate limit, idempotency hardening, payment reconciliation, metrics. | Phase 1 |
| 3 | Event-day operations | Scanner app/API, offline manifest, check-in sync, guest list CSV. | Phase 1, một phần Phase 2 |
| 4 | Admin operations | Dashboard vận hành, báo cáo doanh thu/vé, audit log, refund/cancel workflow. | Phase 1 |
| 5 | AI and extensibility | PDF pipeline, AI Artist Bio, notification adapter, analytics mở rộng. | Phase 1, Phase 4 |
| 6 | Production readiness | Load test, security review, observability, backup/restore, runbook. | Phase 2, 3, 4 |

## Thứ tự ưu tiên kỹ thuật

| Ưu tiên | Hạng mục | Lý do |
|---|---|---|
| 1 | Reservation, quota, order/payment state machine | Đây là nơi quyết định tiền và vé, sai sẽ gây oversell hoặc khiếu nại payment. |
| 2 | Idempotency và reconciliation | Cần trước khi tích hợp payment thật vì webhook/redirect có thể retry, trễ hoặc lệch trạng thái. |
| 3 | Cache, waiting room, rate limit | Bảo vệ database và API trong giờ mở bán. |
| 4 | Scanner offline và conflict policy | Cần test sớm trên thiết bị thật vì rủi ro vận hành tại địa điểm cao. |
| 5 | Observability sale/event day | Không có metrics/log/trace thì khó vận hành và reconcile sự cố. |
| 6 | AI Artist Bio và notification channel mở rộng | Nên triển khai sau vì không nằm trên critical path mua vé. |

## Phase 0: Foundation

Mục tiêu là tạo nền kỹ thuật đủ ổn định để các phase sau không phải sửa lại cấu trúc.

### Scope

- NestJS backend skeleton theo module: `auth`, `concert`, `inventory`, `order`, `payment`, `ticket`, `check-in`, `notification`, `guest-import`, `ai-artist-bio`.
- PostgreSQL migration baseline.
- Redis/RabbitMQ/MinIO local environment bằng Docker Compose.
- Keycloak hoặc auth mock tùy tiến độ đồ án.
- Logging, config validation, request correlation id.
- CI cơ bản: lint, test, build.

### Checklist

- [ ] Backend chạy local bằng một lệnh.
- [ ] Database migration chạy được từ clean database.
- [ ] Module boundary và folder structure thống nhất.
- [ ] Config tách theo environment.
- [ ] Health check cho API, PostgreSQL, Redis, RabbitMQ.
- [ ] Seed data demo cho organization, user, concert mẫu.

### Done khi

- Developer mới clone repo có thể chạy hệ thống local.
- Có ít nhất một endpoint protected và một endpoint public hoạt động.
- CI fail nếu code không build hoặc test cơ bản lỗi.

## Phase 1: Core ticketing foundation

Mục tiêu là hoàn thiện luồng bán vé chính từ public concert page đến phát hành e-ticket.

### Scope

- Concert CRUD cho organizer.
- Ticket type, sale window, capacity, per-user quota.
- Public listing/detail API.
- Reservation transaction với TTL.
- Order state machine cơ bản.
- Payment intent với mock provider trước, sau đó tích hợp VNPAY/MoMo nếu có đủ thông tin.
- Webhook idempotent.
- Ticket QR issuance sau payment success.
- Email/in-app notification đơn giản.

### Checklist

- [ ] Organizer tạo/publish concert.
- [ ] Audience xem concert và ticket type.
- [ ] Audience tạo reservation bằng idempotency key.
- [ ] Backend reject nếu hết vé, ngoài sale window hoặc vượt quota.
- [ ] Order chuyển đúng trạng thái `PENDING_PAYMENT`, `PAYMENT_SUCCEEDED`, `TICKET_ISSUED`, `PAYMENT_FAILED`, `RESERVATION_EXPIRED`.
- [ ] Payment webhook retry không tạo vé trùng.
- [ ] Reservation hết hạn được sweeper release.
- [ ] QR ticket có signature hoặc token hash.

### Done khi

- Không oversell trong test concurrent cơ bản.
- Một user không thể vượt quota bằng request song song.
- Một order chỉ phát hành ticket một lần.
- Notification lỗi không làm rollback ticket đã phát hành.

### Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Transaction giữ vé sai làm oversell | Viết integration test concurrent cho `InventoryService`. |
| Payment provider chưa sẵn sàng | Dùng mock provider có webhook simulator, giữ adapter interface rõ. |
| State machine bị xử lý rải rác | Gom transition vào service riêng, không cho controller tự set status. |

## Phase 2: Flash-sale hardening

Mục tiêu là bảo vệ hệ thống trong giờ mở bán khi read/write traffic tăng đột biến.

### Scope

- Edge/API cache cho concert list/detail.
- Redis inventory summary TTL ngắn.
- Rate limit theo IP, user, device/session.
- Waiting room/virtual queue và sale access token.
- Payment circuit breaker.
- Payment reconciliation job.
- Metrics sale day: reservation success/fail, payment pending/success, queue depth, DLQ, inventory remaining.
- Load test cho reservation hot ticket type.

### Checklist

- [ ] Public concert page không query DB trực tiếp cho mọi request.
- [ ] Reservation endpoint có rate limit nhiều scope.
- [ ] Waiting room cấp token TTL ngắn trước khi reserve.
- [ ] Payment gateway lỗi không làm sập read path.
- [ ] Pending payment quá lâu được reconciliation xử lý.
- [ ] Dashboard/metrics thấy được reservation failure reason.
- [ ] DLQ có quy trình xem và retry.

### Done khi

- Load test không làm PostgreSQL primary quá tải ngoài ngưỡng đã định.
- Khi payment gateway giả lập lỗi, user vẫn xem được concert và order không bị confirm sai.
- Inventory summary có thể stale ngắn, nhưng checkout luôn kiểm tra DB.

### Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Cache hiển thị sai inventory | Ghi rõ cache chỉ để hiển thị; checkout luôn transaction DB. |
| Waiting room phức tạp quá sớm | Làm bản tối giản: token admission + Redis counter trước. |
| Metrics quá nhiều cardinality | Giới hạn label, dùng `concert_id`/`ticket_type_id` có kiểm soát. |

## Phase 3: Event-day operations

Mục tiêu là soát vé ổn định tại cổng, kể cả khi mạng yếu hoặc mất mạng tạm thời.

### Scope

- Scanner API.
- Device assignment theo event/gate/zone.
- Signed manifest cho ticket/guest list/revoked list.
- PWA local encrypted IndexedDB storage.
- Offline check-in queue.
- Sync batch idempotent.
- Conflict policy: accepted/conflict/rejected.
- Guest list CSV import với staging, validation, dedupe, publish version.

### Checklist

- [ ] Scanner chỉ tải manifest theo assignment.
- [ ] Manifest có version, checksum, signature, TTL.
- [ ] QR giả bị reject bằng signature check.
- [ ] Offline scan ghi vào durable local queue.
- [ ] Sync retry không tạo duplicate check-in.
- [ ] Một ticket scan ở hai device offline được backend đánh conflict khi sync.
- [ ] CSV lỗi không ghi đè guest list production.
- [ ] Admin xem được invalid rows và import summary.

### Done khi

- Scanner vẫn check-in được khi tắt mạng.
- Sync lại cho kết quả rõ: accepted/conflict/rejected.
- Guest list version hiện tại không bị hỏng bởi CSV lỗi.

### Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Offline không thể chống double-scan tuyệt đối | Phân vùng gate/zone, sync thường xuyên, backend là nguồn quyết định cuối. |
| Device mất trước khi sync | Local DB encrypted, phân quyền device, vận hành yêu cầu sync định kỳ. |
| CSV nhiều format khác nhau | Chuẩn hóa schema CSV và validate delimiter/encoding sớm. |

## Phase 4: Admin operations

Mục tiêu là giúp ban tổ chức vận hành concert, theo dõi doanh thu/vé và xử lý sự cố.

### Scope

- Admin dashboard theo concert.
- Sold/reserved/available theo ticket type.
- Payment status và pending reconciliation view.
- Audit log cho action nhạy cảm.
- Cancel concert workflow.
- Refund workflow ở mức thiết kế hoặc mock nếu payment provider chưa hỗ trợ.
- Role/ownership enforcement cho organizer.

### Checklist

- [ ] Organizer chỉ thấy concert thuộc organization.
- [ ] Dashboard không query OLTP quá nặng trong giờ mở bán.
- [ ] Action sửa quota/giá sau publish có audit log.
- [ ] Cancel concert dừng bán và trigger notification/refund workflow.
- [ ] Payment pending có màn hình hỗ trợ tra cứu/reconcile.

### Done khi

- Admin có thể vận hành một concert demo từ tạo sự kiện đến theo dõi bán vé.
- Mọi action nhạy cảm có audit trail.
- Dashboard không ảnh hưởng transaction reservation.

## Phase 5: AI and extensibility

Mục tiêu là bổ sung các tính năng mở rộng không nằm trên checkout critical path.

### Scope

- PDF upload vào object storage.
- PDF text extraction.
- AI Artist Bio job async.
- Prompt/model version tracking.
- Admin review/edit/publish bio.
- Notification adapter abstraction.
- Zalo OA/SMS adapter nếu cần demo.
- Analytics/revenue reporting mở rộng.

### Checklist

- [ ] PDF có size limit và malware scan hook hoặc placeholder policy.
- [ ] AI job lỗi không ảnh hưởng public concert page.
- [ ] AI output không auto-publish nếu chưa review.
- [ ] Notification channel mới không cần sửa Order/Payment/Concert.
- [ ] Delivery log và retry/DLQ cho notification.

### Done khi

- Admin upload PDF và nhận draft bio để review.
- Có thể thêm channel notification mới qua adapter.
- AI/model lỗi vẫn giữ concert page hoạt động bình thường.

## Phase 6: Production readiness

Mục tiêu là chuẩn bị hệ thống cho demo nghiêm túc hoặc triển khai thật.

### Scope

- Load test sale day.
- Security review cho auth, QR, webhook, file upload.
- Backup/restore PostgreSQL và object storage.
- Observability dashboard.
- Runbook sale day và event day.
- Deployment checklist.
- Disaster recovery drill tối thiểu.

### Checklist

- [ ] Load test có kịch bản read spike và reservation spike.
- [ ] Webhook verify signature và idempotency đã test.
- [ ] QR không chứa dữ liệu nhạy cảm thô.
- [ ] Backup/restore được thử ít nhất một lần.
- [ ] Alert cho payment pending, queue depth, DLQ, check-in conflict.
- [ ] Runbook có owner và hành động rõ khi gateway lỗi, DB chậm, queue backlog.

### Done khi

- Team có thể mô phỏng ngày mở bán và ngày diễn.
- Có số liệu để quyết định module nào cần tách service.
- Tài liệu vận hành đủ để người khác tiếp quản demo.

## Quy tắc chuyển phase

- Không bắt đầu Phase 2 nếu Phase 1 chưa có reservation/payment/ticket idempotent.
- Không bắt đầu Phase 3 nếu chưa có ticket QR và ticket status ổn định.
- Không làm AI Artist Bio trước khi core ticketing chạy được.
- Chỉ tách microservice khi có số liệu tải hoặc boundary vận hành rõ; trước đó giữ modular monolith.
- Nếu thiếu thời gian, ưu tiên invariant tiền/vé, idempotency và khả năng kiểm chứng trước tính năng mở rộng.
- Mỗi phase chỉ hoàn thành khi đạt tiêu chí `Done khi`.

## Ưu tiên MVP nếu thiếu thời gian

Nếu thời gian đồ án hạn chế, ưu tiên theo thứ tự:

1. Phase 0 foundation.
2. Phase 1 core ticketing.
3. Một phần Phase 2: rate limit, idempotency, reconciliation mock, metrics cơ bản.
4. Một phần Phase 3: scanner API và check-in sync online trước, offline manifest sau.
5. Phase 4 dashboard tối thiểu.
6. Phase 5 AI chỉ làm nếu core đã ổn.

## Kết luận

TicketBox nên đi theo hướng self-hosted/container-based trên Kubernetes, dùng Next.js cho frontend, NestJS cho backend và worker, PostgreSQL cho dữ liệu giao dịch, Redis cho cache/rate limit/waiting room, RabbitMQ cho workflow bất đồng bộ, MinIO cho object storage và Keycloak cho identity.

Giai đoạn đầu nên bắt đầu bằng modular monolith có boundary rõ và worker process riêng. Khi có số liệu tải thực tế, tách dần các domain nóng như Inventory, Payment và Check-in thành service độc lập.

Hai nguyên tắc triển khai quan trọng nhất là tách read-heavy path khỏi write-critical path, và mọi thao tác sinh tiền/vé/check-in phải idempotent, có state machine rõ ràng, có thể reconcile. UI, cache hoặc payment callback từ browser không bao giờ được là nguồn quyết định cuối cùng cho quyền sở hữu vé.
