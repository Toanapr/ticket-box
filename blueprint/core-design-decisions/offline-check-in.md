# Check-In Offline

## Vấn đề

Scanner tại sân vận động có thể mất mạng hoặc kết nối chập chờn. Nhân sự vẫn phải xác minh vé, không mất dữ liệu scan và đồng bộ lại khi có mạng.

Không thể tuyệt đối ngăn cùng một vé được scan trên hai thiết bị hoàn toàn offline vì các thiết bị không chia sẻ trạng thái tức thời.

## Quyết định thiết kế

- Tải trước HMAC-signed ticket/guest manifest theo concert, cổng hoặc khu vực.
- Lưu local checked-in set để chặn scan trùng trên cùng thiết bị.
- Ghi mỗi lần scan vào durable append-only local queue.
- Sync batch idempotent khi có mạng; backend là nguồn quyết định cuối cùng.
- Backend trả conflict rõ ràng khi cùng vé đã được thiết bị khác check-in trước.
- Tạo event id trước khi ghi local, ACK theo từng event và chỉ dọn payload accepted sau khi ACK đã được persist.
- Giữ conflict/rejected local để nhân sự xử lý; retry batch timeout bằng cùng event id.

## Lý do chọn

- Manifest preloaded cho phép đối chiếu token/ref, scope và revoke list mà không gọi backend. Client-side cryptographic verification bằng asymmetric public key là hardening còn lại.
- Durable queue tránh mất dữ liệu khi app crash hoặc mạng mất.
- Idempotent sync cho phép retry batch an toàn.
- Phân vùng manifest theo cổng/khu giảm dữ liệu và giảm nguy cơ scan chéo.
- Per-event ACK xử lý được response một phần và app crash giữa lúc sync.

## Trade-off

- Hai thiết bị offline vẫn có thể cùng chấp nhận một vé trước khi sync.
- Manifest có thể cũ nếu vé vừa refund hoặc revoke.
- AsyncStorage chứa dữ liệu vận hành; demo giảm PII và cleanup sau event. Application-level encryption/key management là production hardening.
- Conflict sau sync cần quy trình vận hành xử lý tại cổng.
- Giữ event conflict/rejected làm tăng local storage và cần cleanup có kiểm soát.

## Phương án không chọn

- **Chỉ check-in online:** đơn giản nhưng không hoạt động khi mạng yếu.
- **QR tự xác nhận mà không có manifest/trạng thái:** không biết vé đã revoke hoặc sai cổng.
- **Chặn tuyệt đối scan trùng khi offline:** không khả thi nếu thiết bị không giao tiếp.

## Cách kiểm chứng

- Test mất mạng, app crash, restart và sync lại.
- Test timeout/partial ACK, gửi lại toàn batch và crash sau ACK trước cleanup.
- Scan cùng vé trên một thiết bị và trên hai thiết bị offline.
- Kiểm tra manifest scope, version, TTL và revoke-list sync; sau hardening, kiểm tra thêm asymmetric signature tại client.
