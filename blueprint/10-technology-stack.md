# 10. Công nghệ sử dụng

## Định hướng chính

TicketBox dùng ba Next.js application theo actor: audience web, admin web và scanner PWA. Backend là một NestJS modular monolith; REST controllers và scheduled workers chạy trong cùng process, dùng chung domain modules và Prisma transaction. Scanner Mobile/Expo tồn tại như prototype, không phải client chính của demo.

Docker Compose hiện cung cấp PostgreSQL và Redis; các application chạy bằng script riêng trong môi trường local. PostgreSQL là nguồn dữ liệu giao dịch và durable async state, Redis phục vụ cache/fixed-window rate limit, local filesystem lưu file cho demo single-writer, auth dùng JWT và RBAC. Không đưa external queue, orchestration cluster, identity provider riêng, secret manager riêng hoặc observability platform đầy đủ vào phạm vi bắt buộc.

## Phạm vi đồ án và hướng mở rộng

| Khía cạnh | Bắt buộc cho đồ án/demo | Chỉ là hướng mở rộng production |
|---|---|---|
| Backend | Một NestJS modular monolith với các domain module gọi nhau trong process. | Tách Inventory, Payment hoặc Check-in thành microservice khi có nhu cầu vận hành thực tế. |
| Runtime | Ba Next.js app và một NestJS Backend Runtime có scheduled workers trong process; Docker Compose chạy PostgreSQL/Redis. | Tách worker process, Kubernetes, autoscaling và nhiều deployment độc lập. |
| Database | Một PostgreSQL instance; outbox/job là các bảng trong cùng database. | Primary/replica, failover tự động, PITR managed, partition hoặc sharding. |
| Cache | Một Redis instance cho cache, inventory summary và fixed-window rate limit. | Redis Sentinel/Cluster và public edge cache nhiều vùng. |
| Async | Scheduled providers đọc durable payment/notification/AI/outbox state trong PostgreSQL. | Worker deployment riêng, RabbitMQ/Kafka/event streaming platform. |
| File storage | Local persistent filesystem, single backend writer. | S3/MinIO shared storage có replication/lifecycle cho multi-replica. |
| Bảo vệ traffic | Fixed-window rate limit, risk guard, DB transaction; bounded signed-token admission là hạng mục hoàn thiện. | Full virtual queue, WAF, device fingerprint, risk platform và CAPTCHA. |
| Quan sát | Structured log, correlation id, health check và metrics cơ bản. | Distributed tracing và nền tảng log/metrics/alert đầy đủ. |

Các mục ở cột production dùng để giải thích đường nâng cấp, không phải acceptance criteria của bản đồ án.

## Stack đồ án

| Thành phần | Công nghệ đề xuất | Dùng để làm gì | Vì sao phù hợp | Lưu ý triển khai |
|---|---|---|---|---|
| Audience Web App | Next.js | Web khán giả, danh sách concert, chi tiết concert, checkout, e-ticket. | Hỗ trợ SSR/SSG, routing tốt, tối ưu cache và SEO cho trang public. | Không cache dữ liệu user/payment; public inventory có thể stale ngắn. |
| Admin Web App | Next.js | Dashboard ban tổ chức, quản lý concert, upload PDF/CSV, báo cáo. | Dùng chung TypeScript, design system và auth flow với audience web. | Tách route và guard quyền rõ nếu cùng codebase với audience web. |
| Scanner Web/PWA App | Next.js PWA | Quét QR, tải offline manifest, lưu check-in log cục bộ và sync. | Dễ cài qua trình duyệt/PWA, hỗ trợ camera và IndexedDB. | Không hứa chặn tuyệt đối double-scan giữa hai thiết bị cùng offline; backend reconcile khi sync. |
| Backend framework | NestJS | REST API, domain modules, scheduled workers và integration adapters trong một runtime. | Đồng nhất TypeScript với Next.js, DI/module rõ, phù hợp modular monolith. | Worker deployment riêng chỉ khi cần scale; không gọi HTTP nội bộ. |
| Database | PostgreSQL | Concert, ticket type, reservation, order, payment, ticket, check-in, guest list, audit. | Transaction mạnh, lock/constraint rõ, query/reporting tốt. | Checkout luôn kiểm tra DB; cache không là nguồn quyết định vé. |
| Cache/rate limit | Redis single instance | Concert cache, inventory summary TTL ngắn và fixed-window counters theo IP/user/device. | Đủ để chứng minh cache-aside và overload protection. | Redis lỗi dùng bounded DB miss budget và in-memory rate fallback. |
| Async processing | `@nestjs/schedule` + durable PostgreSQL records | Reservation expiry, notification, payment reconciliation và AI jobs. | Khớp code, ít vận hành; dùng lease/retry/idempotency theo từng loại job. | Ticket issuance chạy trong payment transaction; notification retry còn tối giản; CSV xử lý trong request. |
| File storage | Local persistent filesystem | Lưu poster, PDF press kit và raw CSV. | Khớp demo single-writer và không thêm service mới. | Backup cùng database; chuyển S3/MinIO trước khi chạy nhiều backend replica. |
| Authentication/Authorization | NestJS JWT + RBAC | Đăng nhập, phân quyền audience/organizer/scanner/admin. | Đã có guard, password hashing và BFF cookie/proxy ở web apps. | Scanner bổ sung `x-device-id` và database assignment check. |
| Secrets/config | `.env` + config validation | DB URL, Redis URL, payment secret, AI key, JWT secret. | Đơn giản, phù hợp local và đồ án. | Không commit secret; validate config khi app start. |
| Monitoring cơ bản | Structured logs + health checks + metrics endpoint | Theo dõi request, order/payment/ticket/check-in, pending/failed job count cơ bản. | Đủ để debug demo và load test nhỏ. | Chuẩn hóa correlation id, order_id, payment_id, ticket_id trong log. |
| PDF parser/OCR | Node PDF parser cho PDF text-based | Thay implementation regex tối giản hiện tại mà không đổi AI pipeline. | Giữ một runtime TypeScript và tăng độ tin cậy với compressed/font-encoded PDF. | OCR/Tesseract không bắt buộc cho demo. |
| AI model integration | AI adapter configurable hoặc mock provider cho local | Tạo draft AI Artist Bio từ text đã làm sạch. | Giữ đúng kiến trúc async mà không cần GPU/local LLM nặng. | AI lỗi không ảnh hưởng concert page/checkout; admin review trước khi publish. |
| Email/App notification | SMTP adapter hoặc in-app notification store | Gửi e-ticket, reminder, thông báo hủy trong app/web. | Dễ demo và test hơn tự vận hành mail server. | Có thể log email trong local dev thay vì gửi thật. |

## Modular monolith hay microservices?

Lựa chọn cho đồ án là modular monolith backend có module boundary rõ; scheduled workers hiện là providers trong cùng Backend Runtime. Việc tách worker hoặc module nóng thành deployment độc lập chỉ được xem xét khi có dữ liệu tải hay nhu cầu vận hành thực tế.

| Hướng | Ưu điểm | Nhược điểm | Khi nên dùng |
|---|---|---|---|
| Modular monolith | Transaction đơn giản hơn, dev nhanh, deploy ít phức tạp, dễ debug. | Scale theo toàn app, boundary dễ bị phá nếu thiếu discipline. | Giai đoạn đầu/MVP, team nhỏ, domain còn thay đổi. |
| Microservices đầy đủ | Scale độc lập, team ownership rõ, fault isolation tốt hơn. | Distributed transaction, monitoring, triển khai và versioning phức tạp hơn. | Khi đã có tải lớn, nhiều team, module Inventory/Payment/Check-in cần scale độc lập. |
| Hybrid | API chính là modular monolith, worker và hot path tách dần. | Cần quản lý contract giữa module/service. | Hướng mở rộng sau đồ án khi đã có dữ liệu tải và nhu cầu scale độc lập. |

## Trade-off self-hosted/container-based

| Tiêu chí | Lợi ích | Rủi ro/chi phí | Cách giảm rủi ro |
|---|---|---|---|
| Kiểm soát hạ tầng | Chủ động cấu hình networking, data locality, version, scaling. | Team phải chịu trách nhiệm vận hành nhiều thành phần. | Dùng Docker Compose và runbook tối giản. |
| Chi phí | Dễ chạy local và demo bằng container OSS. | Khi production, vẫn phải trả chi phí node, DB/cache kể cả lúc ít traffic. | Chỉ scale stateless workload khi cần; capacity planning theo concert campaign. |
| Chống lock-in | Dùng công nghệ OSS, dễ chuyển môi trường. | Tự tích hợp nhiều mảnh ghép hơn. | Chuẩn hóa qua SQL, Redis, S3-compatible API và log/metrics có cấu trúc. |
| Hiệu năng | Process ứng dụng luôn warm, latency ổn định hơn serverless cold start. | Spike có thể làm nghẽn node/DB/cache hoặc scheduled-job backlog. | Chứng minh bằng Redis cache, fixed-window rate limit, miss budget và transaction ngắn. |
| Consistency | PostgreSQL transaction giúp reservation/payment dễ kiểm soát. | Hot row inventory có thể nghẽn dưới concurrent write lớn. | Row-level lock, quota ledger, risk/rate protection; bounded admission là hardening bổ sung. |
| Vận hành sự kiện | Có thể build dashboard và runbook sát nhu cầu mở bán/ngày diễn. | Cần trực ca, alert, backup/restore nếu chạy thật. | Giữ ở mức dashboard, log, health check và hướng dẫn vận hành cơ bản. |
