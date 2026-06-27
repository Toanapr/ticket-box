# Phase 2 hardening demo

Tài liệu này ghi cách demo tối thiểu cho rate limit, reservation failure reason,
payment timeout/circuit breaker, reconciliation và duplicate webhook. Không cần
dashboard vận hành riêng trong Phase 2.

## Chuẩn bị

Chạy Backend API với database đã migrate và seed:

```powershell
cd src/backend-api
pnpm install
pnpm prisma:generate
pnpm db:seed
pnpm start:dev
```

Đăng nhập audience bằng tài khoản seed `audience@ticketbox.local /
Password123!` rồi dùng access token cho các lệnh bên dưới.

## Reserve spam

Gửi nhiều request `POST /reservations` trong cùng một phút bằng cùng user.
Giữ nguyên `Authorization`, `x-device-id` và thay `ticketTypeId` bằng ticket type
seed còn mở bán.

```powershell
$headers = @{
  Authorization = "Bearer <AUDIENCE_TOKEN>"
  "Content-Type" = "application/json"
  "x-device-id" = "demo-device-1"
  "accept-language" = "vi-VN"
}

1..11 | ForEach-Object {
  $body = @{
    ticketTypeId = "<TICKET_TYPE_ID>"
    quantity = 1
    idempotencyKey = [guid]::NewGuid().ToString()
  } | ConvertTo-Json

  try {
    Invoke-WebRequest -Method Post -Uri "http://localhost:3000/reservations" `
      -Headers $headers -Body $body
  } catch {
    $_.Exception.Response
  }
}
```

Expected output:

- các request đầu trả `201 Created`;
- request vượt ngưỡng trả `429 Too Many Requests`;
- response có header `Retry-After`;
- log có event `rate_limit_rejected` với `correlationId`, `scope`,
  `endpoint`, `limit` và `retryAfterSeconds`.

## Reservation failure reason

Gửi request vượt tồn kho hoặc vượt quota.

Expected output:

- API trả lỗi nghiệp vụ như `sold_out`, `quota_exceeded` hoặc
  `sale_window_inactive`;
- log có event `reservation_failed` với `reason` tương ứng và business context
  như `ticketTypeId`, `quantity`;
- rate/risk rejection cũng được biểu diễn bằng reason rõ ràng, không thay thế
  transaction kiểm tra inventory/quota trong PostgreSQL.

## Payment timeout và circuit breaker

Chạy backend với mock provider ở chế độ timeout:

```powershell
$env:MOCK_PAYMENT_MODE = "timeout"
```

Tạo reservation, order, rồi gọi:

```powershell
Invoke-WebRequest -Method Post `
  -Uri "http://localhost:3000/payments/<PAYMENT_ID>/intent" `
  -Headers @{
    Authorization = "Bearer <AUDIENCE_TOKEN>"
    "Idempotency-Key" = [guid]::NewGuid().ToString()
  }
```

Expected output:

- API trả `202 Accepted`;
- body có `status = pending_reconciliation`, `degraded = true`,
  `reason = provider_timeout_ambiguous`;
- public read path như `GET /concerts/<CONCERT_ID>` vẫn trả được dữ liệu;
- log có `payment_pending`;
- khi lỗi provider vượt threshold, log có `circuit_breaker_opened`; sau
  cooldown có `circuit_breaker_half_open`; khi provider hồi phục có
  `circuit_breaker_closed`.

## Reconciliation

Đặt `reconciliationAfter` của payment pending về quá khứ trong database hoặc đợi
đến thời điểm due, rồi chạy worker hoặc gọi test/e2e reconciliation batch.

Expected output:

- log có `payment_reconciliation_started` với số payment được claim;
- khi provider trả kết quả cuối, log có `payment_reconciliation_resolved` với
  `payment_id`, `order_id`, `outcome`;
- nếu provider vẫn chưa chắc chắn, payment được reschedule và outcome là
  `retry`.

## Duplicate webhook

Gửi cùng payload webhook hai lần với cùng `providerEventId` và chữ ký hợp lệ.

Expected output:

- cả hai lần đều trả kết quả idempotent;
- số ticket của order không tăng ở lần replay;
- unique constraint `order_item_id + sequence_no` và webhook event idempotency
  chặn phát hành vé trùng;
- log `payment_webhook_processed` có `order_id`, `payment_id` và
  `issuedTicketCount`.

## Kiểm chứng tự động

Các test liên quan:

```powershell
cd src/backend-api
pnpm test -- structured-log.util.spec.ts reservation-risk.guard.spec.ts rate-limit.guard.spec.ts payment-circuit-breaker.service.spec.ts
pnpm test:e2e -- checkout-flow.e2e-spec.ts
```

Những test này bao phủ rate limit `429 + Retry-After`, risk checks đơn giản,
payment timeout/pending reconciliation, reconciliation idempotent và duplicate
webhook không issue ticket trùng.
