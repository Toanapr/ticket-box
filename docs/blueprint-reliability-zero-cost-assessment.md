# Đánh Giá Blueprint Reliability & Operations Với Ngân Sách 0 Đồng

## 1. Phạm vi đánh giá

Báo cáo này đánh giá phần Reliability & Operations được giao cho `@Nhp125` trong issue `#1 Review Và Hoàn Thiện TicketBox Blueprint`, bao gồm:

- `blueprint/07-protection-mechanisms.md`
- Các luồng check-in offline, CSV import, cache và AI Artist Bio trong `blueprint/05-business-flows.md`
- Các core design decision tương ứng
- Nội dung đã cập nhật trong commit `b1006e2 review: strengthen blueprint reliability and operations`

Tiêu chí bổ sung của báo cáo:

- Đây là đồ án môn học, không phải hệ thống production thực tế.
- Chi phí dịch vụ mục tiêu bằng `0`, hoặc chỉ dùng phần mềm mã nguồn mở/gói miễn phí.
- Hệ thống phải có thể clone và chạy để giảng viên kiểm tra.
- Các cơ chế được mô tả trong Blueprint cần có phiên bản cài đặt thực tế, nhưng không nhất thiết đạt quy mô 80.000 người dùng thật.

## 2. Kết luận tổng quát

**Kết luận: hợp lý về nguyên tắc thiết kế, nhưng cần phân tầng rõ giữa bản cài đặt đồ án và kiến trúc production.**

Các thay đổi trong commit `b1006e2` sửa đúng những lỗ hổng quan trọng:

- Không để hàng đợi hoặc retry tăng vô hạn.
- Không tạo giao dịch payment mới khi trạng thái cũ chưa rõ.
- Không xóa check-in local trước khi backend ACK.
- Không để cache failure dồn traffic không giới hạn vào PostgreSQL.
- Không để CSV/AI retry tạo version hoặc draft trùng.
- Thống nhất idempotency, DLQ và graceful degradation.

Những cơ chế này không đòi hỏi mua dịch vụ trả phí. Phần lớn có thể cài bằng NestJS, PostgreSQL, Redis, RabbitMQ và AsyncStorage; các dịch vụ backend chạy local qua Docker Compose.

Điểm chưa hợp lý xuất hiện nếu Blueprint bị hiểu là phải triển khai đầy đủ:

- Kubernetes production cluster.
- Redis Cluster/Sentinel.
- RabbitMQ 3-node/quorum cluster.
- MinIO distributed cluster.
- Keycloak, Vault, Argo CD.
- Prometheus, Grafana, Loki, Tempo và tracing đầy đủ.
- WAF/bot scoring/device fingerprinting production-grade.
- AI self-hosted cần GPU và OCR cho mọi loại PDF.

Các thành phần trên đều có thể là phần mềm miễn phí, nhưng vẫn có **chi phí tài nguyên, thời gian cấu hình và độ phức tạp vận hành** quá cao so với một đồ án môn học.

## 3. Mức độ phù hợp theo từng nội dung review

| Nội dung | Đánh giá | Quyết định cho đồ án |
|---|---|---|
| Rate limit token bucket | Hợp lý và đúng đề bài | Bắt buộc triển khai bằng một Redis instance |
| Waiting room/sale access token | Hợp lý nhưng dễ làm quá phức tạp | Triển khai bản tối giản bằng Redis counter/queue và signed token |
| Bot protection | Hợp lý về mục tiêu, production-grade bot score không khả thi | Dùng rate limit, token, honeypot và Cloudflare Turnstile Free nếu deploy public |
| Bounded backpressure | Rất hợp lý, chi phí triển khai thấp | Dùng semaphore/concurrency limit và trả `429/503` |
| Payment circuit breaker | Bắt buộc để đáp ứng đề bài | Triển khai trong code với payment mock hoặc VNPAY sandbox |
| Retry budget/bulkhead | Hợp lý, không cần hạ tầng trả phí | Cấu hình timeout, retry count và giới hạn concurrent payment calls |
| Durable idempotency | Rất hợp lý và quan trọng | Lưu PostgreSQL; Redis chỉ cache |
| Cache-aside và TTL | Hợp lý | Dùng một Redis instance, không cần Redis Cluster |
| Transactional outbox | Hợp lý về dữ liệu, hơi nâng cao nhưng có giá trị | Dùng bảng outbox PostgreSQL và polling worker trong cùng backend |
| Offline check-in ACK theo event | Rất hợp lý và cần thiết | Dùng AsyncStorage + explicit sync trong mobile app |
| CSV staging/all-or-nothing | Hợp lý, dễ kiểm thử | Dùng PostgreSQL staging table và transaction publish |
| AI async retry/DLQ | Hợp lý, nhưng AI local có rủi ro tài nguyên | Dùng model nhỏ qua Ollama; chấp nhận xử lý chậm |
| RabbitMQ retry/DLQ | Hợp lý nếu đã dùng broker | Dùng một RabbitMQ node với DLX/DLQ |
| Full observability stack | Quá mức cho MVP | Chỉ cần structured log, health check và vài metrics chính |

## 4. Đánh giá chi tiết

### 4.1 Waiting room, rate limit và bot protection

Thiết kế hiện tại đúng ở điểm không xem rate limit hoặc waiting room là nguồn quyết định inventory. Vé vẫn phải được giữ bằng transaction PostgreSQL.

Phần có thể triển khai miễn phí:

- Token bucket bằng Redis.
- Limit theo IP, user và endpoint.
- Waiting room đơn giản bằng Redis sorted set hoặc counter.
- Sale token ký bằng HMAC/JWT, có TTL, scope và nonce.
- Giới hạn concurrency trong NestJS.
- Trả `429`/`503` và `Retry-After`.

Phần nên giảm scope:

- Không xây hệ thống bot score riêng.
- Không làm device fingerprinting phức tạp.
- Không cam kết chống được bot phân tán hoặc scalper production.
- Không cần WAF cluster riêng cho bản demo local.

Khi deploy public, Cloudflare Turnstile có Free plan và phù hợp môi trường development/testing. Tuy nhiên Blueprint không nên phụ thuộc bắt buộc vào dịch vụ ngoài; local demo có thể dùng test key hoặc adapter tắt/mở bằng cấu hình.

**Kết luận:** hợp lý nếu waiting room được triển khai bản tối giản. Không hợp lý nếu nhóm cố tái tạo hệ thống chống bot cấp doanh nghiệp.

### 4.2 Payment reliability

Đây là phần hợp lý nhất trong nội dung review vì đề bài yêu cầu trực tiếp:

- Payment lỗi không kéo sập read path.
- Không trừ tiền hoặc phát hành vé hai lần.
- Webhook có thể đến trễ hoặc lặp.

Circuit breaker, timeout, retry budget, idempotency và reconciliation đều là logic ứng dụng, không yêu cầu dịch vụ trả phí.

Đề xuất bản đồ án:

- Viết `PaymentProvider` interface.
- Cài một mock provider có webhook simulator.
- Có thể thêm adapter VNPAY sandbox nếu tài khoản sandbox khả dụng.
- Circuit breaker có thể tự cài đơn giản hoặc dùng thư viện TypeScript.
- Reconciliation chạy bằng cron/scheduled worker.
- Không cần tích hợp giao dịch tiền thật.

**Kết luận:** hoàn toàn hợp lý và nên giữ nguyên mức chi tiết hiện tại.

### 4.3 Cache và transactional outbox

Cache-aside, TTL jitter, stale-while-revalidate và bounded fallback đều đúng về reliability. Một Redis container đủ để chứng minh cơ chế.

Transactional outbox làm tăng thêm bảng và worker, nhưng giải quyết lỗi thực tế: database commit thành công trong khi event invalidation chưa được publish. Đây là một kỹ thuật đáng triển khai trong đồ án vì:

- Không cần thêm sản phẩm trả phí.
- Có thể dùng chính PostgreSQL.
- Có test rõ ràng cho crash/retry/idempotency.
- Có thể tái sử dụng cho notification, guest list và inventory update.

Phần không cần cho đồ án:

- Redis Cluster/Sentinel.
- Edge cache nhiều lớp Nginx + Varnish + CDN cùng lúc.
- Read replica PostgreSQL.
- Cache HA hoặc failover tự động.

**Kết luận:** hợp lý, nhưng chỉ triển khai một Redis node và một outbox polling worker.

### 4.4 Offline check-in

Event id tạo trước khi lưu, durable queue, ACK theo từng event và chỉ xóa sau khi persist ACK là thiết kế đúng và có thể triển khai hoàn toàn trong mobile app.

Đề xuất bản đồ án:

- AsyncStorage lưu manifest và check-in attempts.
- Các trạng thái `pending`, `syncing`, `accepted`, `conflict`, `rejected`.
- Nút sync thủ công và tự sync khi app phát hiện online.
- Batch API idempotent theo event id.
- Manifest ký bằng khóa backend và kiểm tra bằng public key.
- Test hai thiết bị cùng scan một vé khi offline.

App tự kích hoạt sync khi phát hiện có mạng và vẫn cung cấp nút sync thủ công. Mã hóa dữ liệu local là hardening tiếp theo; nếu thiếu thời gian nên ưu tiên integrity, assignment và sync correctness trước.

**Kết luận:** rất hợp lý và phù hợp để làm điểm nhấn kỹ thuật của đồ án.

### 4.5 CSV guest list

Staging, validation, deduplication, all-or-nothing publish và idempotency theo checksum đều phù hợp với yêu cầu đề bài.

Đề xuất bản đồ án:

- Upload CSV qua admin thay vì dựng SFTP/drop-folder thật.
- Lưu file trong MinIO hoặc filesystem volume có adapter object storage.
- Parse bằng streaming parser.
- Dùng staging table và batch status.
- Publish version trong một transaction.
- Ghi error report để admin tải/xem.

Malware scan bằng ClamAV là phần mềm miễn phí nhưng tốn RAM và làm Docker Compose nặng hơn. Đối với đồ án, có thể:

- Bắt buộc kiểm tra MIME, extension, kích thước và schema.
- Vô hiệu hóa CSV formula khi xuất error report.
- Để ClamAV dưới dạng profile tùy chọn hoặc ghi rõ production hardening.

**Kết luận:** hợp lý; malware scanner nên là tùy chọn, không phải dependency bắt buộc để chạy demo.

### 4.6 AI Artist Bio

Pipeline async, idempotency, retry budget, DLQ và admin review là đúng. Vấn đề không nằm ở thiết kế reliability mà ở tài nguyên chạy model.

Phương án 0 đồng khả thi:

- PyMuPDF/PDFBox để extract text.
- Tesseract chỉ khi cần OCR.
- Ollama chạy model nhỏ trên CPU hoặc GPU sẵn có.
- Worker giới hạn concurrency bằng `1`.
- Timeout dài hơn và chấp nhận latency demo.
- Admin review trước publish.

Không nên:

- Yêu cầu GPU server riêng.
- Dựng vLLM cluster.
- Cam kết chất lượng/latency production.
- Phụ thuộc một API AI free-tier không bảo đảm còn quota khi chấm bài.

Nếu máy chấm không đủ tài nguyên, README cần nêu cấu hình tối thiểu và cho phép cấu hình endpoint Ollama ở máy khác. Không nên thay AI bằng stub vì đề bài yêu cầu cài tính năng thực.

**Kết luận:** hợp lý về luồng; cần ghi rõ model nhỏ local và giới hạn tài nguyên.

### 4.7 Retry, DLQ và observability

Policy chung cho worker là hợp lý vì RabbitMQ delivery theo hướng at-least-once yêu cầu consumer idempotent.

Một RabbitMQ node local đủ để triển khai:

- Retry queue với TTL.
- Dead-letter exchange/queue.
- Manual replay giữ nguyên message id.
- ACK sau khi side effect bền vững.

Observability nên thu gọn:

- Structured JSON log.
- Correlation id.
- Health endpoint.
- Metrics cơ bản: queue depth, retry/DLQ count, payment pending, unsynced check-in.
- Prometheus/Grafana là profile tùy chọn.

Không cần bắt buộc Loki, Tempo, Jaeger hoặc distributed tracing đầy đủ trong MVP modular monolith.

**Kết luận:** policy hợp lý; stack quan sát đầy đủ nên chuyển sang mục production/optional.

## 5. Kiến trúc triển khai 0 đồng đề xuất

### Bắt buộc chạy trong Docker Compose

| Thành phần | Cấu hình đồ án |
|---|---|
| Client | Next.js cho audience/admin và Expo/React Native cho scanner mobile |
| Backend | Một NestJS modular monolith |
| Worker | Một NestJS worker process dùng chung codebase |
| Database | Một PostgreSQL instance |
| Cache/rate limit/waiting room | Một Redis instance |
| Queue/DLQ | Một RabbitMQ instance |
| Object storage | Một MinIO Community instance hoặc filesystem adapter |
| AI | Ollama local với model nhỏ |
| Email | Mailpit cho demo; SMTP adapter cấu hình tùy chọn |
| Payment | Mock provider + webhook simulator; VNPAY sandbox tùy chọn |
| Monitoring | Log + health check; Prometheus/Grafana profile tùy chọn |

### Chỉ mô tả như hướng production

- Kubernetes cluster và autoscaling thật.
- Redis Cluster/Sentinel.
- RabbitMQ 3-node quorum cluster.
- PostgreSQL primary/replica và failover tự động.
- MinIO distributed cluster.
- Vault/Sealed Secrets/Argo CD.
- Full WAF/bot management.
- Loki/Tempo/OpenTelemetry backend đầy đủ.
- GPU inference cluster.

## 6. Điều chỉnh nên ghi thêm vào Blueprint

Phần `@Nhp125` đã review không sai, nhưng Blueprint tổng thể nên có một đoạn làm rõ:

> Kiến trúc mô tả target production. Bản cài đặt đồ án dùng deployment profile tối giản bằng Docker Compose với một instance cho PostgreSQL, Redis, RabbitMQ và object storage. Các cluster HA, Kubernetes, full observability và bot protection nâng cao là hướng mở rộng, không phải điều kiện để chạy bản demo.

Nên bổ sung bảng `Demo profile` và `Production profile` tại `09-implementation-roadmap.md` hoặc `10-technology-stack.md`. Hai file này thuộc phạm vi thành viên khác nên cần trao đổi trước khi sửa.

## 7. Các điểm cần nhóm thống nhất

1. `80.000 người/5 phút` là mục tiêu thiết kế và load-test mô phỏng, không phải cam kết hạ tầng miễn phí chịu traffic thật.
2. Payment thật không dùng trong demo; mock provider là bắt buộc, sandbox provider là tùy chọn.
3. Waiting room triển khai bản token admission tối giản, không xây nền tảng virtual queue hoàn chỉnh.
4. Bot protection production không nằm trong scope; demo chứng minh rate limit, token replay protection và CAPTCHA adapter.
5. AI chạy local bằng model nhỏ; latency không phải tiêu chí production.
6. Malware scan, Prometheus/Grafana và Keycloak có thể là Docker Compose profile tùy chọn nếu máy yếu.
7. Kubernetes và mọi cluster HA chỉ là target architecture.

## 8. Đánh giá cuối cùng

| Tiêu chí | Mức đánh giá |
|---|---|
| Đúng yêu cầu issue của `@Nhp125` | Tốt |
| Đúng nguyên tắc reliability | Tốt |
| Có thể kiểm thử | Tốt |
| Có thể triển khai bằng phần mềm miễn phí | Có |
| Có thể chạy nhẹ trên máy sinh viên nếu giữ nguyên toàn stack | Không |
| Có thể chạy nhẹ sau khi áp dụng demo profile | Có |
| Nguy cơ over-engineering | Trung bình đến cao nếu không phân tầng |

**Phán quyết:** nội dung review của `@Nhp125` nên được giữ vì đã làm Blueprint đúng và an toàn hơn. Nhóm không nên xóa các policy reliability vừa bổ sung. Thay vào đó, cần bổ sung deployment profile tối giản để xác định cơ chế nào phải cài trong đồ án, cơ chế nào chỉ cần mô tả như hướng production.

## 9. Nguồn kiểm tra gói miễn phí

Thông tin được kiểm tra ngày `2026-06-12`:

- Cloudflare Turnstile Free plan: <https://developers.cloudflare.com/turnstile/plans/>
- Kubernetes local/learning tools: <https://kubernetes.io/docs/tasks/tools/>
- Ollama chạy model local: <https://docs.ollama.com/>
- GitHub Actions billing/free usage: <https://docs.github.com/en/billing/concepts/product-billing/github-actions>
- Keycloak open-source IAM: <https://www.keycloak.org/>
- RabbitMQ free and open-source: <https://www.rabbitmq.com/>
- MinIO Community documentation: <https://docs.min.io/community/minio-object-store/>
- VNPAY sandbox: <https://sandbox.vnpayment.vn/apis/>

Các gói miễn phí có thể thay đổi trong tương lai. Bản demo phải luôn có đường chạy local không phụ thuộc quota miễn phí của nhà cung cấp ngoài.
