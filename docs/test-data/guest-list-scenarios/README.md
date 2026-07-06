# Guest List CSV Test Scenarios

Schema hien tai:
- Bat buoc co `full_name`
- Bat buoc co it nhat mot trong `email`, `phone`, `sponsor_id`
- `zone_code` va `ticket_type_slug` neu co trong file cu se duoc bo qua
- Tat ca guest sau khi publish deu vao mot khu rieng: `GUEST-LIST`

Published:
- 01-valid-public-zones.csv: file hop le co du cac kieu identity co ban.
- 02-idempotent-reupload-same-as-01.csv: y chang file 01 de test idempotent checksum; neu upload truoc 01 thi van published.
- 03-valid-guest-only-vip-zone.csv: file hop le don gian cho guest area rieng.
- 04-valid-mixed-public-and-guest-only.csv: file cu co `zone_code` va `ticket_type_slug`, hien tai van published vi cac cot nay bi ignore.
- 05-valid-semicolon-delimiter.csv: test parser delimiter `;`.
- 06-valid-ticket-type-only.csv: ten file cu, noi dung da doi thanh file hop le theo schema moi.
- 07-valid-quoted-fields.csv: test ten co dau phay va dau nhay kep.
- 11-invalid-missing-zone-and-ticket.csv: ten file cu, nhung theo schema moi day la file hop le vi khong can zone/ticket.
- 12-invalid-zone-ticket-mismatch.csv: ten file cu, nhung theo schema moi day la file hop le vi cot legacy bi ignore.
- 13-invalid-unknown-ticket-type.csv: ten file cu, nhung theo schema moi day la file hop le vi cot legacy bi ignore.

Validation failed:
- 08-invalid-duplicate-in-file.csv: trung identity trong cung file.
- 09-invalid-active-duplicate-after-01.csv: upload sau khi 01 da published de test duplicate voi active guest list.
- 10-invalid-email-phone-identity.csv: email sai dinh dang, phone qua ngan, va dong khong co identity.
- 17-invalid-empty-full-name-row.csv: co header hop le nhung gia tri `full_name` bi rong.

Failed:
- 14-invalid-duplicate-headers.csv: header bi trung lap.
- 15-invalid-unsupported-header.csv: header khong duoc support.
- 16-invalid-missing-full-name-header-group.csv: thieu header `full_name`.
- 18-invalid-tab-data-with-comma-header.csv: du lieu tab khong khop schema header comma hien tai.
