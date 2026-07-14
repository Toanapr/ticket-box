# Huong dan kiem thu TicketBox theo flow

Tai lieu nay huong dan kiem thu toan bo he thong TicketBox, gom:

- `backend-api`: NestJS API, PostgreSQL, Redis, payment, notification va scanner API.
- `admin-web`: trang quan tri cho organizer.
- `audience-web`: trang tim su kien, dat ve, thanh toan va xem e-ticket.
- `scanner-mobile`: ung dung Expo de tai manifest, quet ve offline va dong bo check-in.

Muc tieu la giup mot nguoi moi clone repo co the khoi dong, demo va xac minh cac flow ma khong can hoi them. SMTP, Gemini va VNPAY co the bo qua neu khong co credential. Flow thanh toan mock van phai chay duoc.

## 1. Dieu kien truoc khi test

Can cai:

- Docker Desktop 4+ va Docker Compose v2.
- Node.js 22.x.
- PowerShell 7+ (`pwsh`).
- Android Studio/Android emulator hoac dien thoai cai Expo Go neu test `scanner-mobile` bang camera.

Kiem tra cong cu:

```powershell
docker version
docker compose version
node --version
pwsh --version
```

Tat ca lenh ben duoi mac dinh chay tai thu muc goc repo:

```powershell
cd D:\VisualStudio\SoftwareDesignProj\ticket-box
```

## 2. Cau hinh va cong dich vu

Docker Compose chay cac dich vu sau:

| Dich vu | Dia chi tu may host | Muc dich |
|---|---|---|
| Backend API | `http://localhost:3000` | API chinh |
| Audience Web | `http://localhost:3001` | Trang nguoi mua ve |
| Admin Web | `http://localhost:3002` | Trang organizer |
| PostgreSQL | `localhost:5433` | Database |
| Redis | `localhost:6379` | Cache/rate limit |

Compose co gia tri mac dinh du de demo. Neu can dung env backend that, dat file tai `./.env`. Cac bien `DATABASE_URL`, `DIRECT_URL` va `REDIS_URL` trong container se duoc Compose ghi de dung hostname noi bo `postgres` va `redis`.

Khong dua file `.env` co secret that vao Git.

### Tai khoan seed

| Vai tro | Tai khoan/token | Mat khau/device |
|---|---|---|
| Organizer | `organizer@ticketbox.local` | `Password123!` |
| Audience 1 | `audience.one@ticketbox.local` | `Password123!` |
| Audience 2 | `audience.two@ticketbox.local` | `Password123!` |
| Audience 3 | `audience.three@ticketbox.local` | `Password123!` |
| VIP scanner token | `scanner:12121212-1212-4212-8212-121212121212` | Device `DEV-DEMO-VIP-001` |
| Revoked scanner token | `scanner:13131313-1313-4313-8313-131313131313` | Device `DEV-DEMO-GUEST-001` |

## 3. Khoi dong tu moi truong sach

### 3.1 Khoi dong binh thuong, giu lai du lieu

```powershell
docker compose up -d --build
docker compose ps
```

Cho den khi `postgres`, `redis`, `backend-api`, `audience-web` va `admin-web` deu co trang thai `healthy`.

Theo doi log khoi dong neu can:

```powershell
docker compose logs -f backend-api
```

Thoat man hinh log bang `Ctrl+C`; container van tiep tuc chay.

### 3.2 Reset hoan toan database demo

Chi dung khi chap nhan xoa toan bo du lieu PostgreSQL va file upload trong Docker volume:

```powershell
docker compose down -v
docker compose up -d --build
docker compose ps
```

Backend se deploy migration va seed lai du lieu demo khi container khoi dong.

### 3.3 Kiem tra health thu cong

```powershell
curl.exe -i http://localhost:3000/health
curl.exe -i http://localhost:3001/api/backend/health
curl.exe -i http://localhost:3002/api/backend/health
```

Ket qua mong doi: ca ba request tra HTTP `200`.

Trang goc cua hai web co the tra `307` de redirect den trang chinh; day la hanh vi dung:

```powershell
curl.exe -I http://localhost:3001
curl.exe -I http://localhost:3002
```

## 4. Smoke test E2E tu dong

Chay script smoke sau khi tat ca container healthy:

```powershell
pwsh .\scripts\smoke-all.ps1
```

Script tu dong kiem tra:

1. Health cua backend va proxy health cua hai web.
2. Dang nhap organizer va audience truc tiep qua backend.
3. Dang nhap qua BFF route cua admin va audience, bao gom auth cookie.
4. Doc public concert catalog.
5. Tao reservation cho mot ticket type con ve.
6. Tao order voi payment `mock`.
7. Gia lap thanh toan thanh cong.
8. Kiem tra order va ticket da duoc phat hanh.

Ket qua dat: lenh ket thuc voi dong `Smoke test passed.` va exit code `0`.

Script tao them order/ticket moi moi lan chay. Neu du lieu da thay doi qua nhieu hoac khong con ticket trong concert dau tien, reset database theo muc 3.2 roi chay lai.

## 5. Flow 1 - xac thuc va phan quyen

### 5.1 Audience login/logout

1. Mo `http://localhost:3001/login`.
2. Dang nhap bang `audience.one@ticketbox.local` / `Password123!`.
3. Mo `http://localhost:3001/user`.
4. Xac nhan trang hien tai khoan, reservation, order hoac ticket cua user.
5. Mo `http://localhost:3001/logout` va dang xuat.
6. Thu mo lai `/user`.

Ket qua mong doi:

- Dang nhap thanh cong chuyen ve trang duoc yeu cau.
- Cookie auth duoc tao boi audience BFF, token khong can nhap tren browser.
- Sau logout, route can xac thuc chuyen ve `/login`.

### 5.2 Admin login va role

1. Mo `http://localhost:3002/login`.
2. Dang nhap organizer `organizer@ticketbox.local` / `Password123!`.
3. Xac nhan truy cap duoc `http://localhost:3002/admin/concerts`.
4. Dang xuat, sau do mo lai `/admin/concerts`.
5. Thu dang nhap admin bang tai khoan audience.

Ket qua mong doi:

- Organizer vao duoc trang quan tri.
- Khi chua dang nhap, admin route redirect ve login.
- Audience khong duoc cap quyen organizer.

### 5.3 Register

Test audience tai `http://localhost:3001/register` va organizer tai `http://localhost:3002/register` bang email chua ton tai.

Nen dung email co timestamp de tranh trung:

```text
audience.test.20260714@example.com
organizer.test.20260714@example.com
```

Kiem tra them truong hop email da ton tai va mat khau/input khong hop le. UI phai hien loi ro rang, khong tao tai khoan trung.

## 6. Flow 2 - audience tim concert va mua ve

### 6.1 Catalog va concert detail

1. Mo `http://localhost:3001/concerts`.
2. Xac nhan co concert seed, poster, dia diem, thoi gian va ticket type.
3. Mo chi tiet mot concert con ve, vi du `Anh Trai Say Hi`.
4. Chon zone/ticket type tren seating map hoac danh sach ben canh.
5. Xac nhan gia, so ve con lai, gioi han moi user va nut checkout.

Ket qua mong doi:

- Public catalog xem duoc khi chua login.
- URL chi tiet dung concert slug.
- Ticket type het ve/khong mo ban khong duoc checkout nhu ve dang ban.

### 6.2 Reservation va validation checkout

1. Dang nhap audience.
2. Tai concert detail, chon ticket type con ve va vao checkout.
3. Thay doi quantity trong gioi han hien thi.
4. Thu submit khi email trong hoac email sai dinh dang.
5. Dien du:

```text
Ho ten: Flow Test Audience
So dien thoai: 0900000000
Email: audience.one@ticketbox.local
```

6. Nhan `Xac nhan & thanh toan`.

Ket qua mong doi:

- Email sai bi chan tai UI.
- Backend tao reservation co thoi gian het han.
- UI hien countdown giu ve.
- Submit lap lai khong tao nhieu order ngoai y muon do idempotency key.

### 6.3 Cac loi ton kho qua Demo controls

Neu checkout local hien `Demo controls`, lan luot chon:

- `SOLD_OUT`: mong doi thong bao het ve.
- `QUOTA_EXCEEDED`: mong doi thong bao vuot gioi han mua.
- `SALE_NOT_OPEN`: mong doi thong bao chua mo ban.
- `NORMAL`: mong doi tao reservation/order thanh cong.

Moi lan test nen tai lai trang hoac dung ticket type/user khac de khong bi anh huong boi reservation truoc.

### 6.4 Thanh toan mock thanh cong

Audience UI hien phuong thuc VNPAY, vi vay flow mock hoan chinh duoc bao phu boi script:

```powershell
pwsh .\scripts\smoke-all.ps1
```

Sau khi script thanh cong:

1. Dang nhap `audience.one@ticketbox.local` tai Audience Web.
2. Mo `http://localhost:3001/user`.
3. Mo order/ticket moi nhat.
4. Xac nhan order da thanh toan va e-ticket co QR.

Ket qua mong doi: order co trang thai thanh cong, co `ticketId`, va `GET /tickets/:id` chi cho owner hop le doc.

## 7. Flow 3 - VNPAY sandbox hoac VNPAY that

Bo qua muc nay neu chua co merchant credential hop le. Cac gia tri `demo` trong Compose chi giup backend khoi dong; chung khong the hoan tat giao dich tai VNPAY.

### 7.1 Env backend bat buoc cho implementation hien tai

```dotenv
VNPAY_TMN_CODE=<merchant-terminal-code>
VNPAY_HASH_SECRET=<merchant-hash-secret>
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_QUERYDR_URL=https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
VNPAY_RETURN_URL=http://localhost:3000/payments/vnpay/return
VNPAY_AUDIENCE_RETURN_URL=http://localhost:3001/orders
VNPAY_IP_ADDR=127.0.0.1
VNPAY_LOCALE=vn
VNPAY_ORDER_TYPE=other
```

Sau khi sua `./.env`, recreate backend:

```powershell
docker compose up -d --build --force-recreate backend-api
docker compose ps
```

Luu y ve ba ten bien de tranh hieu nham:

- `PAYMENT_PROVIDER` trong code hien tai la Nest dependency-injection token, khong phai env de chon provider.
- `VNPAY_TEST_MODE` hien khong duoc backend doc.
- `VNPAY_IPN_URL` hien khong duoc backend doc de tao payment intent. Backend co route nhan IPN tai `/payments/vnpay/ipn`, nhung URL callback phai cau hinh trong merchant portal/ha tang VNPAY.

### 7.2 Test browser redirect/return

1. Dang nhap Audience Web va tao checkout voi `VNPAY`.
2. Backend tao order, payment record va signed checkout URL.
3. Browser phai redirect sang domain VNPAY sandbox.
4. Thanh toan bang tai khoan/test card do VNPAY cap.
5. VNPAY redirect browser ve `GET http://localhost:3000/payments/vnpay/return?...`.
6. Backend verify secure hash, amount va transaction status.
7. Backend redirect tiep ve `http://localhost:3001/orders/<orderId>?paymentReturn=1`.
8. Audience Web doc lai order; khi thanh cong phai hien link e-ticket.

Ket qua mong doi:

- Sai signature hoac sai amount khong duoc danh dau thanh toan thanh cong.
- Giao dich thanh cong chi phat hanh ticket mot lan.
- Refresh return URL/replay callback khong phat hanh them ticket.

### 7.3 Test IPN that

`localhost` khong the nhan server-to-server IPN tu VNPAY. Muon test IPN can:

1. Public HTTPS backend bang domain staging hoac tunnel.
2. Dat `VNPAY_RETURN_URL=https://<public-host>/payments/vnpay/return`.
3. Cau hinh IPN URL tai VNPAY thanh `https://<public-host>/payments/vnpay/ipn`.
4. Bao dam proxy/firewall forward den container backend.
5. Test giao dich va kiem tra backend log.

Return URL la redirect tu browser; IPN la callback server-to-server. Khong coi return redirect mot minh la bang chung duy nhat cua ket qua thanh toan trong production.

## 8. Flow 4 - organizer quan ly concert va ticket type

### 8.1 Xem dashboard va operations

1. Dang nhap Admin Web.
2. Mo `/admin/dashboard`.
3. Xac nhan dashboard hien cac concert va lien ket operations/edit.
4. Mo operations cua concert seed co pending payment hoac cancellation drill.
5. Xac nhan cac chi so order, payment, inventory va notification hien hop ly.

### 8.2 Tao concert

1. Mo `/admin/concerts/new`.
2. Thu submit thieu truong bat buoc de kiem tra validation.
3. Tao concert voi tieu de duy nhat, venue, thoi gian sale va thoi gian dien hop le.
4. Tro lai `/admin/concerts` va xac nhan concert moi xuat hien.
5. Mo edit, cap nhat mot truong va tai lai trang.

Ket qua mong doi:

- Concert tao mot lan, slug/ID hop le.
- Gia tri edit duoc luu sau refresh.
- Thoi gian sale/concert vo ly bi tu choi.

### 8.3 Poster va ticket type

1. Tai poster anh hop le tren trang edit concert.
2. Xac nhan poster xem duoc tai Admin va Audience.
3. Mo `/admin/concerts/<id>/ticket-types`.
4. Tao ticket type voi ten, zone, gia, capacity va max-per-user hop le.
5. Sua gia/capacity trong gioi han backend cho phep.
6. Mo concert tu Audience Web va xac nhan ticket type moi.

Nen test them file poster sai MIME/qua lon va capacity thap hon so da ban. He thong phai tra loi validation, khong lam hong du lieu cu.

### 8.4 Huy concert

Dung concert seed `TicketBox Cancellation Drill` neu muon tranh anh huong concert demo chinh.

1. Mo operations/edit cua concert.
2. Huy concert.
3. Xac nhan status concert thay doi.
4. Kiem tra cac order lien quan, refund queue va notification record.
5. Mo Audience Web, xac nhan concert huy khong con mua duoc.

SMTP co the bo qua. Khi notification worker bi tat, van phai xac minh notification/outbox record duoc tao trong backend/admin thay vi doi email that.

## 9. Flow 5 - guest list va AI artist bio

### 9.1 Import guest list hop le

1. Trong Admin Web, mo guest-list cua concert `Chi Dep Dap Gio Re Song`.
2. Upload `docs/test-data/guest-list-scenarios/01-valid-public-zones.csv`.
3. Xac nhan batch thanh cong, summary dung va entry duoc publish.
4. Upload lai `02-idempotent-reupload-same-as-01.csv`.
5. Xac nhan he thong xu ly idempotent/duplicate theo thiet ke, khong nhan doi active guest.

### 9.2 Import guest list loi

Lan luot chon mot so file trong `docs/test-data/guest-list-scenarios`:

| File | Loi can quan sat |
|---|---|
| `08-invalid-duplicate-in-file.csv` | Duplicate trong cung file |
| `10-invalid-email-phone-identity.csv` | Identity khong hop le |
| `12-invalid-zone-ticket-mismatch.csv` | Zone va ticket type khong khop |
| `13-invalid-unknown-ticket-type.csv` | Ticket type khong ton tai |
| `14-invalid-duplicate-headers.csv` | Header trung |
| `17-invalid-empty-full-name-row.csv` | Thieu ho ten |

Mo lien ket error detail cua batch. Ket qua mong doi: co so dong, raw data va ly do loi; batch loi khong thay the active guest list.

### 9.3 AI artist bio

Neu khong co `GEMINI_API_KEY`, chi test draft seed/review/publish va bo qua tao job AI moi.

1. Mo concert `Chi Dep Dap Gio Re Song` trong Admin.
2. Mo khu vuc artist-bio review.
3. Xac nhan draft seed co noi dung va artist profiles.
4. Sua draft, luu va refresh.
5. Publish draft va xac nhan noi dung da publish.

Neu co Gemini key, upload `docs/test-data/artist-press-kit-summer-live.pdf`, tao job, cho job hoan tat, review va publish. Voi PDF multi-artist, kiem tra mapping tung artist va retry khi provider loi.

## 10. Flow 6 - scanner mobile online/offline

### 10.1 Chay ung dung

Tai terminal rieng:

```powershell
cd src\scanner-mobile
npm install
npm run android
```

Co the dung `npm start` de quet QR bang Expo Go. Camera scan khong phai luc nao cung hoat dong day du tren web; uu tien Android/iOS.

Chon API Base URL theo noi chay app:

| Noi chay scanner | API Base URL |
|---|---|
| Android emulator | `http://10.0.2.2:3000/scanner` |
| iOS simulator tren cung may | `http://localhost:3000/scanner` |
| Dien thoai cung Wi-Fi | `http://<LAN-IP-cua-may>:3000/scanner` |

Windows Firewall phai cho phep ket noi vao port `3000` neu dung dien thoai that.

Vi du neu `ipconfig` tren may chay Docker/backend cho IPv4 la `192.168.2.7`,
dien thoai cung mang Wi-Fi dung `http://192.168.2.7:3000/scanner`. Khong dung IP
cua container Docker va khong dung `localhost` tren dien thoai, vi `localhost`
khi do la chinh dien thoai.

### 10.2 Ket noi va tai manifest

Tai man hinh Setup, nhap:

```text
API Base URL: http://10.0.2.2:3000/scanner
Device ID: DEV-DEMO-VIP-001
Access Token: scanner:12121212-1212-4212-8212-121212121212
```

1. Nhan `Connect & Fetch`.
2. Xac nhan assignment `GATE_MAIN / VIP`.
3. Nhan `Download Offline Manifest`.
4. Xac nhan app bao `System Ready` va tai duoc 2 ticket.

Test negative: dung device `DEV-DEMO-GUEST-001` va guest token. Device seed nay co status `revoked`, nen backend phai tu choi.

### 10.3 Quet accepted, duplicate va invalid

Co the dung nut nhap thu cong trong man hinh Scan:

| Gia tri | Ket qua mong doi |
|---|---|
| `qr-chi-dep-vip-1` | Accepted, them mot event vao pending queue |
| `qr-chi-dep-vip-1` lan hai | Rejected duplicate/local already checked-in |
| `qr-chi-dep-vip-2` | Accepted |
| `CHI-DEP-VIP-001` | Accepted va sync bang raw token canonical tu manifest |
| `CHI-DEP-VIP-002` | Accepted va sync bang raw token canonical tu manifest |
| `CHI-DEP-REVOKED-001` | Rejected/revoked neu payload duoc nhan dang theo manifest |
| `not-a-ticket` | Rejected invalid/not found |

Neu nhap ticket reference thay vi raw token, co the thu `CHI-DEP-VIP-001` va `CHI-DEP-VIP-002`.

Scanner luu manifest, queue va danh sach da quet trong AsyncStorage. Sau khi nang cap
ban sua payload scanner, can xoa app data/cai lai app truoc khi test lai; event cu da
queue voi raw token sai khong tu dong thay doi. Tren Android co the vao App info ->
Storage -> Clear storage, sau do ket noi va tai manifest lai.

### 10.4 Offline queue va sync

1. Tai assignment va manifest khi dang online.
2. Tat Wi-Fi/data cua thiet bi hoac dung airplane mode.
3. Quet `qr-chi-dep-vip-1`.
4. Xac nhan app accept local va queue co `1 Wait`.
5. Bat mang lai.
6. Mo Queue va sync pending events.
7. Mo History.

Ket qua mong doi:

- Quet offline khong can goi backend ngay.
- Event co client event ID va metadata assignment/device.
- Sync thanh cong chuyen item khoi pending va ghi result vao history.
- Gui lai cung event phai idempotent, khong tao check-in thu hai.

Luu y: du lieu seed chi co hai ve scanner co dinh. Sau khi da sync accepted, reset database neu can demo lai trang thai ban dau.

## 11. Test suite cua tung app

Nen chay test local trong tung thu muc vi Docker image production khong nhat thiet chua dev dependencies.

### Backend API

```powershell
cd src\backend-api
corepack pnpm install
corepack pnpm prisma:generate
corepack pnpm test -- --runInBand
corepack pnpm test:e2e -- --runInBand
corepack pnpm build
```

Neu `pnpm` shim tren Windows bi `EPERM`, dung runtime Corepack da tai:

```powershell
node "$env:LOCALAPPDATA\node\corepack\v1\pnpm\11.8.0\dist\pnpm.mjs" test -- --runInBand
```

Baseline da quan sat ngay 2026-07-14: backend unit test chua green hoan toan, co `19/29` suite pass va `10/29` suite fail. Nhom loi chinh lien quan Prisma enum/mock (`NotificationChannel`, `CheckInResultStatus`, `PrismaClientKnownRequestError`) va artist-bio `instanceof`. Day la test failure can sua, khong nen danh dau pipeline la pass chi vi container healthy.

### Admin Web

```powershell
cd ..\admin-web
npm install
npm test
npm run build
```

Baseline da quan sat: `4/4` tests pass.

### Audience Web

```powershell
cd ..\audience-web
npm install
npm test
npm run build
```

Baseline da quan sat: `71/71` tests pass.

### Scanner Mobile

```powershell
cd ..\scanner-mobile
npm install
npx tsc --noEmit
```

Baseline da quan sat: TypeScript check pass. App hien chua khai bao test runner trong `package.json`, vi vay can test thu cong flow camera/offline/sync theo muc 10.

## 12. Ma tran ket qua can ghi nhan

Dung bang sau khi test release/demo:

| ID | Flow | Ket qua dat | Pass/Fail/Skip | Bang chung |
|---|---|---|---|---|
| INF-01 | Compose startup | 5 service healthy | | `docker compose ps` |
| E2E-01 | Smoke all | `Smoke test passed.` | | Console output |
| AUTH-01 | Audience auth | Login, session, logout dung | | Screenshot/log |
| AUTH-02 | Admin auth/role | Organizer duoc phep, audience bi chan | | Screenshot/log |
| AUD-01 | Catalog/detail | Concert va ticket type hien dung | | Screenshot |
| AUD-02 | Reservation/order | Co hold, countdown va order | | Order ID |
| PAY-01 | Mock payment | Ticket phat hanh dung 1 lan | | Order/ticket ID |
| PAY-02 | VNPAY return | Signature dung va redirect ve order | | Skip neu thieu credential |
| PAY-03 | VNPAY IPN | Public callback xu ly idempotent | | Skip neu khong co public HTTPS |
| ADM-01 | Concert CRUD | Tao/sua/doc concert thanh cong | | Concert ID |
| ADM-02 | Ticket type | Tao/sua va hien tren audience | | Ticket type ID |
| ADM-03 | Cancel/refund | Status va refund queue dung | | Screenshot/log |
| GST-01 | Guest-list valid | Publish dung entries | | Batch ID |
| GST-02 | Guest-list invalid | Bao loi tung dong, khong publish | | Batch ID |
| AI-01 | Bio review/publish | Draft seed sua va publish duoc | | Draft ID |
| SCN-01 | Manifest | Assignment va 2 ticket duoc tai | | Screenshot |
| SCN-02 | Offline scan | Accepted local va vao queue | | Screenshot |
| SCN-03 | Sync/idempotency | Sync dung, replay khong check-in lai | | Backend log |
| TST-01 | Backend tests | Tat ca suite pass | | Hien dang Fail theo baseline |
| TST-02 | Admin tests | `4/4` pass | | Console output |
| TST-03 | Audience tests | `71/71` pass | | Console output |
| TST-04 | Scanner typecheck | `tsc --noEmit` pass | | Console output |

Chi danh dau `Skip` cho integration can dich vu ngoai nhu SMTP, Gemini, VNPAY credential/public callback. Khong skip health, auth, catalog, mock payment, admin CRUD, guest-list seed, scanner seed va test suite noi bo.

## 13. Troubleshooting

### Container khong healthy

```powershell
docker compose ps
docker compose logs --tail 200 backend-api
docker compose logs --tail 200 audience-web
docker compose logs --tail 200 admin-web
```

Neu backend loi migration tren database cu, sao luu du lieu can thiet roi reset volume theo muc 3.2.

### Cong da bi chiem

```powershell
Get-NetTCPConnection -State Listen | Where-Object LocalPort -In 3000,3001,3002,5433,6379
```

Dung process dang chiem cong hoac doi published port trong `docker-compose.yml`.

### Audience/Admin tra 502 hoac health proxy fail

Kiem tra `backend-api` healthy truoc. Trong container, web goi backend qua `http://backend-api:3000`, khong phai `localhost:3000`.

### VNPAY redirect sang trang bao merchant sai

Gia tri `VNPAY_TMN_CODE=demo` va `VNPAY_HASH_SECRET=demo` khong hop le voi sandbox. Thay bang credential cung mot merchant sandbox, recreate backend va tao order moi.

### Scanner khong ket noi tu emulator/dien thoai

- Android emulator dung `10.0.2.2`, khong dung `localhost`.
- Dien thoai dung LAN IP cua may chay Docker.
- Kiem tra hai may cung mang va Windows Firewall cho phep port 3000.
- API Base URL phai ket thuc bang `/scanner`.
- Device ID va scanner token phai thuoc cung scanner user.

### SMTP/Gemini khong cau hinh

De bien credential trong va giu notification worker/scheduler tat cho base demo. Xac minh record/outbox va UI thay vi cho email hay AI provider that. Ghi `Skip` ro ly do cho integration ngoai, khong coi la loi khoi dong he thong.

## 14. Ket thuc phien test

Dung container nhung giu du lieu:

```powershell
docker compose stop
```

Dung va xoa container/network, van giu named volume:

```powershell
docker compose down
```

Chi them `-v` khi muon xoa database va storage demo.
