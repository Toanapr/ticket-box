# Check-In Offline

## Vấn đề

Scanner tại sân vận động có thể mất mạng hoặc kết nối chập chờn. Nhân sự vẫn phải xác minh vé, không mất dữ liệu scan và đồng bộ lại khi có mạng.

Không thể tuyệt đối ngăn cùng một vé được scan trên hai thiết bị hoàn toàn offline vì các thiết bị không chia sẻ trạng thái tức thời.

## Quyết định thiết kế

- Tải trước signed ticket manifest theo concert, cổng hoặc khu vực.
- Lưu local checked-in set để chặn scan trùng trên cùng thiết bị.
- Ghi mỗi lần scan vào durable append-only local queue.
- Sync batch idempotent khi có mạng; backend là nguồn quyết định cuối cùng.
- Backend trả conflict rõ ràng khi cùng vé đã được thiết bị khác check-in trước.

## Lý do chọn

- Signed manifest cho phép kiểm tra tính hợp lệ mà không gọi backend.
- Durable queue tránh mất dữ liệu khi app crash hoặc mạng mất.
- Idempotent sync cho phép retry batch an toàn.
- Phân vùng manifest theo cổng/khu giảm dữ liệu và giảm nguy cơ scan chéo.

## Trade-off

- Hai thiết bị offline vẫn có thể cùng chấp nhận một vé trước khi sync.
- Manifest có thể cũ nếu vé vừa refund hoặc revoke.
- Local storage chứa dữ liệu nhạy cảm nên cần mã hóa và quản lý thiết bị.
- Conflict sau sync cần quy trình vận hành xử lý tại cổng.

## Phương án không chọn

- **Chỉ check-in online:** đơn giản nhưng không hoạt động khi mạng yếu.
- **QR tự xác nhận mà không có manifest/trạng thái:** không biết vé đã revoke hoặc sai cổng.
- **Chặn tuyệt đối scan trùng khi offline:** không khả thi nếu thiết bị không giao tiếp.

## Cách kiểm chứng

- Test mất mạng, app crash, restart và sync lại.
- Scan cùng vé trên một thiết bị và trên hai thiết bị offline.
- Kiểm tra manifest signature, version, TTL và revoke-list sync.

