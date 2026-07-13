# Đặc tả: Import guest list CSV

## Mô tả

Tính năng import guest list CSV cho phép organizer hoặc system admin upload full snapshot khách mời theo concert, validate trong staging, dedupe, tạo summary lỗi và publish active version mới khi toàn bộ batch hợp lệ. Batch lỗi không làm hỏng version đang dùng tại cổng.

Actor chính:

- Organizer thuộc organization sở hữu concert.
- System admin khi hỗ trợ vận hành.
- Guest List Import Module, Local File Storage, PostgreSQL/outbox record và Check-in Module.

## Luồng chính

1. Organizer chọn concert thuộc organization của mình và upload CSV guest list.
2. Backend xác thực quyền, lưu raw file vào local persistent storage và tạo import batch với checksum/schema version.
3. Guest List Module đọc file trong request, parse header/delimiter/encoding theo format được hỗ trợ.
4. Module normalize identity, sponsor và các trường liên hệ.
5. Module validate từng dòng và ghi kết quả vào staging.
6. Module dedupe identity trong cùng file. Identity đã có ở version active cũ không phải lỗi vì snapshot mới thay thế version cũ.
7. Nếu toàn batch hợp lệ, module publish version mới và ghi `GuestListUpdated` trong cùng transaction.
8. Check-in Module đọc active version trực tiếp khi tạo manifest; outbox record là integration hook bền vững cho mở rộng sau.
9. Admin dashboard hiển thị batch status, summary, active version và danh sách lỗi nếu có.

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
| Identity đã tồn tại ở version active cũ | Hợp lệ; entry được tạo lại trong snapshot/version mới. |
| Request/process lỗi giữa chừng | Database transaction rollback; retry theo `(concert_id, file_checksum, schema_version)` không tạo batch/version/row trùng. |
| Process lỗi sau DB commit | Active version và `GuestListUpdated` đã cùng commit; retry trả batch cũ, không tạo version mới. |
| Batch lỗi nặng hoặc nghi ngờ file độc hại | Quarantine file và giữ nguyên dữ liệu production. |

## Ràng buộc

- Bảo mật: Chỉ organizer sở hữu concert hoặc system admin được upload/import; raw file chứa PII phải được bảo vệ và có retention rõ.
- Snapshot/all-or-nothing: Version mới chứa toàn bộ guest list và chỉ active khi toàn bộ batch hợp lệ.
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
- [ ] Duplicate trong cùng file bị phát hiện; identity lặp lại từ version trước không làm batch full snapshot thất bại.
- [ ] Retry cùng file/checksum không tạo version hoặc guest entry trùng.
- [ ] Retry sau process lỗi/timeout không tạo version hoặc guest entry trùng; committed outbox record vẫn tồn tại.
- [ ] Scanner manifest chỉ nhận guest entry từ version đã publish.
- [ ] User ngoài organization không thể upload guest list cho concert.

## Tài liệu thiết kế liên quan

- `blueprint/04-database-design.md`
- `blueprint/05-business-flows.md`
- `blueprint/06-access-control.md`
- `blueprint/08-requirements.md`
- `blueprint/core-design-decisions/guest-list-csv-import.md`
