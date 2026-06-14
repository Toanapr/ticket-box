# 5. Mô tả các luồng nghiệp vụ quan trọng

Các luồng trong file này bao phủ các nghiệp vụ rủi ro nhất của TicketBox: mua vé, soát vé offline, nhập guest list CSV, cập nhật cache và AI Artist Bio.

## Luồng mua vé

```mermaid
sequenceDiagram
    autonumber
    actor User as Khán giả
    participant Web as Audience Web
    participant API as Backend API
    participant Auth as Auth
    participant Inventory as Inventory Service
    participant DB as PostgreSQL
    participant Order as Order Service
    participant Payment as Payment Service
    participant Gateway as VNPAY/MoMo
    participant Ticket as Ticket Service
    participant Notify as Notification Service

    User->>Web: Chọn concert, loại vé, số lượng
    Web->>API: POST /reservations + idempotency key
    API->>Auth: Xác thực user
    API->>Inventory: Reserve ticket
    Inventory->>DB: Transaction: kiểm tra sale window, capacity, quota
    Inventory->>Order: Tạo order PENDING_PAYMENT và order_items từ reservation
    Order->>Payment: Tạo payment intent idempotent
    Payment->>Gateway: Tạo payment URL
    Payment-->>Web: Trả payment URL
    User->>Gateway: Thanh toán
    Gateway->>Payment: Webhook/callback
    Payment->>Order: PaymentSucceeded event
    Order->>Inventory: Confirm reservation
    Order->>Ticket: Issue QR ticket
    Ticket->>Notify: TicketIssued event
    Notify-->>User: Email/app notification kèm e-ticket
```

### Xử lý lỗi giữa chừng

| Lỗi | Hành vi |
|---|---|
| User bấm mua nhiều lần | API kiểm tra idempotency key; request trùng trả lại kết quả cũ. |
| Hết vé khi reserve | Inventory transaction fail, không tạo order/payment. |
| User vượt quota | Lock/upsert `user_ticket_quotas`, reject nếu vượt limit. |
| Payment timeout | Order giữ `PENDING_PAYMENT`; reconciliation kiểm tra lại gateway; reservation hết TTL thì release. |
| Webhook gửi nhiều lần | Payment Service dedupe theo provider transaction id/payload hash. |
| Ticket issuing retry | Ticket issuing idempotent; bảng tickets chống trùng từng vé bằng `UNIQUE(order_item_id, sequence_no)` và `UNIQUE(qr_token_hash)`. |
| Notification lỗi | Ghi delivery failure và retry qua queue; không rollback ticket đã issued. |
| Payment success sau khi reservation expired | Không issue ticket tự động; chuyển order sang reconciliation/refund_required. |

## Luồng soát vé khi mất mạng và đồng bộ lại

```mermaid
sequenceDiagram
    autonumber
    participant App as Scanner Web/PWA App
    participant Checkin as Check-in Service
    participant DB as PostgreSQL
    participant QR as E-ticket QR

    App->>Checkin: Download signed manifest trước ca làm
    Checkin->>DB: Lấy ticket/guest list theo event/gate/zone
    Checkin-->>App: Manifest version + signature + revoked list

    Note over App,QR: Offline tại cổng
    App->>QR: Scan QR token
    App->>App: Verify signature, concert, zone, local checked-in set
    App->>App: Tạo event id + append CheckInAttempt pending
    App->>App: Mark ticket locally used

    Note over App,Checkin: Khi online lại
    App->>Checkin: Sync batch bằng event id đã lưu
    Checkin->>DB: Idempotent insert + kiểm tra ticket status
    Checkin-->>App: ACK từng event accepted/conflict/rejected
    App->>App: Persist ACK rồi mới dọn payload đã accepted
```

### Xử lý lỗi giữa chừng

| Lỗi | Hành vi |
|---|---|
| Mất mạng hoàn toàn | App dùng signed manifest và local checked-in set. |
| App crash trước sync | Local queue durable/encrypted nên khởi động lại vẫn sync được. |
| Một vé scan hai lần cùng device | Local checked-in set chặn lần thứ hai. |
| Một vé scan ở hai device offline | Backend nhận sync trước thì accepted; sync sau conflict. |
| Manifest cũ | App bắt buộc refresh trước ca; manifest có version, TTL và revoked list. |
| Batch sync timeout hoặc ACK một phần | App gửi lại event chưa có ACK bằng cùng event id; backend dedupe. |
| Event conflict/rejected | Giữ kết quả local để nhân sự xử lý, không tự xóa như event accepted. |
| Manifest hết TTL hoặc sai chữ ký/checksum | Dừng offline scan và yêu cầu tải manifest hợp lệ. |

## Luồng nhập danh sách khách mời từ CSV

```mermaid
sequenceDiagram
    autonumber
    actor Sponsor as Nhãn hàng/Admin
    participant Storage as Object Storage
    participant Scheduler as Scheduler
    participant Import as Guest List Import Service
    participant Staging as Staging Tables
    participant DB as PostgreSQL
    participant Outbox as Outbox Publisher
    participant Bus as RabbitMQ
    participant Checkin as Check-in Service
    participant Admin as Admin Dashboard

    Sponsor->>Storage: Upload CSV ban đêm trước ngày diễn
    Scheduler->>Import: Start import job
    Import->>Storage: Read CSV file
    Import->>Staging: Parse, validate, normalize
    Import->>Import: Deduplicate guest identity
    Import->>DB: Publish version + outbox nếu toàn batch hợp lệ
    Outbox->>DB: Đọc outbox đã commit
    Outbox->>Bus: Publish GuestListUpdated
    Bus-->>Checkin: Notify manifest update
    Import-->>Admin: Summary + invalid rows
```

### Xử lý lỗi giữa chừng

| Lỗi | Hành vi |
|---|---|
| File không đọc được | Batch `FAILED`, giữ guest list version hiện tại. |
| Dòng thiếu field hoặc sai format | Ghi invalid row vào staging, không publish cả batch và hiển thị error report. |
| Trùng khách mời | Dedupe theo concert + identity + sponsor; không publish bản trùng. |
| Batch lỗi nặng | Quarantine file, không ghi đè dữ liệu production. |
| Import service restart | Retry theo `(concert_id, file checksum, schema version)`, không tạo version hoặc row trùng. |
| Worker crash sau DB commit | Outbox tiếp tục publish `GuestListUpdated`; version đã active không bị publish lại thành version mới. |

## Luồng cập nhật cache concert

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin
    participant Concert as Concert Service
    participant DB as DB
    participant Outbox as Outbox Publisher
    participant EventBus as Event Bus
    participant CacheWorker as Cache Worker
    participant Cache as Nginx/Varnish/Redis
    participant PublicAPI as Public API

    Admin->>Concert: Update concert
    Concert->>DB: Save + outbox event trong cùng transaction
    Outbox->>DB: Đọc outbox đã commit
    Outbox->>EventBus: Publish ConcertUpdated
    EventBus-->>CacheWorker: Deliver ConcertUpdated
    CacheWorker->>Cache: Invalidate concert detail/listing keys
    PublicAPI->>Cache: Serve updated content
```

### Xử lý lỗi giữa chừng

| Lỗi | Hành vi |
|---|---|
| Cache worker lỗi | TTL ngắn giúp cache tự hết hạn; worker retry event. |
| Event bus retry | Invalidation idempotent, xóa key nhiều lần vẫn an toàn. |
| Cache stampede | Dùng request coalescing, stale-while-revalidate và prewarm trước giờ mở bán. |
| Redis/edge cache lỗi | Phục vụ stale public data nếu có; fallback DB có concurrency/query budget và trả `503` khi primary gần bão hòa. |

## Luồng AI Artist Bio

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin
    participant Storage as Object Storage
    participant Event as Object Storage/Event
    participant AI as AI Artist Bio Service
    participant PDF as PDF Extractor
    participant Model as AI Model
    participant DB as DB
    participant AdminWeb as Admin Web
    participant Concert as Concert Service
    participant PublicPage as Public Page

    Admin->>Storage: Upload PDF
    Event->>AI: Start idempotent job theo object/pipeline version
    AI->>PDF: Extract text
    AI->>AI: Clean, sanitize, truncate, remove irrelevant content
    AI->>Model: Generate short artist bio
    AI->>DB: Upsert một draft cho job
    Admin->>AdminWeb: Review/publish
    AdminWeb->>Concert: Publish approved bio
    Concert-->>PublicPage: Display published bio
```

### Xử lý lỗi giữa chừng

| Lỗi | Hành vi |
|---|---|
| PDF lỗi hoặc quá lớn | Reject upload hoặc đưa job vào failed, không ảnh hưởng trang concert. |
| Extract text lỗi | Lưu lỗi job để admin upload lại hoặc nhập bio thủ công. |
| AI model timeout | Retry có giới hạn với backoff/jitter; vượt budget thì vào DLQ/failed để admin retry thủ công. |
| AI sinh nội dung không phù hợp | Không auto-publish; admin phải review/edit/publish. |
| Worker nhận lại cùng message | Dedupe theo job/stage key, không tạo thêm draft hoặc gọi model lại khi stage đã hoàn tất. |
| Nội dung PDF cố điều khiển model | Xem PDF là input không tin cậy; sanitize và giữ system instruction cố định. |
