# Prisma seed

## Các file chính

- `schema.prisma`: schema database.
- `migrations/`: lịch sử migration.
- `seed.js`: dữ liệu demo gồm tài khoản, concert, loại vé, inventory, order/payment/ticket, guest list, notification và scanner.
- `seed-if-empty.js`: chỉ chạy `seed.js` khi database chưa có `Organization`.

## Chạy seed

Từ `src/backend-api`:

```powershell
corepack pnpm prisma:migrate:deploy
corepack pnpm db:seed:if-empty
```

Buộc chạy trực tiếp seed:

```powershell
corepack pnpm db:seed
```

`db:seed` không nên dùng trên database đang có dữ liệu thật. Một số bảng dùng `createMany`, nên chạy lại có thể gặp unique constraint hoặc tạo dữ liệu không mong muốn.

## Khi chạy Docker

Backend tự động thực hiện:

```text
prisma migrate deploy -> db:seed:if-empty -> start API
```

Build/restart container không seed lại nếu volume PostgreSQL đã có organization.

Reset toàn bộ dữ liệu demo và seed lại:

```powershell
docker compose down -v
docker compose up -d --build
```

Lệnh `down -v` xóa volume database và file upload demo; không dùng khi cần giữ dữ liệu.

## Tài khoản demo

Mật khẩu chung: `Password123!`

- `organizer@ticketbox.local`
- `audience.one@ticketbox.local`
- `audience.two@ticketbox.local`
- `audience.three@ticketbox.local`

Muốn thay đổi dữ liệu demo, chỉnh các fixture và hàm `seed*()` trong `seed.js`, sau đó reset database demo để kiểm tra từ trạng thái sạch.
