# Công Bằng Khi Mở Bán

## Vấn đề

Bot/scalper có thể gửi request nhanh hơn người dùng thật, tạo nhiều session hoặc vượt hàng chờ. Bot vừa làm giảm công bằng vừa tạo tải rác cho hệ thống.

## Quyết định thiết kế

Kết hợp nhiều tín hiệu và lớp bảo vệ:

- Waiting room/virtual queue kiểm soát thứ tự hoặc phân phối lượt vào.
- Rate limit theo account, IP, device/session và endpoint.
- Risk checks trong Backend API chặn request bất thường phổ biến.
- Bot score đơn giản đánh giá rủi ro từ hành vi và tín hiệu request.
- CAPTCHA chỉ áp dụng khi risk score cao.
- Sale access token được ký, có TTL ngắn, nonce, scope theo concert/endpoint và bind với user/session sau waiting room.

## Lý do chọn

- Không có một cơ chế đơn lẻ nào chặn được mọi bot.
- Chặn sớm ở public cache/reverse proxy hoặc Backend API giảm tải trước khi request vào luồng nghiệp vụ.
- CAPTCHA theo rủi ro giảm ảnh hưởng đến người dùng bình thường.
- Token ngắn hạn chứng minh request đã qua admission control.
- Nonce và binding giúp giảm replay, chia sẻ token hoặc gọi sai sale endpoint.

## Trade-off

- False positive có thể làm người dùng thật bị chặn hoặc phải giải CAPTCHA.
- Bot score và device fingerprint có vấn đề về quyền riêng tư và cần quản trị dữ liệu.
- Bot tinh vi vẫn có thể dùng IP residential hoặc người thật giải CAPTCHA.
- Waiting room cần chính sách rõ: first-come-first-served hay randomized admission.
- Token binding có thể làm người dùng phải vào lại hàng chờ khi đổi thiết bị/session.

## Phương án không chọn

- **Chỉ CAPTCHA cho tất cả:** UX kém và vẫn có dịch vụ vượt CAPTCHA.
- **Chỉ rate limit theo IP:** không công bằng với mạng dùng chung và dễ bị đổi IP.
- **Không có token vào sale:** bot có thể gọi trực tiếp endpoint giữ vé.

## Cách kiểm chứng

- Mô phỏng bot spam, nhiều account và nhiều IP.
- Theo dõi tỷ lệ CAPTCHA, false positive và request bị chặn.
- Audit khả năng token bị replay, chia sẻ hoặc dùng sai scope.
- Mô phỏng Redis/waiting room lỗi và xác nhận reserve fail-closed hoặc dùng emergency admission limit nhỏ.
