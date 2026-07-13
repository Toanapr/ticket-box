# Đặc tả: Thanh toán

## Mô tả

Tính năng thanh toán quản lý payment intent, redirect/deeplink, provider callback/IPN, trạng thái không chắc chắn và reconciliation. Implementation có VNPAY cùng mock provider qua provider port; MoMo là adapter bổ sung nếu rubric yêu cầu cả hai. Payment không quyết định inventory một mình; vé chỉ phát hành khi payment success được xác minh và reservation còn hợp lệ.

Actor chính:

- Khán giả thực hiện thanh toán cho order của mình.
- Payment provider như VNPAY hoặc MoMo.
- Payment, Order, Inventory và Ticket Module trong Backend API.
- Reconciliation worker và vận hành hỗ trợ khách hàng.

## Luồng chính

1. Order `pending_payment` và payment `created` được tạo từ luồng order.
2. Payment Module nhận yêu cầu tạo payment intent kèm idempotency key.
3. Payment Module kiểm tra order thuộc user, số tiền, trạng thái order và provider được hỗ trợ.
4. Hệ thống tạo hoặc trả lại payment intent đã có nếu request idempotent.
5. Payment Module gọi provider adapter để tạo payment URL/deeplink và lưu trạng thái `pending`.
6. Khán giả hoàn tất thanh toán trên provider.
7. Provider gửi webhook/callback về Backend API; request được chuyển tới Payment Module.
8. Payment Module verify signature, kiểm tra số tiền, provider transaction id và dedupe webhook.
9. Payment success hợp lệ chạy transaction chung: cập nhật payment, confirm reservation, chuyển inventory/quota và gọi Ticket Module issue vé idempotent.
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
| Provider event trùng | Dedupe theo `(provider, provider_event_id)`; payload hash khác với cùng event id bị reject, ticket không phát hành lần hai. |
| Webhook success sai số tiền hoặc sai order | Đưa vào trạng thái suspicious/reconciliation; không phát hành vé. |
| Webhook đến trước browser redirect | Xử lý bình thường dựa trên webhook đã verify; redirect chỉ hiển thị trạng thái hiện có. |
| Browser tự báo success hoặc return thiếu/sai provider signature | Hiển thị pending/error; không phát hành vé. Provider-signed return có thể đi qua cùng validation/dedupe path, nhưng IPN/reconciliation vẫn là đường ưu tiên. |
| Webhook mất hoặc đến trễ | Reconciliation worker truy vấn provider và cập nhật trạng thái cuối cùng. |
| Payment success sau reservation expiry | Không issue ticket; đánh dấu cần reconciliation/refund theo chính sách. |

## Ràng buộc

- Bảo mật: Phải verify provider signature và amount/currency/order mapping. Browser return chỉ được xử lý khi payload có chữ ký hợp lệ; IPN/reconciliation là đường xác nhận ưu tiên.
- Idempotency: Tạo payment intent, xử lý provider event và ticket issuance downstream phải retry-safe.
- Consistency: Một provider transaction thành công chỉ được gắn với một payment/order hợp lệ.
- Audit: Lưu provider, provider transaction id, trạng thái, payload hash và correlation id đủ để điều tra khiếu nại.
- Fault tolerance: Retry phải có backoff/jitter và retry budget; tránh retry storm vào provider.
- Cô lập lỗi: Payment provider lỗi không được làm sập public listing/detail, admin management hoặc scanner.
- Reconciliation: Scheduled worker dùng lease/attempt metadata để xử lý `pending_reconciliation`, timeout, webhook mất và trạng thái không khớp.

## Tiêu chí chấp nhận

- [ ] Tạo payment intent cho order pending trả payment URL/deeplink và lưu payment `pending`.
- [ ] Retry cùng idempotency key không tạo thêm payment intent.
- [ ] Webhook success hợp lệ cập nhật payment/order và kích hoạt phát hành vé đúng một lần.
- [ ] Webhook trùng không phát hành vé hoặc confirm reservation lần hai.
- [ ] Webhook sai signature hoặc sai số tiền không cập nhật payment thành success.
- [ ] Browser-controlled success hoặc return sai signature không phát hành vé; signed return/IPN replay vẫn idempotent.
- [ ] Reconciliation cập nhật đúng payment pending khi provider đã có trạng thái cuối cùng.
- [ ] Gateway timeout không tạo payment trùng và không làm public concert page mất khả dụng.
- [ ] Payment success sau reservation expiry được đánh dấu cần xử lý thủ công/refund, không issue ticket tự động.

## Tài liệu thiết kế liên quan

- `blueprint/04-database-design.md`
- `blueprint/05-business-flows.md`
- `blueprint/08-requirements.md`
- `blueprint/core-design-decisions/unstable-payment-gateway.md`
- `blueprint/core-design-decisions/last-ticket-contention.md`
