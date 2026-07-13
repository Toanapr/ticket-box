# Công Bằng Khi Mở Bán

## Vấn đề

Bot/scalper có thể gửi request nhanh hơn người dùng thật, tạo nhiều session hoặc vượt hàng chờ. Bot vừa làm giảm công bằng vừa tạo tải rác cho hệ thống.

## Quyết định thiết kế

Phạm vi đồ án dùng các lớp bảo vệ có thể triển khai và kiểm thử gọn. Rate limit/risk/quota đã có; bounded admission là hạng mục hardening còn lại:

- Fixed-window rate limit theo account, IP, device/session và endpoint.
- Risk guard chặn pattern bất thường phổ biến trước inventory transaction.
- Bounded admission cấp signed token TTL ngắn theo user/concert khi campaign bật protection; không duy trì queue position.

Risk checks đơn giản trong Backend API có thể được dùng để chặn request bất thường phổ biến. Bot score nhiều tín hiệu, device fingerprint và CAPTCHA theo risk score là hướng mở rộng production, không phải acceptance criteria của bản demo.

## Lý do chọn

- Không có một cơ chế đơn lẻ nào chặn được mọi bot.
- Chặn sớm ở public cache/reverse proxy hoặc Backend API giảm tải trước khi request vào luồng nghiệp vụ.
- Nếu bổ sung CAPTCHA trong production, kích hoạt theo rủi ro giúp giảm ảnh hưởng đến người dùng bình thường.
- Token ngắn hạn chứng minh request đã qua admission control; binding user/concert giảm chia sẻ token.
- Token reusable trong TTL cho cùng scope để idempotent retry không bị coi là replay độc hại.

## Trade-off

- False positive có thể làm người dùng thật bị chặn hoặc phải giải CAPTCHA.
- Bot score và device fingerprint có vấn đề về quyền riêng tư và cần quản trị dữ liệu.
- Bot tinh vi vẫn có thể dùng IP residential hoặc người thật giải CAPTCHA.
- Bounded admission là fairness best-effort, không cung cấp queue position hoặc fairness tuyệt đối giữa nhiều account/IP.
- Token binding có thể làm người dùng phải xin admission lại khi đổi account/session.

## Phương án không chọn

- **Chỉ CAPTCHA cho tất cả:** UX kém và vẫn có dịch vụ vượt CAPTCHA.
- **Chỉ rate limit theo IP:** không công bằng với mạng dùng chung và dễ bị đổi IP.
- **Full virtual queue:** có UX/ordering tốt hơn nhưng vượt phạm vi và chưa cần thiết để chứng minh backpressure trong demo.

## Cách kiểm chứng

- Mô phỏng bot spam, nhiều account/IP và xác nhận rate/risk rejection.
- Khi bounded admission hoàn tất, test token thiếu/hết hạn/sai user/sai concert và retry hợp lệ trong TTL.
- Mô phỏng Redis lỗi: rate limit dùng bounded local fallback; admission-enabled reserve trả `429/503`, không fail-open.
