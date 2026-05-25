# 4. Đề xuất kiến trúc tổng thể

## Thành phần và nhiệm vụ

| Thành phần | Nhiệm vụ chính |
|---|---|
| Frontend Web App cho khán giả | Xem concert, sơ đồ vé, tạo reservation/order, thanh toán, xem e-ticket. Tối ưu cache, chống spam submit, hiển thị trạng thái payment pending rõ. |
| Admin Web App cho ban tổ chức | Quản lý concert, ticket type, quota, doanh thu, ticket sold, guest list import, PDF upload và AI artist bio. |
| Mobile App cho nhân sự soát vé | Quét QR, xác minh ticket, hỗ trợ offline manifest, lưu local check-in log, đồng bộ khi có mạng. |
| Nginx Ingress / API Gateway / Backend API | Entry point cho client, routing, authentication enforcement, throttling, request validation, correlation id. |
| Authentication & Authorization | Đăng ký/đăng nhập, token, session, MFA cho admin, RBAC/ABAC theo role và concert ownership. |
| Concert Service | Quản lý dữ liệu concert, artist, venue, seating map, publish/cancel status. Phát event khi có thay đổi để invalidate cache. |
| Ticket Inventory Service | Quản lý ticket type, capacity, sale window, reservation TTL, quota per-user, available count. Là service quan trọng nhất về consistency. |
| Order Service | Tạo và quản lý order lifecycle, liên kết reservation/payment/ticket issuance, đảm bảo idempotency. |
| Payment Service | Tích hợp VNPAY/MoMo, tạo payment intent, verify callback/webhook, reconcile, publish payment events. |
| Notification Service | Gửi email/app notification, reminder trước 24 giờ, thiết kế channel adapter để thêm Zalo OA/SMS. |
| Check-in Service | Quản lý ticket validation, check-in status, offline manifest, sync event, conflict resolution. |
| Guest List Import Service | Đọc CSV định kỳ, validate, dedupe, staging, publish guest list version mới, báo cáo lỗi. |
| AI Artist Bio Service | Xử lý PDF, extract text, clean, gọi AI model, lưu artist bio draft/published. |
| Database | Nguồn dữ liệu chính cho concert, order, payment, ticket, check-in, user role, guest list. |
| Cache | Nginx/Varnish/Redis cache cho concert read path, inventory summary, rate limit counter, queue token. |
| Message Queue / Event Bus | Giao tiếp bất đồng bộ giữa order/payment/ticket/notification/import/AI/analytics. |
| Object Storage | Lưu ảnh concert, SVG seating map, PDF press kit, CSV guest list, generated ticket PDF nếu cần. |
| Edge Cache / Static Asset Server | Phân phối frontend assets, ảnh, SVG, public concert content qua Nginx/Varnish/MinIO gateway, giảm tải backend. |
| Monitoring & Logging | Metrics, logs, traces, alert, dashboard vận hành sale và event day. |

## Service boundary đề xuất

| Domain | Owns data | Không nên làm |
|---|---|---|
| Concert Service | Concert, venue, artist bio, seating map metadata. | Không giữ logic bán vé/payment. |
| Inventory Service | Ticket type, capacity, reservations, quota ledger. | Không gọi payment gateway trực tiếp. |
| Order Service | Order state, order items, ticket issuance trigger. | Không tự tính inventory bằng cache. |
| Payment Service | Payment intent, provider transaction, webhook, reconciliation. | Không phát hành vé trực tiếp nếu chưa qua Order/Inventory contract. |
| Check-in Service | Ticket validation status, check-in event, scanner device, guest list projection. | Không sửa order/payment. |
| Notification Service | Notification job, template, delivery result. | Không chứa business state chính. |

## Dữ liệu chính

| Entity | Mục đích |
|---|---|
| `User` | Tài khoản audience/organizer/scanner. |
| `Organization` | Ban tổ chức hoặc đơn vị sở hữu concert. |
| `Concert` | Sự kiện, venue, thời gian, publish/cancel status. |
| `TicketType` | Loại vé, giá, tổng số lượng, sale window, quota limit. |
| `InventoryCounter` | Tổng capacity, reserved, sold, available theo ticket type. |
| `Reservation` | Vé giữ tạm, TTL, user, order, trạng thái. |
| `UserTicketQuota` | Số vé user đã reserved/paid theo concert/ticket type. |
| `Order` | Đơn hàng, trạng thái, tổng tiền, user. |
| `Payment` | Payment provider, transaction id, trạng thái, webhook payload hash. |
| `Ticket` | Vé đã phát hành, QR token/signature, owner, check-in status. |
| `CheckInEvent` | Lần quét vé, scanner id, device id, online/offline, sync status. |
| `GuestListBatch` | Batch import CSV, status, file, version, summary lỗi. |
| `GuestEntry` | Khách mời VIP sau validation. |
| `ArtistBioJob` | PDF processing job, extracted text, AI output, review status. |

## Luồng giữ vé và thanh toán

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client
    participant API as API
    participant Inventory as Inventory Service
    participant DB as DB
    participant Order as Order Service
    participant Payment as Payment Service
    participant Gateway as Payment Gateway
    participant Ticket as Ticket Service
    participant Notification as Notification Service
    participant Sweeper as Sweeper/Reconciliation

    Client->>API: POST /reservations<br/>concert_id, ticket_type_id, quantity, idempotency_key
    API->>API: Xác thực user, kiểm tra anti-bot/sale access token
    API->>Inventory: Reserve tickets
    Inventory->>DB: Transaction/conditional write
    Note over Inventory,DB: Kiểm tra sale window, available >= quantity,<br/>user quota, tạo reservation TTL,<br/>tăng reserved counter và quota reserved
    Inventory->>Order: Tạo order PENDING_PAYMENT
    Order->>Payment: Tạo payment intent với provider
    Client->>Gateway: Thanh toán
    Gateway->>Payment: Webhook payment success
    Payment->>Payment: Verify webhook
    Payment->>Order: Publish PaymentSucceeded
    Order->>Inventory: Confirm reservation
    Inventory->>DB: Chuyển reserved sang sold, quota paid
    Order->>Ticket: Phát hành QR ticket
    Order->>Notification: TicketIssued event
    Notification-->>Client: Gửi e-ticket

    alt Payment fail/timeout quá hạn
        Sweeper->>Inventory: Release reservation
        Inventory->>DB: Giảm reserved counter và quota reserved
    end
```

## Luồng cập nhật cache concert

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin
    participant Concert as Concert Service
    participant DB as DB
    participant EventBus as Event Bus
    participant CacheWorker as Cache Worker
    participant Cache as Nginx/Varnish/Redis
    participant PublicAPI as Public API

    Admin->>Concert: Update concert
    Concert->>DB: Save
    Concert->>EventBus: Publish ConcertUpdated
    EventBus-->>CacheWorker: Deliver ConcertUpdated
    CacheWorker->>Cache: Invalidate concert detail/listing keys
    PublicAPI->>Cache: Serve updated content
```

## Luồng CSV guest list

```mermaid
sequenceDiagram
    autonumber
    actor SponsorAdmin as Sponsor/Admin
    participant Storage as Object Storage
    participant Scheduler as Scheduler
    participant Import as Guest List Import Service
    participant Staging as Staging
    participant DB as DB
    participant EventBus as Event Bus
    participant Checkin as Check-in Service
    participant Mobile as Mobile Apps
    participant Dashboard as Dashboard

    SponsorAdmin->>Storage: Upload CSV
    Scheduler->>Import: Start import job
    Import->>Storage: Read file
    Import->>Staging: Parse and validate rows
    Import->>Import: Deduplicate by concert_id + guest identity
    Import->>DB: Publish new guest list version if batch valid enough
    Import->>EventBus: Publish GuestListUpdated
    EventBus-->>Checkin: Deliver GuestListUpdated
    Checkin-->>Mobile: Sync manifest version
    SponsorAdmin->>Dashboard: View import summary and invalid rows
```

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
    Event->>AI: Start job
    AI->>PDF: Extract text
    AI->>AI: Clean, truncate, remove irrelevant content
    AI->>Model: Generate short artist bio
    AI->>DB: Save draft bio
    Admin->>AdminWeb: Review/publish
    AdminWeb->>Concert: Publish approved bio
    Concert-->>PublicPage: Display published bio
```
