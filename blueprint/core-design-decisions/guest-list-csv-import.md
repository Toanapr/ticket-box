# Guest List CSV

## Vấn đề

Hệ thống không gọi được API nguồn khách mời mà chỉ nhận CSV theo lịch. File có thể sai format, trùng dữ liệu, thiếu cột hoặc chứa dữ liệu không hợp lệ. Import lỗi không được làm hỏng guest list đang dùng tại cổng.

## Quyết định thiết kế

Dùng pipeline import bất đồng bộ theo batch:

```text
raw file -> staging -> validation -> deduplication -> summary -> publish version
```

File gốc được lưu trong local persistent storage. Mỗi file là full snapshot; dữ liệu chỉ được publish thành active version mới sau khi toàn bộ batch vượt validation. File lỗi giữ trạng thái failed/validation_failed và không ghi trực tiếp vào active guest list.

Policy là full-snapshot all-or-nothing. Duplicate chỉ bị từ chối trong cùng file; identity ở version trước được phép xuất hiện lại. Batch idempotent theo `(concert_id, file_checksum, schema_version)`. Publish active version và ghi `GuestListUpdated` trong cùng transaction.

## Lý do chọn

- Staging cô lập dữ liệu chưa tin cậy khỏi dữ liệu đang phục vụ.
- Batch status và summary giúp admin biết lỗi ở file hoặc dòng nào.
- Versioned publish cho phép giữ version hiện tại nếu import mới thất bại.
- Giới hạn file và dataset demo cho phép parse/import trong request, tránh thêm worker pipeline chưa cần thiết.
- Checksum idempotency và transaction giúp request retry không tạo version trùng; outbox giữ integration hook cho projection về sau.

## Trade-off

- Dữ liệu guest list không xuất hiện ngay sau khi file được gửi.
- Cần thêm bảng staging, batch status, version và cleanup.
- Identity được normalize từ email, phone hoặc sponsor ID; cần ghi rõ precedence khi một dòng có nhiều định danh.
- Việc sửa một vài dòng lỗi có thể yêu cầu gửi lại cả batch.
- All-or-nothing làm chậm việc nhập các dòng hợp lệ khi file chỉ có ít lỗi, đổi lại version tại cổng luôn nhất quán.

## Phương án không chọn

- **Ghi trực tiếp vào production table:** đơn giản nhưng batch lỗi có thể để lại dữ liệu dở dang.
- **Bỏ qua mọi dòng lỗi và tiếp tục:** khó audit và có thể thiếu khách quan trọng.
- **Publish DB rồi gửi event trực tiếp:** có thể mất event nếu worker crash giữa hai bước.
- **Scheduled import worker riêng:** phù hợp file rất lớn/drop folder production nhưng tăng deployment/state; demo dùng admin upload đồng bộ có giới hạn.

## Cách kiểm chứng

- Test file sai encoding, delimiter, cột bắt buộc và dữ liệu trùng.
- Mô phỏng request timeout/process error và retry cùng checksum.
- Mô phỏng lỗi trước/sau transaction commit và xác nhận active version/outbox không lệch.
- Kiểm tra version đang dùng không đổi khi batch mới thất bại.
