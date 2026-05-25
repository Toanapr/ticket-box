# 3. High-Level Architecture Diagram

## Sơ đồ tổng quan

```mermaid
flowchart TD
    Internet["Internet"]
    Edge["Reverse Proxy / Edge Cache / WAF<br/>Nginx/Varnish/Coraza"]
    Gateway["API Gateway / Backend API"]

    AudienceWeb["Audience Web App"]
    AdminWeb["Admin Web App"]
    ScannerApp["Scanner Mobile App<br/>offline manifest + local queue"]

    Auth["Auth / Keycloak"]
    Concert["Concert Service"]
    Inventory["Inventory Service"]
    Order["Order Service"]
    PaymentSvc["Payment Service"]
    Ticket["Ticket Service"]
    Checkin["Check-in Service"]
    Notify["Notification Service"]
    GuestImport["Guest List Import Service"]
    AIBio["AI Artist Bio Service"]

    Postgres["PostgreSQL"]
    Redis["Redis"]
    RabbitMQ["RabbitMQ"]
    Storage["Object Storage"]

    PaymentGateway["VNPAY / MoMo"]
    AIModel["AI Model"]
    CSVSource["Sponsor CSV Drop"]
    EmailProvider["Email/App Notification"]

    Internet --> Edge
    Edge --> AudienceWeb
    Edge --> AdminWeb
    Edge --> ScannerApp

    AudienceWeb --> Gateway
    AdminWeb --> Gateway
    ScannerApp --> Gateway

    Gateway --> Auth
    Gateway --> Concert
    Gateway --> Inventory
    Gateway --> Order
    Gateway --> PaymentSvc
    Gateway --> Checkin

    Concert --> Postgres
    Concert --> Redis
    Concert --> Storage
    Inventory --> Postgres
    Inventory --> Redis
    Order --> Postgres
    PaymentSvc --> Postgres
    Ticket --> Postgres
    Checkin --> Postgres

    Order --> RabbitMQ
    PaymentSvc --> RabbitMQ
    Ticket --> RabbitMQ
    GuestImport --> RabbitMQ
    AIBio --> RabbitMQ
    Notify --> RabbitMQ

    PaymentSvc --> PaymentGateway
    PaymentGateway --> PaymentSvc
    Notify --> EmailProvider
    GuestImport --> CSVSource
    GuestImport --> Storage
    AIBio --> Storage
    AIBio --> AIModel

    ScannerApp -. "download manifest / sync queue" .-> Checkin
```

## Các điểm tích hợp quan trọng

| Tích hợp | Luồng | Yêu cầu thiết kế |
|---|---|---|
| VNPAY/MoMo | Payment Service tạo payment intent/URL, gateway gửi webhook/callback. | Verify signature, idempotency key, payment state machine, reconciliation khi timeout. |
| AI model | AI Artist Bio Service gửi text đã clean để sinh bio ngắn. | Async job, retry/backoff, lưu draft, admin review trước publish. |
| CSV guest list | Import service đọc file CSV theo lịch từ object storage/drop folder. | Staging, validate, dedupe, publish version mới khi batch hợp lệ. |
| Scanner offline | Mobile app tải signed manifest, ghi local queue, sync lại khi online. | QR signed token, local durable storage, idempotent sync, conflict policy. |

## Luồng phụ thuộc khi checkout

Checkout phụ thuộc vào Auth, Inventory, Order, Payment và database transaction. Notification, analytics và email chỉ chạy sau qua queue. Nếu notification lỗi, checkout không rollback. Nếu payment gateway lỗi, hệ thống dừng bước thanh toán nhưng vẫn giữ được read path cho concert.

