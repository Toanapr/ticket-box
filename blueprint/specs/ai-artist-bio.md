# Đặc tả: AI Artist Bio

## Mô tả

Tính năng AI Artist Bio cho phép organizer upload PDF press kit, xử lý bất đồng bộ để trích xuất nội dung, sinh draft bio bằng AI, cho admin review/edit và publish bio lên trang concert. Output AI không được tự động publish và lỗi AI/PDF không được ảnh hưởng checkout hoặc trang public hiện có.

Actor chính:

- Organizer thuộc organization sở hữu concert.
- AI Artist Bio Module và PDF extractor.
- AI model provider.
- Concert Module/Public Page hiển thị bio đã publish.

## Luồng chính

1. Organizer mở concert thuộc organization của mình và upload PDF press kit.
2. Backend kiểm tra quyền, loại file/kích thước/magic bytes, sinh storage key và lưu PDF vào local persistent storage.
3. Hệ thống tạo job idempotent theo object version và pipeline version.
4. Worker extract text từ PDF, clean/sanitize/truncate nội dung đầu vào.
5. Worker gọi AI model với prompt version cố định để sinh draft artist bio ngắn gọn.
6. Hệ thống lưu job status, model/prompt version, extracted text đã xử lý và draft output.
7. Organizer xem draft, chỉnh sửa nếu cần và approve/publish.
8. Concert Module lưu bio đã publish cho concert và public page hiển thị nội dung mới.

## Kịch bản lỗi

| Tình huống | Hành vi mong đợi |
|---|---|
| Organizer không sở hữu concert | Từ chối upload, xem job hoặc publish bio. |
| File không phải PDF, quá lớn hoặc sai signature/magic bytes | Reject upload hoặc đánh dấu job failed; không tạo draft publishable. Antivirus là production extension. |
| PDF lỗi, scan-only hoặc không extract được text đủ dùng | Job failed với lý do rõ; admin có thể upload lại hoặc nhập bio thủ công. |
| Nội dung PDF quá dài | Truncate theo giới hạn pipeline và ghi nhận metadata; không gửi vượt token/budget. |
| PDF chứa prompt injection hoặc nội dung không liên quan | Xem PDF là input không tin cậy; sanitize và giữ system instruction cố định. |
| AI model timeout hoặc lỗi tạm thời | Retry giới hạn với backoff/jitter; vượt budget vào failed state để retry thủ công. |
| Worker nhận lại cùng message | Không tạo nhiều draft ngoài ý muốn và không gọi model lại nếu stage đã hoàn tất. |
| AI output không phù hợp hoặc sai | Không auto-publish; admin có thể sửa, reject hoặc upload lại. |
| Publish thất bại do conflict phiên bản | Yêu cầu reload hoặc retry với version mới; không ghi đè bio đã publish ngoài ý muốn. |
| Job lỗi sau khi concert đang có bio cũ | Public page tiếp tục dùng bio cũ hoặc bio thủ công. |

## Ràng buộc

- Bảo mật: PDF là input không tin cậy; kiểm tra file/quyền, không đưa model tool hoặc quyền publish và không để nội dung nguồn thay đổi system instruction.
- Async: Upload không chờ AI hoàn tất; xử lý qua job table/polling worker có trạng thái rõ ràng.
- Human review: Draft AI phải được organizer review/edit trước khi publish.
- Idempotency: Stage xử lý idempotent theo object version, pipeline version và job id.
- Retry: Retry có giới hạn, backoff/jitter và manual retry khi job chuyển failed.
- Audit: Lưu người upload, object key/version, job status, prompt version, model version, người publish và thời điểm publish.
- Cô lập lỗi: Lỗi PDF/AI không ảnh hưởng checkout, payment, scanner hoặc public page hiện có.
- Privacy/retention: Extracted text và draft output cần chính sách retention vì có thể chứa dữ liệu nhạy cảm.

## Tiêu chí chấp nhận

- [ ] Organizer upload PDF hợp lệ và nhận job processing bất đồng bộ.
- [ ] PDF không hợp lệ, quá lớn hoặc sai file signature không tạo draft publishable.
- [ ] Job thành công tạo draft bio kèm trạng thái review.
- [ ] Draft AI không xuất hiện trên public page trước khi organizer publish.
- [ ] Organizer có thể chỉnh sửa draft và publish bio lên concert thuộc organization của mình.
- [ ] Worker retry không tạo nhiều draft hoặc gọi model lặp lại cho stage đã hoàn tất.
- [ ] Model timeout vượt retry budget đưa job vào failed state và cho phép retry thủ công.
- [ ] Prompt injection trong PDF không làm thay đổi policy bắt buộc như human review.
- [ ] Job failed không làm mất bio đã publish trước đó và không ảnh hưởng checkout.

## Tài liệu thiết kế liên quan

- `blueprint/04-database-design.md`
- `blueprint/05-business-flows.md`
- `blueprint/06-access-control.md`
- `blueprint/08-requirements.md`
- `blueprint/core-design-decisions/ai-artist-bio.md`
