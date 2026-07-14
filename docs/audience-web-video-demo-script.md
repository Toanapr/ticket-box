# Kịch bản video demo Audience Web

## 1. Mục tiêu và phạm vi

1. Xem danh sách và chi tiết concert.
2. Đăng nhập hoặc đăng ký.
3. Chọn hạng vé và tạo reservation.
4. Tạo order và thanh toán qua VNPAY.
5. Theo dõi trạng thái order và mở e-ticket QR.

Các vấn đề kỹ thuật cần nhấn mạnh:

- Public read traffic lớn nhưng không truy vấn PostgreSQL cho mọi request.
- Dữ liệu tồn kho trên UI có thể cache vài giây, nhưng quyết định bán vé luôn do backend kiểm tra lại.
- JWT không được đưa cho JavaScript phía browser; Audience Web dùng BFF và cookie `HttpOnly`.
- Retry hoặc double-click không được tạo nhiều reservation/order/payment intent.
- Nhiều request đồng thời không được oversell hoặc vượt quota của một tài khoản.
- Reservation có TTL để tránh giữ vé vô thời hạn.
- Rate limit và UI `Retry-After` bảo vệ luồng checkout khi tải tăng cao.
- Kết quả thanh toán không chắc chắn được hiển thị là pending/reconciliation, không tự nhận thành công.
- Chỉ user sở hữu order/ticket mới đọc được dữ liệu và QR của mình.

```text
audience.one@ticketbox.local
Password123!
```
## 3. Timeline quay và lời thoại

### Cảnh 1 — Giới thiệu phạm vi (0:00–0:35)

**Trên màn hình:** Trang danh sách concert.

**Lời nói:**

> Em phụ trách phần Audience Web và các tương tác liên quan đến hành trình mua vé của khán giả. Trong phần này em sẽ demo từ lúc xem concert, chọn vé, checkout, thanh toán đến khi nhận e-ticket. Bên cạnh chức năng, em tập trung giải thích các vấn đề kỹ thuật của một hệ thống bán vé tải cao: cache dữ liệu public, chống oversell và vượt quota, idempotency khi người dùng retry, bảo vệ checkout bằng rate limit, và xử lý trạng thái thanh toán không chắc chắn.

### Cảnh 2 — Danh sách concert và bài toán tải đọc cao (0:35–1:25)

**Thao tác:**

1. Cuộn qua danh sách concert.
2. Dùng bộ lọc/tìm kiếm nếu có.
3. Chuyển nhanh sang terminal backend để chỉ log `cache_miss` hoặc `cache_hit`, sau đó quay lại giao diện.

**Lời nói:**

> Đây là trang public có lượng đọc lớn nhất, đặc biệt khi vừa công bố hoặc mở bán concert. Audience Web lấy dữ liệu thật từ Backend API, không âm thầm fallback về mock data nếu backend lỗi. Ở backend, danh sách và chi tiết concert dùng cache-aside với Redis. Request đầu tiên có thể là cache miss và đọc PostgreSQL; các request tiếp theo dùng cache. Hệ thống còn coalesce các cache miss cùng key và giới hạn số truy vấn miss đồng thời để tránh nhiều request cùng đánh vào database.
>
> Thông tin concert có TTL dài hơn, còn số vé khả dụng có TTL ngắn khoảng vài giây. Vì vậy UI ghi rõ đây là số lượng gần realtime. Điểm quan trọng là số hiển thị chỉ phục vụ trải nghiệm; khi mua, backend vẫn khóa và kiểm tra lại inventory trong transaction, nên cache cũ không thể gây oversell.

**Điểm cần chỉ trên UI:** Nhãn “Gần realtime”, “Cập nhật gần đây” hoặc cảnh báo dữ liệu có thể chậm vài giây nếu xuất hiện.

### Cảnh 3 — Chi tiết concert, URL ổn định và lựa chọn vé (1:25–2:15)

**Thao tác:**

1. Mở một concert đang bán, ưu tiên `Anh Trai Say Hi` hoặc `Chị Đẹp Đạp Gió Rẽ Sóng`.
2. Chỉ URL dùng slug.
3. Chọn lần lượt SVIP, VIP hoặc CAT trong sidebar/seating map.
4. Chỉ giá, hạn mức mỗi tài khoản và số vé gần đúng.

**Lời nói:**

> Trang chi tiết dùng slug thay cho UUID nội bộ. Nếu truy cập URL UUID cũ hoặc ticket type UUID, hệ thống redirect về URL canonical. Backend chỉ trả concert đã publish; concert draft hoặc canceled không bị lộ trên public API.
>
> Dữ liệu API được đưa qua một adapter có validate contract trước khi chuyển thành model của giao diện. Việc này giải quyết sự khác nhau giữa DTO backend và view model frontend, đồng thời tránh render sai âm thầm khi API thay đổi. Tại đây khán giả chọn khu vé trên seating map, xem giá, quota và tồn kho gần đúng trước khi checkout.

### Cảnh 5 — Checkout, quota và reservation TTL (2:55–4:15)

**Thao tác:**

1. Chọn số lượng vé.
2. Chỉ giới hạn số lượng trên UI.
3. Nhập họ tên, số điện thoại, email.
4. Chọn VNPAY.
5. Chỉ phần tóm tắt tiền vé, phí dịch vụ và tổng tiền.
6. Bấm “Xác nhận & thanh toán”.
7. Nếu màn hình hiển thị bộ đếm giữ vé, dừng lại để quay rõ.

**Lời nói:**

> UI giới hạn số lượng theo quota để phản hồi sớm, nhưng đây không phải lớp bảo vệ cuối cùng vì client có thể bị sửa hoặc nhiều tab có thể gửi request đồng thời. Khi xác nhận, backend tạo reservation trong một PostgreSQL transaction ngắn. Hệ thống khóa dòng inventory của ticket type và khóa quota ledger của user bằng `FOR UPDATE`, sau đó tính lại số vé còn và tổng `paidCount + reservedCount + quantity`.
>
> Vì cả inventory và quota đều được kiểm tra dưới lock, hai request song song không thể cùng bán chiếc vé cuối hoặc làm một tài khoản vượt hạn mức. Reservation có thời hạn khoảng mười phút. Nếu không thanh toán kịp, worker chuyển reservation sang expired và hoàn lại reserved count, tránh việc người dùng giữ vé vô thời hạn.

### Cảnh 6 — Idempotency và khả năng retry an toàn (4:15–5:00)

**Thao tác:**

1. Mở DevTools → Application → Session Storage.
2. Chỉ key có prefix `ticketbox:checkout-intent:` nếu nó còn tồn tại trong một lần thử lỗi/chưa hoàn tất.
3. Quay lại trang order.

**Lời nói:**

> Một vấn đề thường gặp là người dùng double-click hoặc mạng timeout rồi bấm lại, dẫn đến tạo nhiều reservation hoặc bị trừ tiền nhiều lần. Audience Web tạo một checkout intent ổn định trong session storage. Với cùng concert, hạng vé, số lượng và user, lần retry dùng lại idempotency key cho ba bước reservation, order và payment intent.
>
> Backend lưu và kiểm tra các key này. Nếu request được replay với cùng payload, hệ thống trả lại resource cũ; nếu cùng key nhưng payload khác, hệ thống trả conflict thay vì thực hiện lại. Session storage được chọn thay vì local storage để intent chỉ tồn tại trong phiên tab và giảm khả năng dùng lại ngoài ý muốn.

### Cảnh 7 — Thanh toán và trạng thái không chắc chắn (5:00–6:15)

**Thao tác:**

1. Mở trang VNPAY sandbox.
2. Hoàn tất giao dịch test hoặc chuyển sang order đã chuẩn bị sẵn.
3. Quay lại trang trạng thái order.
4. Chỉ trạng thái và việc trang tự polling.

**Lời nói:**

> Hệ thống không tin vào việc browser tự báo thanh toán thành công. Backend chỉ cập nhật từ return/IPN đã kiểm tra chữ ký hoặc từ reconciliation với provider. Trang order tự polling backend và chỉ mở link e-ticket khi trạng thái thật là `TICKET_ISSUED` và đã có ticket ID.
>
> Nếu gateway timeout, kết quả giao dịch là không chắc chắn: user có thể đã trả tiền nhưng backend chưa nhận được kết quả. UI không hiển thị thành công giả và cũng không tạo giao dịch mới ngay. Thay vào đó, order chuyển sang trạng thái đang kiểm tra hoặc pending reconciliation, polling chậm hơn và có thể mở lại đúng checkout URL cũ. Payment circuit breaker và bulkhead cô lập lỗi gateway, nên trang concert public vẫn đọc được bình thường khi payment gặp sự cố.

**Nếu VNPAY chưa trả kết quả:** Đây là cơ hội để giải thích trạng thái pending; không cần giả vờ rằng giao dịch đã thành công.

### Cảnh 8 — E-ticket, ownership và chống phát hành trùng (6:15–7:15)

**Thao tác:**

1. Khi order có trạng thái “Đã có vé”, bấm mở e-ticket.
2. Chỉ tên concert, hạng vé, chủ sở hữu và QR.
3. Không zoom hoặc đọc nguyên QR token.

**Lời nói:**

> Sau khi payment success được xác minh, backend confirm reservation, chuyển inventory từ reserved sang sold và phát hành ticket. Ticket issuance là idempotent; unique key theo order item và sequence number ngăn webhook hoặc reconciliation retry tạo QR thứ hai cho cùng một vé.
>
> API ticket kiểm tra ticket thuộc user đang đăng nhập, nên biết UUID của người khác cũng không đọc được e-ticket. QR dùng opaque token, không nhúng trực tiếp thông tin cá nhân; bản demo lưu cả token và hash để render và đối chiếu vé. Notification được tạo sau commit; gửi email lỗi không rollback vé đã phát hành. Như vậy kết quả mua vé không phụ thuộc vào dịch vụ thông báo.

### Cảnh 9 — Demo lỗi quota thật (7:15–8:00)

**Chuẩn bị:** Đăng nhập `audience.one@ticketbox.local`, chọn SVIP của `Anh Trai Say Hi`. Tài khoản seed này đã có đủ quota SVIP.

**Thao tác:** Thử đặt thêm một vé và chỉ lỗi “Vượt hạn mức mua vé”.

**Lời nói:**

> Đây là kiểm chứng lỗi quota từ backend, không phải lỗi mock trên frontend. Tài khoản seed đã có đủ số vé SVIP nên request mới bị từ chối. Backend tính cả vé đã thanh toán và vé đang được giữ, vì vậy không thể lách quota bằng nhiều order nhỏ hoặc gửi đồng thời từ nhiều tab. UI ánh xạ domain error thành thông báo có ý nghĩa thay vì chỉ hiện lỗi 500 chung chung.

### Cảnh 10 — Kết luận (8:00–8:35)

**Trên màn hình:** Quay lại trang concert hoặc e-ticket.

**Lời nói:**

> Tóm lại, phần Audience Web không chỉ bao phủ happy path từ xem concert đến nhận QR. Luồng này được thiết kế để hoạt động an toàn dưới tải cao: read path có cache nhưng write path luôn kiểm tra source of truth; inventory và quota được bảo vệ bằng transaction và row lock; retry được kiểm soát bằng idempotency; checkout có rate limit; và payment không chắc chắn được reconciliation thay vì tự kết luận thành công. 

## 4. Cảnh kỹ thuật tùy chọn: chứng minh rate limit (thêm 1–2 phút)

Chỉ thêm cảnh này nếu tổng thời lượng cho phép. Đây là kiểm chứng backend thật, không dùng `Demo controls` của UI.

### Cách quay

1. Dùng một audience mới sau khi seed.
2. Mở DevTools → Console tại Audience Web.
3. Gửi 11 request reservation trong cùng một phút. Có thể dùng ticket type CAT 2 seed dưới đây trong môi trường demo:

```js
await Promise.all(
  Array.from({ length: 11 }, () =>
    fetch("/api/backend/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketTypeId: "66666666-6666-4666-8666-666666666664",
        quantity: 1,
        idempotencyKey: crypto.randomUUID(),
      }),
    }).then(async (response) => ({
      status: response.status,
      retryAfter: response.headers.get("retry-after"),
      body: await response.json(),
    })),
  ),
);
```

4. Chỉ response `429`, header `Retry-After` và log `rate_limit_rejected` có correlation ID.
5. Seed lại database sau cảnh này vì các request thành công đã tạo reservation.

### Lời nói

> Endpoint reservation áp dụng fixed-window rate limit theo IP, user và device/session khi có identifier. Ở đây em gửi hơn mười request trong một phút bằng cùng user. Request vượt ngưỡng trả HTTP 429 cùng `Retry-After`; UI dùng metadata này để khóa nút tạm thời thay vì cho người dùng spam tiếp. Redis giữ counter dùng chung giữa các instance; trong demo nếu Redis lỗi, hệ thống có local fallback để vẫn bảo vệ một instance. Rate limit chỉ giảm tải rác, còn transaction inventory và quota vẫn là lớp đảm bảo correctness cuối cùng.
