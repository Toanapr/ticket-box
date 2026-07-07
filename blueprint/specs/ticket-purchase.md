# Đặc tả: Mua vé

## Mô tả

Tính năng mua vé cho phép khán giả chọn concert đã publish, chọn loại vé và số lượng, giữ vé tạm thời, tạo order, thanh toán và nhận e-ticket sau khi payment được xác nhận. Backend là nguồn quyết định cuối cùng cho sale window, inventory, quota và trạng thái order; UI chỉ hiển thị dữ liệu tham khảo.

Actor chính:

- Khán giả đã đăng nhập.
- Backend API, Inventory Service, Order Service, Payment Service và Ticket Service.
- Notification Service gửi thông báo sau khi vé được phát hành.

## Luồng chính

1. Khán giả mở trang concert đã publish và chọn ticket type còn trong sale window.
2. Khán giả chọn số lượng vé và gửi yêu cầu mua kèm idempotency key và sale access token hợp lệ.
3. Backend xác thực user, kiểm tra role `audience`, kiểm tra token vào sale và chống bot/rate limit.
4. Inventory giữ vé trong transaction: kiểm tra sale window, capacity còn lại và quota theo user.
5. Hệ thống tạo reservation có TTL, order `PENDING_PAYMENT` và order items tương ứng.
6. Payment Service tạo payment intent idempotent và trả payment URL hoặc deeplink.
7. Khán giả thanh toán qua provider.
8. Webhook/callback đã verify xác nhận payment thành công.
9. Hệ thống confirm reservation, chuyển order sang trạng thái đã thanh toán/phát hành và tạo đúng số e-ticket.
10. Notification Service gửi e-ticket hoặc thông báo mua thành công cho khán giả.

## Kịch bản lỗi

| Tình huống | Hành vi mong đợi |
|---|---|
| Concert không tồn tại hoặc chưa publish | Trả `404 Not Found`; không tiết lộ dữ liệu draft. |
| Ticket type không thuộc concert, đã ngừng bán hoặc chưa mở bán | Từ chối reservation và trả lỗi nghiệp vụ rõ ràng. |
| Request thiếu hoặc trùng idempotency key | Thiếu key bị từ chối; key trùng trả lại kết quả đã tạo trước đó nếu cùng user và payload tương thích. |
| Sale access token hết hạn, sai scope hoặc bị replay | Từ chối trước khi vào transaction inventory. |
| Hết vé trong lúc giữ | Transaction thất bại, không tạo order/payment mới. |
| User vượt quota bằng nhiều request song song | Chỉ các request trong quota được giữ vé; request còn lại bị từ chối. |
| Payment thất bại hoặc user hủy thanh toán | Order chuyển sang failed/canceled theo kết quả provider; reservation được release hoặc để sweeper expire theo chính sách. |
| Payment timeout hoặc không có webhook | Order giữ `PENDING_PAYMENT`; reconciliation kiểm tra lại provider; reservation hết TTL thì được expire. |
| Payment success đến sau khi reservation expired | Không phát hành vé tự động; order chuyển sang trạng thái cần reconciliation/refund. |
| Ticket issuing retry hoặc worker xử lý lại job/outbox record | Phát hành vé idempotent; không tạo QR/ticket trùng. |
| Notification gửi thất bại | Ghi nhận lỗi và retry async; không rollback order hoặc ticket đã phát hành. |

## Ràng buộc

- Bảo mật: Chỉ user role `audience` hoặc `system_admin` theo quy trình vận hành mới tạo reservation/order; user chỉ xem được order và ticket của chính mình.
- Consistency: Không được oversell; không user nào vượt `per_user_limit`; một payment success chỉ phát hành vé đúng một lần.
- Idempotency: Các thao tác tạo reservation/order/payment và issue ticket phải retry-safe.
- Thời gian: Reservation có TTL hữu hạn; sweeper phải release reservation hết hạn mà không ảnh hưởng reservation còn active.
- Payment: Không tin browser redirect là bằng chứng thanh toán; chỉ dùng webhook đã verify hoặc reconciliation.
- Hiệu năng: Inventory chính xác chỉ kiểm tra ở backend transaction; số vé còn lại trên UI có thể trễ vài giây.
- Audit: Ghi correlation id và trạng thái quan trọng cho reservation, order, payment, ticket issuing và lỗi reconciliation.

## Tiêu chí chấp nhận

- [ ] Khán giả mua thành công một ticket type còn mở bán và nhận đúng số e-ticket sau payment success đã verify.
- [ ] Nhiều request song song cho số vé cuối cùng không làm `sold_count + reserved_count` vượt capacity.
- [ ] Nhiều request song song từ cùng user không vượt quota của ticket type.
- [ ] Gửi lại cùng idempotency key không tạo thêm reservation, order, payment hoặc ticket.
- [ ] Reservation hết TTL được release và làm inventory/quota available trở lại.
- [ ] Payment success đến sau reservation expiry không phát hành vé và được đưa vào luồng reconciliation/refund.
- [ ] Ticket issuing retry không tạo QR/ticket trùng.
- [ ] Lỗi notification không làm checkout thành công bị rollback.
- [ ] User không thể xem order/ticket của user khác.

## Tài liệu thiết kế liên quan

- `blueprint/04-database-design.md`
- `blueprint/05-business-flows.md`
- `blueprint/06-access-control.md`
- `blueprint/08-requirements.md`
- `blueprint/core-design-decisions/last-ticket-contention.md`
- `blueprint/core-design-decisions/per-user-ticket-limit.md`
- `blueprint/core-design-decisions/sale-fairness.md`
- `blueprint/core-design-decisions/unstable-payment-gateway.md`
