# Báo cáo đối chiếu TKPM_Checklist.xlsx với TicketBox

Ngày đánh giá: 12/07/2026. Phạm vi: mã nguồn và tài liệu trong repo `ticket-box`; checklist nguồn `D:\HK6\TKPM\TKPM_Checklist.xlsx`. Trạng thái chỉ dựa trên bằng chứng có trong workspace, không coi mô tả thiết kế là bằng chứng cài đặt và không suy đoán các tài sản Google Drive bên ngoài.

## Tổng hợp

| Nhóm | Đã hoàn thành | Hoàn thành một phần | Chưa hoàn thành | Tổng |
|---|---:|---:|---:|---:|
| Blueprint (BP01–BP15) | 15 | 0 | 0 | 15 |
| Cài đặt (IM01–IM18) | 14 | 3 | 1 | 18 |
| Nộp bài (SB01–SB05) | 0 | 0 | 5 | 5 |
| **Toàn bộ checklist** | **29** | **3** | **6** | **38** |

- Nếu tính mọi ID ngang nhau: hoàn thành đầy đủ **29/38 = 76,3%**; có triển khai ít nhất một phần **32/38 = 84,2%**.
- Trong 37 ID bắt buộc/luồng lựa chọn (loại BP14 “Khuyến nghị”): hoàn thành đầy đủ **28/37 = 75,7%**.
- Riêng phần cài đặt bắt buộc: hoàn thành đầy đủ **14/18 = 77,8%**; có triển khai ít nhất một phần **17/18 = 94,4%**.
- Ba mục “Chọn ít nhất 2 luồng” BP06–BP08 đều đã có, nên điều kiện chọn tối thiểu hai luồng được đáp ứng.

## Blueprint

### BP01 — Kiến trúc tổng thể

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `blueprint/01-system-design.md` mô tả mục tiêu, kiến trúc modular monolith, giao tiếp, service boundary và ảnh hưởng khi thành phần lỗi (đặc biệt các mục “Kiến trúc được chọn”, “Cách các thành phần giao tiếp”, “Ảnh hưởng khi một phần gặp sự cố”). `blueprint/10-technology-stack.md` bổ sung lựa chọn công nghệ/trade-off.
3. **Thiếu sót và hướng triển khai:** Không thiếu phần bắt buộc. Nên thêm liên kết từ README gốc và ma trận “thành phần thiết kế → module code” để chấm nhanh.
4. **Đóng góp tổng hợp:** 1 mục Blueprint bắt buộc hoàn thành.

### BP02 — C4 Level 1 System Context

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `blueprint/02-c4-diagrams.md`, mục `Level 1 - System Context`, có sơ đồ Mermaid và diễn giải Khán giả, Ban tổ chức, Nhân sự soát vé cùng VNPAY/MoMo, AI và nguồn CSV.
3. **Thiếu sót và hướng triển khai:** Không thiếu nội dung bắt buộc; nên xuất Mermaid thành ảnh/PDF khi đóng gói để tránh phụ thuộc renderer.
4. **Đóng góp tổng hợp:** 1 mục Blueprint bắt buộc hoàn thành.

### BP03 — C4 Level 2 Container

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `blueprint/02-c4-diagrams.md`, mục `Level 2 - Container` và `Công nghệ đề xuất theo container`, thể hiện audience/admin/scanner, backend, PostgreSQL, Redis, broker/object storage và giao tiếp.
3. **Thiếu sót và hướng triển khai:** Sơ đồ mô tả cả container mục tiêu (ví dụ broker/object storage) trong khi bản demo dùng phương án nhẹ hơn; nên gắn nhãn rõ “implemented” và “target”.
4. **Đóng góp tổng hợp:** 1 mục Blueprint bắt buộc hoàn thành.

### BP04 — High-Level Architecture

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `blueprint/03-high-level-architecture.md` có sơ đồ tổng quan, điểm tích hợp, dependency của checkout, topology và trade-off; `blueprint/05-business-flows.md` mô tả payment, AI, CSV, offline check-in và lỗi giữa chừng.
3. **Thiếu sót và hướng triển khai:** Không thiếu yêu cầu chính; nên chú thích failure boundary trực tiếp bằng màu/legend trong bản PDF.
4. **Đóng góp tổng hợp:** 1 mục Blueprint bắt buộc hoàn thành.

### BP05 — Thiết kế dữ liệu

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `blueprint/04-database-design.md` có lựa chọn PostgreSQL, ER diagram, entity và transaction giữ vé; schema thực tế ở `src/backend-api/prisma/schema.prisma` (Concert, Reservation, Order, Payment, Ticket, InventoryCounter, UserTicketQuota, Guest List, Artist Bio, Scanner/CheckIn).
3. **Thiếu sót và hướng triển khai:** Tài liệu và schema có thể lệch nhỏ theo thời gian; nên sinh ERD từ Prisma trong CI hoặc thêm migration/schema version vào blueprint.
4. **Đóng góp tổng hợp:** 1 mục Blueprint bắt buộc hoàn thành.

### BP06 — Luồng mua vé

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `blueprint/05-business-flows.md`, mục `Luồng mua vé` và `Xử lý lỗi giữa chừng`; đặc tả chi tiết ở `blueprint/specs/ticket-purchase.md` và `blueprint/specs/payment.md`.
3. **Thiếu sót và hướng triển khai:** Không thiếu phần được chọn; nên thêm link tới `src/backend-api/test/checkout-flow.e2e-spec.ts` làm bằng chứng thực thi.
4. **Đóng góp tổng hợp:** 1 trong 3 luồng lựa chọn hoàn thành.

### BP07 — Luồng soát vé offline và đồng bộ

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `blueprint/05-business-flows.md`, mục `Luồng soát vé khi mất mạng và đồng bộ lại`; `blueprint/specs/offline-check-in.md`; policy conflict tại `blueprint/07-protection-mechanisms.md`, mục `Check-in offline conflict policy`.
3. **Thiếu sót và hướng triển khai:** Rủi ro hai thiết bị cùng offline được thừa nhận đúng; nên ghi rõ SLA đồng bộ và playbook xử lý conflict cho nhân viên.
4. **Đóng góp tổng hợp:** 1 trong 3 luồng lựa chọn hoàn thành.

### BP08 — Luồng Guest List CSV

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `blueprint/05-business-flows.md`, mục `Luồng nhập danh sách khách mời từ CSV`; `blueprint/specs/guest-list-import.md`; quyết định staging/version/idempotency ở `blueprint/core-design-decisions/guest-list-csv-import.md`.
3. **Thiếu sót và hướng triển khai:** Không thiếu phần thiết kế; nên bổ sung sequence riêng cho nguồn file định kỳ/drop-folder vì code hiện chủ yếu nhận upload quản trị.
4. **Đóng góp tổng hợp:** 1 trong 3 luồng lựa chọn hoàn thành.

### BP09 — Thiết kế kiểm soát truy cập

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `blueprint/06-access-control.md` có vai trò, ma trận quyền và enforcement tại API/admin/scanner; code tương ứng gồm `auth.guard.ts`, `roles.guard.ts`, `scanner-auth.guard.ts`, `src/admin-web/src/proxy.ts`.
3. **Thiếu sót và hướng triển khai:** Blueprint có yêu cầu audit log nhưng chưa thấy module audit riêng; không làm thiếu tiêu chí ma trận/enforcement, nhưng nên bổ sung bảng audit và interceptor ghi thao tác nhạy cảm.
4. **Đóng góp tổng hợp:** 1 mục Blueprint bắt buộc hoàn thành.

### BP10 — Tải đột biến/rate limiting

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `blueprint/07-protection-mechanisms.md`, mục `Kiểm soát tải đột biến`, mô tả token bucket, key, waiting room và overload response; `blueprint/core-design-decisions/sale-traffic-spike.md` ghi trade-off cho 80.000 người/5 phút.
3. **Thiếu sót và hướng triển khai:** Nên thêm bảng capacity calculation cụ thể cho 70% phút đầu và kịch bản load-test gắn với các ngưỡng cấu hình.
4. **Đóng góp tổng hợp:** 1 mục Blueprint bắt buộc hoàn thành.

### BP11 — Circuit Breaker và graceful degradation

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `blueprint/07-protection-mechanisms.md`, mục `Xử lý cổng thanh toán không ổn định`, có Closed/Open/Half-Open, retry, fallback/state machine; ADR `blueprint/core-design-decisions/unstable-payment-gateway.md`.
3. **Thiếu sót và hướng triển khai:** Không thiếu phần bắt buộc; nên đồng bộ trực tiếp threshold blueprint với biến môi trường/config runtime để tránh drift.
4. **Đóng góp tổng hợp:** 1 mục Blueprint bắt buộc hoàn thành.

### BP12 — Idempotency Key

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `blueprint/07-protection-mechanisms.md`, mục `Chống trừ tiền hai lần`, mô tả key, lưu/check, TTL và replay; `blueprint/specs/payment.md` quy định lỗi/retry.
3. **Thiếu sót và hướng triển khai:** Nên thêm bảng mã phản hồi HTTP cho key trùng nhưng payload khác và policy cleanup bản ghi hết hạn.
4. **Đóng góp tổng hợp:** 1 mục Blueprint bắt buộc hoàn thành.

### BP13 — Caching

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `blueprint/07-protection-mechanisms.md`, mục `Caching`, nêu cache-aside, TTL và invalidation; `blueprint/core-design-decisions/high-read-traffic.md` phân tích trade-off.
3. **Thiếu sót và hướng triển khai:** Nên lập bảng key/TTL/invalidation event duy nhất để đối chiếu trực tiếp với constants trong code.
4. **Đóng góp tổng hợp:** 1 mục Blueprint bắt buộc hoàn thành.

### BP14 — ADR

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `blueprint/core-design-decisions/` có ADR cho payment gateway, spike/fairness, per-user limit, last-ticket contention, offline check-in, notification, caching, CSV và AI; `docs/blueprint-reliability-technology-tradeoffs.md` bổ sung so sánh công nghệ.
3. **Thiếu sót và hướng triển khai:** Nên chuẩn hóa mỗi ADR với status/date/owner/consequences và link tới code/test.
4. **Đóng góp tổng hợp:** Mục khuyến nghị hoàn thành; không đưa vào mẫu số “bắt buộc”.

### BP15 — Tổ chức tài liệu Blueprint

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `blueprint/README.md`, các tài liệu `01`–`10`, thư mục `blueprint/specs/` và `blueprint/core-design-decisions/`; các spec có `Kịch bản lỗi`, `Ràng buộc`, `Tiêu chí chấp nhận`.
3. **Thiếu sót và hướng triển khai:** Không dùng đúng tên `proposal.md/design.md` nhưng cấu trúc tương đương và đầy đủ hơn; khi nộp nên gom/xuất thành `blueprint.pdf` để đáp ứng định dạng chấm phổ biến.
4. **Đóng góp tổng hợp:** 1 mục Blueprint bắt buộc hoàn thành.

## Cài đặt

### IM01 — Xem concert/chi tiết/nghệ sĩ/địa điểm/sơ đồ/vé còn lại

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** API `src/backend-api/src/modules/concert/concerts.controller.ts` và `concerts.service.ts`; UI `src/audience-web/src/app/concerts/page.tsx`, `concerts/[id]/page.tsx`, `components/seating-map.tsx`; seed `src/backend-api/prisma/seed.js` có 4 concert, nghệ sĩ, địa điểm, `seatingMapObjectKey`, ticket types/inventory.
3. **Thiếu sót và hướng triển khai:** Sơ đồ được dựng bằng component SVG thay vì thấy các file SVG vật lý tương ứng object key; nên thống nhất asset thật hoặc bỏ object key không phục vụ để demo không tạo kỳ vọng sai.
4. **Đóng góp tổng hợp:** 1/18 mục cài đặt hoàn thành.

### IM02 — Chọn vé, thanh toán và e-ticket QR

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `src/audience-web/src/components/checkout-client.tsx`, `app/concerts/[id]/checkout/page.tsx`, `app/orders/[id]/page.tsx`, `app/tickets/[id]/page.tsx`; backend `inventory`, `order`, `payment`, `ticket/ticket-issuance.service.ts`; E2E `test/checkout-flow.e2e-spec.ts`.
3. **Thiếu sót và hướng triển khai:** Có VNPAY + mock nhưng chưa thấy MoMo provider thật; thêm `momo-payment-provider.ts` nếu cần demo cả hai cổng.
4. **Đóng góp tổng hợp:** 2/18 mục cài đặt hoàn thành.

### IM03 — Enforce giới hạn vé/tài khoản

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `schema.prisma` có `UserTicketQuota`; transaction/locking trong `inventory.service.ts` và `inventory.repository.ts`; test song song `checkout-flow.e2e-spec.ts` với case `does not let one user exceed quota with parallel requests`.
3. **Thiếu sót và hướng triển khai:** Nên thêm stress test nhiều process/connection, không chỉ concurrent Promise trong một test runner.
4. **Đóng góp tổng hợp:** 3/18 mục cài đặt hoàn thành.

### IM04 — Thông báo sau mua và nhắc 24 giờ

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `notification-channel.adapter.ts`, `in-app-channel.adapter.ts`, `smtp-email-channel.adapter.ts`, `notification-worker.service.ts`, `notification-reminder.scheduler.ts`; các file `.spec.ts` kiểm chứng worker/scheduler/adapters.
3. **Thiếu sót và hướng triển khai:** Nên thêm test E2E với SMTP test server và cấu hình timezone rõ ràng; kiến trúc adapter đã đáp ứng khả năng thêm kênh.
4. **Đóng góp tổng hợp:** 4/18 mục cài đặt hoàn thành.

### IM05 — Quản trị concert/ticket/doanh thu

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** API `admin.controller.ts` có `GET /admin/dashboard`, CRUD, `POST /concerts/:id/cancel`; `admin.service.ts` tính gross revenue, sold/reserved/available, refund exposure và workflow hủy; UI `admin/dashboard/page.tsx`, `concert-form.tsx`, `ticket-types-manager.tsx`, `concert-cancellation-manager.tsx`.
3. **Thiếu sót và hướng triển khai:** Nên bổ sung test E2E đầy đủ cho dashboard/cancel/refund và export báo cáo; hiện bằng chứng code đầy đủ nhưng test admin chủ yếu ở unit/integration rời.
4. **Đóng góp tổng hợp:** 5/18 mục cài đặt hoàn thành.

### IM06 — RBAC thật ở API/admin/scanner

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `auth.guard.ts`, `roles.guard.ts`, `roles.decorator.ts`; admin controllers dùng role organizer; `scanner-auth.guard.ts` và scanner routes; `src/admin-web/src/proxy.ts` bảo vệ trang quản trị; auth/scanner E2E specs.
3. **Thiếu sót và hướng triển khai:** Nên thêm ma trận test tự động cho mọi endpoint với audience/organizer/scanner và case tenant khác organization.
4. **Đóng góp tổng hợp:** 6/18 mục cài đặt hoàn thành.

### IM07 — App quét QR và xác nhận tại cổng

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** Mobile `scanner-mobile/src/screens/ScanScreen.tsx`, `src/lib/scanner/scan.ts`, `scan.test.ts`; backend `scanner.controller.ts`, `scanner.service.ts`, `scanner.repository.ts`; E2E `scanner-check-in-sync.e2e-spec.ts`.
3. **Thiếu sót và hướng triển khai:** Nên thêm hướng dẫn camera/device permission và kiểm thử trên thiết bị thật.
4. **Đóng góp tổng hợp:** 7/18 mục cài đặt hoàn thành.

### IM08 — Soát vé offline và đồng bộ

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** Mobile `store.ts`, `manifest.ts`, `queue-event.ts`, `scan.ts`; backend manifest/sync và `scanner-check-in-sync.e2e-spec.ts` có accepted/conflict/duplicate replay.
3. **Thiếu sót và hướng triển khai:** Không thể tuyệt đối ngăn hai thiết bị hoàn toàn offline cùng nhận một vé; cần demo/UX conflict rõ và quy trình vận hành phân vùng gate như blueprint.
4. **Đóng góp tổng hợp:** 8/18 mục cài đặt hoàn thành.

### IM09 — AI Artist Bio

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `artist-bio-pdf.util.ts`, validation/storage/queue/worker/processor services, `gemini-artist-bio.provider.ts` cùng fallback/mock, review DTO/service; UI `artist-bio-manager.tsx`; PDF mẫu trong `docs/test-data/`; unit specs cho pipeline.
3. **Thiếu sót và hướng triển khai:** Chưa thấy OCR cho PDF scan-only/malware scan; thêm adapter OCR và scan file nếu muốn production-hardening.
4. **Đóng góp tổng hợp:** 9/18 mục cài đặt hoàn thành.

### IM10 — Guest List CSV định kỳ

1. **Trạng thái:** **[Hoàn thành một phần]**.
2. **Bằng chứng:** `guest-list-import.service.ts` có checksum idempotency, staging, validation/dedupe/publish; `guest-list-csv.util.ts`; admin upload/list/errors APIs và `guest-list-import-manager.tsx`; 18 bộ CSV trong `docs/test-data/guest-list-scenarios/`; unit tests xử lý duplicate/invalid.
3. **Thiếu sót và hướng triển khai:** Chưa thấy scheduler/drop-folder/SFTP polling thực sự để “định kỳ nhập”; luồng hiện là admin upload rồi xử lý. Thêm `guest-list-import.scheduler.ts` dùng `@Cron`, source adapter (folder/SFTP/object storage), distributed lease và job status/retry; đăng ký trong `guest-list.module.ts`.
4. **Đóng góp tổng hợp:** 1/3 mục cài đặt còn một phần; chưa tính vào số hoàn thành đầy đủ.

### IM11 — Không oversell vé cuối

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** atomic transaction ở `inventory.repository.ts`/`inventory.service.ts`, `InventoryCounter` trong Prisma; E2E `checkout-flow.e2e-spec.ts` có case `does not oversell the last available ticket under concurrent requests`.
3. **Thiếu sót và hướng triển khai:** Nên lưu kết quả load/stress test với PostgreSQL thật và nhiều instance backend để tăng sức thuyết phục.
4. **Đóng góp tổng hợp:** 10/18 mục cài đặt hoàn thành.

### IM12 — Bảo vệ tải đột biến/bot-fairness

1. **Trạng thái:** **[Hoàn thành một phần]**.
2. **Bằng chứng:** `common/cache/rate-limit.guard.ts`, decorator/constants và Redis fallback; `inventory/reservation-risk.guard.ts`; unit specs; audience có `waiting-room-banner.tsx` và sale-access-token storage.
3. **Thiếu sót và hướng triển khai:** Chưa thấy load test chứng minh ngưỡng 80.000/5 phút và chưa có backend waiting-room/admission token/fair queue hoàn chỉnh. Thêm module `sale-admission`, Redis sorted-set/token issuance, CAPTCHA/risk adapter và k6/Artillery script + report.
4. **Đóng góp tổng hợp:** 2/3 mục cài đặt còn một phần; chưa tính vào số hoàn thành đầy đủ.

### IM13 — Circuit breaker/graceful degradation thật

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `payment-circuit-breaker.service.ts`, `payment-bulkhead.service.ts`, `resilient-payment-provider.ts` và specs; `docs/phase2-hardening-demo.md` có kịch bản timeout/circuit/reconciliation; public concert read path tách khỏi payment.
3. **Thiếu sót và hướng triển khai:** Nên thêm một E2E tự động assert concert page/API vẫn hoạt động khi provider liên tục lỗi.
4. **Đóng góp tổng hợp:** 11/18 mục cài đặt hoàn thành.

### IM14 — Idempotency thật

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `common/idempotency/idempotency.service.ts`, model `IdempotencyRecord`, header `Idempotency-Key`; `checkout-flow.e2e-spec.ts` kiểm tra duplicate reservation/request và webhook replay không sinh ticket trùng.
3. **Thiếu sót và hướng triển khai:** Nên thêm test concurrent retry cùng key ở nhiều connection/process và test payload mismatch công khai trong tài liệu API.
4. **Đóng góp tổng hợp:** 12/18 mục cài đặt hoàn thành.

### IM15 — Caching thật

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `common/cache/cache.service.ts`, `redis.service.ts`, `cache-invalidation.service.ts`; concert/inventory dùng cache-aside; `cache.service.spec.ts` có hit/miss/coalescing; admin write/poster flow gọi invalidation.
3. **Thiếu sót và hướng triển khai:** Nên thêm consistency E2E sau update và metric cache hit ratio thay vì chỉ unit/log.
4. **Đóng góp tổng hợp:** 13/18 mục cài đặt hoàn thành.

### IM16 — README clone-and-run

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `README.md` ở root có prerequisites, cấu hình, thứ tự chạy hệ thống, tài khoản seed, hướng dẫn Scanner Mobile, smoke test và troubleshooting.
3. **Thiếu sót và hướng triển khai:** Có thể tách phần Scanner Mobile thành README riêng để tiện tra cứu, nhưng không chặn clone-and-run.
4. **Đóng góp tổng hợp:** 14/18 mục cài đặt hoàn thành.

### IM17 — Seed 4 concert mẫu

1. **Trạng thái:** **[Đã hoàn thành]**.
2. **Bằng chứng:** `src/backend-api/prisma/seed.js` seed đúng 4 tên `Anh Trai Say Hi`, `Chị Đẹp Đạp Gió Rẽ Sóng`, `Anh Trai Vượt Ngàn Chông Gai`, `Em Xinh Say Hi`, kèm nghệ sĩ/địa điểm, `seatingMapObjectKey`, ticket type, giá, capacity/inventory; poster UI nằm ở `src/audience-web/public/concert-posters/`.
3. **Thiếu sót và hướng triển khai:** Không thấy file seating-map SVG vật lý tương ứng các object key; nên thêm asset seed hoặc ghi rõ `components/seating-map.tsx` là renderer chính. Nên có smoke assertion kiểm tra đủ 4 concert sau seed.
4. **Đóng góp tổng hợp:** 15/18 mục cài đặt hoàn thành.

### IM18 — Khởi chạy/demo toàn hệ thống

1. **Trạng thái:** **[Hoàn thành một phần]**.
2. **Bằng chứng:** `src/backend-api/docker-compose.yml` khởi chạy PostgreSQL/Redis; mỗi app có package scripts; backend có nhiều E2E và `test-all-backend.ps1`; scanner mobile có test setup/scan.
3. **Thiếu sót và hướng triển khai:** Chưa có compose/script gốc chạy backend + audience + admin + scanner cùng lúc và chưa có smoke E2E xuyên toàn hệ thống. Thêm root `docker-compose.yml`/`start-all.ps1`, health dependency checks, `.env.example` tổng và `smoke-all.ps1` chạy login → reserve → payment mock → ticket → scanner sync.
4. **Đóng góp tổng hợp:** 3/3 mục cài đặt còn một phần; chưa tính vào số hoàn thành đầy đủ.

## Nộp bài

### SB01 — Google Drive public

1. **Trạng thái:** **[Chưa hoàn thành]** (không có bằng chứng trong workspace).
2. **Bằng chứng:** Không tìm thấy link Drive, ảnh kiểm tra quyền hoặc manifest nộp bài trong repo.
3. **Thiếu sót và hướng triển khai:** Tạo thư mục Drive, đặt quyền “Anyone with the link – Viewer”, thử bằng cửa sổ ẩn danh/tài khoản khác và lưu ảnh xác nhận.
4. **Đóng góp tổng hợp:** 1/5 mục nộp bài chưa hoàn thành.

### SB02 — Drive có Blueprint

1. **Trạng thái:** **[Chưa hoàn thành]** (không xác minh được Drive).
2. **Bằng chứng:** Repo có thư mục `blueprint/` đầy đủ, nhưng không có `blueprint.pdf` hay link trực tiếp Drive chứng minh đã upload.
3. **Thiếu sót và hướng triển khai:** Xuất tài liệu Mermaid/Markdown thành `blueprint.pdf` hoặc upload nguyên thư mục `blueprint/`; thêm link trực tiếp và kiểm tra ẩn danh.
4. **Đóng góp tổng hợp:** 2/5 mục nộp bài chưa hoàn thành; nội dung nguồn đã sẵn sàng.

### SB03 — Drive có src/data/README

1. **Trạng thái:** **[Chưa hoàn thành]**.
2. **Bằng chứng:** Repo có `src/` và dữ liệu seed/test, nhưng không có root `README.md`, không có thư mục root `data/`, và không có link Drive.
3. **Thiếu sót và hướng triển khai:** Hoàn thiện IM16; tạo `data/` đóng gói seed/assets/test files hoặc tài liệu chỉ rõ vị trí; upload và kiểm tra cấu trúc trên Drive.
4. **Đóng góp tổng hợp:** 3/5 mục nộp bài chưa hoàn thành.

### SB04 — Video clips

1. **Trạng thái:** **[Chưa hoàn thành]**.
2. **Bằng chứng:** Không tìm thấy thư mục `clips/` hoặc file MP4 trong repo, cũng không có link video.
3. **Thiếu sót và hướng triển khai:** Quay demo 1080p khoảng 720 kbps có camera + code/app; bao phủ mua vé, admin, AI/CSV, offline scan/sync và resilience; kiểm tra phát bằng tài khoản ẩn danh.
4. **Đóng góp tổng hợp:** 4/5 mục nộp bài chưa hoàn thành.

### SB05 — File text mã nhóm/MSSV và link Drive

1. **Trạng thái:** **[Chưa hoàn thành]**.
2. **Bằng chứng:** Không tìm thấy file `.txt` đúng quy ước tên chứa link Drive public trong root.
3. **Thiếu sót và hướng triển khai:** Tạo `<mã-nhóm>_<mssv1>_....txt`, chỉ ghi link Drive public theo yêu cầu; mở thử link từ nội dung file trước khi nộp.
4. **Đóng góp tổng hợp:** 5/5 mục nộp bài chưa hoàn thành.

## Ưu tiên khép kín checklist

1. Tạo README gốc và script/compose khởi chạy + smoke test toàn hệ thống (IM16, IM18, đồng thời mở đường cho SB03).
2. Thêm scheduler/source adapter cho Guest List CSV (IM10).
3. Hoàn thiện backend waiting room/fair admission và lưu báo cáo load test (IM12).
4. Chuẩn hóa asset seating-map và test seed 4 concert để bằng chứng IM01/IM17 không còn điểm mơ hồ.
5. Đóng gói Blueprint, source/data/README, quay clips, upload Drive và tạo file link (SB01–SB05).

## Ghi chú về độ tin cậy đánh giá

- Báo cáo là static review: có kiểm tra file/code/test hiện hữu nhưng không chạy toàn bộ stack và không truy cập Drive bên ngoài.
- “Đã hoàn thành” nghĩa là có chuỗi bằng chứng thiết kế/code/test hợp lý trong repo, không đồng nghĩa đã qua kiểm thử tải/production acceptance.
- `docs/implementation-checklist.md` có một số nhận định đã cũ (ví dụ dashboard admin, cancel workflow và seed 4 concert hiện đã có); báo cáo này ưu tiên trạng thái code mới nhất.
