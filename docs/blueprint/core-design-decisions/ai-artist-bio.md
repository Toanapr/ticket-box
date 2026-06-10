# AI Artist Bio

## Vấn đề

PDF press kit có thể lớn, lỗi, chứa nội dung không liên quan hoặc độc hại. PDF extraction và AI model có latency cao, có thể timeout và sinh nội dung không chính xác. Tính năng này không được ảnh hưởng checkout hoặc tự động publish nội dung sai.

## Quyết định thiết kế

- Upload PDF vào object storage thay vì lưu trực tiếp trong database.
- Kiểm tra file size, loại file và malware trước khi xử lý.
- Xử lý bất đồng bộ qua queue/workflow: extract, clean, sanitize, generate.
- Lưu trạng thái job, prompt version, model version và draft output.
- Yêu cầu admin review/edit trước khi publish.
- Khi job lỗi, trang concert tiếp tục dùng bio cũ hoặc bio thủ công.

## Lý do chọn

- Object storage phù hợp file lớn và hỗ trợ lifecycle/versioning.
- Async worker cô lập tác vụ chậm, tốn CPU/GPU khỏi API chính.
- Human review giảm rủi ro hallucination và nội dung không phù hợp.
- Job state, retry và audit giúp vận hành và tái tạo kết quả.

## Trade-off

- Bio không được tạo ngay sau upload.
- Cần vận hành worker, queue, PDF parser và có thể cần GPU.
- Human review tăng thời gian và công việc của admin.
- Lưu extracted text và AI output tạo thêm yêu cầu bảo mật, retention.

## Phương án không chọn

- **Gọi AI đồng bộ khi upload:** dễ timeout và làm nghẽn API.
- **Lưu PDF trong PostgreSQL:** làm database giao dịch phình lớn.
- **Tự động publish output AI:** nhanh nhưng rủi ro nội dung sai cao.
- **Đưa PDF thô trực tiếp cho model:** khó kiểm soát dữ liệu và chi phí token.

## Cách kiểm chứng

- Test PDF lỗi, file lớn, scan-only, nội dung độc hại và model timeout.
- Kiểm tra retry không tạo nhiều draft ngoài ý muốn.
- Xác nhận job lỗi không ảnh hưởng trang concert và checkout.

