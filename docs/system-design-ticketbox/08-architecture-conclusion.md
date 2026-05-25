# 8. Kết luận kiến trúc

TicketBox nên được thiết kế quanh hai nguyên tắc: tách read-heavy path khỏi write-critical path, và mọi thao tác sinh tiền/vé/check-in phải idempotent, có trạng thái rõ ràng, có thể reconcile.

Kiến trúc được khuyến nghị là self-hosted/container-based trên Kubernetes. Hướng triển khai thực tế là bắt đầu bằng modular monolith hoặc service nhỏ với NestJS/Spring Boot, PostgreSQL, Redis, RabbitMQ, MinIO và Keycloak, sau đó tách riêng các domain nóng như Inventory, Payment và Check-in khi có số liệu tải thực tế.

Quyết định quan trọng nhất khi implement là không để UI/cache/payment callback trực tiếp quyết định quyền sở hữu vé. Vé chỉ được phát hành sau khi backend đã confirm reservation, quota và payment bằng transaction/idempotency rõ ràng.
