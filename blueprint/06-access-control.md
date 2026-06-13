# 06. Thiết kế kiểm soát truy cập

## Mô hình đề xuất

TicketBox dùng RBAC làm nền tảng, kết hợp ownership check theo organization và concert. Role quyết định người dùng được gọi nhóm chức năng nào; ownership quyết định họ được thao tác trên tài nguyên nào.

## Vai trò

| Role | Người dùng | Quyền chính |
|---|---|---|
| `audience` | Khán giả | Xem concert public, tạo reservation/order của chính mình, xem ticket của chính mình. |
| `organizer` | Ban tổ chức | Tạo/sửa/hủy concert thuộc organization, cấu hình vé, upload PDF/CSV, xem doanh thu concert mình quản lý. |
| `scanner` | Nhân sự soát vé | Đăng nhập scanner app, tải manifest được phân công, quét và đồng bộ check-in. |
| `system_admin` | Quản trị hệ thống | Quản lý organization, user, global config, audit. |
| `service_account` | Worker/internal service | Gọi API nội bộ hoặc consume event theo scope hẹp. |

## Ma trận quyền

| Tài nguyên/hành động | audience | organizer | scanner | system_admin |
|---|---:|---:|---:|---:|
| Xem concert public | Có | Có | Có | Có |
| Tạo reservation/order | Có, cho chính mình | Không mặc định | Không | Có khi cần vận hành |
| Xem ticket | Chỉ ticket của mình | Theo concert thuộc org khi hỗ trợ vận hành | Khi scan theo assignment | Có |
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
4. Scanner token phải ngắn hạn và bind theo device, event, gate hoặc zone.
5. Service account chỉ có scope tối thiểu cho job nội bộ.

### API endpoint

Mọi endpoint private yêu cầu access token hợp lệ. Backend kiểm tra:

1. Token còn hạn và issuer hợp lệ.
2. Role có permission với endpoint.
3. Resource ownership: `concert.organization_id` phải thuộc organization của organizer.
4. Với scanner: device/event/gate assignment còn hiệu lực.
5. Với audience: `user_id` trong token phải trùng owner của order hoặc ticket.
6. Với thao tác ghi có retry: bắt buộc có idempotency key.

Ví dụ:

| Endpoint | Kiểm tra |
|---|---|
| `POST /reservations` | Role `audience`, sale access token hợp lệ, idempotency key, quota/inventory check ở backend. |
| `PATCH /admin/concerts/{id}` | Role `organizer`, concert thuộc organization của user. |
| `GET /admin/concerts/{id}/revenue` | Role `organizer`, concert thuộc organization, audit log cho truy cập nhạy cảm nếu cần. |
| `GET /scanner/events/{id}/manifest` | Role `scanner`, assigned event/gate/zone, device binding. |
| `POST /scanner/checkins/sync` | Role `scanner`, event/device hợp lệ, idempotency key, backend kiểm tra lại ticket status và assignment. |

### Trang admin

Admin web chỉ hiển thị route khi user có role `organizer` hoặc `system_admin`. UI không phải lớp bảo mật duy nhất; backend vẫn chặn ở từng API. Các thao tác nhạy cảm như hủy concert, refund, đổi quota sau khi mở bán phải có audit log và có thể yêu cầu MFA hoặc re-auth.

### Scanner app

Scanner app dùng token ngắn hạn, bind với `device_id`, `concert_id`, `gate_id` và `zone_code` nếu có. Manifest tải về phải có chữ ký, version và TTL. Khi vận hành offline, app phải cho phép ghi nhận check-in tạm thời vào durable local queue và tự đồng bộ lại khi có mạng; backend vẫn là nguồn quyết định cuối cùng khi phát hiện conflict.

## Audit log

Các hành động cần audit:

- tạo/sửa/hủy concert;
- sửa loại vé, giá, quota, sale window;
- upload/publish artist bio;
- import/publish guest list version;
- payment webhook, reconciliation, refund;
- ticket issuing và check-in conflict.

## Tiêu chí chấp nhận

- Người mua chỉ thao tác được trên dữ liệu của mình.
- Organizer chỉ thao tác được trên concert thuộc organization của mình.
- Scanner chỉ truy cập được manifest và check-in trong phạm vi được cấp.
- Mọi thao tác nhạy cảm đều truy vết được.
