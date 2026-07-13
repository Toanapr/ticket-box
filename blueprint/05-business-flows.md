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
    participant Inventory as Inventory Module
    participant DB as PostgreSQL
    participant Order as Order Module
    participant Payment as Payment Module
    participant Gateway as VNPAY/MoMo
    participant Ticket as Ticket Module
    participant Notify as Notification Module

    User->>Web: Chọn concert, loại vé, số lượng
    Web->>API: POST /reservations + idempotency key
    API->>Auth: Xác thực user
    API->>Inventory: Reserve ticket
    Inventory->>DB: Transaction: kiểm tra sale window, capacity, quota
    Inventory->>Order: Tạo order pending_payment và order_items từ reservation
    Order->>Payment: Tạo payment intent idempotent
    Payment->>Gateway: Tạo payment URL
    Payment-->>Web: Trả payment URL
    User->>Gateway: Thanh toán
    Gateway->>API: Webhook/IPN/callback đã ký
    API->>Payment: Verify + dedupe provider event
    Payment->>DB: Transaction: confirm reservation, inventory, quota
    Payment->>Ticket: Issue QR ticket idempotent trong transaction
    Ticket->>Notify: Tạo notification records sau commit
    Notify-->>User: Email/app notification kèm e-ticket
```

### Xử lý lỗi giữa chừng

| Lỗi | Hành vi |
|---|---|
| User bấm mua nhiều lần | API kiểm tra idempotency key; request trùng trả lại kết quả cũ. |
| Hết vé khi reserve | Inventory transaction fail, không tạo order/payment. |
| User vượt quota | Lock/upsert `user_ticket_quotas`, reject nếu vượt limit. |
| Payment timeout | Order giữ `pending_payment`, payment chuyển `pending_reconciliation`; worker kiểm tra lại gateway, reservation hết TTL thì release. |
| Webhook gửi nhiều lần | Payment Module dedupe theo `(provider, provider_event_id)` và giữ payload hash để phát hiện replay khác nội dung. |
| Ticket issuing retry | Ticket issuing idempotent; bảng tickets chống trùng từng vé bằng `UNIQUE(order_item_id, sequence_no)` và `UNIQUE(qr_token_hash)`. |
| Notification lỗi | Ghi delivery `failed` cùng error; không rollback ticket đã issued. Automatic retry/manual retry endpoint là hạng mục bổ sung. |
| Payment success sau khi reservation expired | Không issue ticket tự động; payment vẫn `succeeded`, order chuyển `refund_required`. |

## Luồng soát vé khi mất mạng và đồng bộ lại

```mermaid
sequenceDiagram
    autonumber
    participant App as Scanner Web/PWA App
    participant Checkin as Check-in Module
    participant DB as PostgreSQL
    participant QR as E-ticket QR

    App->>Checkin: Download HMAC-signed manifest trước ca làm
    Checkin->>DB: Lấy ticket/guest list theo event/gate/zone
    Checkin-->>App: Manifest version + signature + revoked list

    Note over App,QR: Offline tại cổng
    App->>QR: Scan QR token
    App->>App: Match token với manifest, scope và local checked-in set
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
| App crash trước sync | Local queue lưu bền trong IndexedDB nên khởi động lại vẫn sync được. Dữ liệu local được giảm PII; application-level encryption là hardening production. |
| Một vé scan hai lần cùng device | Local checked-in set chặn lần thứ hai. |
| Một vé scan ở hai device offline | Backend nhận sync trước thì accepted; sync sau conflict. |
| Manifest cũ | App bắt buộc refresh trước ca; manifest có version, TTL và revoked list. |
| Batch sync timeout hoặc ACK một phần | App gửi lại event chưa có ACK bằng cùng event id; backend dedupe. |
| Event conflict/rejected | Giữ kết quả local để nhân sự xử lý, không tự xóa như event accepted. |
| Manifest hết TTL hoặc sai scope/checksum | Dừng offline scan và yêu cầu tải manifest hợp lệ. Backend hiện ký HMAC; independent browser verification bằng public key là hạng mục hardening còn lại. |

## Luồng nhập danh sách khách mời từ CSV

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Organizer/Admin
    participant API as Backend API
    participant Storage as Local File Storage
    participant Import as Guest List Import Module
    participant Staging as Staging Tables
    participant DB as PostgreSQL
    participant Checkin as Check-in Module
    participant AdminWeb as Admin Dashboard

    Admin->>API: Upload CSV cho concert
    API->>Import: Kiểm tra ownership, checksum, schema version
    Import->>Storage: Lưu raw CSV
    Import->>Storage: Read CSV file
    Import->>Staging: Parse, validate, normalize
    Import->>Import: Deduplicate identity trong cùng snapshot
    Import->>DB: Transaction publish full snapshot version + outbox
    Checkin->>DB: Đọc active version khi tạo manifest
    Import-->>AdminWeb: Batch status, summary và invalid rows
```

### Xử lý lỗi giữa chừng

| Lỗi | Hành vi |
|---|---|
| File không đọc được | Batch `FAILED`, giữ guest list version hiện tại. |
| Dòng thiếu field hoặc sai format | Ghi invalid row vào staging, không publish cả batch và hiển thị error report. |
| Trùng khách trong cùng file | Batch invalid theo normalized identity; active version không đổi. Identity xuất hiện ở version cũ không phải lỗi vì file mới là full snapshot. |
| Batch lỗi nặng | Đánh dấu batch `failed`/`validation_failed`, giữ active version hiện tại và raw file để điều tra. |
| Client retry cùng file | Unique `(concert_id, file checksum, schema version)` trả batch cũ, không tạo version hoặc row trùng. |
| Process lỗi sau DB commit | Active version và `GuestListUpdated` record đã cùng commit; retry cùng checksum trả kết quả idempotent. |

## Luồng cập nhật cache concert

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin
    participant Concert as Concert Module
    participant DB as DB
    participant Cache as Redis
    participant PublicAPI as Public API

    Admin->>Concert: Update concert
    Concert->>DB: Commit thay đổi
    Concert->>Cache: Xóa detail/listing keys sau commit
    PublicAPI->>Cache: Cache miss
    PublicAPI->>DB: Đọc dữ liệu mới
    PublicAPI->>Cache: Set cache với TTL + jitter
```

### Xử lý lỗi giữa chừng

| Lỗi | Hành vi |
|---|---|
| Xóa cache lỗi | TTL giúp cache tự hết hạn; structured log ghi lỗi invalidation. |
| Cache stampede | Dùng in-process request coalescing, TTL jitter và DB miss budget. |
| Redis lỗi | Cache-aside fallback DB có concurrency/query budget; trả `503` khi miss budget cạn thay vì dồn tải không giới hạn. |

## Luồng AI Artist Bio

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin
    participant Storage as Local File Storage
    participant API as Backend API
    participant AI as AI Artist Bio Module
    participant PDF as PDF Extractor
    participant Model as AI Model
    participant DB as DB
    participant AdminWeb as Admin Web
    participant Concert as Concert Module
    participant PublicPage as Public Page

    Admin->>API: Upload PDF cho concert
    API->>Storage: Lưu file theo checksum
    API->>DB: Tạo job idempotent theo checksum/pipeline version
    AI->>DB: Scheduled worker claim job bằng lease
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
| AI model timeout | Retry có giới hạn với backoff/jitter; vượt budget thì vào failed state để admin retry thủ công. |
| AI sinh nội dung không phù hợp | Không auto-publish; admin phải review/edit/publish. |
| Scheduled worker claim lại job | Lease, status và unique `(concert_id, checksum, pipeline_version)` ngăn tạo draft/job trùng. |
| Nội dung PDF cố điều khiển model | Xem PDF là input không tin cậy; sanitize và giữ system instruction cố định. |
