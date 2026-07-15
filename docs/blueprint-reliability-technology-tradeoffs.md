# So Sánh Công Nghệ Và Trade-Off Cho Reliability & Operations

## 1. Mục tiêu

Tài liệu này giải thích tại sao phần Reliability & Operations của TicketBox chọn các công nghệ và cách giải quyết hiện tại, đồng thời so sánh với các phương án thay thế.

Phạm vi tương ứng với phần review của `@Nhp125`:

- Kiểm soát tải đột biến, waiting room, rate limit và bot protection.
- Payment circuit breaker, retry, idempotency và reconciliation.
- Cache, invalidation và transactional outbox.
- Offline check-in và đồng bộ conflict.
- Guest list CSV import.
- AI Artist Bio.
- Message queue, retry, DLQ và observability.

Tiêu chí lựa chọn:

1. Đúng yêu cầu nghiệp vụ và không phá invariant tiền/vé/check-in.
2. Có thể triển khai, kiểm thử và demo trong đồ án môn học.
3. Chi phí dịch vụ bằng `0` hoặc dùng phần mềm mã nguồn mở.
4. Không tạo độ phức tạp production không cần thiết cho MVP.
5. Có đường nâng cấp khi tải hoặc phạm vi hệ thống tăng.

## 2. Tóm tắt quyết định

| Bài toán | Lựa chọn hiện tại | Lý do chính |
|---|---|---|
| Rate limit | Token bucket với Redis | Cho phép burst nhỏ, counter atomic, dùng chung nhiều instance |
| Flash-sale admission | Waiting room tối giản + signed sale token | Làm phẳng write traffic trước khi chạm database |
| Backpressure | Bounded concurrency/queue + `429/503` | Không nhận tải vượt khả năng xử lý |
| Bot protection | Nhiều lớp, CAPTCHA theo rủi ro | Một cơ chế đơn lẻ không đủ; giảm ảnh hưởng người dùng thật |
| Payment failure | Circuit breaker + bulkhead + reconciliation | Cô lập gateway lỗi và xử lý trạng thái thanh toán chưa chắc chắn |
| Idempotency | PostgreSQL durable record, Redis cache | Không mất dedupe khi Redis restart hoặc TTL hết |
| Public read cache | Redis cache-aside + TTL/invalidation | Dễ triển khai, database vẫn là source of truth |
| Event consistency | Transactional outbox | Không mất event sau khi database commit |
| Async jobs | RabbitMQ + retry queue + DLQ | Phù hợp workflow, routing và retry nghiệp vụ |
| Offline scanner | Expo/React Native + AsyncStorage + signed manifest | Truy cập camera trực tiếp, vẫn hoạt động khi mất mạng |
| Check-in sync | Event id + per-event ACK + backend conflict | Retry an toàn và không xóa dữ liệu trước ACK |
| CSV import | Async staging + all-or-nothing version publish | File lỗi không làm hỏng guest list đang dùng |
| File storage | MinIO hoặc filesystem adapter cho demo | Không làm PostgreSQL phình lớn, chạy local miễn phí |
| AI execution | Async worker + Ollama model nhỏ | Không chặn API và không phụ thuộc API trả phí |
| Observability | Structured log + metrics thiết yếu | Đủ kiểm chứng mà không cần full production stack |

## 3. Kiểm soát tải đột biến

### 3.1 Thuật toán rate limit

| Phương án | Ưu điểm | Nhược điểm | Đánh giá |
|---|---|---|---|
| Fixed window | Dễ cài, ít state | Có burst gấp đôi ở ranh giới cửa sổ | Không chọn cho endpoint giữ vé |
| Sliding log | Chính xác | Tốn bộ nhớ theo số request | Quá nặng cho flash sale |
| Sliding window counter | Khá chính xác, ít state hơn log | Phức tạp hơn fixed window | Phù hợp nếu cần limit mượt hơn |
| Token bucket | Cho phép burst có kiểm soát, refill đều | Cần atomic update và cấu hình capacity/refill | **Được chọn** |
| Leaky bucket | Output rate rất đều | Có thể tạo queue và tăng latency | Hợp xử lý nền hơn request tương tác |

**Tại sao chọn token bucket:** người dùng thật có thể tạo một burst nhỏ khi tải trang hoặc bấm mua, nhưng không được spam liên tục. Token bucket biểu diễn đúng nhu cầu này hơn fixed window và không lưu từng request như sliding log.

**Cách triển khai đồ án:** Redis Lua script hoặc transaction atomic lưu token và thời điểm refill. Có thể limit theo IP, user và endpoint.

### 3.2 Redis so với các nơi lưu rate-limit state

| Công nghệ | Ưu điểm | Nhược điểm |
|---|---|---|
| In-memory trong NestJS | Rất đơn giản, không cần dependency | Mỗi instance có counter riêng; mất state khi restart |
| PostgreSQL | Durable, đã có sẵn | Tăng write load và lock trên database giao dịch |
| Redis | Atomic counter nhanh, TTL tự nhiên, chia sẻ giữa instance | Thêm dependency; dữ liệu có thể mất khi restart |
| API gateway managed | Ít code ứng dụng | Có thể tốn phí và phụ thuộc nhà cung cấp |

**Tại sao chọn Redis:** rate-limit state không cần durability như order/payment. Tốc độ và TTL quan trọng hơn lưu trữ lâu dài. PostgreSQL phải được dành cho transaction inventory.

**Trade-off:** Redis lỗi có thể làm mất rate-limit state. Reserve path vì vậy không được fail-open hoàn toàn; backend vẫn cần emergency concurrency limit.

### 3.3 Waiting room so với các phương án khác

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| Chỉ autoscale backend | Dễ hiểu | Scale chậm; không bảo vệ database hot row |
| Chỉ rate limit | Chặn spam | Không điều tiết đủ lượng người dùng hợp lệ |
| Nhận toàn bộ request vào queue | Không bỏ request | Tăng timeout, memory và trải nghiệm không chắc chắn |
| Waiting room + sale token | Chặn tải trước critical path, có UX chờ rõ | Thêm state, token và chính sách công bằng |
| Lottery/pre-registration | Công bằng hơn khi cầu vượt cung | Thay đổi nghiệp vụ bán vé và UX |

**Tại sao chọn waiting room:** bài toán có lượng người dùng hợp lệ lớn hơn khả năng xử lý, không chỉ có bot. Waiting room kiểm soát admission trước khi request chạm inventory.

**Phạm vi đồ án:** Redis sorted set/counter và signed token TTL ngắn. Không xây nền tảng virtual queue production hoàn chỉnh.

### 3.4 FIFO so với randomized admission

| Chính sách | Ưu điểm | Nhược điểm |
|---|---|---|
| FIFO | Dễ giải thích, người đến trước vào trước | Bot có lợi thế về tốc độ và đồng hồ/network |
| Randomized admission trong một cửa sổ | Giảm lợi thế millisecond và bot tốc độ cao | Người dùng khó dự đoán thứ tự |
| Weighted admission | Linh hoạt theo nhóm người dùng | Phức tạp và dễ bị xem là thiếu công bằng |

**Lựa chọn:** Blueprint cho phép FIFO hoặc randomized admission nhưng yêu cầu chốt trước mỗi đợt bán. Với đồ án, FIFO dễ triển khai; randomized admission có giá trị nếu nhóm muốn nhấn mạnh fairness.

### 3.5 Backpressure

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| Unbounded queue | Ít reject ban đầu | Cuối cùng cạn memory/connection và timeout hàng loạt |
| Bounded queue/concurrency | Giữ hệ thống trong capacity | Phải từ chối một số request |
| Serialize mọi reserve qua broker | Giảm lock contention | Tăng latency và phức tạp phản hồi đồng bộ |
| Database connection pool tự điều tiết | Có sẵn | Quá muộn; request đã chiếm tài nguyên API |

**Tại sao chọn bounded admission:** từ chối sớm bằng `429/503` tốt hơn nhận request rồi thất bại sau thời gian dài. Queue qua RabbitMQ chỉ nên dùng cho ticket type cực nóng, không phải mặc định cho mọi reservation.

## 4. Bot protection và sale token

### 4.1 So sánh cơ chế

| Cơ chế | Ngăn được gì | Hạn chế |
|---|---|---|
| Rate limit theo IP | Spam thô | NAT/shared IP, bot đổi IP |
| Rate limit theo account | Spam từ một tài khoản | Bot tạo nhiều tài khoản |
| Device/session binding | Chia sẻ token, multi-account cơ bản | Quyền riêng tư, có thể giả mạo |
| CAPTCHA cho mọi người | Automation đơn giản | UX kém, vẫn có CAPTCHA-solving service |
| CAPTCHA theo risk | Giảm friction | Cần risk signal |
| WAF rules | Request độc hại phổ biến | Không nhận biết đầy đủ logic scalper |
| Signed sale token | Chặn gọi thẳng reserve endpoint | Token vẫn có thể bị đánh cắp nếu binding yếu |

**Tại sao chọn nhiều lớp:** bot có nhiều cách vượt một tín hiệu. Sale token chứng minh request đã qua admission; rate limit giảm spam; CAPTCHA chỉ dùng khi rủi ro cao để tránh làm phiền toàn bộ người dùng.

**Đồ án 0 đồng:** dùng rate limit, signed token, honeypot và CAPTCHA adapter. Cloudflare Turnstile Free có thể dùng khi deploy public nhưng không được là dependency bắt buộc của local demo.

## 5. Payment reliability

### 5.1 Circuit breaker so với retry trực tiếp

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| Retry ngay vô hạn | Dễ cài ban đầu | Retry storm, tăng nguy cơ duplicate charge |
| Retry có giới hạn | Giảm lỗi transient | Không đủ khi gateway lỗi kéo dài |
| Circuit breaker | Fail fast, cho dependency thời gian hồi phục | Có thể reject khi gateway vừa phục hồi |
| Circuit breaker + bulkhead | Cô lập cả lỗi và tài nguyên chờ | Thêm cấu hình threshold/concurrency |

**Tại sao chọn circuit breaker + bulkhead:** gateway payment là external dependency chậm và không ổn định. Circuit breaker giảm request vô ích; bulkhead ngăn payment call chiếm hết connection/thread của public API.

### 5.2 Reconciliation so với tin callback

| Nguồn trạng thái | Ưu điểm | Nhược điểm |
|---|---|---|
| Browser redirect | UX nhanh | Có thể mất, giả mạo hoặc user đóng trình duyệt |
| Webhook | Server-to-server, đáng tin hơn | Có thể trễ, lặp hoặc mất |
| Query/reconciliation | Xử lý trạng thái chưa chắc chắn | Chậm và cần scheduled worker |

**Lựa chọn:** webhook đã verify là nguồn chính; redirect chỉ cập nhật UX; reconciliation xử lý webhook mất hoặc trạng thái chưa rõ.

### 5.3 Idempotency storage

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| Chỉ Redis `SET NX` | Nhanh, đơn giản | Mất record khi restart/evict/TTL hết |
| Chỉ PostgreSQL | Durable, transaction được | Thêm query trên request path |
| PostgreSQL + Redis cache | Durable và đọc nhanh | Phức tạp hơn một storage |
| Distributed lock | Ngăn chạy đồng thời | Không lưu kết quả cũ và không đủ cho retry lâu dài |

**Tại sao chọn PostgreSQL + Redis cache:** payment idempotency cần tồn tại xuyên restart và hết TTL cache. PostgreSQL là nguồn đúng; Redis chỉ tối ưu lookup.

**Ưu điểm:** concurrent duplicate được chặn trong transaction, request cũ trả lại kết quả cũ.

**Nhược điểm:** cần schema/state `PROCESSING`, `SUCCEEDED`, `FAILED_FINAL` và cleanup policy.

## 6. Caching

### 6.1 Cache pattern

| Pattern | Ưu điểm | Nhược điểm | Đánh giá |
|---|---|---|---|
| Cache-aside | Đơn giản, app kiểm soát key/TTL | Cache miss và invalidation do app xử lý | **Được chọn** |
| Read-through | App đơn giản hơn | Phụ thuộc cache library/platform | Không cần cho đồ án |
| Write-through | Cache luôn cập nhật cùng write | Write chậm, coupling cache với transaction | Không cần cho concert content |
| Write-behind | Write nhanh | Nguy cơ mất dữ liệu, consistency khó | Không phù hợp dữ liệu nghiệp vụ |
| Không cache | Ít thành phần | PostgreSQL chịu toàn bộ read traffic | Không đạt yêu cầu |

**Tại sao chọn cache-aside:** phù hợp dữ liệu public đọc nhiều, dễ demo và database vẫn là source of truth.

### 6.2 Redis so với reverse proxy/CDN

| Lớp | Phù hợp | Hạn chế |
|---|---|---|
| Browser cache | Static asset | Không chia sẻ giữa người dùng |
| Nginx/Varnish | Public HTTP response | Invalidation theo domain khó hơn |
| CDN/edge cache | Chặn traffic xa backend | Có thể phụ thuộc gói dịch vụ ngoài |
| Redis | Object/read model trong backend | Request vẫn phải vào backend |

**Lựa chọn:** bản demo bắt buộc dùng Redis. Nginx hoặc CDN là lớp bổ sung, không cần dùng đồng thời Nginx và Varnish.

### 6.3 Invalidation

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| Chỉ TTL | Rất đơn giản, tự hồi phục | Dữ liệu stale đến hết TTL |
| Xóa cache trực tiếp sau DB commit | Nhanh | Process crash có thể bỏ lỡ invalidation |
| Publish event trực tiếp | Tách worker | Có khoảng trống DB commit/event publish |
| Transactional outbox | Không mất ý định publish | Thêm bảng và polling worker |
| CDC/Debezium | Tự động bắt thay đổi DB | Hạ tầng nặng cho đồ án |

**Tại sao chọn transactional outbox:** cung cấp tính nhất quán đủ mạnh mà chỉ cần PostgreSQL và worker hiện có. Debezium/Kafka giải quyết bài toán lớn hơn nhưng không phù hợp ngân sách tài nguyên và thời gian.

### 6.4 Cache failure

| Cách xử lý | Ưu điểm | Nhược điểm |
|---|---|---|
| Fallback DB không giới hạn | Tăng availability ngắn hạn | Có thể làm sập PostgreSQL |
| Fail toàn bộ | Bảo vệ DB | Public page mất hoàn toàn |
| Stale-if-error + bounded fallback | Cân bằng availability và bảo vệ DB | Có thể trả dữ liệu cũ hoặc `503` |

**Lựa chọn:** stale public data, request coalescing và query budget. Checkout vẫn luôn kiểm tra inventory trong PostgreSQL.

## 7. Message broker, retry và DLQ

### 7.1 RabbitMQ so với lựa chọn khác

| Công nghệ | Ưu điểm | Nhược điểm | Phù hợp TicketBox |
|---|---|---|---|
| RabbitMQ | Routing, ACK, retry/DLQ rõ, dễ chạy Docker | Throughput/replay analytics kém Kafka | **Phù hợp nhất** |
| Kafka | Throughput cao, replay/event log tốt | Vận hành nặng, consumer semantics phức tạp | Quá mức cho MVP |
| NATS JetStream | Nhẹ, nhanh | Hệ sinh thái workflow/DLQ ít quen thuộc hơn | Có thể thay thế |
| Redis Streams | Tận dụng Redis, đơn giản hạ tầng | Redis vừa cache vừa broker tăng blast radius | Không ưu tiên |
| PostgreSQL job table | Không cần broker | Polling/locking, throughput hạn chế | Tốt cho bản tối giản |
| BullMQ | API TypeScript tốt, chạy trên Redis | Phụ thuộc Redis và không phải broker domain event đầy đủ | Hợp background job nhỏ |

**Tại sao chọn RabbitMQ:** hệ thống có nhiều workflow cần ACK, retry và DLQ như notification, CSV, AI và reconciliation. RabbitMQ thể hiện các khái niệm này rõ và chạy miễn phí bằng một container.

**Khi nên chọn PostgreSQL job table/BullMQ:** nếu nhóm cần giảm dependency và chỉ có ít job. Tuy nhiên Blueprint hiện đã dùng RabbitMQ cho nhiều luồng, đổi sang giải pháp khác sẽ giảm tính nhất quán tài liệu.

### 7.2 Retry strategy

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| Immediate retry | Phục hồi nhanh lỗi chớp nhoáng | Tạo tải lặp khi dependency đang lỗi |
| Fixed delay | Dễ dự đoán | Nhiều worker retry cùng lúc |
| Exponential backoff | Giảm tải dần | Có thể chờ lâu |
| Backoff + jitter | Tránh retry đồng loạt | Khó dự đoán thời điểm chính xác |

**Lựa chọn:** exponential backoff có jitter, số lần tối đa và DLQ. Poison message không retry như lỗi transient.

## 8. Offline check-in

### 8.1 PWA so với mobile app

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| PWA + IndexedDB | Cài nhanh qua trình duyệt | Camera/storage/background API tùy trình duyệt |
| React Native/Expo | Native API và storage tốt hơn, phù hợp thiết bị soát vé | Thêm toolchain và quy trình build mobile |
| Native Android/iOS | Kiểm soát thiết bị tốt nhất | Chi phí phát triển cao nhất |
| Chỉ web online | Đơn giản | Không đáp ứng yêu cầu mất mạng |

**Tại sao chọn React Native/Expo:** scanner cần camera và local storage ổn định trên thiết bị chuyên dụng. Expo vẫn giữ stack TypeScript, còn AsyncStorage đủ cho manifest và queue của bản demo.

### 8.2 AsyncStorage so với SQLite

| Storage | Ưu điểm | Nhược điểm |
|---|---|---|
| AsyncStorage | API đơn giản, tích hợp React Native tốt | Key-value, cần tự serialize và không có query phức tạp |
| SQLite native | Query và transaction tốt, phù hợp dữ liệu lớn | Thêm dependency và migration schema |

**Tại sao chọn AsyncStorage:** implementation hiện tại cần persistence key-value cho manifest, assignment và queue, chưa cần query phức tạp. Có thể chuyển SQLite khi dữ liệu hoặc yêu cầu transaction local tăng.

### 8.3 Xác minh offline

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| QR chỉ chứa ticket id | QR nhỏ | Offline không biết vé hợp lệ |
| QR chứa toàn bộ dữ liệu không ký | Offline đọc được | Dễ giả mạo |
| Signed QR + manifest | Kiểm tra chữ ký, event/zone và revoke snapshot | Manifest có thể stale |
| Online lookup mọi scan | Trạng thái mới nhất | Không hoạt động khi mất mạng |

**Lựa chọn:** signed QR và signed manifest theo event/gate/zone. Backend vẫn quyết định conflict cuối cùng khi sync.

### 8.4 Sync conflict

Không có công nghệ nào ngăn tuyệt đối hai thiết bị hoàn toàn offline cùng chấp nhận một vé. Các lựa chọn thực tế:

| Cách giảm rủi ro | Ưu điểm | Nhược điểm |
|---|---|---|
| Phân vùng gate/zone | Giảm khả năng cùng vé đến hai scanner | Giảm linh hoạt vận hành |
| Local checked-in set | Chặn trùng trên cùng device | Không chia sẻ giữa device |
| Device-to-device mesh | Chia sẻ trạng thái cục bộ | Rất phức tạp và khó tin cậy |
| Sync thường xuyên | Thu hẹp cửa sổ conflict | Phụ thuộc mạng |

**Lựa chọn:** local set + gate assignment + sync idempotent. Event sync đầu tiên được accepted; event sau conflict và được giữ để xử lý.

## 9. Guest list CSV

### 9.1 Đồng bộ hay bất đồng bộ

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| Import trong HTTP request | Dễ triển khai | Timeout, chiếm API worker, retry khó |
| Scheduled/async worker | Cô lập tải, retry được | Dữ liệu xuất hiện chậm hơn |
| Database bulk load trực tiếp | Nhanh | Validation/audit khó, nguy cơ dữ liệu dở dang |

**Tại sao chọn async worker:** file được gửi ban đêm và không yêu cầu phản hồi tức thời. Reliability quan trọng hơn latency.

### 9.2 Ghi trực tiếp so với staging/version

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| Upsert trực tiếp production | Ít bảng | Batch lỗi để lại trạng thái một phần |
| Bỏ dòng lỗi, nhập dòng đúng | Có dữ liệu sớm | Guest list thiếu mà khó nhận biết |
| Staging + all-or-nothing | Version nhất quán, audit rõ | Phải sửa và gửi lại cả file |
| Staging + threshold | Linh hoạt | Policy phức tạp và khó giải thích |

**Lựa chọn:** all-or-nothing vì guest list quyết định quyền vào cổng. Một version đầy đủ, đã kiểm tra dễ vận hành hơn danh sách thiếu âm thầm.

### 9.3 File storage

| Công nghệ | Ưu điểm | Nhược điểm |
|---|---|---|
| PostgreSQL bytea | Transaction cùng DB | DB phình lớn, backup nặng |
| Local filesystem | Nhẹ, dễ demo | Khó scale và không bền khi container thay |
| MinIO | API S3, version/lifecycle, chạy local | Thêm container và cấu hình |
| Cloud object storage | Managed, bền | Có thể phát sinh phí/quota |

**Lựa chọn:** MinIO cho kiến trúc; filesystem adapter được chấp nhận cho demo nhẹ. Không lưu file lớn trong PostgreSQL.

## 10. AI Artist Bio

### 10.1 Xử lý đồng bộ hay async

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| Gọi model trong upload request | UX tưởng như trực tiếp | Timeout, giữ connection, làm nghẽn API |
| Async job | Cô lập CPU/GPU và retry được | Admin phải chờ/tracking trạng thái |

**Tại sao chọn async:** PDF extraction và inference có latency không ổn định, đặc biệt khi chạy model miễn phí trên CPU.

### 10.2 Ollama/self-hosted so với cloud AI

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| Ollama model nhỏ | Không phí theo request, dữ liệu ở local | Chậm trên CPU, cần tải model |
| vLLM | Throughput GPU tốt | Quá nặng cho máy sinh viên |
| Cloud API trả phí | Chất lượng/latency tốt | Chi phí và cần secret |
| Cloud free tier | Dễ bắt đầu | Quota/chính sách có thể thay đổi |
| Rule-based summarization | Nhẹ và deterministic | Không đáp ứng đúng tính năng AI |

**Tại sao chọn Ollama:** đáp ứng yêu cầu AI thật và không phụ thuộc quota ngoài. Worker concurrency `1` và model nhỏ đổi latency lấy khả năng chạy miễn phí.

### 10.3 PDF extraction

| Công nghệ | Điểm mạnh | Điểm yếu |
|---|---|---|
| PyMuPDF | Nhanh, API tốt, hỗ trợ nhiều PDF | Thêm Python worker nếu backend TypeScript |
| Apache PDFBox | Ổn định, Java | Khác stack chính |
| pdf-parse/PDF.js | Dùng Node.js/TypeScript | Khả năng xử lý PDF phức tạp hạn chế hơn |
| Tesseract OCR | Xử lý scan image, miễn phí | Chậm và sai với layout/phông khó |

**Khuyến nghị đồ án:** bắt đầu bằng parser Node.js hoặc PyMuPDF worker. Chỉ dùng Tesseract cho PDF scan-only; OCR không nên chạy mặc định.

### 10.4 Human review

| Phương án | Ưu điểm | Nhược điểm |
|---|---|---|
| Auto-publish | Nhanh | Hallucination/nội dung sai xuất hiện công khai |
| Human review | Kiểm soát chất lượng | Thêm bước vận hành |
| Không dùng AI output trực tiếp | An toàn nhất | Giảm giá trị tính năng |

**Lựa chọn:** lưu draft và bắt buộc admin review. Artist bio không nằm trên critical path nên độ trễ này chấp nhận được.

## 11. Observability

### 11.1 Các mức triển khai

| Mức | Công nghệ | Ưu điểm | Nhược điểm |
|---|---|---|---|
| Tối thiểu | JSON log, correlation id, health endpoint | Nhẹ, dễ demo | Khó xem xu hướng |
| Đồ án khuyến nghị | Prometheus metrics + Grafana tùy chọn | Dashboard rõ, miễn phí | Thêm RAM/container |
| Production đầy đủ | OpenTelemetry + Prometheus + Loki + Tempo | Metrics/log/trace liên kết | Nặng và cấu hình phức tạp |

**Lựa chọn:** structured log và business metrics thiết yếu là bắt buộc; Prometheus/Grafana là profile tùy chọn; Loki/Tempo không bắt buộc.

**Metrics quan trọng hơn công cụ:** payment pending age, queue depth, DLQ count, cache hit ratio, rate-limit rejection và unsynced check-in age.

## 12. Lựa chọn triển khai cuối cùng cho đồ án

| Thành phần | Lựa chọn đồ án | Phương án production |
|---|---|---|
| Rate limit/waiting room | Một Redis node | Redis Sentinel/Cluster hoặc managed service |
| Queue | Một RabbitMQ node | RabbitMQ quorum cluster |
| Backend | NestJS modular monolith + worker | Tách hot modules khi có số liệu |
| Cache | Redis cache-aside | Redis HA + edge CDN |
| Outbox | PostgreSQL polling worker | CDC/Debezium nếu quy mô lớn |
| Scanner | Expo/React Native + AsyncStorage | Native build/SQLite nếu cần device control hoặc dữ liệu lớn hơn |
| File | MinIO single node/filesystem adapter | Distributed object storage |
| AI | Ollama model nhỏ, concurrency `1` | GPU inference service/vLLM |
| Monitoring | Log + health + metrics chính | Full metrics/logs/traces |
| Bot protection | Rate limit + sale token + CAPTCHA adapter | Managed bot protection/risk engine |

## 13. Kết luận

Các lựa chọn hiện tại không phải luôn là công nghệ mạnh nhất theo mọi tiêu chí. Chúng được chọn vì cân bằng tốt giữa:

- Tính đúng của dữ liệu.
- Khả năng chịu lỗi.
- Khả năng giải thích và kiểm thử.
- Chi phí dịch vụ bằng `0`.
- Khả năng chạy local.
- Đường nâng cấp lên production.

Các quyết định quan trọng nhất nên giữ là:

1. PostgreSQL là source of truth cho tiền, vé và idempotency bền vững.
2. Redis chỉ dùng cho state ngắn hạn, cache, rate limit và waiting room.
3. RabbitMQ dùng cho workflow async có retry/DLQ, không dùng để xác nhận đã giữ vé trước DB commit.
4. Transactional outbox nối database transaction với event delivery.
5. Mobile scanner offline dùng AsyncStorage, signed manifest và per-event ACK.
6. CSV publish theo version; AI luôn async và có human review.
7. Bản đồ án dùng single-node Docker Compose; cluster HA và full observability chỉ là target production.

## 14. Tài liệu liên quan

- `blueprint/05-business-flows.md`
- `blueprint/07-protection-mechanisms.md`
- `blueprint/core-design-decisions/`
- `blueprint/10-technology-stack.md`
- `docs/blueprint-reliability-zero-cost-assessment.md`
