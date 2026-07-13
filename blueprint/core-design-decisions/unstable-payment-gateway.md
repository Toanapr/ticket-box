# Payment Gateway Không Ổn Định

## Vấn đề

Payment gateway có thể timeout, trả callback trễ hoặc gửi webhook nhiều lần. Người dùng có thể đã bị trừ tiền dù browser chưa nhận kết quả. Sự cố payment không được kéo sập trang concert hoặc tạo nhiều vé cho một giao dịch.

## Quyết định thiết kế

- Tách public read path khỏi Payment Module và adapter payment provider.
- Tách order state `pending_payment` khỏi payment state `pending_reconciliation`.
- Tạo order/payment bằng idempotency key.
- Chỉ tin webhook đã verify hoặc kết quả reconciliation, không tin browser redirect.
- Dùng in-process circuit breaker, bulkhead và graceful degradation khi gateway lỗi kéo dài.
- Chỉ phát hành vé sau khi payment success được xác nhận đúng một lần và reservation liên quan vẫn còn hợp lệ; nếu reservation đã expired thì chuyển sang reconciliation/refund_required.

## Lý do chọn

- State machine biểu diễn rõ trạng thái chưa chắc chắn thay vì đoán thành công/thất bại.
- Idempotency giúp retry không tạo payment hoặc vé trùng.
- Reconciliation xử lý webhook mất, trễ hoặc trạng thái không đồng bộ.
- Circuit breaker ngăn gateway lỗi kéo cạn connection và tài nguyên backend.
- Bulkhead giữ connection/thread chờ payment không chiếm tài nguyên của public read path.
- Tách read path giữ trang public hoạt động khi checkout bị gián đoạn.

## Trade-off

- Một số order phải chờ reconciliation, làm UX chậm và cần hỗ trợ khách hàng.
- Cần lưu audit, raw payload hash và vận hành reconciliation job.
- Circuit breaker có thể từ chối request trong lúc gateway vừa hồi phục.
- Retry budget thấp có thể chuyển nhiều payment sang reconciliation, làm UX chậm hơn nhưng tránh retry storm.
- Reservation TTL và payment pending cần chính sách xử lý khi lệch thời gian.

## Phương án không chọn

- **Tin browser redirect:** callback có thể giả mạo, mất hoặc bị đóng giữa chừng.
- **Retry tạo payment không idempotent:** có nguy cơ trừ tiền nhiều lần.
- **Retry ở nhiều tầng:** số request tăng theo cấp số nhân và cản gateway hồi phục.
- **Gọi gateway đồng bộ trong mọi luồng:** payment lỗi có thể kéo sập tính năng không liên quan.

## Cách kiểm chứng

- Test webhook trùng, đến trễ, đến trước redirect và mất webhook.
- Mô phỏng gateway timeout dài và kiểm tra public page vẫn hoạt động.
- Kiểm tra circuit threshold/cooldown/half-open probe và bulkhead saturation.
- Kiểm tra một payment success chỉ phát hành vé đúng một lần.
