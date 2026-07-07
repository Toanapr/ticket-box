# Tải Trọng Đột Biến Khi Mở Bán

## Vấn đề

Trong vài phút đầu mở bán, lượng người dùng và request giữ vé có thể tăng đột ngột. Nếu chỉ khởi động thêm container sau khi tải tăng thì thường không đủ nhanh, còn database không thể scale write vô hạn.

## Quyết định thiết kế

Dùng nhiều lớp kiểm soát tải:

1. Waiting room/virtual queue giới hạn số người được vào luồng mua vé.
2. Backend API/Redis rate limit request theo IP, user, device và endpoint.
3. Queue hoặc admission control tạo backpressure cho request giữ vé.
4. Chuẩn bị sẵn capacity Docker/container trước giờ mở bán.
5. Cache phục vụ read traffic để dành tài nguyên cho write-critical path.
6. Đặt concurrency limit và backlog/admission depth tối đa; khi vượt ngưỡng, từ chối sớm bằng `429/503` kèm `Retry-After`.

## Lý do chọn

- Waiting room làm phẳng traffic trước khi request chạm backend và database.
- Rate limit loại bỏ spam sớm, giảm chi phí xử lý bên trong.
- Backpressure giữ hệ thống trong ngưỡng có thể xử lý thay vì nhận vô hạn.
- Chuẩn bị capacity trước giờ mở bán giúp tránh khởi động container đúng lúc traffic tăng.
- Bounded queue tránh cạn connection/memory và cho client retry bằng cùng idempotency key.

## Trade-off

- Người dùng phải chờ và cần UX hiển thị vị trí/trạng thái rõ ràng.
- Queue tạo thêm trạng thái, timeout và bài toán retry.
- Từ chối sớm làm một số người dùng phải quay lại hàng chờ dù hệ thống chưa sập.
- Rate limit sai có thể chặn người dùng thật dùng chung IP.
- Bật sẵn capacity tăng chi phí/tài nguyên dù traffic thực tế thấp hơn dự kiến.
- Tăng số backend container không giải quyết được bottleneck ở database hoặc Redis/cache.

## Phương án không chọn

- **Chỉ tăng số container backend:** phản ứng chậm và không bảo vệ database.
- **Nhận toàn bộ request rồi xử lý dần:** dễ cạn connection, memory và timeout.
- **Chỉ tăng kích thước server:** tốn chi phí và vẫn có giới hạn.

## Cách kiểm chứng

- Load test theo traffic profile của giờ mở bán, không chỉ tải đều.
- Kiểm tra backlog/admission depth, p95/p99 latency, error rate và database saturation.
- Mô phỏng Redis/waiting room lỗi để xác nhận reserve path không fail-open vào database.
- Diễn tập mở bán với capacity đã chuẩn bị, waiting room và cơ chế degrade.
