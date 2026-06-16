# 10. Công nghệ sử dụng

## Định hướng chính

TicketBox chọn Next.js làm frontend framework thống nhất cho audience web, admin web và scanner PWA; NestJS làm backend framework thống nhất cho API và worker. Backend đi theo modular monolith có module boundary rõ, kết hợp worker bất đồng bộ cho notification, ticket issuance, payment reconciliation, CSV import và AI jobs.

Phạm vi implement chính ưu tiên stack có thể chạy được bằng Docker Compose: PostgreSQL là nguồn dữ liệu giao dịch, Redis cho cache/rate limit/waiting room, RabbitMQ cho xử lý bất đồng bộ, MinIO hoặc S3-compatible storage cho file, auth nội bộ bằng JWT/session và RBAC. Không đưa orchestration cluster, event streaming platform, identity provider riêng, secret manager riêng, lớp bảo vệ web chuyên dụng hoặc nền tảng quan sát hệ thống đầy đủ vào phạm vi công nghệ chính của đồ án.

## Stack MVP bắt buộc

| Thành phần | Công nghệ đề xuất | Dùng để làm gì | Vì sao phù hợp | Lưu ý triển khai |
|---|---|---|---|---|
| Audience Web App | Next.js | Web khán giả, danh sách concert, chi tiết concert, checkout, e-ticket. | Hỗ trợ SSR/SSG, routing tốt, tối ưu cache và SEO cho trang public. | Không cache dữ liệu user/payment; public inventory có thể stale ngắn. |
| Admin Web App | Next.js | Dashboard ban tổ chức, quản lý concert, upload PDF/CSV, báo cáo. | Dùng chung TypeScript, design system và auth flow với audience web. | Tách route và guard quyền rõ nếu cùng codebase với audience web. |
| Scanner Web/PWA App | Next.js PWA | Quét QR, tải offline manifest, lưu check-in log cục bộ và sync. | Dễ cài qua trình duyệt/PWA, hỗ trợ camera và IndexedDB. | Không hứa chặn tuyệt đối double-scan giữa hai thiết bị cùng offline; backend reconcile khi sync. |
| Backend framework | NestJS | API backend, domain modules, workers và integration adapters. | Đồng nhất TypeScript với Next.js, DI/module rõ, phù hợp modular monolith. | Giữ transaction discipline; không để module gọi chéo tùy tiện. |
| Database | PostgreSQL | Concert, ticket type, reservation, order, payment, ticket, check-in, guest list, audit. | Transaction mạnh, lock/constraint rõ, query/reporting tốt. | Checkout luôn kiểm tra DB; cache không là nguồn quyết định vé. |
| Cache/rate limit/waiting room | Redis single instance cho MVP | Concert cache, inventory summary TTL ngắn, rate limit counter, waiting room token, idempotency cache nếu phù hợp. | Đủ cho local/dev và demo tải cơ bản; dễ nâng cấp sau. | Không lưu dữ liệu cần bền vững chỉ trong Redis. |
| Message broker | RabbitMQ | Notification, ticket issuance, payment reconciliation, CSV import, AI jobs, retry/DLQ. | Routing/retry/DLQ hợp workflow nghiệp vụ và đủ nhẹ cho đồ án. | Dùng queue riêng cho job quan trọng; log rõ DLQ/retry reason. |
| Object storage | MinIO hoặc local S3-compatible storage | Lưu ảnh concert, SVG seating map, PDF press kit, CSV guest list, ticket assets. | Dễ chạy local bằng Docker Compose, API gần S3. | Có thể thay bằng S3 thật khi deploy production. |
| Authentication/Authorization | NestJS auth + JWT/session + RBAC | Đăng nhập, phân quyền audience/organizer/scanner/admin. | Đủ cho đồ án, ít vận hành hơn một identity provider riêng. | Thiết kế claims/guards rõ để sau này có thể thay auth provider. |
| Secrets/config | `.env` + config validation | DB URL, Redis URL, payment secret, AI key, JWT secret. | Đơn giản, phù hợp local và đồ án. | Không commit secret; validate config khi app start. |
| Monitoring cơ bản | Structured logs + health checks + metrics endpoint | Theo dõi request, order/payment/ticket/check-in, queue depth cơ bản. | Đủ để debug demo và load test nhỏ. | Chuẩn hóa correlation id, order_id, payment_id, ticket_id trong log. |
| PDF parser/OCR | PyMuPDF hoặc Apache PDFBox; Tesseract chỉ khi cần OCR | Extract text từ PDF press kit. | Self-hosted, chi phí thấp, đủ cho PDF text-based. | OCR là fallback, không bắt buộc nếu input PDF có text. |
| AI model integration | AI adapter configurable hoặc mock provider cho local | Tạo draft AI Artist Bio từ text đã làm sạch. | Giữ đúng kiến trúc async mà không cần GPU/local LLM nặng. | AI lỗi không ảnh hưởng concert page/checkout; admin review trước khi publish. |
| Email/App notification | SMTP adapter hoặc in-app notification store | Gửi e-ticket, reminder, thông báo hủy trong app/web. | Dễ demo và test hơn tự vận hành mail server. | Có thể log email trong local dev thay vì gửi thật. |

## Modular monolith hay microservices?

Khuyến nghị bắt đầu bằng modular monolith backend có module boundary rõ, kết hợp worker tách riêng cho tác vụ async. Khi traffic hoặc team size tăng, tách các module nóng thành service độc lập.

| Hướng | Ưu điểm | Nhược điểm | Khi nên dùng |
|---|---|---|---|
| Modular monolith | Transaction đơn giản hơn, dev nhanh, deploy ít phức tạp, dễ debug. | Scale theo toàn app, boundary dễ bị phá nếu thiếu discipline. | Giai đoạn đầu/MVP, team nhỏ, domain còn thay đổi. |
| Microservices đầy đủ | Scale độc lập, team ownership rõ, fault isolation tốt hơn. | Distributed transaction, monitoring, triển khai và versioning phức tạp hơn. | Khi đã có tải lớn, nhiều team, module Inventory/Payment/Check-in cần scale độc lập. |
| Hybrid | API chính là modular monolith, worker và hot path tách dần. | Cần quản lý contract giữa module/service. | Phù hợp nhất cho TicketBox: giảm rủi ro ban đầu nhưng vẫn có đường mở rộng. |

## Trade-off self-hosted/container-based

| Tiêu chí | Lợi ích | Rủi ro/chi phí | Cách giảm rủi ro |
|---|---|---|---|
| Kiểm soát hạ tầng | Chủ động cấu hình networking, data locality, version, scaling. | Team phải chịu trách nhiệm vận hành nhiều thành phần. | Dùng Docker Compose và runbook tối giản. |
| Chi phí | Dễ chạy local và demo bằng container OSS. | Khi production, vẫn phải trả chi phí node, DB, broker kể cả lúc ít traffic. | Chỉ scale stateless workload khi cần; capacity planning theo concert campaign. |
| Chống lock-in | Dùng công nghệ OSS, dễ chuyển môi trường. | Tự tích hợp nhiều mảnh ghép hơn. | Chuẩn hóa qua SQL, Redis, AMQP, S3-compatible API và log/metrics có cấu trúc. |
| Hiệu năng | Service luôn warm, latency ổn định hơn serverless cold start. | Nếu scale chậm, spike có thể làm nghẽn node/DB/broker. | Chứng minh bằng waiting room, rate limit, cache và transaction ngắn. |
| Consistency | PostgreSQL transaction giúp reservation/payment dễ kiểm soát. | Hot row inventory có thể nghẽn dưới concurrent write lớn. | Waiting room, short transaction, row-level lock tối ưu, partition theo ticket type/concert khi cần. |
| Vận hành sự kiện | Có thể build dashboard và runbook sát nhu cầu mở bán/ngày diễn. | Cần trực ca, alert, backup/restore nếu chạy thật. | Giữ ở mức dashboard, log, health check và hướng dẫn vận hành cơ bản. |
