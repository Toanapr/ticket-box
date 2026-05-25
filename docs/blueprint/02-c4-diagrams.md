# 2. C4 Diagram

## Level 1 - System Context

```mermaid
flowchart LR
    Audience["Khán giả"]
    Organizer["Ban tổ chức"]
    ScannerStaff["Nhân sự soát vé"]
    Sponsor["Nhãn hàng tài trợ"]

    TicketBox["TicketBox<br/>Nền tảng bán vé concert"]

    Payment["VNPAY / MoMo<br/>Payment Gateway"]
    Email["Email/App Notification Provider"]
    AI["AI Model<br/>Artist Bio generation"]
    CSV["CSV Guest List<br/>từ hệ thống nhãn hàng"]

    Audience -->|"Xem concert, mua vé, nhận QR"| TicketBox
    Organizer -->|"Quản lý concert, vé, doanh thu, PDF/CSV"| TicketBox
    ScannerStaff -->|"Quét QR, sync check-in"| TicketBox
    Sponsor -->|"Gửi CSV ban đêm trước ngày diễn"| CSV

    TicketBox -->|"Tạo payment URL, nhận webhook"| Payment
    TicketBox -->|"Gửi xác nhận, e-ticket, reminder"| Email
    TicketBox -->|"Gửi text đã làm sạch"| AI
    TicketBox -->|"Đọc file theo lịch"| CSV
```

### Diễn giải

TicketBox là hệ thống trung tâm. Khán giả, ban tổ chức và nhân sự soát vé tương tác trực tiếp với TicketBox. Các hệ thống ngoài gồm payment gateway, notification provider, AI model và nguồn CSV guest list. Tích hợp payment cần đồng bộ và có webhook; AI và CSV là luồng bất đồng bộ; notification không được ảnh hưởng đến kết quả mua vé.

## Level 2 - Container

```mermaid
flowchart TD
    Audience["Khán giả"]
    Organizer["Ban tổ chức"]
    ScannerStaff["Nhân sự soát vé"]

    subgraph TicketBox["TicketBox System"]
        AudienceWeb["Audience Web App<br/>Next.js"]
        AdminWeb["Admin Web App<br/>Next.js"]
        ScannerApp["Scanner Mobile App<br/>Flutter/React Native"]
        Gateway["API Gateway / Backend API<br/>NestJS/Spring Boot"]
        Workers["Background Workers<br/>Node/Java workers"]
        Postgres["PostgreSQL<br/>transactional database"]
        Redis["Redis<br/>cache/rate limit/waiting room"]
        RabbitMQ["RabbitMQ<br/>event bus/job queue"]
        ObjectStorage["MinIO/Object Storage<br/>PDF, CSV, SVG, ticket assets"]
        Keycloak["Keycloak<br/>OIDC/RBAC/MFA"]
    end

    Payment["VNPAY / MoMo"]
    AI["AI Model"]
    Email["Email/App Notification"]
    CSVSource["CSV Guest List"]

    Audience --> AudienceWeb
    Organizer --> AdminWeb
    ScannerStaff --> ScannerApp

    AudienceWeb --> Gateway
    AdminWeb --> Gateway
    ScannerApp --> Gateway

    Gateway --> Keycloak
    Gateway --> Postgres
    Gateway --> Redis
    Gateway --> RabbitMQ
    Gateway --> ObjectStorage

    Workers --> RabbitMQ
    Workers --> Postgres
    Workers --> Redis
    Workers --> ObjectStorage

    Gateway --> Payment
    Payment --> Gateway
    Workers --> AI
    Workers --> Email
    Workers --> CSVSource
```

### Công nghệ đề xuất

| Container | Công nghệ | Giao tiếp chính |
|---|---|---|
| Audience/Admin Web | Next.js | HTTPS tới API Gateway, cache public page ở edge. |
| Scanner Mobile App | Flutter hoặc React Native | HTTPS khi online, local encrypted DB khi offline. |
| Backend API | NestJS hoặc Spring Boot | REST, transaction PostgreSQL, Redis, RabbitMQ. |
| Workers | Cùng stack backend | RabbitMQ consumer, gọi AI/email/CSV/object storage. |
| PostgreSQL | SQL database | Transaction, constraint, index, lock cho consistency. |
| Redis | In-memory data store | Cache-aside, token bucket, waiting room token. |
| RabbitMQ | Message broker | Retry, DLQ, asynchronous workflow. |
| MinIO | Object storage | Lưu file lớn và asset versioned. |
| Keycloak | OIDC provider | Login, JWT/session, role, MFA. |

