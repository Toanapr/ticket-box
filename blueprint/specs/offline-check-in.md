# Đặc tả: Soát vé offline

## Mô tả

Tính năng soát vé offline cho phép nhân sự scanner tải manifest trước ca, quét QR khi mất mạng, lưu event cục bộ bền vững và đồng bộ lại khi có kết nối. Backend là nguồn quyết định cuối cùng khi có conflict giữa nhiều thiết bị.

Actor chính:

- Nhân sự role `scanner`.
- Scanner Mobile App.
- Check-in Module trong Backend API.
- Khán giả mang e-ticket QR hoặc có tên trong guest list.

## Luồng chính

1. Scanner đăng nhập và được cấp token ngắn hạn bind với device, concert, gate hoặc zone.
2. Trước ca, scanner tải HMAC-signed manifest theo assignment gồm ticket/guest entry hợp lệ, version, TTL và revoked list.
3. App kiểm tra manifest presence, TTL và scope rồi lưu vào AsyncStorage. Client-side cryptographic verification bằng public key là hardening còn lại.
4. Khi quét QR, app đối chiếu token/ref với manifest, concert, zone/gate và local checked-in set.
5. Nếu hợp lệ, app tạo event idempotency key, ghi check-in attempt vào durable local queue và đánh dấu local used.
6. Nếu online, app có thể sync ngay; nếu offline, app tiếp tục xếp hàng các event pending.
7. Khi có mạng, app gửi batch event tới Check-in Module qua Backend API bằng cùng event id.
8. Backend xử lý idempotent từng event, kiểm tra ticket/guest status và trả `accepted`, `conflict` hoặc `rejected`.
9. App persist ACK rồi mới dọn payload accepted; conflict/rejected được giữ lại để nhân sự xử lý.

## Kịch bản lỗi

| Tình huống | Hành vi mong đợi |
|---|---|
| Scanner không có assignment phù hợp | Không cho tải manifest hoặc sync check-in ngoài phạm vi. |
| Manifest sai scope/checksum hoặc hết TTL | Dừng offline scan và yêu cầu tải manifest hợp lệ. TTL phải bao phủ toàn ca/sự kiện cộng grace period. |
| Mất mạng hoàn toàn tại cổng | App vẫn xác minh được vé trong manifest và ghi queue cục bộ. |
| QR sai chữ ký, sai concert, sai gate/zone hoặc đã revoke trong manifest | Từ chối scan và ghi kết quả local để audit nếu cần. |
| Cùng vé scan hai lần trên một thiết bị offline | Local checked-in set chặn lần thứ hai. |
| Cùng vé scan trên hai thiết bị offline | Cả hai có thể tạm chấp nhận; backend accepted event đầu tiên sync, event sau trả conflict. |
| App crash sau khi scan nhưng trước sync | Event vẫn còn trong durable queue sau khi mở lại app. |
| Batch sync timeout | App retry các event chưa có ACK bằng cùng event idempotency key. |
| Batch nhận ACK một phần rồi app crash | Sau restart, app chỉ retry event chưa persist ACK; backend dedupe event đã xử lý. |
| Backend trả conflict/rejected | App giữ event và hiển thị trạng thái cần xử lý; không tự xóa như accepted. |

## Ràng buộc

- Bảo mật: Bearer token + `x-device-id` được backend đối chiếu active assignment; manifest giới hạn scope và local data giảm PII. Application-level encryption/key management là production hardening.
- Offline: Tính năng ghi nhận check-in offline là bắt buộc; không phụ thuộc network trong lúc scan nếu manifest còn hợp lệ.
- Idempotency: Mỗi check-in attempt có event id ổn định trước khi ghi local và được dùng lại khi retry sync.
- Conflict resolution: Backend quyết định trạng thái cuối cùng; một ticket chỉ có tối đa một accepted check-in.
- Dữ liệu local: ACK phải được persist trước khi cleanup; conflict/rejected không bị xóa tự động.
- Vận hành: App phải hiển thị số event pending, accepted, conflict và rejected để nhân sự biết tình trạng sync.

## Tiêu chí chấp nhận

- [ ] Scanner có assignment hợp lệ tải được manifest đã ký và dùng được khi offline.
- [ ] Manifest hết TTL hoặc sai scope bị từ chối trước khi scan offline; sau khi nâng asymmetric signature, sai chữ ký cũng phải bị từ chối tại client.
- [ ] Vé hợp lệ, đúng concert/gate/zone được ghi nhận offline và lưu durable queue.
- [ ] Scan lại cùng vé trên cùng thiết bị bị chặn bởi local checked-in set.
- [ ] Sau app crash/restart, event pending vẫn được sync.
- [ ] Retry batch sync bằng cùng event id không tạo check-in trùng.
- [ ] Hai thiết bị offline scan cùng vé dẫn tới một accepted và một conflict sau sync.
- [ ] App chỉ xóa payload accepted sau khi đã persist ACK.
- [ ] Conflict/rejected vẫn hiển thị cho nhân sự xử lý.

## Tài liệu thiết kế liên quan

- `blueprint/04-database-design.md`
- `blueprint/05-business-flows.md`
- `blueprint/06-access-control.md`
- `blueprint/08-requirements.md`
- `blueprint/core-design-decisions/offline-check-in.md`
