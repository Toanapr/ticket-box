# Tải Đọc Cực Cao

## Vấn đề

Trang danh sách và chi tiết concert được đọc hàng nghìn lần mỗi giây nhưng phần lớn dữ liệu thay đổi ít. Nếu mọi request truy vấn PostgreSQL, read traffic có thể làm ảnh hưởng các transaction giữ vé và thanh toán.

## Quyết định thiết kế

Dùng cache nhiều lớp:

- Public cache hoặc reverse proxy cache cho nội dung public và static assets khi phù hợp.
- Redis cache-aside cho danh sách, chi tiết concert và read model.
- Tách dữ liệu concert tương đối tĩnh khỏi inventory summary gần realtime.
- Inventory chính xác chỉ được kiểm tra tại backend khi reserve.
- Ghi cache invalidation event bằng transactional outbox; dùng request coalescing, TTL jitter và stale-while-revalidate/stale-if-error.
- Giới hạn concurrency/query budget khi fallback database để cache failure không kéo sập write-critical path.

## Lý do chọn

- Dữ liệu public có tỷ lệ đọc cao và phù hợp cache.
- Public cache chặn phần lớn traffic đọc lặp lại trước khi vào backend.
- Redis giảm query lặp lại và có thể dùng TTL ngắn cho inventory summary.
- Tách read path giúp database ưu tiên write-critical path.
- Outbox tránh mất invalidation khi process crash sau DB commit.
- Bounded fallback ưu tiên dữ liệu public hơi stale hơn làm bão hòa PostgreSQL.

## Trade-off

- Người dùng có thể thấy số vé còn lại trễ vài giây.
- Cache invalidation và event cập nhật cache làm hệ thống phức tạp hơn.
- Redis hoặc public cache lỗi có thể tạo cache stampede vào database.
- Trả stale/`503` khi fallback hết budget có thể làm dữ liệu chậm cập nhật hoặc giảm availability ngắn hạn.
- Phải tránh cache dữ liệu cá nhân, order hoặc payment của user khác.

## Phương án không chọn

- **Mọi request đọc trực tiếp database:** đơn giản nhưng không chịu được peak traffic.
- **Cache inventory chính xác để quyết định bán vé:** nhanh nhưng có thể oversell.
- **TTL rất dài cho mọi dữ liệu:** giảm tải tốt nhưng nội dung cập nhật chậm.
- **Fallback không giới hạn vào database:** tăng availability tức thời nhưng có thể làm hỏng reservation/payment.

## Cách kiểm chứng

- Load test public page và đo cache hit ratio.
- Kiểm tra database vẫn ổn định khi cache miss tăng.
- Mô phỏng Redis/public cache lỗi toàn phần và đo fallback concurrency, stale response, `503`.
- Đo độ trễ cập nhật inventory summary và kiểm thử cache invalidation.
