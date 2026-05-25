# 1. Tóm tắt bài toán

## TicketBox giải quyết vấn đề gì?

TicketBox số hóa toàn bộ quy trình bán vé concert từ lúc khán giả xem thông tin, chọn loại vé, thanh toán, nhận e-ticket QR, đến khi vào cổng sự kiện. Hệ thống thay thế các kênh rời rạc như Zalo OA, Google Form và chuyển khoản thủ công bằng một nền tảng có kiểm soát tồn kho vé, thanh toán, phân quyền, thông báo và soát vé.

## Các nhóm người dùng chính

| Nhóm người dùng | Nhu cầu chính |
|---|---|
| Khán giả | Xem concert, chọn khu vé, mua vé, thanh toán, nhận QR, nhận thông báo và check-in tại cổng. |
| Ban tổ chức | Tạo concert, cấu hình vé và giới hạn mua, cập nhật/hủy sự kiện, xem doanh thu, theo dõi vé bán ra, upload press kit PDF. |
| Nhân sự soát vé | Đăng nhập app soát vé, quét QR, xác minh vé, ghi nhận check-in kể cả khi mạng yếu. |
| Hệ thống tích hợp | Payment gateway, email/app notification, CSV guest list, PDF processing và AI model. |

## Các rủi ro lớn nhất

| Rủi ro | Tác động |
|---|---|
| Oversell vé | Hai hoặc nhiều người cùng nhận vé cuối cùng, gây khủng hoảng vận hành và hoàn tiền. |
| Payment không đồng bộ | Người dùng bị trừ tiền nhưng không nhận vé, hoặc một thanh toán sinh nhiều vé. |
| Bot/scalper | Vé bị mua hết bởi bot, giảm công bằng và uy tín của ban tổ chức. |
| Backend quá tải khi mở bán | Website sập trong vài phút đầu, mất doanh thu, mất niềm tin. |
| Check-in offline sai | Một vé có thể được dùng hai lần hoặc dữ liệu check-in bị mất khi đồng bộ. |
| Phân quyền lỏng lẻo | Người không có quyền có thể sửa concert, xem doanh thu hoặc dùng công cụ soát vé. |
| Import CSV lỗi | Guest list sai làm nghẽn cổng VIP hoặc ghi đè dữ liệu hợp lệ. |

## Vì sao khó hơn một website bán vé thông thường?

TicketBox có đặc tính flash-sale với inventory hữu hạn và concurrent request rất cao. Ngoài mua hàng online, hệ thống còn phải đảm bảo công bằng, chống bot, xử lý thanh toán bất định, enforce quota theo tài khoản, gửi thông báo, xử lý dữ liệu bất đồng bộ, và hỗ trợ check-in offline tại địa điểm sóng yếu. Một website bán vé thông thường có thể chỉ cần CRUD sản phẩm và checkout; TicketBox cần kiểm soát tính nhất quán, độ sẵn sàng và trải nghiệm vận hành tại sự kiện.
