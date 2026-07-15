# 1. Tài liệu thiết kế hệ thống

## Mục tiêu kiến trúc

TicketBox cần xử lý flash-sale vé concert, thanh toán không ổn định, chống bot/scalper, giới hạn vé theo tài khoản, thông báo, soát vé offline và nhập danh sách khách mời từ CSV. Vì vậy hệ thống được tổ chức thành một backend modular monolith theo domain. REST API và các scheduled worker hiện chạy trong cùng NestJS process; trạng thái bất đồng bộ bền vững được lưu bằng các bảng payment reconciliation, notification, guest-list outbox và AI job trong PostgreSQL. Redis phục vụ cache và rate limit, không phải nguồn quyết định inventory.

TicketBox số hóa toàn bộ quy trình bán vé concert từ lúc khán giả xem thông tin, chọn loại vé, thanh toán, nhận e-ticket QR, đến khi vào cổng sự kiện. Hệ thống thay thế các kênh rời rạc như Zalo OA, Google Form và chuyển khoản thủ công bằng một nền tảng có kiểm soát tồn kho vé, thanh toán, phân quyền, thông báo và soát vé.

## Nhóm người dùng và rủi ro chính

| Nhóm người dùng | Nhu cầu chính |
|---|---|
| Khán giả | Xem concert, chọn khu vé, mua vé, thanh toán, nhận QR, nhận thông báo và check-in tại cổng. |
| Ban tổ chức | Tạo concert, cấu hình vé và giới hạn mua, cập nhật/hủy sự kiện, xem doanh thu, theo dõi vé bán ra, upload press kit PDF. |
| Nhân sự soát vé | Đăng nhập app soát vé, quét QR, xác minh vé, ghi nhận check-in kể cả khi mạng yếu. |
| Hệ thống tích hợp | Payment gateway, email/app notification, CSV guest list, PDF processing và AI model. |

## Kiến trúc được chọn

Kiến trúc triển khai cho đồ án là modular monolith theo domain. Backend API và các scheduled worker dùng chung một NestJS process và gọi các module qua interface/application service; không dùng HTTP nội bộ giữa các module. Các worker xử lý reservation expiry, notification, payment reconciliation và AI job theo lịch. Đây là logical worker boundary; việc tách thành process độc lập chỉ là hướng mở rộng khi cần scale riêng.

Các luồng đọc nhiều như danh sách concert, chi tiết concert, sơ đồ chỗ ngồi và số vé còn lại được cache bằng Redis; reverse proxy/public cache là tùy chọn cho demo. Các luồng ghi quan trọng như giữ vé, tạo order, xác nhận thanh toán và check-in đi qua Backend API có idempotency và PostgreSQL transaction. Ticket được phát hành idempotent trong cùng transaction xác nhận payment; notification và các tác vụ chậm được xử lý sau qua durable records/scheduled workers.

Phạm vi bắt buộc của đồ án là ba frontend theo actor, một Backend API process có scheduled workers, một PostgreSQL instance, một Redis instance và local persistent file storage. Kubernetes, autoscaling, WAF/bot management nâng cao, Redis HA, PostgreSQL replica/failover, sharding, worker deployment riêng và việc tách module thành microservice chỉ là hướng mở rộng production, không phải tiêu chí hoàn thành bản demo. Bảng phân tách chi tiết được quản lý tại [10-technology-stack.md](10-technology-stack.md#phạm-vi-đồ-án-và-hướng-mở-rộng).

| Thành phần | Vai trò |
|---|---|
| Audience Web App | Khán giả xem concert, chọn vé, thanh toán, xem e-ticket. |
| Admin Web App | Ban tổ chức tạo/cập nhật/hủy concert, cấu hình vé, xem báo cáo, upload PDF/CSV. |
| Scanner Mobile App | Nhân sự soát vé quét QR, hoạt động offline, đồng bộ check-in. |
| Backend API | Điểm vào chính cho web/mobile, xác thực, phân quyền, rate limit và điều phối các domain module. |
| Auth Module | Quản lý đăng nhập, token, role và quyền truy cập. |
| Concert Module | Quản lý concert, venue, artist bio, seating map và nội dung public. |
| Inventory Module | Quản lý loại vé, tồn kho, reservation TTL và quota theo user. |
| Order Module | Quản lý order, state machine và liên kết reservation/payment/ticket. |
| Payment Module | Tạo payment intent, redirect/deeplink, webhook, reconciliation và idempotency. |
| Ticket Module | Phát hành e-ticket QR, ký token và lưu trạng thái vé. |
| Check-in Module | Xác minh vé, nhận sync offline, xử lý conflict và quản lý manifest. |
| Notification Module | Tạo/gửi email và app notification, reminder, mở rộng adapter Zalo OA/SMS. |
| Guest List Import Module | Đọc CSV, validate, dedupe và publish guest list version. |
| AI Artist Bio Module | Xử lý PDF, extract text, gọi AI model và lưu draft bio để review/publish. |
| Scheduled Workers | Các provider chạy trong Backend API process để xử lý expiry, notification, reconciliation và AI job theo lịch. |
| PostgreSQL | Nguồn dữ liệu giao dịch và nơi lưu durable async state/outbox records. |
| Redis | Cache concert, inventory summary và fixed-window rate-limit counter. |
| File Storage | Local persistent filesystem cho ảnh, PDF và CSV; shared object storage là hướng mở rộng. |

## Core design decisions

| Vấn đề | Quyết định thiết kế |
|---|---|
| [Tranh chấp vé cuối cùng](core-design-decisions/last-ticket-contention.md) | Không trừ vé trực tiếp từ UI. Dùng flow `reserve -> pay -> confirm`, reservation có TTL, cập nhật inventory bằng conditional write hoặc transaction. |
| [Giới hạn vé mỗi tài khoản](core-design-decisions/per-user-ticket-limit.md) | Enforce ở backend trong cùng transaction với reservation/order, không tin dữ liệu client. Dùng per-user ticket quota ledger. |
| [Tải đọc cực cao](core-design-decisions/high-read-traffic.md) | Redis cache-aside là lớp cache bắt buộc; reverse proxy/public cache là tùy chọn. Tách dữ liệu concert tương đối tĩnh khỏi số vé còn lại gần realtime. |
| [Tải trọng đột biến khi mở bán](core-design-decisions/sale-traffic-spike.md) | Cache read path, fixed-window rate limit nhiều scope, risk guard và transaction ngắn bảo vệ đường ghi. Bounded sale admission là hạng mục hardening còn lại; autoscaling là hướng production. |
| [Công bằng khi mở bán](core-design-decisions/sale-fairness.md) | Bản đồ án dùng rate limit theo account/IP/device, risk checks và quota transaction. Signed sale admission token TTL ngắn là phần bổ sung có phạm vi hẹp; full virtual queue, CAPTCHA và device fingerprint là hướng mở rộng. |
| [Payment gateway không ổn định](core-design-decisions/unstable-payment-gateway.md) | Tách public read path khỏi payment. Khi gateway timeout không chắc chắn, payment chuyển `pending_reconciliation`, order giữ `pending_payment`; circuit breaker, bulkhead, idempotency và reconciliation tránh gọi/trừ tiền hoặc phát hành vé trùng. |
| [Check-in offline](core-design-decisions/offline-check-in.md) | Scanner Mobile lưu local durable log, sync idempotent khi online. Với vé thường, ưu tiên preloaded signed ticket manifest theo cổng/khu. |
| [Guest list CSV](core-design-decisions/guest-list-csv-import.md) | Admin upload full snapshot có checksum, staging, validation và versioned publish trong transaction; file lỗi giữ batch failed, không ghi active data. |
| [AI Artist Bio](core-design-decisions/ai-artist-bio.md) | Upload PDF vào local file storage, tạo durable job, scheduled worker extract/sanitize/call AI và lưu draft để human review. |

## Cách các thành phần giao tiếp

| Kiểu giao tiếp | Dùng ở đâu | Lý do |
|---|---|---|
| HTTP/REST | Web/mobile gọi Backend API; Backend API gọi payment provider khi cần phản hồi đồng bộ. | Dễ debug, phù hợp request-response. |
| In-process module call | Auth, Concert, Inventory, Order, Payment, Ticket và Check-in phối hợp trong modular monolith. | Không thêm network hop hoặc contract phân tán không cần thiết cho đồ án. |
| PostgreSQL durable records | Notification, guest-list update, AI job và payment reconciliation. | Tách side effect chậm, retry được bằng scheduled worker và không kéo sập luồng chính. |
| Database transaction | Reservation, quota, order/payment/ticket state. | Cần consistency mạnh để không oversell và không phát hành trùng vé. |
| Cache access | Concert listing/detail, inventory summary, rate limit. | Giảm tải database dưới đọc cao. |
| Local storage mobile | Offline check-in queue và manifest. | Soát vé được khi mất mạng, sync lại sau. |

## Ranh giới module đề xuất

| Domain | Owns data | Không nên làm |
|---|---|---|
| Concert Module | Concert, venue, artist bio, seating map metadata. | Không giữ logic bán vé/payment. |
| Inventory Module | Ticket type, capacity, reservations, quota ledger. | Không gọi payment gateway trực tiếp. |
| Order Module | Order state, order items, ticket issuance trigger. | Không tự tính inventory bằng cache. |
| Payment Module | Payment intent, provider transaction, webhook, reconciliation. | Không phát hành vé trực tiếp nếu chưa qua Order/Inventory contract. |
| Check-in Module | Ticket validation status, check-in event, scanner device, guest list projection. | Không sửa order/payment. |
| Notification Module | Notification job, template, delivery result. | Không chứa business state chính. |


## Ảnh hưởng khi một phần gặp sự cố

| Thành phần lỗi | Ảnh hưởng | Cách cô lập |
|---|---|---|
| Payment gateway lỗi | Không tạo được payment URL hoặc webhook trễ; người dùng vẫn xem concert được. | Circuit breaker, bulkhead, graceful degradation, order `pending_payment`, payment `pending_reconciliation`. |
| Notification Module/worker lỗi | Không gửi email/app ngay, nhưng mua vé vẫn thành công. | Delivery chuyển `failed` và giữ error để vận hành xem; automatic retry/backoff là hardening còn lại. |
| AI Artist Bio lỗi | Không sinh được bio mới, trang concert vẫn dùng bio cũ/draft. | Xử lý async, không nằm trong checkout path. |
| CSV import lỗi | Guest list version hiện tại vẫn giữ nguyên. | Staging table, all-or-nothing publish và batch failed/validation_failed có error report. |
| Redis lỗi | Cache miss và rate limit phân tán suy giảm. | Demo dùng cache fallback DB có miss budget và rate-limit counter in-memory; Redis HA chỉ là hướng production. |
| PostgreSQL lỗi | Các luồng ghi quan trọng tạm dừng. | Demo có hướng dẫn backup/restore; replica/failover và PITR tự động chỉ là hướng production. |
| Scanner Mobile mất mạng | Scanner vẫn ghi nhận tạm thời check-in. | Signed manifest, durable local queue, idempotent sync. |
