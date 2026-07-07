# Đặc tả: Import guest list CSV

## Mô tả

Tính năng import guest list CSV cho phép organizer hoặc system admin upload file khách mời theo concert, validate dữ liệu trong staging, dedupe, tạo summary lỗi và publish version mới khi toàn bộ batch hợp lệ. Batch lỗi không được làm hỏng guest list production đang dùng tại cổng.

Actor chính:

- Organizer thuộc organization sở hữu concert.
- System admin khi hỗ trợ vận hành.
- Guest List Import Service, Object Storage, Outbox Polling Worker và Check-in Service.

## Luồng chính

1. Organizer chọn concert thuộc organization của mình và upload CSV guest list.
2. Backend xác thực quyền, lưu raw file vào object storage và tạo import batch với checksum/schema version.
3. Import worker đọc file, parse header/delimiter/encoding theo format được hỗ trợ.
4. Worker normalize dữ liệu định danh khách, zone/ticket type, sponsor và các trường liên hệ.
5. Worker validate từng dòng và ghi kết quả vào staging.
6. Worker dedupe trong file và so với guest entry active theo concert, sponsor và identity.
7. Nếu toàn batch hợp lệ, worker publish version mới trong transaction và ghi outbox `GuestListUpdated`.
8. Outbox polling worker đọc event đã commit để Check-in Service/manifest biết có version mới.
9. Admin dashboard hiển thị batch status, summary, version active và danh sách lỗi nếu có.

## Kịch bản lỗi

| Tình huống | Hành vi mong đợi |
|---|---|
| User không có quyền trên concert | Từ chối upload/import. |
| File không đọc được, sai loại file hoặc vượt giới hạn kích thước | Batch `FAILED` hoặc upload bị reject; version active không đổi. |
| Header thiếu cột bắt buộc, trùng header hoặc có header không hỗ trợ | Batch invalid; không publish version mới. |
| Delimiter/encoding không hỗ trợ | Batch invalid hoặc failed có thông báo rõ. |
| Dòng thiếu identity, full name, zone/ticket mapping hoặc sai format | Ghi invalid row vào staging; toàn batch không publish. |
| Zone hoặc ticket type không thuộc concert | Batch invalid; không ghi production. |
| Duplicate trong cùng file | Batch invalid với report các dòng trùng. |
| Duplicate với guest entry active theo identity/sponsor | Batch invalid hoặc rejected theo policy dedupe; version active không đổi. |
| Worker crash giữa chừng | Retry theo `(concert_id, file_checksum, schema_version)` không tạo batch/version/row trùng. |
| Worker crash sau DB commit nhưng trước khi outbox được xử lý | Outbox polling worker xử lý lại `GuestListUpdated`; không tạo version mới lần nữa. |
| Batch lỗi nặng hoặc nghi ngờ file độc hại | Quarantine file và giữ nguyên dữ liệu production. |

## Ràng buộc

- Bảo mật: Chỉ organizer sở hữu concert hoặc system admin được upload/import; raw file chứa PII phải được bảo vệ và có retention rõ.
- All-or-nothing: Version mới chỉ active khi toàn bộ batch hợp lệ.
- Idempotency: Import idempotent theo concert, checksum và schema version.
- Audit: Lưu người upload, thời điểm, checksum, batch status, summary lỗi và version publish.
- Consistency: Publish version active và outbox event phải nằm trong cùng transaction.
- Manifest: Check-in manifest chỉ dùng guest list version đã publish, không dùng staging.
- Vận hành: Error report phải đủ thông tin dòng/cột để admin sửa file và upload lại.

## Tiêu chí chấp nhận

- [ ] Upload CSV hợp lệ tạo batch, publish version mới và phát `GuestListUpdated`.
- [ ] Batch invalid không thay đổi guest list version active.
- [ ] File thiếu header bắt buộc, duplicate header hoặc header không hỗ trợ bị báo lỗi rõ.
- [ ] Dòng sai format hoặc thiếu dữ liệu bắt buộc xuất hiện trong error report.
- [ ] Duplicate trong file hoặc duplicate với dữ liệu active bị phát hiện theo identity policy.
- [ ] Retry cùng file/checksum không tạo version hoặc guest entry trùng.
- [ ] Worker crash sau DB commit vẫn xử lý event qua outbox sau khi chạy lại.
- [ ] Scanner manifest chỉ nhận guest entry từ version đã publish.
- [ ] User ngoài organization không thể upload guest list cho concert.

## Tài liệu thiết kế liên quan

- `blueprint/04-database-design.md`
- `blueprint/05-business-flows.md`
- `blueprint/06-access-control.md`
- `blueprint/08-requirements.md`
- `blueprint/core-design-decisions/guest-list-csv-import.md`
