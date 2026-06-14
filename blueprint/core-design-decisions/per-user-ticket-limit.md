# Giới Hạn Vé Mỗi Tài Khoản

## Vấn đề

Một người dùng có thể gửi nhiều request giữ vé đồng thời để vượt giới hạn mua. Kiểm tra quota ở frontend hoặc kiểm tra rồi cập nhật bằng hai thao tác tách rời đều có race condition.

Invariant bắt buộc:

```text
paid_user_ticket_count + active_reserved_user_ticket_count <= configured_user_limit
```

## Quyết định thiết kế

Backend enforce quota trong cùng transaction tạo reservation/order. Hệ thống dùng per-user ticket quota ledger theo `(user_id, ticket_type_id)` để lưu số vé đang giữ và đã mua của từng user cho từng loại vé.

Transaction phải khóa hoặc atomic upsert cả inventory và quota liên quan trước khi tạo reservation.

## Lý do chọn

- Backend là trust boundary; client không thể tự khai báo quota còn lại.
- Cùng transaction giúp inventory và quota thành công hoặc thất bại cùng nhau.
- Quota ledger tránh phải đếm toàn bộ order/reservation mỗi lần mua.
- Ledger tạo điểm audit rõ khi xử lý khiếu nại hoặc điều chỉnh quota.

## Trade-off

- Thêm bảng và logic đồng bộ quota reserved/paid/released.
- Request phải khóa nhiều row hơn, làm tăng nguy cơ contention hoặc deadlock.
- Cần quy định rõ quota áp dụng theo concert, ticket type hay toàn campaign.
- Sửa hoặc hoàn tiền order phải cập nhật ledger chính xác.

## Phương án không chọn

- **Chỉ giới hạn ở UI:** dễ bị bỏ qua bằng request trực tiếp.
- **Đếm order mỗi request:** query nặng và vẫn có race condition nếu không khóa.
- **Chỉ dùng Redis counter:** nhanh nhưng không phù hợp làm nguồn dữ liệu quota cuối cùng.

## Cách kiểm chứng

- Gửi nhiều request song song từ cùng user khi quota gần đầy.
- Kiểm tra quota sau reservation expiry, payment failure và refund.
- Theo dõi deadlock, quota mismatch và transaction retry.

