# Đặc tả: Quản lý concert

## Mô tả

Tính năng quản lý concert cho phép organizer tạo, chỉnh sửa, cấu hình ticket type, seating map, publish hoặc hủy concert trong phạm vi organization của mình. Tính năng này kiểm soát dữ liệu public mà khán giả nhìn thấy và các điều kiện bán vé mà checkout sử dụng.

Actor chính:

- Organizer thuộc organization sở hữu concert.
- System admin khi hỗ trợ vận hành.
- Audience đọc concert public sau khi concert được publish.
- Cache invalidation service xóa Redis keys sau thay đổi public data.

## Luồng chính

1. Organizer tạo concert draft với tên, nghệ sĩ, địa điểm, thời gian, mô tả và thông tin hiển thị ban đầu.
2. Organizer upload hoặc chọn seating map/SVG và cấu hình zone metadata nếu có.
3. Organizer tạo ticket type gồm zone, tên, giá, capacity, quota mỗi user và sale window.
4. Backend tạo ticket type và inventory counter tương ứng trong cùng transaction.
5. Organizer xem lại draft, chỉnh sửa nội dung và cấu hình vé trước khi mở bán.
6. Khi đủ điều kiện publish, organizer chuyển concert sang `published`.
7. Public API chỉ trả concert `published`; sau commit, service xóa Redis listing/detail keys và request kế tiếp reload theo cache-aside.
8. Sau khi sale window bắt đầu, các trường ảnh hưởng financial/inventory bị hạn chế chỉnh sửa.
9. Nếu concert bị hủy, hệ thống chuyển trạng thái `canceled`, dừng bán và kích hoạt các luồng vận hành liên quan.

## Kịch bản lỗi

| Tình huống | Hành vi mong đợi |
|---|---|
| Organizer không thuộc organization sở hữu concert | Từ chối thao tác. |
| Tạo concert thiếu trường bắt buộc hoặc thời gian không hợp lệ | Trả validation error; không tạo draft không hợp lệ. |
| Upload/chọn seating map hoặc local file storage lỗi | Giữ trạng thái hiện tại; không publish asset lỗi. |
| Tạo ticket type với capacity, price, quota hoặc sale window không hợp lệ | Từ chối trong validation. |
| Tạo ticket type thành công nhưng inventory counter không tạo được | Transaction rollback toàn bộ. |
| Publish khi thiếu thông tin bắt buộc hoặc không có ticket type hợp lệ | Từ chối publish và trả danh sách lỗi. |
| Sửa `capacity`, `price`, `per_user_limit`, `zone_code`, `sale_start_at` hoặc `sale_end_at` sau khi mở bán | Trả `409 Conflict` theo policy Phase 1. |
| Public đọc concert draft/canceled | Trả `404 Not Found` hoặc không xuất hiện trong listing public. |
| Cache invalidation lỗi | Structured log ghi lỗi; TTL làm key cũ tự hết hạn và dữ liệu cuối cùng được cập nhật. |
| Hủy concert đã có order/payment | Chuyển trạng thái canceled và kích hoạt refund/notification workflow; không xóa dữ liệu lịch sử. |

## Ràng buộc

- Bảo mật: Backend gán `organization_id` từ authenticated organizer, không nhận organization do client tự chọn.
- Ownership: Organizer chỉ thao tác concert thuộc organization của mình.
- State machine: Concert có trạng thái tối thiểu `draft`, `published`, `canceled`.
- Inventory: Mỗi ticket type phải có đúng một inventory counter, tạo/cập nhật cùng transaction khi thay đổi capacity hợp lệ.
- Publish: Chỉ dữ liệu `published` được public API trả về cho audience.
- Mutability: Sau khi mở bán, các trường ảnh hưởng inventory/giá/quota/sale window bị khóa theo yêu cầu hiện tại.
- Cache: Thay đổi concert/ticket type public phải xóa listing/detail/inventory keys liên quan sau commit; TTL là fallback.
- Audit: Ghi audit cho tạo/sửa/hủy concert, sửa ticket type, publish và thay đổi asset quan trọng.

## Tiêu chí chấp nhận

- [ ] Organizer tạo được concert draft trong organization của mình.
- [ ] Backend không cho client tự gán organization khác khi tạo concert.
- [ ] Tạo ticket type hợp lệ đồng thời tạo inventory counter với giá trị ban đầu đúng capacity.
- [ ] Public listing/detail chỉ hiển thị concert `published`.
- [ ] Publish bị chặn khi concert thiếu thông tin hoặc thiếu ticket type hợp lệ.
- [ ] Sau khi sale bắt đầu, sửa các trường bị khóa trả `409 Conflict`.
- [ ] Organizer ngoài organization không thể sửa, publish hoặc hủy concert.
- [ ] Cập nhật concert/ticket type public invalidates Redis keys liên quan; request kế tiếp trả dữ liệu mới.
- [ ] Hủy concert dừng bán và giữ dữ liệu order/ticket/payment để xử lý vận hành.

## Tài liệu thiết kế liên quan

- `blueprint/04-database-design.md`
- `blueprint/05-business-flows.md`
- `blueprint/06-access-control.md`
- `blueprint/08-requirements.md`
- `blueprint/core-design-decisions/high-read-traffic.md`
