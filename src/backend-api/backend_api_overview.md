# Backend API Overview - Person 2 Phase 1

## 1. Purpose

Backend này xử lý flow mua vé Phase 1:

```text
reserve -> create order -> mock payment success/webhook -> issue ticket QR
```

Mục tiêu chính:
- không oversell
- không vượt quota theo user
- không issue ticket trùng
- chịu được retry, replay, và request song song

Code chính nằm tại:
- [backend-api](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api)

## 2. Tech Stack

- NestJS cho HTTP API và worker
- Prisma làm DB client
- PostgreSQL là source of truth cho inventory, quota, order, payment, ticket
- Raw SQL trong Prisma transaction cho các đoạn cần lock rõ ràng

## 3. Main Modules

### Inventory

Phụ trách:
- `POST /reservations`
- kiểm tra sale window
- kiểm tra available quantity
- kiểm tra per-user quota
- giữ vé với TTL
- release hold khi hết hạn

Files:
- [inventory.controller.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/modules/inventory/inventory.controller.ts)
- [inventory.service.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/modules/inventory/inventory.service.ts)
- [inventory.repository.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/modules/inventory/inventory.repository.ts)
- [reservation-expiry.worker.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/workers/reservation-expiry.worker.ts)

### Order

Phụ trách:
- `POST /orders`
- tạo order từ reservation hợp lệ
- chống duplicate request

Files:
- [order.controller.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/modules/order/order.controller.ts)
- [order.service.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/modules/order/order.service.ts)
- [order.repository.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/modules/order/order.repository.ts)

### Payment

Phụ trách:
- `POST /payments/mock-success`
- `POST /payments/webhook`
- payment replay handling
- late success handling
- shared payment confirmation logic

Files:
- [payment.controller.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/modules/payment/payment.controller.ts)
- [payment.service.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/modules/payment/payment.service.ts)
- [payment.repository.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/modules/payment/payment.repository.ts)

### Ticket

Phụ trách:
- issue ticket sau payment success
- đọc ticket cho frontend
- QR token và QR token hash
- post-commit notification abstraction

Files:
- [ticket.controller.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/modules/ticket/ticket.controller.ts)
- [ticket.service.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/modules/ticket/ticket.service.ts)
- [ticket.repository.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/modules/ticket/ticket.repository.ts)
- [ticket-issuance.service.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/modules/ticket/ticket-issuance.service.ts)
- [ticket-notification.publisher.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/modules/ticket/ticket-notification.publisher.ts)

## 4. Main API Endpoints

### `POST /reservations`

Tạo reservation tạm thời.

Input:
- `x-user-id`
- `ticketTypeId`
- `quantity`
- `idempotencyKey`

Behavior:
- lock inventory row bằng `FOR UPDATE`
- lock quota row bằng `FOR UPDATE`
- reject nếu sale chưa mở/đã đóng
- reject nếu hết vé
- reject nếu vượt quota
- tạo reservation `active`
- tăng `reservedCount` cho inventory và quota

### `POST /orders`

Tạo order từ reservation.

Behavior:
- reservation phải thuộc user hiện tại
- reservation phải còn `active`
- reservation chưa được link vào order khác
- tạo order `pending_payment`
- tạo `order_items`
- tạo payment record ban đầu

### `POST /payments/mock-success`

Dùng cho local/demo flow.

Behavior:
- xác nhận payment thành công
- đi qua cùng logic với webhook success
- confirm reservation
- chuyển inventory `reserved -> sold`
- chuyển quota `reserved -> paid`
- issue ticket

### `POST /payments/webhook`

Webhook mock cho payment result.

Behavior:
- optional signature verification qua `x-webhook-signature`
- hash payload để audit/dedupe
- replay-safe theo provider transaction và payload hash
- success thì đi qua payment confirmation logic
- failed thì mark payment/order failed

### `GET /orders/:id`

Cho frontend poll trạng thái order/payment.

### `GET /tickets/:id`

Cho frontend lấy ticket và QR payload render được.

## 5. Core Business Rules

### Reservation

- `capacity` và `quota` luôn check trong DB transaction
- không dùng cache làm source of truth
- reservation có TTL
- sweeper sẽ release inventory/quota khi reservation hết hạn

### Payment

- browser redirect không phải final payment truth
- mock success và webhook là nguồn xác nhận cuối trong Phase 1
- webhook có thể replay nhiều lần nhưng không được tạo side effect trùng

### Late Success

Nếu payment success đến sau khi reservation hết hạn:
- không issue ticket
- order chuyển `refund_required`
- payment vẫn giữ `succeeded`

### Notification

- notification lỗi không rollback payment đã confirm hoặc ticket đã issue

## 6. Status Model

### Reservation

- `active`
- `confirmed`
- `released`
- `expired`

### Order

- `pending_payment`
- `paid`
- `issued`
- `failed`
- `expired`
- `refund_required`

### Payment

- `created`
- `pending`
- `succeeded`
- `failed`

### Ticket

- `issued`
- `revoked`
- `checked_in`

Transition map:
- [state-transitions.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/common/constants/state-transitions.ts)

## 7. Database and Migration

Schema:
- [schema.prisma](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/prisma/schema.prisma)

Baseline migration:
- [migration.sql](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/prisma/migrations/0_init/migration.sql)

Migration runbook:
- [MIGRATIONS.md](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/prisma/MIGRATIONS.md)

Important DB guarantees:
- unique reservation idempotency key theo `(userId, idempotencyKey)`
- unique order idempotency key theo `(userId, idempotencyKey)`
- unique ticket theo `(orderItemId, sequenceNo)`
- unique `qrToken`
- unique `qrTokenHash`
- index cho reservation sweeper và query order/payment

## 8. Config

Env example:
- [.env.example](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/.env.example)

Các biến chính:
- `DATABASE_URL`
- `DIRECT_URL`
- `RESERVATION_TTL_MINUTES`
- `RESERVATION_EXPIRY_BATCH_SIZE`
- `RESERVATION_EXPIRY_WORKER_ENABLED`
- `PORT`
- `WEBHOOK_SIGNING_SECRET`

## 9. Logging and Correlation ID

Đã có:
- request correlation id qua header `x-correlation-id`
- response trả lại `x-correlation-id`
- structured log cho request/payment/reservation/worker
- error response có `correlationId`

Files:
- [app.setup.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/app.setup.ts)
- [request-context.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/common/context/request-context.ts)
- [structured-log.util.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/common/logging/structured-log.util.ts)

## 10. Verification

### Unit tests

- [state-transitions.spec.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/common/constants/state-transitions.spec.ts)
- [structured-log.util.spec.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/common/logging/structured-log.util.spec.ts)
- [hash.util.spec.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/common/utils/hash.util.spec.ts)
- [qr-token.util.spec.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/common/utils/qr-token.util.spec.ts)
- [webhook-signature.util.spec.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/src/common/utils/webhook-signature.util.spec.ts)

### E2E tests

- [app.e2e-spec.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/test/app.e2e-spec.ts)
- [checkout-flow.e2e-spec.ts](/D:/VisualStudio/SoftwareDesignProj/ticket-box/src/backend-api/test/checkout-flow.e2e-spec.ts)

Đã verify:
- reservation idempotency
- full checkout flow
- webhook replay safety
- failed payment
- late success `refund_required`
- quota contention
- last-ticket contention
- renderable QR output
- webhook signature verification
- sweeper rerun safety
- correlation id header

## 11. Current Completion Status

Đã hoàn thành theo issue Phase 1:
- reservation flow
- order flow
- payment flow
- ticket issuance
- read APIs
- concurrency safety verification
- migration baseline
- logging/correlation id hardening

Follow-up nhỏ ngoài scope issue:
- Prisma vẫn cảnh báo seed config cũ trong `package.json` sẽ deprecated ở Prisma 7
