# Báo cáo Đánh giá Đóng góp Thành viên Nguyễn Hữu Phúc (MSSV: 23120157)
**Dự án:** TicketBox - Công nghệ Phần mềm
**Ngày đối chiếu:** 14/07/2026
**Tài liệu đối chiếu:** `FileDanhGia.xlsx` và Mã nguồn hiện tại trong repository

---

## 1. Tổng quan thông tin cá nhân
- **Họ và tên:** Nguyễn Hữu Phúc
- **MSSV:** 23120157
- **Email:** 23120157@student.hcmus.edu.vn
- **Vai trò:** Backend (chịu trách nhiệm chính các phần Caching, Rate Limiting, Guest List Import, Admin APIs & Dashboard, Email)
- **Tài khoản Git:** `Nhp125` / `Nguyễn Phúc` (`nguyenhuuphuc12052005@gmail.com`)
- **Kết quả đối chiếu Git Log:** **Khớp**. Các commit chính liên quan đến các tính năng trên đều do tài khoản Git này thực hiện.

---

## 2. Kết quả đối chiếu chi tiết từng hạng mục yêu cầu (ChecklistYeuCau)

Dưới đây là kết quả kiểm tra đối chiếu giữa các thông tin tự khai báo trong file Excel với mã nguồn và tài liệu thực tế trong dự án:

| ID Yêu cầu | Tên Yêu cầu | Trạng thái trong Excel | Kiểm tra thực tế trong Code / Tài liệu | Kết quả đối chiếu & Nhận xét |
| :--- | :--- | :--- | :--- | :--- |
| **BP08** | Luồng Guest List CSV (Blueprint) | Hoàn thành (100% - Đạt) | Tài liệu thiết kế tại [guest-list-csv-import.md](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/blueprint/core-design-decisions/guest-list-csv-import.md) mô tả quy trình bất đồng bộ: raw file $\rightarrow$ staging $\rightarrow$ validation $\rightarrow$ dedupe $\rightarrow$ publish. | **Đúng thực tế**. Thiết kế chi tiết, chỉ ra đầy đủ phương án và đánh đổi. |
| **BP10** | Tải đột biến/rate limiting (Blueprint) | Hoàn thành (100% - Đạt) | Tài liệu thiết kế tại [sale-traffic-spike.md](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/blueprint/core-design-decisions/sale-traffic-spike.md) mô tả các lớp bảo vệ (Waiting room, Redis Rate limit, Backpressure). | **Đúng thực tế**. Thiết kế đáp ứng yêu cầu cho tải đột biến 80.000 user / 5 phút. |
| **BP11** | Circuit Breaker (Blueprint) | Hoàn thành (100% - Đạt) | Tài liệu thiết kế tại [unstable-payment-gateway.md](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/blueprint/core-design-decisions/unstable-payment-gateway.md). | **Đúng thực tế**. Tài liệu thiết kế do Phúc co-author cùng Danh và Toàn. Tuy nhiên phần code logic chính do Toàn cài đặt (xem chi tiết ở mục task T29 phía dưới). |
| **BP13** | Caching (Blueprint) | Hoàn thành (100% - Đạt) | Tài liệu thiết kế tại [high-read-traffic.md](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/blueprint/core-design-decisions/high-read-traffic.md). | **Đúng thực tế**. Chi tiết về cache-aside, TTL cho list/detail và inventory. |
| **IM04** | Thông báo sau mua & nhắc trước 24 giờ | Hoàn thành (100% - Đạt) | Code gửi email và in-app tại [notification.service.ts](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/backend-api/src/modules/notification/notification.service.ts) và SMTP email adapter. | **Đúng thực tế**. Phúc xây dựng service notification cốt lõi và tích hợp SMTP email channel adapter. Phần scheduler do Toàn hoàn thiện. |
| **IM05** | Quản trị admin (CRUD/Dashboard/Refund) | Hoàn thành (100% - Đạt) | Code giao diện quản trị tại thư mục `src/admin-web/`. Các file [dashboard/page.tsx](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/admin-web/src/app/admin/dashboard/page.tsx) và [concert-cancellation-manager.tsx](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/admin-web/src/components/concert-cancellation-manager.tsx) do Phúc code. | **Đúng thực tế**. Giao diện và API đáp ứng đầy đủ yêu cầu quản lý concert, doanh thu và hoàn tiền. |
| **IM10** | Guest List CSV định kỳ | Hoàn thành (100% - Đạt) | Code import tại [guest-list-import.service.ts](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/backend-api/src/modules/guest-list/guest-list-import.service.ts). Các kịch bản test tại [guest-list-import.service.spec.ts](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/backend-api/src/modules/guest-list/guest-list-import.service.spec.ts). | **Chênh lệch nhẹ về mức độ hoàn thành**. Code đã xử lý tốt staging, validation, dedupe và publish all-or-nothing. Tuy nhiên, đúng như báo cáo [checklist-assessment-report.md](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/docs/checklist-assessment-report.md#L191-L197) đã chỉ ra, hệ thống chưa có Cron job/scheduler tự động quét thư mục (SFTP/drop-folder) định kỳ mà hiện tại vẫn là **Admin upload thủ công qua UI**. Do đó, trạng thái đúng kỹ thuật là **Hoàn thành một phần**. |
| **IM12** | Bảo vệ tải đột biến / rate limiting | Hoàn thành (90% - Đạt) | Code [rate-limit.guard.ts](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/backend-api/src/common/cache/rate-limit.guard.ts) và unit tests. | **Đúng thực tế**. Guard hỗ trợ đầy đủ 3 scope (IP, User, Device) bằng Redis fixed-window. Đúng như ghi chú của nhóm trong Excel, dự án **vẫn thiếu báo cáo Load Test k6 / report RPS** để chứng minh khả năng chịu tải 80.000 người/5 phút. |
| **IM15** | Caching | Hoàn thành (100% - Đạt) | Lớp cache dùng chung tại [cache.service.ts](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/backend-api/src/common/cache/cache.service.ts) và invalidation tại [cache-invalidation.service.ts](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/backend-api/src/common/cache/cache-invalidation.service.ts). | **Đúng thực tế**. Code chạy đạt các unit test về hit/miss coalescing, miss budget, và TTL. Ghi chú trong file Excel ("thiếu log/report chạy Redis cache end-to-end") là đúng do thiếu báo cáo thực nghiệm chạy thật ngoài môi trường unit test. |
| **IM18** | Khởi chạy/demo toàn hệ thống | Đang làm (70% - Chưa kiểm tra) | Có file [docker-compose.yml](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/backend-api/docker-compose.yml) để chạy Postgres/Redis ở backend. | **Đúng thực tế**. Hiện tại dự án vẫn chưa có file docker-compose/start script ở thư mục gốc của toàn bộ dự án để khởi động đồng thời cả 5 ứng dụng (audience, admin, scanner, backend). Trạng thái 70% (đang làm) là chính xác. |

---

## 3. Kết quả đối chiếu phân công công việc cá nhân (PhanCongTask)

Đối chiếu 9 task chính được phân công cho Nguyễn Hữu Phúc trong sheet `03_PhanCongTask`:

1. **T16 (Thiết kế Reliability - BP10):** Đóng góp rà soát tài liệu kiến trúc. **Đúng thực tế** (co-author trong blueprint).
2. **T17 (Xây Admin Web/API - IM05):** Phúc viết API/UI CRUD cho concert & ticket type. **Đúng thực tế** (PR #17).
3. **T18 (Cài đặt Notification - IM04):** Xây dựng flow gửi mail và in-app. **Đúng thực tế** (File [notification.service.ts](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/backend-api/src/modules/notification/notification.service.ts) do Phúc code chính).
4. **T19 (Cài đặt Rate Limit - IM12):** Hiện thực fixed-window rate limit trên Redis. **Đúng thực tế** (File [rate-limit.guard.ts](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/backend-api/src/common/cache/rate-limit.guard.ts) do Phúc code).
5. **T20 (Cài đặt Caching - IM15):** Xây dựng CacheService với coalescing và miss budget. **Đúng thực tế** (File [cache.service.ts](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/backend-api/src/common/cache/cache.service.ts) do Phúc code).
6. **T21 (Import Guest List CSV - IM10):** Pipeline validation, staging, dedupe. **Đúng thực tế** (File [guest-list-import.service.ts](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/backend-api/src/modules/guest-list/guest-list-import.service.ts) do Phúc code).
7. **T22 (Tích hợp UI Guest List - IM05):** Phúc thiết kế lại UI Admin để tải lên và kiểm tra lỗi CSV. **Đúng thực tế** (File [guest-list-import-manager.tsx](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/admin-web/src/components/guest-list-import-manager.tsx)).
8. **T23 (Tích hợp Artist Bio - IM09):** Tích hợp màn hình theo dõi job AI, review và sửa draft. **Đúng thực tế** (File [artist-bio-manager.tsx](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/admin-web/src/components/artist-bio-manager.tsx)).
9. **T24 (Dashboard doanh thu & Hủy/Refund - IM05):** Xây dựng dashboard tổng hợp và refund workflow. **Đúng thực tế** (File [concert-cancellation-manager.tsx](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/admin-web/src/components/concert-cancellation-manager.tsx) và [dashboard/page.tsx](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/admin-web/src/app/admin/dashboard/page.tsx)).

---

## 4. Phát hiện sai sót / Điểm bất thường trong bảng tính Excel

### 1. Lỗi công thức tính Điểm Công Việc tại Task T23 (Bất thường lớn)
- **Thông tin trong bảng:** Task T23 có Độ khó = `4.0`, % HT = `100.0`, Chất lượng = `5.0`. Điểm số ghi nhận trong cột N là **`3.84`**.
- **Công thức chuẩn của nhóm:** `Điểm công việc = Độ khó * (% HT / 100) * (Chất lượng / 5.0) * 1.2`
- **Tính toán lý thuyết:** `4.0 * 1.0 * (5.0 / 5.0) * 1.2 = 4.8`
- **Nguyên nhân:** Giá trị `3.84` trong Excel bị nhập cứng (hardcoded) tương ứng với Chất lượng = `4.0` (như ở task T22), có thể do lỗi copy-paste và không sử dụng công thức Excel tự động.
- **Ảnh hưởng:** Nguyễn Hữu Phúc bị **thiếu mất 0.96 điểm** cho task này. Nếu tính đúng, tổng điểm công việc trong sheet `03_PhanCongTask` và `08_TongHopGV` phải là **`47.04`** thay vì **`46.08`**.

### 2. Sự không nhất quán về Vai trò sở hữu Circuit Breaker (BP11 / IM13)
- Trong sheet `02_ChecklistYeuCau` (dòng 16) và sheet `06_MinhChung_NopBai` (dòng 16), người sở hữu (Owner) hạng mục **BP11 / MC11 (Circuit Breaker)** được khai báo là **Nguyễn Hữu Phúc**.
- Tuy nhiên:
  - Trong sheet `07_ChuanBiVanDap` (dòng 11), người phụ trách giải thích vấn đáp là **Huỳnh Thái Toàn**.
  - Trong sheet `03_PhanCongTask` (dòng 34 - task T29), người chính thực hiện code Circuit Breaker là **Huỳnh Thái Toàn**, người phối hợp là Nguyễn Minh Tú. Phúc không tham gia vào task T29 này.
  - Lịch sử Git log của file code [payment-circuit-breaker.service.ts](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/src/backend-api/src/modules/payment/resilience/payment-circuit-breaker.service.ts) cho thấy file này chỉ được chỉnh sửa bởi Toàn và Danh. Phúc có tham gia viết tài liệu thiết kế blueprint [unstable-payment-gateway.md](file:///d:/HK2 25-26/Tkpm/Lab/ticket-box/blueprint/core-design-decisions/unstable-payment-gateway.md).
- **Kết luận:** Khai báo Phúc là owner chính cho cả file code `payment-circuit-breaker.service.ts` trong sheet 02 là chưa hoàn toàn khớp với phân công task thực tế.

### 3. Thiếu sót task IM18 trong bảng phân công công việc
- Hạng mục **IM18** (Khởi chạy/demo toàn hệ thống - Đang làm 70%) có tên Phúc là owner chính ở sheet `02_ChecklistYeuCau`, nhưng trong sheet `03_PhanCongTask` **không hề có bất kỳ dòng task nào** tương ứng với requirement ID `IM18`.

---

## 5. Đánh giá tổng quan chất lượng đóng góp
- **Khối lượng công việc:** **Rất lớn và cốt lõi**. Nguyễn Hữu Phúc gánh vác phần lớn các cơ chế kỹ thuật phức tạp (Redis Caching, Multi-scope Rate limiting, CSV import pipeline, Notification module) và toàn bộ giao diện điều hành của Admin (Dashboard, CRUD, Cancel/Refund).
- **Chất lượng code:** **Rất tốt**. Code được tổ chức ngăn nắp, có cấu trúc chặt chẽ, ghi nhận log đầy đủ và tuân thủ các quy tắc bảo vệ dữ liệu.
- **Chất lượng kiểm thử:** Tất cả các test suite liên quan đến Caching, Rate limiting, Guest List CSV, và Notification đều **PASS 100%** (trong tổng số 130 test của backend).
- **Điểm tự đánh giá & Đánh giá chéo:** Tự đánh giá đạt `4.78` và đồng đội đánh giá chéo đạt `4.83` là hoàn toàn xứng đáng với năng lực và khối lượng đóng góp thực tế trong dự án.

*Báo cáo được tạo tự động để phục vụ cho việc chuẩn bị vấn đáp và rà soát tài liệu nộp bài.*
