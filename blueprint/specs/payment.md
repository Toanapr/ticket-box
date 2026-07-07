# Đặc tả: Thanh toán

## Mô tả

Tính năng thanh toán quản lý payment intent, redirect/deeplink sang VNPAY/MoMo, nhận webhook/callback, xác minh trạng thái thanh toán và reconciliation khi provider không ổn định. Payment không quyết định inventory một mình; vé chỉ được phát hành khi payment success đã được xác minh và order/reservation còn đủ điều kiện.

Actor chính:

- Khán giả thực hiện thanh toán cho order của mình.
- Payment provider như VNPAY hoặc MoMo.
- Payment Service, Order Service, Inventory Service và Ticket Service.
- Reconciliation worker và vận hành hỗ trợ khách hàng.

## Luồng chính

1. Order `PENDING_PAYMENT` được tạo từ luồng reservation.
2. Payment Service nhận yêu cầu tạo payment intent kèm idempotency key.
3. Payment Service kiểm tra order thuộc user, số tiền, trạng thái order và provider được hỗ trợ.
4. Hệ thống tạo hoặc trả lại payment intent đã có nếu request idempotent.
5. Payment Service gọi provider để tạo payment URL/deeplink và lưu trạng thái `pending`.
6. Khán giả hoàn tất thanh toán trên provider.
7. Provider gửi webhook/callback về Payment Service.
8. Payment Service verify signature, kiểm tra số tiền, provider transaction id và dedupe webhook.
9. Payment success hợp lệ ghi trạng thái/outbox record để Order/Inventory confirm reservation và Ticket Service issue vé.
10. Payment failed/expired cập nhật order và release hoặc expire reservation theo chính sách.

## Kịch bản lỗi

| Tình huống | Hành vi mong đợi |
|---|---|
| Order không tồn tại hoặc không thuộc user | Từ chối tạo payment intent. |
| Order không ở trạng thái thanh toán được | Không tạo payment mới; trả trạng thái hiện tại của order/payment. |
| Request tạo payment intent bị retry | Trả lại payment intent cũ nếu idempotency key và payload tương thích. |
| Gateway timeout khi tạo payment | Đưa payment/order vào trạng thái pending hoặc cần retry có kiểm soát; không tạo nhiều intent không idempotent. |
| Gateway lỗi kéo dài | Circuit breaker mở, từ chối checkout mới có thông báo phù hợp; public concert read path vẫn hoạt động. |
| Webhook sai signature | Từ chối, ghi audit/security log, không đổi trạng thái payment. |
| Webhook trùng | Dedupe theo provider transaction id/payload hash; không ghi confirm job/outbox lần hai. |
| Webhook success sai số tiền hoặc sai order | Đưa vào trạng thái suspicious/reconciliation; không phát hành vé. |
| Webhook đến trước browser redirect | Xử lý bình thường dựa trên webhook đã verify; redirect chỉ hiển thị trạng thái hiện có. |
| Browser redirect báo success nhưng chưa có webhook hợp lệ | Hiển thị pending và chờ webhook hoặc reconciliation; không phát hành vé. |
| Webhook mất hoặc đến trễ | Reconciliation worker truy vấn provider và cập nhật trạng thái cuối cùng. |
| Payment success sau reservation expiry | Không issue ticket; đánh dấu cần reconciliation/refund theo chính sách. |

## Ràng buộc

- Bảo mật: Phải verify signature/cert của provider và không tin tham số từ browser redirect.
- Idempotency: Tạo payment intent, xử lý webhook và ghi job/outbox downstream phải retry-safe.
- Consistency: Một provider transaction thành công chỉ được gắn với một payment/order hợp lệ.
- Audit: Lưu provider, provider transaction id, trạng thái, payload hash và correlation id đủ để điều tra khiếu nại.
- Fault tolerance: Retry phải có backoff/jitter và retry budget; tránh retry storm vào provider.
- Cô lập lỗi: Payment provider lỗi không được làm sập public listing/detail, admin management hoặc scanner.
- Reconciliation: Có job định kỳ xử lý payment pending, timeout, webhook mất và trạng thái không khớp.

## Tiêu chí chấp nhận

- [ ] Tạo payment intent cho order pending trả payment URL/deeplink và lưu payment `pending`.
- [ ] Retry cùng idempotency key không tạo thêm payment intent.
- [ ] Webhook success hợp lệ cập nhật payment/order và kích hoạt phát hành vé đúng một lần.
- [ ] Webhook trùng không phát hành vé hoặc confirm reservation lần hai.
- [ ] Webhook sai signature hoặc sai số tiền không cập nhật payment thành success.
- [ ] Browser redirect success nhưng thiếu webhook hợp lệ không phát hành vé.
- [ ] Reconciliation cập nhật đúng payment pending khi provider đã có trạng thái cuối cùng.
- [ ] Gateway timeout không tạo payment trùng và không làm public concert page mất khả dụng.
- [ ] Payment success sau reservation expiry được đánh dấu cần xử lý thủ công/refund, không issue ticket tự động.

## Tài liệu thiết kế liên quan

- `blueprint/04-database-design.md`
- `blueprint/05-business-flows.md`
- `blueprint/08-requirements.md`
- `blueprint/core-design-decisions/unstable-payment-gateway.md`
- `blueprint/core-design-decisions/last-ticket-contention.md`
