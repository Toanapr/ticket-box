# Tranh Chấp Vé Cuối Cùng

## Vấn đề

Khi nhiều khán giả cùng mua một loại vé gần hết, các request có thể đồng thời đọc thấy vé còn lại. Nếu mỗi request tự trừ vé mà không có kiểm soát concurrency, hệ thống có thể bán nhiều hơn sức chứa.

Invariant bắt buộc:

```text
sold_count + active_reserved_count <= total_capacity
```

## Quyết định thiết kế

Dùng flow `reserve -> pay -> confirm`:

1. Backend tạo reservation có TTL và giữ tạm số vé yêu cầu.
2. Người dùng thanh toán trong thời gian reservation còn hiệu lực.
3. Backend chỉ chuyển reservation thành vé đã bán sau khi payment được xác nhận. Nếu payment success đến sau khi reservation expired, order chuyển sang reconciliation/refund_required.
4. Reservation hết hạn hoặc payment thất bại được giải phóng.

Thao tác reserve và confirm dùng PostgreSQL transaction với row lock hoặc conditional write. UI và cache không phải nguồn quyết định inventory.

## Lý do chọn

- Transaction hoặc conditional write tạo một điểm quyết định duy nhất khi nhiều request cạnh tranh.
- Reservation TTL cho người dùng thời gian thanh toán mà không khóa vé vô hạn.
- Tách reserve khỏi confirm giúp xử lý payment timeout, webhook đến trễ và retry.
- PostgreSQL phù hợp vì inventory cần consistency mạnh hơn tốc độ đọc từ cache.

## Trade-off

- Row inventory của ticket type hot có thể trở thành bottleneck.
- Reservation làm mô hình trạng thái và sweeper hết hạn phức tạp hơn.
- TTL quá dài làm vé bị giữ không cần thiết; TTL quá ngắn làm người dùng chưa kịp thanh toán.
- Transaction retry và lock contention làm tăng latency dưới tải cao.

## Phương án không chọn

- **Trừ vé từ UI hoặc cache:** nhanh nhưng không đảm bảo consistency.
- **Chỉ kiểm tra inventory trước payment:** có thể oversell trong thời gian người dùng thanh toán.
- **Distributed lock làm nguồn quyết định duy nhất:** tăng phụ thuộc hạ tầng và vẫn cần transaction để lưu trạng thái cuối.

## Cách kiểm chứng

- Load test nhiều request cùng giữ số vé cuối cùng.
- Kiểm tra không có trạng thái vượt invariant sau retry, timeout hoặc worker crash.
- Theo dõi lock wait, transaction retry và số reservation hết hạn.

