# Minh chứng kiểm thử TicketBox - 2026-07-14

## 1. Phạm vi và môi trường

- Workspace: `D:\VisualStudio\SoftwareDesignProj\ticket-box`
- Docker Desktop: đang chạy.
- Runtime Compose: PostgreSQL 16, Redis 7, Backend API, Admin Web và Audience Web.
- Backend E2E dùng database tách biệt `ticketbox_test` tại `localhost:5433`, không sửa dữ liệu demo.
- Thanh toán end-to-end trong lần chạy này dùng provider `mock`. VNPAY thật không được tính là đã kiểm thử vì cần bộ `TMN_CODE/HASH_SECRET` sandbox hoặc production hợp lệ và callback public.
- Scanner Mobile được kiểm thử parser/validator/type-check tại máy phát triển. Việc bật/tắt Wi-Fi hoặc chế độ máy bay trên thiết bị Android thật chưa thể tự động hóa từ terminal.

## 2. Thay đổi QR provision scanner

### Admin Web

Sau khi provision, Admin Web tạo ngay QR từ chính response hiện tại. Payload có version và gồm:

```json
{
  "type": "ticketbox-scanner-config",
  "version": 1,
  "apiBaseUrl": "http://<backend-ip>:3000/scanner",
  "deviceCode": "DEV-...",
  "accessToken": "<one-time-provision-response-token>"
}
```

QR chỉ tồn tại trong state của thẻ kết quả provision. Khi đóng/xóa phần thông tin provision, QR biến mất theo; hệ thống không tạo thêm enrollment token có hạn 5-10 phút.

Đường dẫn triển khai:

- `src/admin-web/src/components/scanner-manager.tsx`
- `src/admin-web/src/lib/scanner-setup-qr.ts`
- `src/admin-web/src/lib/scanner-setup-qr.test.ts`

### Scanner Mobile

Màn hình Setup có nút `Scan Setup QR`, xin quyền camera, kiểm tra schema QR, điền `API Base URL`, `Device ID` và `Bearer Token`, sau đó kết nối/lấy assignment theo flow hiện tại.

Đường dẫn triển khai:

- `src/scanner-mobile/src/screens/SetupScreen.tsx`
- `src/scanner-mobile/src/lib/scanner/setup-qr.ts`
- `src/scanner-mobile/src/lib/scanner/setup-qr.test.ts`

Với điện thoại thật, `apiBaseUrl` phải là địa chỉ LAN mà điện thoại truy cập được, ví dụ `http://192.168.2.7:3000/scanner`; không dùng `localhost` của máy phát triển.

## 3. Kết quả kiểm thử tự động

### 3.1 Backend unit test

Lệnh:

```powershell
cd src/backend-api
npm test -- --runInBand
```

Kết quả:

```text
Test Suites: 29 passed, 29 total
Tests:       130 passed, 130 total
```

### 3.2 Backend E2E trọng tâm

Chuẩn bị database test:

```powershell
docker compose exec -T postgres createdb -U ticketbox ticketbox_test
cd src/backend-api
$env:DATABASE_URL='postgresql://ticketbox:ticketbox123@localhost:5433/ticketbox_test?schema=public'
$env:DIRECT_URL=$env:DATABASE_URL
npx prisma migrate deploy
```

Lệnh kiểm thử:

```powershell
npm run test:e2e -- --runInBand test/checkout-flow.e2e-spec.ts test/scanner-assignment.e2e-spec.ts test/scanner-manifest.e2e-spec.ts test/scanner-check-in-sync.e2e-spec.ts
```

Kết quả:

```text
Test Suites: 4 passed, 4 total
Tests:       34 passed, 34 total
```

Các suite:

- `src/backend-api/test/checkout-flow.e2e-spec.ts`
- `src/backend-api/test/scanner-assignment.e2e-spec.ts`
- `src/backend-api/test/scanner-manifest.e2e-spec.ts`
- `src/backend-api/test/scanner-check-in-sync.e2e-spec.ts`

### 3.3 Admin Web

Lệnh:

```powershell
cd src/admin-web
npm test
npm run lint
npm run build
```

Kết quả: `6/6` test đạt; lint không có error; Next.js production build và TypeScript đạt. Hai test QR xác nhận payload dùng `deviceCode` và từ chối access token rỗng. Lint còn một warning không liên quan tại `src/app/admin/profile/page.tsx` do biến `error` chưa dùng.

### 3.4 Scanner Mobile

Lệnh:

```powershell
cd src/scanner-mobile
npm test
npx tsc --noEmit
```

Kết quả: `4/4` test đạt; TypeScript đạt. Test bao gồm parse QR cấu hình, từ chối sai loại QR, chuẩn hóa raw ticket token và chặn quét trùng cục bộ.

### 3.5 Docker Compose và smoke test

Lệnh build/chạy:

```powershell
docker compose up -d --build backend-api admin-web
docker compose ps
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\smoke-all.ps1 -AudienceEmail audience.three@ticketbox.local -TimeoutSeconds 30
```

Kết quả:

- `backend-api`, `admin-web`, `audience-web`, `postgres`, `redis`: `healthy`.
- Port: Backend `3000`, Audience `3001`, Admin `3002`, PostgreSQL host `5433`, Redis `6379`.
- Smoke test đạt auth Admin/Audience, catalog, reserve, tạo order, mock payment, đọc order và ticket.
- Script: `scripts/smoke-all.ps1`.

Record mới nhất được đối chiếu trực tiếp trong PostgreSQL sau smoke test:

| Record | ID/trạng thái |
| --- | --- |
| Order | `728e2ca3-6ed9-41d7-a517-abb6abbd1c43`, `issued`, `700000.00` |
| Payment | `c6f0c412-adfa-4a20-8d32-c933042044b6`, provider `mock`, `succeeded` |
| Ticket | `74bd9c78-42e4-41c1-ab4f-190b944a5af0`, `issued`, sequence `1` |
| QR | `qrToken` và `qrTokenHash` đều tồn tại |

### 3.6 File log kết quả

- `docs/test-evidence/logs/checkout-concurrency-2026-07-14.log`: tên 5 case checkout/quota/oversell được chọn và kết quả Jest `5 passed`.
- `docs/test-evidence/logs/checkout-smoke-2026-07-14.log`: output smoke end-to-end trên Docker Compose.
- `docs/test-evidence/logs/order-payment-ticket-records-2026-07-14.log`: snapshot Order/Payment/Ticket và trạng thái QR từ PostgreSQL.
- `scripts/capture-core-test-evidence.ps1`: chạy lại test và ghi đè bộ log theo ngày.

Lệnh tái tạo:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\capture-core-test-evidence.ps1 -EvidenceDate 2026-07-14
```

## 4. Ma trận yêu cầu

| Yêu cầu | Minh chứng | Kết luận |
| --- | --- | --- |
| Chọn loại/số lượng vé, thanh toán, sinh e-ticket QR | Smoke Compose; checkout E2E `completes reservation -> order -> mock success -> issued tickets`; test `returns renderable opaque QR token`; record Order/Payment/Ticket ở trên | Đạt với mock payment |
| Giới hạn vé/tài khoản trên toàn bộ đơn thành công, kể cả request đồng thời | Checkout E2E `does not let one user exceed quota with parallel requests` và `enforces quota across paid orders and concurrent follow-up requests` | Đạt |
| Soát vé offline, lưu tạm, sync, không mất dữ liệu/không vào hai lần | Mobile local duplicate test; Backend sync idempotency, partial replay, same-ticket conflict và two-device conflict E2E | Đạt tự động ở logic; cần kiểm thử thiết bị thật cho mất mạng/persistence |
| Không oversell vé cuối khi nhiều người mua đồng thời | Checkout E2E `does not oversell the last available ticket under concurrent requests` với 5 user tranh 1 vé | Đạt |

## 5. Cơ chế bảo vệ concurrency và dữ liệu

### Quota và inventory

- `src/backend-api/src/modules/inventory/inventory.repository.ts`: transaction khóa row inventory bằng `FOR UPDATE`.
- Cùng transaction khóa row `user_ticket_quotas` bằng `FOR UPDATE`.
- Quota được tính bằng `paidCount + reservedCount + requestedQuantity`, nên đơn đã thanh toán vẫn được tính vào giới hạn.
- Số vé khả dụng được tính từ `totalCapacity - reservedCount - soldCount`; cập nhật diễn ra trong transaction nên các request tranh vé cuối không cùng thành công.

### Scanner offline và chống trùng

- `src/scanner-mobile/src/lib/scanner/store.ts`: Zustand persist queue/manifest/assignment qua `AsyncStorage`.
- `src/scanner-mobile/src/lib/scanner/scan.ts`: kiểm tra manifest, revoked ticket và canonical local reference trước khi thêm queue; scan lặp trả `duplicate_local_scan`.
- `src/backend-api/src/modules/scanner/scanner.repository.ts`: dùng PostgreSQL advisory transaction lock theo concert/ticket và unique `clientEventId` để xử lý idempotency.
- Khi ACK đầu tiên được chấp nhận, backend cập nhật `Ticket.status = checked_in`; lần sau trả `ticket_already_checked_in`/conflict.

## 6. Kịch bản thiết bị thật còn cần chạy thủ công

Phần này không được ghi nhận là đã chạy trong phiên terminal:

1. Provision device trong Admin tại `http://localhost:3002/admin/scanners` và giữ thẻ response đang mở.
2. Sửa Scanner API URL trên thẻ QR thành IP LAN của backend, ví dụ `http://192.168.2.7:3000/scanner`.
3. Scanner Mobile > Setup > `Scan Setup QR`; xác nhận assignment và download manifest thành công.
4. Tắt Wi-Fi/mobile data, quét vé hợp lệ A; xác nhận vé vào pending queue.
5. Quét lại đúng QR A khi vẫn offline; kỳ vọng `duplicate_local_scan` và pending queue không tăng.
6. Đóng/mở lại app khi offline; xác nhận pending queue vẫn còn để chứng minh `AsyncStorage` không mất dữ liệu.
7. Bật mạng và Sync; kỳ vọng A `accepted`, queue được ACK/xóa.
8. Quét lại A hoặc dùng device thứ hai quét A rồi Sync; kỳ vọng conflict `ticket_already_checked_in`, không tạo check-in thành công thứ hai.
9. Kiểm tra Admin/ticket detail và database: `Ticket.status = checked_in`, chỉ một `CheckInEvent` thắng cho vé A.

## 7. Giới hạn và lưu ý

- Real VNPAY chưa được kiểm thử trong báo cáo này. Cần credential hợp lệ, `VNPAY_IPN_URL` public HTTPS và cấu hình website/IPN đúng trên portal VNPAY.
- Unit test Node có cảnh báo `MODULE_TYPELESS_PACKAGE_JSON`; không làm test thất bại.
- `npm install` của Admin báo 2 dependency vulnerability mức moderate; chưa tự động chạy `npm audit fix` để tránh thay đổi dependency ngoài phạm vi.
- QR provision chứa bearer token đầy đủ để thiết bị đăng nhập. Chỉ hiển thị trong response provision một lần; người vận hành phải tránh chụp/chia sẻ QR ngoài thiết bị được cấp.
