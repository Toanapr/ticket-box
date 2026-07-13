# Thông Báo

## Vấn đề

Sau khi mua vé thành công, khán giả phải nhận xác nhận qua app và email kèm e-ticket. Trước concert 24 giờ, hệ thống phải gửi nhắc nhở tự động.

Gửi thông báo không được làm chậm hoặc làm hỏng luồng thanh toán/phát hành vé. Hệ thống cũng cần dễ bổ sung kênh mới như Zalo OA hoặc SMS mà không phải sửa lớn vào luồng nghiệp vụ chính.

## Quyết định thiết kế

- Sau ticket issuance/cancel/reminder, domain module tạo `notification_records` idempotent cho từng channel.
- Scheduled Notification Worker đọc record pending đến hạn, render nội dung, gọi channel adapter và cập nhật delivery status.
- Tách kênh gửi bằng interface/adapter chung, ví dụ `InAppChannel`, `EmailChannel`, `SmsChannel`, `ZaloOaChannel`.
- In-app notification và email confirmation được tạo từ cùng event `TicketIssued`; email đính kèm hoặc liên kết e-ticket đã được phát hành.
- Reminder trước 24 giờ được tạo bởi scheduler/job theo concert start time, có idempotency key theo `(concert_id, user_id, notification_type, channel)`.
- Lưu trạng thái delivery theo từng kênh: `pending`, `sent`, `failed`; attempt/backoff states được thêm khi triển khai automatic retry.
- Template được version hóa theo notification type, locale và channel.

## Lý do chọn

- Durable notification record bảo đảm yêu cầu gửi không mất và có thể retry mà không cần external message broker.
- Xử lý bất đồng bộ giúp payment/order flow không phụ thuộc độ ổn định của email provider hoặc push provider.
- Delivery theo từng kênh cho phép email lỗi nhưng in-app vẫn thành công, và ngược lại.
- Adapter channel giúp thêm Zalo OA hoặc SMS bằng cách thêm implementation mới thay vì sửa business flow.
- Idempotency tránh tạo delivery trùng khi scheduler/reminder chạy lại; automatic retry của failed delivery là hạng mục hardening còn lại.
- Template versioning giúp thay đổi nội dung mà không cần deploy lại toàn bộ luồng nghiệp vụ.

## Trade-off

- Thông báo có thể đến trễ vài giây vì xử lý bất đồng bộ.
- Cần bảng notification records và scheduled worker; retry/backoff/cleanup nâng cao có thể bổ sung mà không đổi adapter contract.
- E-ticket trong email cần kiểm soát bảo mật, TTL hoặc signed URL nếu dùng link tải.
- Nhiều kênh làm tăng nhu cầu quản lý consent, unsubscribe và preference của người dùng.
- Reminder trước 24 giờ phụ thuộc timezone, thay đổi giờ diễn và trạng thái hủy/hoãn concert.

## Phương án không chọn

- **Gửi email/push trực tiếp trong transaction mua vé:** dễ làm checkout chậm hoặc fail vì lỗi provider bên ngoài.
- **Mỗi service tự gọi provider thông báo:** nhanh lúc đầu nhưng khó kiểm soát retry, template, audit và thêm kênh mới.
- **Hard-code logic theo email và app:** không đáp ứng yêu cầu mở rộng sang Zalo OA, SMS.
- **Scheduler gửi thẳng provider không lưu delivery:** khó retry an toàn và khó điều tra khi người dùng báo không nhận được.

## Cách kiểm chứng

- Test phát hành vé thành công nhưng email provider timeout; order vẫn thành công và delivery lưu `failed` cùng error.
- Test scheduler/producer chạy lại trên cùng idempotency key không tạo delivery trùng; khi thêm retry, test adapter timeout không gửi duplicate.
- Test reminder job chạy lại nhiều lần chỉ tạo một delivery cho mỗi user/channel/type.
- Kiểm tra thêm channel mới chỉ cần thêm adapter, template và cấu hình routing.
- Kiểm tra concert đổi giờ, hủy hoặc hoãn trước khi reminder được gửi.
