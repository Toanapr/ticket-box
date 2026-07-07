# 1. Tài liệu thiết kế hệ thống

## Mục tiêu kiến trúc

TicketBox cần xử lý flash-sale vé concert, thanh toán không ổn định, chống bot/scalper, giới hạn vé theo tài khoản, thông báo, soát vé offline và nhập danh sách khách mời từ CSV. Vì vậy hệ thống không nên là một website CRUD đơn giản, mà nên là kiến trúc service-oriented theo domain, có worker bất đồng bộ dựa trên PostgreSQL/outbox và có cache/rate limit ở biên.

TicketBox số hóa toàn bộ quy trình bán vé concert từ lúc khán giả xem thông tin, chọn loại vé, thanh toán, nhận e-ticket QR, đến khi vào cổng sự kiện. Hệ thống thay thế các kênh rời rạc như Zalo OA, Google Form và chuyển khoản thủ công bằng một nền tảng có kiểm soát tồn kho vé, thanh toán, phân quyền, thông báo và soát vé.

## Nhóm người dùng và rủi ro chính

| Nhóm người dùng | Nhu cầu chính |
|---|---|
| Khán giả | Xem concert, chọn khu vé, mua vé, thanh toán, nhận QR, nhận thông báo và check-in tại cổng. |
| Ban tổ chức | Tạo concert, cấu hình vé và giới hạn mua, cập nhật/hủy sự kiện, xem doanh thu, theo dõi vé bán ra, upload press kit PDF. |
| Nhân sự soát vé | Đăng nhập app soát vé, quét QR, xác minh vé, ghi nhận check-in kể cả khi mạng yếu. |
| Hệ thống tích hợp | Payment gateway, email/app notification, CSV guest list, PDF processing và AI model. |

## Kiến trúc được chọn

Kiến trúc đề xuất là event-driven, service-oriented theo domain, triển khai theo hướng self-hosted/container-based trên Docker và Kubernetes. Ở giai đoạn đầu, backend nên bắt đầu bằng modular monolith có module boundary rõ, kết hợp worker process riêng cho tác vụ bất đồng bộ. Khi traffic hoặc team size tăng, các module nóng như Inventory, Payment và Check-in có thể tách thành service độc lập.

Các luồng đọc nhiều như danh sách concert, chi tiết concert, sơ đồ chỗ ngồi và số vé còn lại được phục vụ qua edge cache, Redis và read model. Các luồng ghi quan trọng như giữ vé, tạo order, xác nhận thanh toán và check-in đi qua backend API có idempotency, transaction và outbox/polling worker để đảm bảo tính nhất quán.

| Thành phần | Vai trò |
|---|---|
| Audience Web App | Khán giả xem concert, chọn vé, thanh toán, xem e-ticket. |
| Admin Web App | Ban tổ chức tạo/cập nhật/hủy concert, cấu hình vé, xem báo cáo, upload PDF/CSV. |
| Scanner Web/PWA App | Nhân sự soát vé quét QR, hoạt động offline, đồng bộ check-in. |
| API Gateway / Backend API | Điểm vào chính cho web/mobile, xác thực, phân quyền, rate limit, điều phối request. |
| Auth Service / Identity Provider | Quản lý đăng nhập, token, role, MFA cho admin. |
| Concert Service | Quản lý concert, venue, artist bio, seating map, nội dung public. |
| Inventory Service | Quản lý loại vé, tồn kho, reservation TTL, quota theo user. |
| Order Service | Quản lý order, state machine, liên kết reservation/payment/ticket. |
| Payment Service | Tạo payment intent, redirect/deeplink, webhook, reconciliation, idempotency. |
| Ticket Service | Phát hành e-ticket QR, ký token, lưu trạng thái vé. |
| Check-in Service | Xác minh vé, nhận sync offline, xử lý conflict, quản lý manifest. |
| Notification Service | Gửi email/app notification, reminder, mở rộng adapter Zalo OA/SMS. |
| Guest List Import Service | Đọc CSV theo lịch, validate, dedupe, publish guest list version. |
| AI Artist Bio Service | Xử lý PDF, extract text, gọi AI model, lưu draft bio để review/publish. |
| PostgreSQL | Nguồn dữ liệu chính cho giao dịch, inventory, order, payment, ticket, check-in. |
| Redis | Cache concert, inventory summary, rate limit counter, waiting room token. |
| PostgreSQL outbox + scheduled workers | Domain event và background job: notification, import, AI, reconciliation. |
| Object Storage | Lưu ảnh, SVG seating map, PDF press kit, CSV guest list, ticket assets. |

## Core design decisions

| Vấn đề | Quyết định thiết kế |
|---|---|
| [Tranh chấp vé cuối cùng](core-design-decisions/last-ticket-contention.md) | Không trừ vé trực tiếp từ UI. Dùng flow `reserve -> pay -> confirm`, reservation có TTL, cập nhật inventory bằng conditional write hoặc transaction. |
| [Giới hạn vé mỗi tài khoản](core-design-decisions/per-user-ticket-limit.md) | Enforce ở backend trong cùng transaction với reservation/order, không tin dữ liệu client. Dùng per-user ticket quota ledger. |
| [Tải đọc cực cao](core-design-decisions/high-read-traffic.md) | Cache mạnh tại Nginx/Varnish và Redis. Tách dữ liệu chi tiết concert tương đối tĩnh khỏi số lượng vé còn lại realtime/gần realtime. |
| [Tải trọng đột biến khi mở bán](core-design-decisions/sale-traffic-spike.md) | Dùng waiting room/virtual queue để làm phẳng traffic, rate limit ở gateway/edge, concurrency limit/backpressure cho request giữ vé, autoscale và pre-warm capacity trước giờ mở bán. |
| [Công bằng khi mở bán](core-design-decisions/sale-fairness.md) | Waiting room/virtual queue, rate limit, WAF, bot score, CAPTCHA theo rủi ro, token mở bán ngắn hạn. |
| [Payment gateway không ổn định](core-design-decisions/unstable-payment-gateway.md) | Tách luồng xem concert khỏi luồng thanh toán. Khi payment gateway lỗi, public read path vẫn hoạt động qua cache/read model; checkout chuyển sang `PENDING_PAYMENT` hoặc tạm dừng có kiểm soát, dùng circuit breaker, idempotency và reconciliation để tránh trừ tiền hoặc tạo vé trùng. |
| [Check-in offline](core-design-decisions/offline-check-in.md) | Scanner PWA lưu local durable log, sync idempotent khi online. Với vé thường, ưu tiên preloaded signed ticket manifest theo cổng/khu. |
| [Guest list CSV](core-design-decisions/guest-list-csv-import.md) | Import bất đồng bộ theo batch, staging table, validation, deduplication, quarantine file lỗi, không ghi thẳng vào production table. |
| [AI Artist Bio](core-design-decisions/ai-artist-bio.md) | Upload PDF vào object storage, xử lý async bằng job table/polling worker, extract text, sanitize, gọi AI model, human review nếu cần. |

## Cách các thành phần giao tiếp

| Kiểu giao tiếp | Dùng ở đâu | Lý do |
|---|---|---|
| HTTP/REST nội bộ | Request đồng bộ cần phản hồi ngay: xem concert, tạo reservation, tạo payment intent. | Dễ debug, phù hợp request-response. |
| PostgreSQL outbox/job table | Notification, ticket issuing, CSV import, AI job, payment reconciliation. | Tách tải, retry được bằng polling worker, không kéo sập luồng chính khi worker lỗi. |
| Database transaction | Reservation, quota, order/payment/ticket state. | Cần consistency mạnh để không oversell và không phát hành trùng vé. |
| Cache access | Concert listing/detail, inventory summary, rate limit. | Giảm tải database dưới đọc cao. |
| Local storage mobile | Offline check-in queue và manifest. | Soát vé được khi mất mạng, sync lại sau. |

## Service boundary đề xuất

| Domain | Owns data | Không nên làm |
|---|---|---|
| Concert Service | Concert, venue, artist bio, seating map metadata. | Không giữ logic bán vé/payment. |
| Inventory Service | Ticket type, capacity, reservations, quota ledger. | Không gọi payment gateway trực tiếp. |
| Order Service | Order state, order items, ticket issuance trigger. | Không tự tính inventory bằng cache. |
| Payment Service | Payment intent, provider transaction, webhook, reconciliation. | Không phát hành vé trực tiếp nếu chưa qua Order/Inventory contract. |
| Check-in Service | Ticket validation status, check-in event, scanner device, guest list projection. | Không sửa order/payment. |
| Notification Service | Notification job, template, delivery result. | Không chứa business state chính. |


## Ảnh hưởng khi một phần gặp sự cố

| Thành phần lỗi | Ảnh hưởng | Cách cô lập |
|---|---|---|
| Payment gateway lỗi | Không tạo được payment URL hoặc webhook trễ; người dùng vẫn xem concert được. | Circuit breaker, graceful degradation, order `PENDING_PAYMENT`, reconciliation. |
| Notification Service lỗi | Không gửi email/app ngay, nhưng mua vé vẫn thành công. | Worker retry theo `scheduled_for`/attempt count, chuyển `failed` khi vượt giới hạn, delivery log. |
| AI Artist Bio lỗi | Không sinh được bio mới, trang concert vẫn dùng bio cũ/draft. | Xử lý async, không nằm trong checkout path. |
| CSV import lỗi | Guest list version hiện tại vẫn giữ nguyên. | Staging table, validate trước publish, quarantine file lỗi. |
| Redis lỗi | Cache miss, rate limit/waiting room suy giảm. | Fallback DB có giới hạn, circuit/rate limit ở gateway, Redis HA. |
| PostgreSQL primary lỗi | Các luồng ghi quan trọng tạm dừng. | Backup/PITR, replica/failover, giảm blast radius bằng cache cho read-only. |
| Scanner PWA mất mạng | Scanner vẫn ghi nhận tạm thời check-in. | Signed manifest, durable local queue, idempotent sync. |
