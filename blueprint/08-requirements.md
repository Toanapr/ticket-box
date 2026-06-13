# 08. Yêu cầu chức năng và phi chức năng

## Yêu cầu chức năng

### Khán giả

| Chức năng | Mô tả | Ghi chú thiết kế |
|---|---|---|
| Xem danh sách concert | Hiển thị concert sắp diễn ra, nghệ sĩ, địa điểm, thời gian, trạng thái mở bán. | Cache tại edge/Redis, invalidation khi admin cập nhật. |
| Xem chi tiết concert | Hiển thị mô tả, artist bio, sơ đồ khu vực, loại vé, giá vé, thời điểm mở bán. | Tách nội dung tĩnh khỏi inventory động. |
| Xem sơ đồ chỗ ngồi/khu vực vé | SVG tương tác theo GA, SVIP, VIP, CAT1, CAT2. | SVG lưu object storage, metadata khu vé lấy từ API. |
| Xem số vé còn lại | Hiển thị số vé còn lại theo khu gần realtime. | Không yêu cầu tuyệt đối realtime từng vé; checkout vẫn kiểm tra DB. |
| Mua vé | Chọn loại vé, số lượng, submit order. | Backend kiểm tra quota, sale window, inventory, anti-bot token. |
| Thanh toán | Redirect/deeplink qua VNPAY/MoMo và nhận kết quả. | Idempotency, timeout handling, webhook reconciliation. |
| Nhận e-ticket QR | Sau payment thành công, hệ thống phát hành e-ticket có QR. | QR chứa signed token hoặc ticket id + signature. |
| Nhận thông báo | Email/app notification khi mua thành công và nhắc trước 24 giờ. | Gửi async qua notification event, dễ mở rộng Zalo OA/SMS. |
| Xem lịch sử đơn/vé | Xem order, trạng thái thanh toán, QR ticket. | Hỗ trợ payment pending và chăm sóc khách hàng. |

### Ban tổ chức

| Chức năng | Mô tả | Ghi chú thiết kế |
|---|---|---|
| Tạo concert | Nhập tên, mô tả, nghệ sĩ, địa điểm, thời gian, trạng thái publish. | Chỉ role organizer/admin. |
| Cấu hình loại vé | Tên vé, giá, số lượng, khu vực, thời điểm mở bán. | Sau khi mở bán cần hạn chế sửa số lượng hoặc giá tùy policy. |
| Cấu hình giới hạn vé mỗi tài khoản | Ví dụ SVIP tối đa 2 vé/user, CAT1 tối đa 4 vé/user. | Enforce ở backend bằng quota ledger trong cùng transaction reservation. |
| Cập nhật concert | Sửa thông tin, hình ảnh, sơ đồ, nội dung hiển thị. | Invalidate cache sau thay đổi. |
| Hủy concert | Chuyển trạng thái canceled, dừng bán, trigger refund/notification flow. | Cần workflow riêng vì liên quan payment/refund. |
| Theo dõi doanh thu | Revenue theo concert, ticket type, payment status. | Dùng read model/analytics, không query trực tiếp OLTP lớn. |
| Theo dõi lượng vé bán ra | Sold/reserved/available theo loại vé. | Event-driven read model để dashboard nhẹ. |
| Upload PDF press kit | Upload PDF để tạo AI Artist Bio. | File vào object storage, xử lý async, admin review trước publish. |
| Quản lý guest list | Xem trạng thái import CSV, lỗi dòng, dữ liệu trùng, version đang publish. | Cần audit log vì liên quan quyền vào cổng. |

### Nhân sự soát vé

| Chức năng | Mô tả | Ghi chú thiết kế |
|---|---|---|
| Đăng nhập app soát vé | Nhân sự dùng tài khoản role scanner. | Token ngắn hạn, bind với device/event/gate nếu có thể. |
| Tải dữ liệu phục vụ offline | Tải manifest vé, guest list, revoke list theo concert, khu vực hoặc cổng. | Có version, checksum, signature, encrypted local storage. |
| Quét QR | Camera scan QR trên e-ticket. | QR kiểm tra chữ ký được cả khi offline. |
| Xác minh vé | Kiểm tra ticket hợp lệ, đúng concert, đúng cổng/khu, chưa check-in trong local state. | Online hỏi backend; offline dùng local manifest. |
| Ghi nhận check-in offline | Lưu check-in event vào durable local queue khi không có mạng. | Đây là scope bắt buộc, không phải tùy chọn. |
| Đồng bộ khi có mạng | Push batch event lên Check-in Service khi kết nối phục hồi. | Backend xử lý idempotent, trả accepted/conflict/rejected rõ ràng. |
| Xem trạng thái sync | Biết số event chưa đồng bộ, event lỗi hoặc conflict. | Quan trọng cho vận hành tại cổng. |

### Hệ thống tích hợp

| Tích hợp | Chức năng | Ghi chú thiết kế |
|---|---|---|
| VNPAY/MoMo | Tạo payment intent, redirect/deeplink, nhận webhook/callback, reconcile trạng thái. | Webhook phải verify signature, idempotent, retry-safe. |
| Email/app notification | Gửi xác nhận mua vé, e-ticket, reminder trước 24 giờ, thông báo hủy concert. | Dùng event và adapter pattern để thêm Zalo OA/SMS. |
| Import CSV guest list | Đọc file CSV từ object storage hoặc drop folder. | Validate, dedupe, staging, quarantine lỗi, publish version mới khi batch hợp lệ. |
| PDF processing | Nhận PDF press kit, extract text, clean content. | Giới hạn file size, malware scan, async processing. |
| AI model | Sinh artist bio ngắn gọn từ text đã xử lý. | Prompt template, guardrails, output review, retry/backoff. |

## Yêu cầu phi chức năng

| Nhóm | Vì sao quan trọng | Thiết kế đáp ứng |
|---|---|---|
| Scalability | Concert lớn có thể có hàng chục nghìn người truy cập trong vài phút đầu. | Edge cache, Redis, API Gateway rate limit, waiting room, queue async, warm capacity trước giờ mở bán. |
| High availability | Payment lỗi không được kéo sập trang concert, admin hoặc soát vé. | Tách read path khỏi payment path, circuit breaker, graceful degradation. |
| Fault tolerance | Webhook, queue, mobile sync và CSV import đều có thể retry hoặc lỗi giữa chừng. | Idempotency key, retry backoff, DLQ, staging/quarantine, state machine rõ ràng. |
| Security | Hệ thống có PII, payment status, QR ticket và quyền admin. | RBAC, ownership check, signed QR, encrypt at rest/in transit, secret management, audit log, file scanning. |
| Fairness | Bot/scalper có thể chiếm vé trong vài giây. | Waiting room token, randomized admission khi quá tải, rate limit account/IP/device, CAPTCHA theo risk score, sale access token TTL ngắn. |
| Consistency | Inventory hữu hạn và quota phải đúng dưới concurrent request. | Reservation/payment/ticket issuance flow, reservation TTL, transaction/conditional write, quota ledger, sweeper. |
| Performance | Public listing/detail có read traffic rất cao. | Cache static content, cache concert detail, inventory summary TTL ngắn, index và pagination. |
| Observability | Sale day cần biết lỗi payment, oversell risk, queue backlog, check-in conflict. | Structured logs, correlation id, tracing, business metrics, dashboard sale/event day. |
| Maintainability | Hệ thống sẽ mở rộng payment provider, notification channel, guest workflow và AI feature. | Domain boundary rõ, adapter interface, versioned event contract, automated tests. |
| Offline support | Sân vận động hoặc nhà thi đấu có sóng yếu. | Encrypted local DB, signed manifest theo cổng/khu, append-only check-in log, batch sync idempotent, backend conflict resolution. |
| Bot protection | Bot vừa gây bất công vừa tạo tải rác. | WAF, rate limit nhiều lớp, risk scoring, CAPTCHA theo rủi ro, device/session binding. |
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
