# Guest List CSV

## Vấn đề

Hệ thống không gọi được API nguồn khách mời mà chỉ nhận CSV theo lịch. File có thể sai format, trùng dữ liệu, thiếu cột hoặc chứa dữ liệu không hợp lệ. Import lỗi không được làm hỏng guest list đang dùng tại cổng.

## Quyết định thiết kế

Dùng pipeline import bất đồng bộ theo batch:

```text
raw file -> staging -> validation -> deduplication -> summary -> publish version
```

File gốc được lưu trong object storage. Dữ liệu chỉ được publish thành version mới sau khi toàn bộ batch vượt qua validation. File lỗi được quarantine; không ghi trực tiếp vào bảng guest list production.

## Lý do chọn

- Staging cô lập dữ liệu chưa tin cậy khỏi dữ liệu đang phục vụ.
- Batch status và summary giúp admin biết lỗi ở file hoặc dòng nào.
- Versioned publish cho phép giữ version hiện tại nếu import mới thất bại.
- Async worker tránh upload/import lớn làm nghẽn request API.

## Trade-off

- Dữ liệu guest list không xuất hiện ngay sau khi file được gửi.
- Cần thêm bảng staging, batch status, version và cleanup.
- Deduplication cần quy tắc identity rõ, ví dụ email, phone hoặc sponsor ID.
- Việc sửa một vài dòng lỗi có thể yêu cầu gửi lại cả batch.

## Phương án không chọn

- **Ghi trực tiếp vào production table:** đơn giản nhưng batch lỗi có thể để lại dữ liệu dở dang.
- **Bỏ qua mọi dòng lỗi và tiếp tục:** khó audit và có thể thiếu khách quan trọng.
- **Import đồng bộ trong HTTP request:** dễ timeout và chiếm tài nguyên API.

## Cách kiểm chứng

- Test file sai encoding, delimiter, cột bắt buộc và dữ liệu trùng.
- Mô phỏng worker crash giữa batch và retry.
- Kiểm tra version đang dùng không đổi khi batch mới thất bại.

