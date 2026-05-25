# 3. Non-functional Requirements

## Scalability

**Vì sao quan trọng:** Concert lớn có thể có 80.000 người truy cập trong 5 phút đầu, 70% dồn vào phút đầu. Read traffic và write traffic đều tăng đột biến.

**Nếu xử lý kém:** API sập, database quá tải, timeout hàng loạt, người dùng spam retry làm tình hình nặng hơn.

**Thiết kế đáp ứng:**

- Nginx/Varnish/Redis cache cho trang danh sách, chi tiết concert, ảnh, SVG seating map.
- Redis/cache cho inventory summary và sale status.
- Nginx Ingress/API Gateway rate limit theo IP/user/device/session.
- Virtual queue/waiting room trước thời điểm mở bán để làm phẳng write traffic.
- Queue/event bus cho tác vụ async như notification, AI, import, analytics.
- Kubernetes Horizontal Pod Autoscaler cho API/worker, kết hợp cluster autoscaling hoặc chuẩn bị warm capacity trước giờ mở bán.

## High Availability

**Vì sao quan trọng:** Dù payment gateway lỗi, người dùng vẫn phải xem concert và vé còn lại. Admin và soát vé cũng cần hoạt động.

**Nếu xử lý kém:** Một lỗi payment kéo sập toàn hệ thống, website không xem được thông tin, đội vận hành mất kiểm soát.

**Thiết kế đáp ứng:**

- Tách Payment Service khỏi Concert/Ticket read path.
- Multi-AZ database/cache.
- Reverse proxy/edge cache vẫn phục vụ nội dung tĩnh khi backend lỗi một phần.
- Circuit breaker với payment gateway.
- Graceful degradation: tạm ẩn nút thanh toán hoặc chuyển order sang `PAYMENT_PENDING_RETRY` khi gateway sự cố.

## Fault Tolerance

**Vì sao quan trọng:** Payment webhook có thể đến trễ, message queue có thể retry, mobile sync có thể gửi lại, CSV có thể lỗi.

**Nếu xử lý kém:** Duplicate ticket, duplicate notification, mất check-in event, import sai guest list.

**Thiết kế đáp ứng:**

- Idempotency key cho reservation, order, payment, ticket issuing, check-in sync.
- Outbox pattern hoặc transactional event publishing cho event quan trọng.
- Dead-letter queue cho job lỗi.
- Retry với exponential backoff.
- Staging/quarantine cho CSV import lỗi.
- State machine rõ ràng cho order/payment.

## Security

**Vì sao quan trọng:** Hệ thống xử lý thông tin cá nhân, dữ liệu payment status, QR ticket và quyền admin nội bộ.

**Nếu xử lý kém:** Lộ dữ liệu khách hàng, giả mạo vé, sửa concert trái phép, xem doanh thu trái quyền.

**Thiết kế đáp ứng:**

- OAuth/OIDC bằng Keycloak với MFA cho admin.
- RBAC theo role: audience, organizer, scanner, system admin.
- Fine-grained authorization theo concert/organization.
- QR ticket có chữ ký số, expiry/nonce nếu cần.
- Encrypt at rest và in transit.
- Secrets lưu trong HashiCorp Vault, External Secrets Operator hoặc Sealed Secrets, không hardcode.
- Audit log cho admin action, ticket issuing, refund, guest list changes.
- WAF, bot protection, input validation, file upload scanning.

## Fairness khi mở bán vé

**Vì sao quan trọng:** Scalper dùng bot có thể mua hết vé trong vài giây, làm người dùng thật mất cơ hội.

**Nếu xử lý kém:** Mất uy tín, khiếu nại lớn, vé bị bán lại với giá cao.

**Thiết kế đáp ứng:**

- Waiting room phát queue token trước sale.
- Randomized admission trong cửa sổ mở bán nếu lượng người chờ quá lớn.
- Rate limit theo account/IP/device fingerprint/payment instrument.
- CAPTCHA hoặc proof-of-work nhẹ theo risk score.
- Giới hạn số request reserve/order mỗi user trong thời gian ngắn.
- Chỉ cho reserve khi có sale access token hợp lệ, TTL ngắn.
- Phát hiện bot bằng pattern: tốc độ request, nhiều account cùng IP/device, headless signature.

## Consistency khi giữ/mua vé

**Vì sao quan trọng:** SVIP chỉ có 200 chỗ nhưng hàng chục nghìn người cùng mua. Giới hạn per-user cũng phải đúng dưới concurrent request.

**Nếu xử lý kém:** Oversell, user vượt quota bằng nhiều request song song, order pending giữ vé vô hạn.

**Thiết kế đáp ứng:**

- Flow `reservation -> payment -> ticket issuance`.
- Reservation có TTL, tự release khi hết hạn hoặc payment fail.
- Conditional write/transaction: chỉ reserve nếu `available >= requested`.
- Quota ledger theo `(concert_id, ticket_type_id, user_id)` cập nhật cùng transaction với reservation.
- Order/payment state machine:
  - `RESERVED`
  - `PENDING_PAYMENT`
  - `PAYMENT_SUCCEEDED`
  - `TICKET_ISSUED`
  - `PAYMENT_FAILED`
  - `RESERVATION_EXPIRED`
  - `REFUNDED`
- Background sweeper giải phóng reservation hết hạn.

## Performance

**Vì sao quan trọng:** Trang danh sách và chi tiết concert có thể bị đọc hàng nghìn lần/giây. Người dùng cần phản hồi nhanh để không spam refresh.

**Nếu xử lý kém:** DB bị đọc trực tiếp quá nhiều, latency tăng, cache stampede, UI hiển thị chậm.

**Thiết kế đáp ứng:**

- Cache static content tại Nginx/Varnish hoặc reverse proxy cache.
- Cache concert detail với TTL và explicit invalidation.
- Inventory summary cập nhật qua event, cache TTL ngắn.
- Separate read model cho dashboard và public listing.
- Pagination/filter index cho concert listing.
- WebSocket/SSE chỉ dùng nếu cần, không dùng để push từng thay đổi inventory cho mọi user.

## Cost Optimization

**Vì sao quan trọng:** Traffic TicketBox có tính mùa vụ, spike cực cao khi mở bán nhưng thấp trong ngày thường.

**Nếu xử lý kém:** Hạ tầng Kubernetes phải over-provision quanh năm, hoặc bot spam làm tiêu tốn node capacity, băng thông, database connection và broker throughput.

**Thiết kế đáp ứng:**

- Reverse proxy cache và Redis giảm request về backend/database.
- Serverless hoặc autoscaling để trả tiền theo tải thực.
- Rate limit/bot protection để chặn traffic rác sớm.
- Queue async để không phải scale tất cả worker theo peak.
- Tiered storage: object storage cho PDF/ticket assets/log archive.
- Dashboard cost theo service/concert/campaign.

## Observability

**Vì sao quan trọng:** Khi mở bán hoặc diễn ra sự kiện, team cần biết ngay lỗi payment, oversell risk, queue backlog, check-in conflict, CSV import lỗi.

**Nếu xử lý kém:** Không biết nguyên nhân sự cố, xử lý chậm, không reconcile được tiền/vé.

**Thiết kế đáp ứng:**

- Structured logging có correlation id/order id/payment id/ticket id.
- Distributed tracing qua API, service, queue, DB.
- Metrics:
  - API latency/error rate
  - reservation success/fail
  - inventory remaining
  - payment success/pending/timeout
  - webhook retry count
  - queue depth/DLQ count
  - notification delivery rate
  - check-in per minute/conflict/offline sync backlog
  - CSV import valid/invalid/duplicate rows
- Alert theo SLO và business metric, không chỉ CPU/memory.

## Maintainability

**Vì sao quan trọng:** Hệ thống sẽ mở rộng thêm kênh thông báo, payment provider, loại concert, guest workflow và AI feature.

**Nếu xử lý kém:** Mỗi thay đổi nhỏ ảnh hưởng nhiều service, khó test, khó deploy, dễ regression.

**Thiết kế đáp ứng:**

- Domain boundaries rõ: Concert, Inventory, Order, Payment, Notification, Check-in.
- Adapter interface cho payment provider và notification channel.
- Event contract versioning.
- API versioning.
- Infrastructure as Code.
- Automated tests cho reservation/payment/check-in.
- Feature flags cho sale campaign lớn.

## Offline support cho soát vé

**Vì sao quan trọng:** Sân vận động/nhà thi đấu có sóng yếu khi hàng chục nghìn người tập trung.

**Nếu xử lý kém:** Cổng vào nghẽn, dữ liệu check-in mất, vé bị dùng lại.

**Thiết kế đáp ứng:**

- Mobile app lưu encrypted local database.
- Preload signed ticket/guest manifest theo cổng/khu.
- Local append-only check-in log.
- Sync batch idempotent.
- Conflict resolution tại backend.
- Device assignment và revoke list.
- Hiển thị trạng thái offline/sync rõ cho nhân sự.

## Bot Protection

**Vì sao quan trọng:** Bot không chỉ gây bất công mà còn làm tăng tải backend và payment.

**Nếu xử lý kém:** Hệ thống bị spam reserve/order, queue bị chiếm, vé vào tay scalper.

**Thiết kế đáp ứng:**

- WAF với OWASP Core Rule Set.
- Rate limit nhiều lớp: reverse proxy, Nginx Ingress/API Gateway, application.
- Risk scoring theo hành vi.
- CAPTCHA theo rủi ro, không bắt mọi user làm CAPTCHA từ đầu.
- Device/session binding cho queue token.
- Detect automation signal ở frontend.
- Per-account and per-payment-instrument quota.

## Payment Reliability

**Vì sao quan trọng:** Đây là điểm dễ gây khiếu nại nhất: đã trừ tiền nhưng chưa có vé hoặc có vé nhưng chưa thu tiền chắc chắn.

**Nếu xử lý kém:** Mất tiền, mất vé, duplicate order, refund thủ công phức tạp.

**Thiết kế đáp ứng:**

- Payment intent idempotent cho mỗi order.
- Verify webhook signature.
- Không tin redirect callback từ browser là bằng chứng cuối cùng.
- Reconciliation job gọi lại gateway hoặc đọc report định kỳ.
- Timeout không hủy ngay nếu gateway có thể gửi webhook trễ. Chuyển sang `PAYMENT_PENDING_RECONCILIATION`.
- Ticket chỉ issue sau payment success đã verify.
- Refund/cancel flow có state machine riêng.
