# 08. Yêu cầu chức năng và phi chức năng

## Yêu cầu chức năng

### Khán giả

| Chức năng | Mô tả | Ghi chú thiết kế |
|---|---|---|
| Xem danh sách concert | Hiển thị concert sắp diễn ra, nghệ sĩ, địa điểm, thời gian, trạng thái mở bán. | Backend chỉ trả concert có `status = published` và `start_at >= current_time`; cache tại edge/Redis, invalidation khi admin cập nhật. |
| Xem chi tiết concert | Hiển thị mô tả, artist bio, sơ đồ khu vực, loại vé, giá vé, thời điểm mở bán. | Backend chỉ trả concert có `status = published`; concert không tồn tại hoặc không ở trạng thái `published` trả `404 Not Found`; tách nội dung tĩnh khỏi inventory động. |
| Xem sơ đồ chỗ ngồi/khu vực vé | SVG tương tác theo GA, SVIP, VIP, CAT1, CAT2. | Demo dùng asset/local file key, metadata khu vé lấy từ API; object storage là hướng multi-replica. |
| Xem số vé còn lại | Hiển thị số vé còn lại theo khu gần realtime. | Không yêu cầu tuyệt đối realtime từng vé; checkout vẫn kiểm tra DB. |
| Mua vé | Chọn loại vé, số lượng, submit order. | Backend kiểm tra auth, rate/risk policy, quota, sale window và inventory; sale admission token được kiểm tra khi hardening này được bật. |
| Thanh toán | Redirect/deeplink qua VNPAY/MoMo và nhận kết quả. | Idempotency, timeout handling, webhook reconciliation. |
| Nhận e-ticket QR | Sau payment thành công, hệ thống phát hành e-ticket có QR. | QR chứa signed token hoặc ticket id + signature. |
| Nhận thông báo | Email/app notification khi mua thành công và nhắc trước 24 giờ. | Gửi async qua notification event, dễ mở rộng Zalo OA/SMS. |
| Xem lịch sử đơn/vé | Xem order, trạng thái thanh toán, QR ticket. | Hỗ trợ payment pending và chăm sóc khách hàng. |

### Ban tổ chức

| Chức năng | Mô tả | Ghi chú thiết kế |
|---|---|---|
| Tạo concert | Nhập tên, mô tả, nghệ sĩ, địa điểm, thời gian, trạng thái publish. | Chỉ role organizer/admin. |
| Cấu hình loại vé | Tên vé, giá, số lượng, khu vực, thời điểm mở bán. | Sau khi mở bán cần hạn chế sửa số lượng hoặc giá. Chỉ organizer/admin; khi tạo ticket type, backend phải tạo inventory counter tương ứng theo `04-database-design.md`.|
| Cập nhật loại vé | Cập nhật thông tin loại vé trước khi bắt đầu mở bán. | Trong Phase 1, không cho phép sửa `capacity`, `price`, `per_user_limit`, `zone_code`, `sale_start_at` hoặc `sale_end_at` sau khi thời điểm mở bán bắt đầu. Nếu vi phạm, API trả `409 Conflict`. |
| Cấu hình giới hạn vé mỗi tài khoản | Ví dụ SVIP tối đa 2 vé/user, CAT1 tối đa 4 vé/user. | Enforce ở backend bằng quota ledger trong cùng transaction reservation. |
| Cập nhật concert | Sửa thông tin, hình ảnh, sơ đồ, nội dung hiển thị. | Invalidate cache sau thay đổi. |
| Hủy concert | Chuyển trạng thái canceled, dừng bán, trigger refund/notification flow. | Cần workflow riêng vì liên quan payment/refund. |
| Theo dõi doanh thu | Revenue theo concert, ticket type, payment status. | Demo dùng PostgreSQL aggregate có index và phân quyền theo organization; read model là hướng production. |
| Theo dõi lượng vé bán ra | Sold/reserved/available theo loại vé. | Đọc inventory counters và order/payment summary trực tiếp cho dashboard đồ án. |
| Upload PDF press kit | Upload PDF để tạo AI Artist Bio. | File vào local persistent storage, tạo durable job, scheduled worker xử lý và organizer review trước publish. |
| Quản lý guest list | Xem trạng thái import CSV, lỗi dòng, dữ liệu trùng, version đang publish. | Cần audit log vì liên quan quyền vào cổng. |

### Nhân sự soát vé

| Chức năng | Mô tả | Ghi chú thiết kế |
|---|---|---|
| Đăng nhập app soát vé | Nhân sự dùng tài khoản role scanner. | Token ngắn hạn, bind với device/event/gate nếu có thể. |
| Tải dữ liệu phục vụ offline | Tải manifest vé, guest list, revoke list theo concert, khu vực hoặc cổng. | Có version, checksum, signature và IndexedDB durable storage; application-level encryption/public-key verification là security hardening còn lại. |
| Quét QR | Camera scan QR trên e-ticket. | QR kiểm tra chữ ký được cả khi offline. |
| Xác minh vé | Kiểm tra ticket hợp lệ, đúng concert, đúng cổng/khu, chưa check-in trong local state. | Online hỏi backend; offline dùng local manifest. |
| Ghi nhận check-in offline | Lưu check-in event vào durable local queue khi không có mạng. | Đây là scope bắt buộc, không phải tùy chọn. |
| Đồng bộ khi có mạng | Push batch event lên Check-in Module qua Backend API khi kết nối phục hồi. | Backend xử lý idempotent, trả accepted/conflict/rejected rõ ràng. |
| Xem trạng thái sync | Biết số event chưa đồng bộ, event lỗi hoặc conflict. | Quan trọng cho vận hành tại cổng. |

### Hệ thống tích hợp

| Tích hợp | Chức năng | Ghi chú thiết kế |
|---|---|---|
| VNPAY/MoMo | Tạo payment intent, redirect/deeplink, nhận webhook/callback, reconcile trạng thái. | Webhook phải verify signature, idempotent, retry-safe. |
| Email/app notification | Gửi xác nhận mua vé, e-ticket, reminder trước 24 giờ, thông báo hủy concert. | Dùng event và adapter pattern để thêm Zalo OA/SMS. |
| Import CSV guest list | Organizer upload full-snapshot CSV nhận từ nhãn hàng. | Checksum idempotency, staging, dedupe trong file, batch error report và all-or-nothing active version publish. |
| PDF processing | Nhận PDF press kit, extract text, clean content. | Giới hạn file size/type, lưu bằng server-generated key và xử lý async; antivirus/OCR là hướng mở rộng. |
| AI model | Sinh artist bio ngắn gọn từ text đã xử lý. | Prompt template, guardrails, output review, retry/backoff. |

## Yêu cầu phi chức năng

| Nhóm | Vì sao quan trọng | Thiết kế đáp ứng |
|---|---|---|
| Scalability | Concert lớn có thể có hàng chục nghìn người truy cập trong vài phút đầu. | Redis cache-aside, fixed-window multi-scope rate limit, risk guard, transaction ngắn và bounded admission cho concert hot. Demo kiểm chứng bằng scaled load profile, không tuyên bố một máy phục vụ toàn bộ 80.000 user. |
| Failure isolation | Payment lỗi không được kéo sập trang concert, admin hoặc soát vé; single-instance demo không tuyên bố high availability hạ tầng. | Tách read path khỏi payment path, circuit breaker, bulkhead và graceful degradation. |
| Fault tolerance | Webhook, scheduled worker, scanner sync và CSV request đều có thể retry hoặc lỗi giữa chừng. | Idempotency key, processing lease/backoff, failed state, staging/transaction và state machine rõ ràng. |
| Security | Hệ thống có PII, payment status, QR ticket và quyền admin. | RBAC, ownership/device assignment, signed QR, provider signature, password hashing, config/secret hygiene và structured logs; durable audit log, local encryption và antivirus là hardening còn lại. |
| Fairness | Bot/scalper có thể chiếm vé trong vài giây. | Đồ án dùng rate limit account/IP/device, risk checks, quota transaction và bounded signed-token admission; full virtual queue, randomized admission và CAPTCHA là hướng mở rộng. |
| Consistency | Inventory hữu hạn và quota phải đúng dưới concurrent request. | Reservation/payment/ticket issuance flow, reservation TTL, transaction/conditional write, quota ledger, sweeper. |
| Performance | Public listing/detail có read traffic rất cao. | Cache static content, cache concert detail, inventory summary TTL ngắn, index và pagination. |
| Monitoring cơ bản | Sale day cần biết lỗi payment, oversell risk, pending/failed job backlog, check-in conflict. | Structured logs, correlation id, health checks, business metrics, dashboard sale/event day tối thiểu. |
| Maintainability | Hệ thống sẽ mở rộng payment provider, notification channel, guest workflow và AI feature. | Modular-monolith boundary, provider/channel adapter, durable state contract và automated tests. |
| Offline support | Sân vận động hoặc nhà thi đấu có sóng yếu. | Encrypted local DB, signed manifest theo cổng/khu, append-only check-in log, batch sync idempotent, backend conflict resolution. |
| Bot protection | Bot vừa gây bất công vừa tạo tải rác. | Đồ án chứng minh rate limit nhiều scope và chống replay sale token; risk scoring nâng cao, CAPTCHA và device fingerprint không phải acceptance criteria của demo. |
| Payment reliability | Đây là điểm dễ gây khiếu nại nhất. | Payment intent idempotent, webhook signature verification, không tin browser redirect, reconciliation job, ticket chỉ issue sau payment success đã verify. |

## Tiêu chí chấp nhận kiến trúc

- Không oversell khi nhiều request cùng mua ticket type hot.
- Không user nào vượt quota bằng request song song.
- Một payment success chỉ phát hành ticket đúng một lần.
- Notification, AI hoặc CSV lỗi không rollback checkout thành công.
- Scanner vẫn phải ghi nhận check-in tạm thời khi không có mạng và tự đồng bộ lại khi kết nối phục hồi.
- Sync check-in phải trả kết quả rõ: accepted, conflict hoặc rejected.
- Guest list CSV lỗi không làm hỏng dữ liệu production đang dùng.
- Public concert page vẫn đọc được khi payment gateway lỗi.
