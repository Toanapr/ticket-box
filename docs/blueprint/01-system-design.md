# 1. Tài liệu thiết kế hệ thống

## Mục tiêu kiến trúc

TicketBox cần xử lý flash-sale vé concert, thanh toán không ổn định, chống bot/scalper, giới hạn vé theo tài khoản, thông báo, soát vé offline và nhập danh sách khách mời từ CSV. Vì vậy hệ thống không nên là một website CRUD đơn giản, mà nên là kiến trúc service-oriented theo domain, có queue cho tác vụ bất đồng bộ và có cache/rate limit ở biên.

## Kiến trúc được chọn

Kiến trúc đề xuất là modular monolith có ranh giới module rõ ở giai đoạn đầu, kết hợp worker riêng cho tác vụ nền. Các module nóng như Inventory, Payment, Check-in có thể tách thành microservice khi tải hoặc quy mô team tăng.

| Thành phần | Vai trò |
|---|---|
| Audience Web App | Khán giả xem concert, chọn vé, thanh toán, xem e-ticket. |
| Admin Web App | Ban tổ chức tạo/cập nhật/hủy concert, cấu hình vé, xem báo cáo, upload PDF/CSV. |
| Scanner Mobile App | Nhân sự soát vé quét QR, hoạt động offline, đồng bộ check-in. |
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
| RabbitMQ | Domain event và background job: notification, import, AI, reconciliation. |
| Object Storage | Lưu ảnh, SVG seating map, PDF press kit, CSV guest list, ticket assets. |

## Cách các thành phần giao tiếp

| Kiểu giao tiếp | Dùng ở đâu | Lý do |
|---|---|---|
| HTTP/REST nội bộ | Request đồng bộ cần phản hồi ngay: xem concert, tạo reservation, tạo payment intent. | Dễ debug, phù hợp request-response. |
| Message queue/event | Notification, ticket issuing, CSV import, AI job, payment reconciliation. | Tách tải, retry được, không kéo sập luồng chính khi worker lỗi. |
| Database transaction | Reservation, quota, order/payment/ticket state. | Cần consistency mạnh để không oversell và không phát hành trùng vé. |
| Cache access | Concert listing/detail, inventory summary, rate limit. | Giảm tải database dưới đọc cao. |
| Local storage mobile | Offline check-in queue và manifest. | Soát vé được khi mất mạng, sync lại sau. |

## Ảnh hưởng khi một phần gặp sự cố

| Thành phần lỗi | Ảnh hưởng | Cách cô lập |
|---|---|---|
| Payment gateway lỗi | Không tạo được payment URL hoặc webhook trễ; người dùng vẫn xem concert được. | Circuit breaker, graceful degradation, order `PENDING_PAYMENT`, reconciliation. |
| Notification Service lỗi | Không gửi email/app ngay, nhưng mua vé vẫn thành công. | Queue retry, dead-letter queue, delivery log. |
| AI Artist Bio lỗi | Không sinh được bio mới, trang concert vẫn dùng bio cũ/draft. | Xử lý async, không nằm trong checkout path. |
| CSV import lỗi | Guest list version hiện tại vẫn giữ nguyên. | Staging table, validate trước publish, quarantine file lỗi. |
| Redis lỗi | Cache miss, rate limit/waiting room suy giảm. | Fallback DB có giới hạn, circuit/rate limit ở gateway, Redis HA. |
| PostgreSQL primary lỗi | Các luồng ghi quan trọng tạm dừng. | Backup/PITR, replica/failover, giảm blast radius bằng cache cho read-only. |
| Mobile app mất mạng | Scanner vẫn ghi nhận tạm thời check-in. | Signed manifest, durable local queue, idempotent sync. |

