# TicketBox Implementation Checklist

Tài liệu này đối chiếu giữa:

- đề bài trong `blueprint/project-brief-ticketbox.md`
- blueprint trong thư mục `blueprint/`
- phần cài đặt hiện có trong `src/`

Quy ước trạng thái:

- `[x]` Đã làm tương đối đầy đủ trong code
- `[~]` Đã làm một phần hoặc mới đạt mức nền tảng
- `[ ]` Chưa thấy cài đặt đầy đủ

## 1. Blueprint và tài liệu thiết kế

| Công việc | Trạng thái | Công nghệ / hiện trạng | Cần bổ sung |
|---|---|---|---|
| Tài liệu kiến trúc tổng thể | `[x]` | Bộ tài liệu `blueprint/01` đến `blueprint/10`, có system design, C4, database, flows, access control, protection mechanisms | Có thể bổ sung liên kết trực tiếp từ README gốc để người chấm mở nhanh hơn |
| Đặc tả theo tính năng | `[x]` | Có `blueprint/specs/*` cho payment, ticket purchase, offline check-in, guest list import, concert management, AI artist bio | Có thể thêm ma trận traceability từ spec sang file code/test |
| Quyết định kỹ thuật / ADR | `[x]` | Có `blueprint/core-design-decisions/*` và tài liệu trade-off trong `docs/` | Nên liên kết rõ từng ADR với module thực thi tương ứng trong `src/backend-api/src/modules` |

## 2. Nền tảng hệ thống và hạ tầng local

| Công việc | Trạng thái | Công nghệ / hiện trạng | Cần bổ sung |
|---|---|---|---|
| Backend API chạy được theo modular monolith | `[x]` | NestJS, TypeScript, Prisma, PostgreSQL, Redis, `ScheduleModule`, các module `auth`, `concert`, `inventory`, `order`, `payment`, `ticket`, `scanner`, `guest-list` | Có thể thêm module audit hoặc analytics riêng nếu muốn tách rõ vận hành |
| CSDL và migration | `[x]` | Prisma schema khá đầy đủ: user, concert, ticket type, reservation, order, payment, ticket, notification, guest list, artist bio, scanner | Chưa thấy chiến lược backup/restore hoặc script khôi phục dữ liệu |
| Hạ tầng local bằng container | `[x]` | `docker-compose.yml` cho PostgreSQL và Redis | Chưa có MinIO/container object storage đúng như blueprint; hiện file đang lưu local disk |
| README khởi chạy toàn repo | `[x]` | Có `README.md` ở root mô tả cách chạy các thành phần chính | Tiếp tục đồng bộ khi script hoặc biến môi trường thay đổi |

## 3. Audience web: xem concert, mua vé, e-ticket

| Công việc | Trạng thái | Công nghệ / hiện trạng | Cần bổ sung |
|---|---|---|---|
| Xem danh sách concert công khai | `[x]` | Next.js App Router, backend `GET /concerts`, cache đọc công khai | Có thể bổ sung skeleton/loading và test end-to-end cho luồng public |
| Xem chi tiết concert | `[x]` | Next.js server components, slug canonicalization, backend `GET /concerts/:identifier` | Nên xác nhận asset seating map thực sự được phục vụ đầy đủ trong môi trường demo |
| Chọn loại vé và checkout | `[x]` | Next.js, BFF route handlers, auth bằng HttpOnly cookie, reservation/order flow qua backend | Có thể thêm test tích hợp xuyên suốt web -> backend cho checkout thành công/thất bại |
| Xem trạng thái đơn hàng | `[x]` | Trang `/orders/[id]`, component `order-status-client`, backend `GET /orders/:id` | Có thể bổ sung timeline chi tiết hơn cho trạng thái payment/reconciliation |
| Xem e-ticket QR | `[x]` | Trang `/tickets/[id]`, QR code, ticket issuance sau payment success | Có thể bổ sung cơ chế tải vé PDF/wallet nếu muốn hoàn thiện trải nghiệm |
| Dữ liệu mock cho UI | `[~]` | Có `audience-web/src/lib/mock-data.ts` | Hiện web public đã chuyển sang backend thật; nên làm rõ mock data chỉ để tham khảo hoặc loại bỏ nếu không còn dùng |

## 4. Auth và phân quyền

| Công việc | Trạng thái | Công nghệ / hiện trạng | Cần bổ sung |
|---|---|---|---|
| Audience đăng ký / đăng nhập | `[x]` | NestJS auth module, JWT, password hashing với `scrypt`, Next.js auth proxy routes | Có thể thêm email verification / password reset nếu muốn hoàn chỉnh hơn |
| RBAC organizer / audience / scanner | `[x]` | `AuthGuard`, `RolesGuard`, role enum trong Prisma, route protection cho admin và scanner | Nên bổ sung test bao phủ nhiều hơn cho quyền truy cập theo từng role |
| Scanner authentication | `[x]` | `ScannerAuthGuard`, Bearer token + `x-device-id` | Có thể thêm rotate token / revoke device rõ hơn ở tầng UI vận hành |

## 5. Admin web và nghiệp vụ quản trị

| Công việc | Trạng thái | Công nghệ / hiện trạng | Cần bổ sung |
|---|---|---|---|
| Tạo / sửa / xóa concert | `[x]` | Admin web Next.js, backend admin controller/service, Prisma, slug generation, poster upload | Nên thêm soft delete hoặc cancel workflow riêng thay vì chủ yếu là delete |
| Cấu hình ticket type, capacity, quota, sale window | `[x]` | Admin API + Prisma transaction + inventory counter, rule chặn sửa field nhạy cảm sau khi mở bán | Có thể thêm bulk editing hoặc validation UX tốt hơn ở form |
| Upload poster concert | `[x]` | Multer memory upload, local file storage, cache invalidation | Chưa dùng object storage dùng chung; multi-replica chưa an toàn |
| Xem trạng thái notification | `[x]` | Admin page `/admin/notifications`, backend `notification_records` | Chưa có lọc, retry thủ công hoặc dashboard delivery nâng cao |
| Dashboard doanh thu / số vé bán | `[ ]` | Chưa thấy endpoint/report/dashboard chuyên cho revenue, sold/reserved/available theo góc vận hành | Cần thêm read model hoặc dashboard riêng theo concert/ticket type/payment status |
| Hủy concert / refund workflow | `[~]` | Có `ConcertStatus.canceled`, `OrderStatus.refund_required`, test late payment success -> refund_required | Chưa thấy UI/API workflow hoàn chỉnh cho cancel concert, trigger refund, gửi thông báo hàng loạt, theo dõi tiến trình refund |
| Audit log thao tác nhạy cảm | `[ ]` | Chưa thấy module/bảng audit log riêng | Cần thêm audit trail cho create/update/delete concert, ticket type, guest list, artist bio publish, scanner assignment |

## 6. Thanh toán và phát hành vé

| Công việc | Trạng thái | Công nghệ / hiện trạng | Cần bổ sung |
|---|---|---|---|
| Reservation không oversell, có TTL | `[x]` | Prisma transaction, `inventory_counters`, reservation expiry worker, per-user quota ledger | Nên có stress/load test được ghi lại trong tài liệu |
| Chống double submit / double charge | `[x]` | `IdempotencyRecord`, header `Idempotency-Key`, replay logic ở reservation/payment | Có thể bổ sung tài liệu vận hành khi bản ghi idempotency hết hạn |
| Payment provider chính | `[~]` | Có `VnpayPaymentProvider` và `MockPaymentProvider` | Chưa thấy provider MoMo thực sự dù đề bài yêu cầu VNPAY, MoMo |
| Webhook / callback / reconciliation | `[x]` | Verify webhook signature, VNPAY return/IPN, reconciliation worker, lease-based processing | Có thể thêm tài liệu mô tả rõ luồng reconcile cho người chấm |
| Circuit breaker và graceful degradation | `[x]` | Module payment resilience, circuit breaker, bulkhead, trạng thái `pending_reconciliation` | Nên có demo script hoặc README riêng để chứng minh rõ hơn khi gateway lỗi |
| Chỉ phát hành vé khi payment đã xác minh | `[x]` | Ticket issuance service chạy sau payment success đã verify | Có thể thêm kiểm thử E2E cho nhiều provider hơn nếu bổ sung MoMo |

## 7. Notification

| Công việc | Trạng thái | Công nghệ / hiện trạng | Cần bổ sung |
|---|---|---|---|
| Gửi thông báo mua vé thành công | `[x]` | Notification module, `notification_records`, in-app adapter, SMTP email adapter | Có thể thêm template đẹp hơn hoặc tệp đính kèm e-ticket trong email |
| Nhắc lịch trước 24 giờ | `[x]` | Scheduler worker tạo reminder tasks | Nên thêm cấu hình timezone/event locale rõ hơn |
| Dễ mở rộng kênh mới | `[x]` | Adapter pattern cho channel `in_app`, `email` | Chưa có adapter thật cho Zalo OA / SMS / push notification |

## 8. Scanner và check-in offline

| Công việc | Trạng thái | Công nghệ / hiện trạng | Cần bổ sung |
|---|---|---|---|
| Scanner backend API | `[x]` | NestJS scanner module, manifest signing, assignment API, sync API, conflict handling | Có thể thêm metrics endpoint/export ngoài log nội bộ |
| Scanner mobile app | `[x]` | Expo, React Native, Zustand persist, AsyncStorage, camera, queue/history/setup screens và test cho setup/scan | Cần bổ sung README riêng và kiểm thử trên thiết bị thật |
| Đồng bộ lại khi có mạng | `[x]` | Queue local, batch sync, kết quả `accepted/conflict/rejected`, idempotent replay | Có thể thêm chính sách xử lý conflict trong UI rõ hơn cho nhân sự soát vé |
| Chống check-in lặp | `[x]` | Backend lưu `CheckInEvent`, xác định `winningEventId`, manifest scope/device/assignment checks | Giới hạn offline đa thiết bị cùng lúc vẫn là accepted risk; nên nêu rõ trong demo/tài liệu |

## 9. Guest list CSV

| Công việc | Trạng thái | Công nghệ / hiện trạng | Cần bổ sung |
|---|---|---|---|
| Import CSV khách mời | `[x]` | Multer upload, parser CSV, checksum idempotency, staging tables, validation, dedupe, publish version | Có thể thêm import theo lịch tự động từ drop folder nếu muốn sát đề hơn |
| Xử lý file lỗi, dữ liệu trùng | `[x]` | `guest_entries_staging`, `guest_list_batches`, danh sách lỗi theo dòng, summary rõ ràng | Có thể thêm export báo cáo lỗi CSV cho người vận hành |
| Scanner dùng được guest list đang active | `[x]` | Guest list manifest ghép vào scanner manifest cho zone `GUEST-LIST` | Có thể bổ sung quyền quản lý guest list chi tiết hơn theo sponsor/zone |

## 10. AI Artist Bio

| Công việc | Trạng thái | Công nghệ / hiện trạng | Cần bổ sung |
|---|---|---|---|
| Upload PDF press kit | `[x]` | Admin upload, local storage, checksum idempotency | Chưa thấy malware scan như blueprint gợi ý |
| Trích xuất và xử lý nội dung | `[x]` | Worker pipeline, processor service, PDF utilities, cleaned text | Nên bổ sung tài liệu nêu rõ thư viện PDF đang dùng và giới hạn input |
| Gọi AI sinh bio và review trước publish | `[x]` | Gemini adapter + fallback/mock provider, queue worker, draft review/publish UI | Có thể thêm moderation/guardrails mạnh hơn và versioning hiển thị ra UI |

## 11. Bảo vệ hệ thống khi flash sale

| Công việc | Trạng thái | Công nghệ / hiện trạng | Cần bổ sung |
|---|---|---|---|
| Cache trang public và inventory summary | `[x]` | Redis, cache-aside, TTL cho concert list/detail và inventory summary, invalidation khi dữ liệu đổi | Có thể thêm benchmark hoặc số liệu hit ratio |
| Rate limiting | `[x]` | Custom `RateLimitGuard`, Redis counter + fallback in-memory, scope theo IP/user/device | Có thể thêm sliding window/token bucket đúng như blueprint nếu muốn chặt hơn |
| Risk checks chống bot cơ bản | `[x]` | `ReservationRiskGuard`, đánh điểm theo header/attempt/quantity | Hiện mới là heuristic cơ bản, chưa có CAPTCHA hoặc risk score nhiều tín hiệu |
| Waiting room / sale access fairness | `[~]` | Audience web đã có `sale-access-token` plumbing và waiting-room banner | Chưa thấy backend waiting-room service, cấp token, hàng đợi admission, random fairness đầy đủ |
| Bảo vệ read path khi payment lỗi | `[x]` | Payment tách khỏi public read path, circuit breaker + graceful degradation | Có thể thêm kịch bản demo được ghi tài liệu rõ ràng |

## 12. Quan sát hệ thống và readiness vận hành

| Công việc | Trạng thái | Công nghệ / hiện trạng | Cần bổ sung |
|---|---|---|---|
| Health check | `[x]` | `GET /health` | Mới chỉ trả `status: ok`, chưa kiểm tra PostgreSQL/Redis/dependencies |
| Structured logging và correlation id | `[x]` | `x-correlation-id`, structured log util, request middleware, scanner correlation middleware | Có thể chuẩn hóa log sink hoặc dashboard tập trung |
| Metrics / dashboard vận hành | `[~]` | Có metrics nội bộ cho scanner và log sự kiện payment/notification | Chưa thấy Prometheus/OpenTelemetry/metrics endpoint/dashboard thật |
| Runbook / load test / security review | `[ ]` | Chưa thấy tài liệu/runbook tổng thể trong repo `src` | Cần bổ sung load test script, checklist sale day, event day, backup/restore, security review |

## 13. Seed data và độ khớp với đề bài

| Công việc | Trạng thái | Công nghệ / hiện trạng | Cần bổ sung |
|---|---|---|---|
| Seed dữ liệu demo | `[x]` | Prisma seed cho organization, users, concerts, ticket types, inventory, poster fixtures | Nên seed thêm scanner users/devices/assignments nếu muốn demo đầy đủ event-day |
| Seed đúng bộ concert mẫu theo đề | `[~]` | Hiện seed backend dùng `TicketBox Summer Live`, `TicketBox Winter Night`, `TicketBox Reservation Test` | Đề bài yêu cầu các concert mẫu như `Anh Trai Say Hi`, `Anh Trai Vượt Ngàn Chông Gai`, `Em Xinh Say Hi`, `Chị Đẹp Đạp Gió Rẽ Sóng`; cần bổ sung đầy đủ tên, loại vé, giá và seating map tương ứng |
| Tài nguyên demo đi kèm | `[~]` | Có poster mẫu, CSV test data, PDF press kit test | Cần thống nhất lại asset storage và tài liệu chỉ rõ cách nạp các file mẫu này khi chấm |

## Tổng kết nhanh

### Những phần đã làm tốt

- `Blueprint` rất đầy đủ và bám sát đề.
- `Backend` đã có nhiều phần nghiệp vụ cốt lõi chạy thật: auth, reservation, quota, order, payment, ticket issuance, notification, guest list, AI artist bio, scanner sync.
- `Audience web` và `admin web` không còn là mock UI đơn thuần, đã nối vào backend thật cho nhiều luồng chính.
- `Offline check-in` là điểm mạnh vì có backend và mobile app offline-first.

### Những phần còn thiếu hoặc chưa khép kín

- Scanner mobile chưa có README riêng; hướng dẫn demo hiện nằm trong README tổng thể ở root.
- Chưa có `MoMo` provider thật.
- Chưa có `dashboard doanh thu / số vé bán` đúng nghĩa cho admin.
- Chưa có `cancel concert + refund workflow` hoàn chỉnh ở mức UI/API vận hành.
- `Waiting room / fairness` mới dừng ở mức partial, chưa thấy backend admission flow đầy đủ.
- `Observability`, `runbook`, `load test`, `security review`, `backup/restore` còn thiếu.
- `Seed data` chưa khớp hoàn toàn với các concert mẫu được yêu cầu trong đề.

### Ưu tiên bổ sung đề xuất

1. Bổ sung README riêng cho `scanner-mobile` và quy trình demo trên thiết bị thật.
2. Bổ sung `MoMo provider` hoặc nêu rõ phạm vi nếu chỉ demo `VNPAY + mock`.
3. Làm `admin dashboard` cho revenue / sold / reserved / available.
4. Hoàn thiện `cancel concert / refund workflow`.
5. Hoàn tất `waiting room` phía backend nếu muốn bám sát blueprint Phase 2.
6. Chuẩn hóa `seed data` theo đúng 4 concert mẫu trong đề.
