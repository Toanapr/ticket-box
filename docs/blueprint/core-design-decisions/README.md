# Core Design Decisions

Thư mục này giải thích chi tiết các quyết định thiết kế cốt lõi của TicketBox. Mỗi tài liệu mô tả vấn đề, thiết kế được chọn, lý do chọn, trade-off và cách kiểm chứng.

| Quyết định | Mục tiêu chính |
|---|---|
| [Tranh chấp vé cuối cùng](last-ticket-contention.md) | Không oversell khi nhiều người giữ vé đồng thời. |
| [Giới hạn vé mỗi tài khoản](per-user-ticket-limit.md) | Không cho một tài khoản vượt quota bằng request song song. |
| [Tải đọc cực cao](high-read-traffic.md) | Giảm tải database cho trang public đọc nhiều. |
| [Tải trọng đột biến khi mở bán](sale-traffic-spike.md) | Bảo vệ backend và database trước traffic spike. |
| [Công bằng khi mở bán](sale-fairness.md) | Hạn chế bot/scalper và kiểm soát quyền vào luồng mua vé. |
| [Payment gateway không ổn định](unstable-payment-gateway.md) | Không phát hành vé sai và giữ các tính năng khác hoạt động. |
| [Check-in offline](offline-check-in.md) | Soát vé khi mất mạng và đồng bộ lại có kiểm soát. |
| [Guest list CSV](guest-list-csv-import.md) | Nhập dữ liệu một chiều mà không làm hỏng dữ liệu đang dùng. |
| [AI Artist Bio](ai-artist-bio.md) | Cô lập xử lý PDF/AI khỏi luồng nghiệp vụ chính. |

## Tài liệu liên quan

- [System design](../01-system-design.md)
- [Database design](../04-database-design.md)
- [Business flows](../05-business-flows.md)
- [Protection mechanisms](../07-protection-mechanisms.md)
- [Requirements](../08-requirements.md)

