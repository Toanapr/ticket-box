# 6. Thiết kế kiểm soát truy cập

## Mô hình đề xuất

TicketBox dùng RBAC làm nền tảng, kết hợp ownership check theo organization/concert. Role quyết định người dùng được gọi nhóm chức năng nào; ownership quyết định họ được thao tác trên concert nào.

## Vai trò

| Role | Người dùng | Quyền chính |
|---|---|---|
| `audience` | Khán giả | Xem concert public, tạo reservation/order của chính mình, xem ticket của chính mình. |
| `organizer` | Ban tổ chức | Tạo/sửa/hủy concert thuộc organization, cấu hình vé, upload PDF/CSV, xem doanh thu concert mình quản lý. |
| `scanner` | Nhân sự soát vé | Đăng nhập mobile app, tải manifest được phân công, quét/sync check-in. |
| `system_admin` | Quản trị hệ thống | Quản lý organization, user, global config, audit. |
| `service_account` | Worker/internal service | Gọi API nội bộ hoặc consume event theo scope hẹp. |

## Ma trận quyền

| Tài nguyên/hành động | audience | organizer | scanner | system_admin |
|---|---:|---:|---:|---:|
| Xem concert public | Có | Có | Có | Có |
| Tạo reservation/order | Có, cho chính mình | Không mặc định | Không | Có |
| Xem ticket | Chỉ ticket của mình | Theo concert thuộc org | Khi scan/assigned gate | Có |
| Tạo/sửa/hủy concert | Không | Có, theo org | Không | Có |
| Cấu hình loại vé/quota | Không | Có, theo org | Không | Có |
| Xem doanh thu | Không | Có, theo org | Không | Có |
| Upload press kit PDF | Không | Có, theo org | Không | Có |
| Upload/import guest list | Không | Có, theo org | Không | Có |
| Tải scanner manifest | Không | Không | Có, theo assignment | Có |
| Sync check-in | Không | Không | Có, theo device/event/gate | Có |

## Kiểm tra quyền tại từng điểm truy cập

Nguyên tắc chung:

1. Không tin quyền từ UI; backend kiểm tra lại ở mọi endpoint.
2. Token chỉ chứng minh danh tính và role, không thay thế resource ownership check.
3. Admin action nhạy cảm phải có audit log.
4. Scanner token nên ngắn hạn và bind theo device/event/gate.
5. Service account chỉ có scope tối thiểu cho job nội bộ.

### API endpoint

Mọi endpoint private yêu cầu access token hợp lệ. Backend kiểm tra:

1. Token còn hạn và issuer hợp lệ.
2. Role có permission với endpoint.
3. Resource ownership: `concert.organization_id` phải thuộc organization của organizer.
4. Với scanner: device/event/gate assignment còn hiệu lực.
5. Với audience: `user_id` trong token phải trùng owner của order/ticket.

Ví dụ:

| Endpoint | Kiểm tra |
|---|---|
| `POST /reservations` | Role `audience`, sale access token hợp lệ, idempotency key. |
| `PATCH /admin/concerts/{id}` | Role `organizer`, concert thuộc organization của user. |
| `GET /admin/concerts/{id}/revenue` | Role `organizer`, concert thuộc organization, audit log. |
| `GET /scanner/events/{id}/manifest` | Role `scanner`, assigned event/gate/zone, device binding. |
| `POST /scanner/checkins/sync` | Role `scanner`, event/device hợp lệ, idempotency key. |

### Trang admin

Admin Web chỉ hiển thị route sau khi user có role `organizer` hoặc `system_admin`. UI không phải lớp bảo mật duy nhất; backend vẫn kiểm tra quyền trên từng API. Các action nhạy cảm như hủy concert, refund, đổi quota sau khi mở bán cần audit log và có thể yêu cầu MFA/re-auth.

### Mobile app soát vé

Scanner app dùng token ngắn hạn, có thể bind với `device_id`, `concert_id`, `gate_id` và `zone_code`. Manifest tải về cần chữ ký và version. Khi sync offline, backend không tin dữ liệu client hoàn toàn mà kiểm tra lại ticket status, assignment và idempotency key.

## Audit log

Các hành động cần audit:

- Tạo/sửa/hủy concert.
- Sửa loại vé, giá, quota, sale window.
- Upload/publish artist bio.
- Import/publish guest list version.
- Payment webhook/reconciliation/refund.
- Ticket issuing và check-in conflict.
