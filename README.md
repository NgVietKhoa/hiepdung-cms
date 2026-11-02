# CMS xưởng cơ khí Hiệp Dung

Hệ thống quản lý cho xưởng cơ khí (phát triển từ ứng dụng **Báo giá nhanh**), chạy dạng **ứng dụng desktop Windows** trên máy của xưởng, dữ liệu nằm trên ổ cứng máy đó. Các module:

| Module | Chức năng |
|---|---|
| **Tổng quan** | Doanh thu, thu – chi, tồn quỹ, công nợ, báo giá chờ chốt, chấm công hôm nay, biểu đồ thu – chi 6 tháng |
| **Báo giá & nghiệm thu** | Như bản cũ: báo giá, biên bản nghiệm thu, khách hàng, danh mục hạng mục; xuất PDF / Word / Excel, in |
| **Chấm công & lương** | Nhân viên; bảng chấm công tháng (chọn ký hiệu rồi bấm ô, tăng ca, ghi chú); bảng lương công nhật (công × lương/công + tăng ca + phụ cấp − tạm ứng); xuất Excel |
| **Hoá đơn** | Sổ theo dõi hoá đơn **mua vào / bán ra** (không phát hành HĐĐT): dòng hàng, chiết khấu, VAT, hạn thanh toán, file PDF/XML đính kèm, lập từ báo giá, ghi tiền thu / trả; thuế GTGT phải nộp tạm tính; nhà cung cấp |
| **Thu chi & công nợ** | Phiếu thu / chi (tự đánh số PT-, PC-), tiền mặt / chuyển khoản, sổ quỹ theo tháng; công nợ phải thu / phải trả theo đối tác, quá hạn |

- Một người dùng, **không đăng nhập**: mở ứng dụng là vào thẳng, dùng được mọi chức năng.
- Ứng dụng Electron tự chạy **PostgreSQL nhúng** và **máy chủ API** (Node.js + Express + Prisma) ngay trên máy, rồi mở giao diện React trong cửa sổ. Máy dùng không cần cài Node, Docker hay PostgreSQL.
- Tự lưu liên tục ở báo giá, nghiệm thu, hoá đơn; lỡ đóng cửa sổ vẫn không mất phần đang nhập.
- Danh mục, ký hiệu, vai trò… đều là dữ liệu trong DB (sửa trong ứng dụng); giá trị ban đầu ở `prisma/duLieuBanDau.ts`.

## 1. Cài và dùng

Tạo bộ cài trên máy dev (mục 3) rồi chạy `release/Hiep Dung CMS Setup <phiên bản>.exe` trên máy của xưởng. Bộ cài chưa ký số nên Windows SmartScreen cảnh báo lần đầu: bấm **More info → Run anyway**.

- **Lần mở đầu:** tự tạo CSDL, không nạp dữ liệu mẫu. Vào **Cài đặt**: nhập thông tin xưởng, tài khoản ngân hàng, tải logo.
- **Dữ liệu:** `%APPDATA%\hiep-dung-cms\` — `pgdata\` (CSDL), `cauHinh.json` (mật khẩu CSDL), `nhatKy.log` (nhật ký khi có lỗi).
- **File PDF / Word / Excel** khi bấm "Lưu": thư mục `Hiep Dung CMS` trong Documents (menu **Dữ liệu → Mở thư mục file đã lưu**).
- **Cập nhật phiên bản:** chạy bộ cài mới đè lên; dữ liệu trong AppData giữ nguyên, lần mở đầu tự áp migration mới.
- Máy chủ chạy ở cổng `41730` và chỉ nhận kết nối từ chính máy đó (`127.0.0.1`): vì không có đăng nhập nên máy khác / điện thoại cùng mạng không vào được.
- Chỉ mở được một cửa sổ ứng dụng mỗi lúc. Gửi khách qua Zalo: lưu PDF rồi kéo file vào Zalo.

## 2. Sao lưu

- **Toàn bộ dữ liệu:** menu **Dữ liệu → Sao lưu toàn bộ…** → chọn thư mục (nên là USB / ổ khác) → tạo `SaoLuu_<ngày>_<giờ>\` gồm `pgdata\` + `cauHinh.json`. Ứng dụng tạm dừng vài giây trong lúc chép (bản chép thư mục khi Postgres đang chạy không dùng được; bản Postgres nhúng không có `pg_dump`).
- **Khôi phục:** **Dữ liệu → Khôi phục từ bản sao lưu…** → chọn thư mục `SaoLuu_…`. Dữ liệu đang có được giữ lại ở `%APPDATA%\hiep-dung-cms\TruocKhoiPhuc_<ngày>_<giờ>\` (cùng dạng bản sao lưu, chọn nhầm thì khôi phục lại từ đó).
- Trang Báo giá nhắc khi đã hơn 30 ngày chưa **Sao lưu toàn bộ**.

## 3. Phát triển trên máy

Cần Node.js 20+ và Docker Desktop (chỉ để chạy PostgreSQL khi dev).

```bash
cp .env.example .env      # Windows: copy .env.example .env
npm install
npm run db:up        # PostgreSQL trong Docker (docker-compose.yml chỉ có service db)
npm run db:deploy    # áp dụng migration (lần đầu)
npm run db:seed      # nạp dữ liệu ban đầu còn thiếu (cài đặt, cột bảng hạng mục, dữ liệu mẫu lần đầu…) — chạy lại không sao
npm run dev:api      # máy chủ API, cổng API_PORT, tự khởi động lại khi sửa mã
npm run dev          # giao diện, cổng DEV_PORT — mở http://127.0.0.1:<DEV_PORT>
```

Vite tự chuyển tiếp mọi yêu cầu `/api` sang `127.0.0.1:API_PORT`.

| Biến (`.env`) | Ý nghĩa | Mặc định |
|---|---|---|
| `POSTGRES_PORT` | Cổng PostgreSQL mở ra máy thật (Prisma, DBeaver, pgAdmin kết nối vào) | `5432` |
| `API_PORT` | Cổng của `npm run dev:api` | `3000` |
| `DEV_PORT` | Cổng giao diện khi phát triển bằng `npm run dev` | `5173` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Tài khoản và tên CSDL | `hiepdung` / — / `hiep_dung_cms` |
| `POSTGRES_HOST` | Máy chứa DB | `localhost` |
| `DATABASE_URL` | Chuỗi kết nối cho Prisma (đọc trong `prisma.config.ts` và `server/prisma.ts`); **tự ghép** từ các biến trên, thường không cần sửa | |
| `SEED_DU_LIEU_MAU` | Lần chạy đầu (DB trống) tự nạp dữ liệu mẫu | `true` |
| `TZ` | Múi giờ máy chủ | `Asia/Ho_Chi_Minh` |
| `THU_MUC_LUU_FILE` | Thư mục lưu file PDF / Word / Excel khi bấm "Lưu" | `./file` |

> `.env` trên máy dựng dự án đặt `POSTGRES_PORT=5433`, `DEV_PORT=5174` vì cổng 5432 và 5173 đang bị chương trình khác dùng. Đổi lại tuỳ ý.

**Prisma 7:** chuỗi kết nối không còn nằm trong `schema.prisma`. Prisma CLI (migrate, studio…) đọc từ `prisma.config.ts`; máy chủ kết nối qua driver adapter `@prisma/adapter-pg` trong `server/prisma.ts`. Prisma Client được sinh vào `server/generated/` (không đưa vào kho mã).

| Lệnh | Việc |
|---|---|
| `npm test` | Unit test: đọc số thành chữ, tính tiền, đánh số, mẫu PDF |
| `npm run build` | Kiểm tra kiểu (giao diện + máy chủ) và đóng gói giao diện vào `dist/` |
| `npm run desktop:dev` | Build rồi mở ứng dụng desktop trên máy dev (dữ liệu ở `%APPDATA%\hiep-dung-cms\`, như bản cài) |
| `npm run desktop:build` | Tạo bộ cài `release/Hiep Dung CMS Setup <phiên bản>.exe` |
| `npm run db:migrate` | Sau khi sửa `prisma/schema.prisma`: tạo migration mới |
| `npm run db:seed` | Nạp dữ liệu ban đầu từ `prisma/seed.ts` (chỉ thêm phần còn thiếu, không ghi đè). Bản desktop tự chạy khi mở |
| `npm run db:studio` | Mở Prisma Studio để xem/sửa dữ liệu trực tiếp |

## Kiến trúc & cấu trúc thư mục

```
desktop/main.ts          Bản desktop (Electron): PostgreSQL nhúng → migrate → seed → máy chủ, mở cửa sổ; menu sao lưu / khôi phục
docker-compose.yml       Chỉ PostgreSQL cho lúc phát triển
prisma.config.ts         Cấu hình Prisma CLI (đường dẫn schema, migration, DATABASE_URL)
.env.example             Mẫu cấu hình khi phát triển
prisma/
├── schema.prisma        Mô hình dữ liệu
├── seed.ts              Dữ liệu ban đầu (npm run db:seed): chỉ thêm phần còn thiếu
├── duLieuBanDau.ts      Giá trị ban đầu của cài đặt (tên xưởng mẫu, điều khoản, đơn vị tính, nhóm, mức VAT)
└── migrations/          Migration SQL (đưa vào kho mã)
server/                  Máy chủ API
├── index.ts             Các tuyến /api/* (báo giá + gắn các module), phục vụ dist/, xử lý lỗi; chỉ nghe 127.0.0.1
├── dichVu.ts            Nghiệp vụ báo giá: lưu chứng từ, cấp số, ảnh, sao lưu, dữ liệu mẫu
├── anhXa.ts             Chuyển đổi bản ghi Prisma ⇄ kiểu dữ liệu ứng dụng, làm sạch dữ liệu vào (dùng chung)
├── tienIch.ts           boc(), khoảng ngày theo tháng, cấp số phiếu có khoá
├── modules/             Mỗi module một Router: chamCong, hoaDon, thuChi, tongQuan
├── prisma.ts            PrismaClient + adapter PostgreSQL
├── moiTruong.ts         Đọc .env
└── generated/           Prisma Client (tự sinh)
src/                     Giao diện (React + Vite)
├── db/
│   ├── kieu.ts          Kiểu dữ liệu dùng chung giao diện ⇄ máy chủ
│   ├── api.ts           Gọi API, báo mất kết nối
│   ├── hooks.ts         useTruyVan: tải và tự làm mới dữ liệu
│   ├── thaoTac.ts       Tạo / nhân bản / chuyển báo giá → nghiệm thu / xoá
│   ├── nhapTam.ts       Bản nháp tạm (localStorage) chống mất dữ liệu
│   ├── macDinh.ts, duLieuMau.ts, saoLuu.ts
├── lib/                 Logic thuần, dùng chung với máy chủ
│   ├── docSo.ts (+test)      Đọc số tiền thành chữ
│   ├── tinhTien.ts (+test)   Thành tiền, chiết khấu, VAT — tongBaoGia / tongNghiemThu dùng cho mọi màn hình và bản xuất
│   ├── soChungTu.ts (+test)  BG-2026-001, NT-2026-001
│   ├── nghiepVu.ts           Dựng chứng từ mới, chuyển báo giá → nghiệm thu
│   └── dinhDang.ts, timKiem.ts, anh.ts, useTuLuu.ts
├── pdf/                 Mẫu Báo giá, Biên bản nghiệm thu (+ phụ lục ảnh), xuất/in/chia sẻ
├── components/, pages/  Giao diện báo giá + khung chung (menu: components/menu.ts)
└── modules/             Các module CMS — mỗi thư mục: kieu.ts (kiểu dùng chung với máy chủ) + các trang
    ├── api.ts           Gọi API của các module
    ├── tongQuan/  chamCong/ (tinhLuong.ts +test, xuatExcel.ts)
    └── hoaDon/  thuChi/
```

**Thêm module mới:** model trong `schema.prisma` → `npm run db:migrate`; kiểu ở `src/modules/<tên>/kieu.ts`; Router ở `server/modules/<tên>.ts` (gắn trong `server/index.ts`); trang + mục menu (`src/components/menu.ts`) + route (`src/App.tsx`).

### Mô hình dữ liệu (PostgreSQL)

- Báo giá: `khach_hang`, `hang_muc`, `bao_gia` → `dong_bao_gia`, `nghiem_thu` → `dong_nghiem_thu` + `anh_nghiem_thu`, `cai_dat` (1 dòng), `cot_hang_muc`.
- Chấm công: `nhan_vien`, `loai_cong` (ký hiệu X, N, P… + hệ số công), `cham_cong` (một ô = nhân viên × ngày, `UNIQUE`).
- Hoá đơn: `nha_cung_cap`, `hoa_don` → `dong_hoa_don` + `tep_hoa_don` (file lưu trong DB, tối đa 15 MB).
- Thu chi: `phieu_thu_chi` (gắn khách / NCC / nhân viên / hoá đơn; `tru_vao_luong` = tạm ứng).
Tiền: `Decimal(15,0)` (đồng); số lượng: `Decimal(14,3)`. **Thành tiền và tổng không lưu** mà luôn tính lại từ số lượng × đơn giá nên không bao giờ lệch. Xoá báo giá → biên bản đã lập vẫn giữ (khoá ngoại `SET NULL`); xoá biên bản → dòng và ảnh xoá theo (`CASCADE`).

### API chính

| | |
|---|---|
| `GET /api/suc-khoe` | Kiểm tra máy chủ |
| `GET/PUT /api/cai-dat` | Cài đặt |
| `GET /api/khach-hang`, `PUT/DELETE /api/khach-hang/:id` | Khách hàng (PUT = tạo hoặc sửa) |
| `GET /api/hang-muc`, `PUT/DELETE /api/hang-muc/:id` | Danh mục |
| `GET /api/bao-gia`, `GET/PUT/DELETE /api/bao-gia/:id` | Danh sách chỉ trả bản tóm tắt kèm tổng tiền (không kèm dòng); `GET /:id` trả đầy đủ. PUT ghi cả chứng từ kèm dòng; số trống → máy chủ cấp số |
| `GET /api/nghiem-thu[?baoGiaId=]`, `GET/PUT/DELETE /api/nghiem-thu/:id` | Như trên |
| `GET/POST /api/nghiem-thu/:id/anh`, `PATCH/DELETE /api/anh/:id` | Ảnh nghiệm thu |
| `POST /api/sao-luu/da-tai` (bản desktop gọi sau khi sao lưu toàn bộ), `POST /api/du-lieu-mau`, `DELETE /api/du-lieu`, `POST /api/don-nhap-rong` | Bảo trì |
| `/api/nhan-vien`, `/api/loai-cong`, `GET/PUT /api/cham-cong?thang=`, `GET /api/bang-luong?thang=` | Chấm công (PUT ghi nhiều ô; ô trống = xoá) |
| `/api/nha-cung-cap`, `/api/hoa-don[/:id]`, `/api/hoa-don/:id/tep`, `/api/tep-hoa-don/:id`, `GET /api/hoa-don-tu-bao-gia/:id`, `GET /api/thue-gtgt` | Hoá đơn |
| `/api/phieu-thu-chi[/:id]`, `GET /api/so-quy`, `GET /api/cong-no?loai=phaiThu\|phaiTra`, `GET /api/tam-ung` | Thu chi |
| `GET /api/tong-quan?thang=` | Tổng quan |

Lọc theo tháng: `?thang=YYYY-MM` (hoặc `?tu=YYYY-MM-DD&den=YYYY-MM-DD`).

## Ghi chú về các lựa chọn thiết kế

| Vấn đề | Cách xử lý |
|---|---|
| Đánh số chứng từ khi nhiều máy dùng chung | **Máy chủ cấp số** trong giao dịch có khoá `pg_advisory_xact_lock`, cột số có ràng buộc `UNIQUE`. Đã thử 20 yêu cầu tạo đồng thời → 20 số liên tiếp, không trùng. Số tự về 001 khi sang năm; sửa tay được, trùng thì báo lỗi rõ ràng. |
| Không mất dữ liệu khi mất kết nối / đóng cửa sổ | Mỗi lần sửa: ghi ngay bản nháp tạm vào localStorage (đồng bộ), gửi máy chủ sau 0,4 giây. Mất kết nối → hiện thanh báo, tự thử lại mỗi 5 giây. Lần mở sau gửi lại bản nháp tạm còn sót. |
| Hai máy cùng sửa một chứng từ | Bản lưu sau cùng thắng (đơn giản, phù hợp xưởng nhỏ). Các lần ghi cùng một chứng từ xếp hàng bằng khoá `pg_advisory_xact_lock` theo id; trên trình duyệt, lần lưu tự động sau chỉ gửi khi lần trước xong. Danh sách tự làm mới khi quay lại tab. |
| Làm tròn thành tiền | Số lượng quy ra phần nghìn (đúng 3 chữ số thập phân như DB lưu) rồi nhân trên số nguyên, nên 0,145 × 100 = 15 — khớp công thức `ROUND()` trong file Excel xuất ra. |
| Chứng từ tạo ra rồi bỏ trống | Rời màn hình → xoá ngay. Đóng tab đột ngột → lần mở sau trên **chính máy đó** xoá ngay; máy chủ dọn nháp trống của mọi máy sau 10 phút (không xoá sớm hơn để khỏi xoá nhầm nháp máy khác vừa tạo). |
| Ảnh nghiệm thu | Nén trên điện thoại (JPEG, cạnh dài 1280px, ~100–300 KB) rồi mới gửi lên; lưu ở bảng riêng `anh_nghiem_thu`. |
| Đặc tả nêu quy tắc “tư” (24, 34…) nhưng test bắt buộc 2.024.350 → “…hai mươi **bốn** nghìn…” | Mặc định đọc **“bốn”** để đúng test; Cài đặt có tuỳ chọn chuyển sang “hai mươi tư”. |
| “Bằng chữ” với số lẻ đồng | Làm tròn đến đồng; “chẵn” chỉ thêm khi số tròn nghìn (khác 0). |
| Thứ tự chiết khấu và VAT | Chiết khấu trừ trước, VAT tính trên số tiền **sau** chiết khấu. |
| Biên bản cần thêm trường | Thêm `khachHangId`, `ngayCanCu`, `tieuDe`, `tyLeVAT`, `chietKhau` — sao chép từ báo giá. |
| Trạng thái biên bản | Nháp / Đã ký / Huỷ. |
| Tạo nghiệm thu từ báo giá chưa chốt | Hỏi “Đánh dấu Đã chốt và tạo biên bản?”. Một báo giá lập được nhiều biên bản (giao nhiều đợt). |
| Xoá khách hàng đang có báo giá | Cho xoá nhưng cảnh báo; báo giá giữ lại, chỉ mất liên kết khách. |
| Hợp đồng không có số | Biên bản in dòng chấm “……” để điền tay. |
| Ô chọn ngày | Lịch chọn ngày của điện thoại; bên dưới luôn hiện “Ngày dd/mm/yyyy”. Văn bản in luôn dd/mm/yyyy. |
| Nút In trên điện thoại | Mở PDF ở thẻ mới để in bằng trình xem PDF của máy; máy tính in thẳng. |
| Tên file | `BaoGia_BG-2026-001_ThietBiCongNghiepHoangLong.pdf` (bỏ dấu, bỏ tiền tố “Công ty TNHH/CP…”). |

## Câu hỏi thường gặp

- **Ứng dụng báo "Không khởi động được"** → xem `%APPDATA%\hiep-dung-cms\nhatKy.log`. Hay gặp: cổng `41730` đang bị chương trình khác dùng.
- **(Dev) Báo lỗi cổng đã được dùng (port is already allocated)** → đổi `POSTGRES_PORT` / `API_PORT` / `DEV_PORT` trong `.env`.
- **(Dev) Mở `localhost:...` bị treo, `127.0.0.1:...` thì được** → trên Windows, `localhost` có thể trỏ vào IPv6 `::1` đang bị chương trình khác (vd. WSL) giữ cùng cổng. Dùng `127.0.0.1` hoặc đổi sang cổng khác.
- **(Dev) Đổi `POSTGRES_PASSWORD` rồi không kết nối được DB** → Postgres chỉ đọc mật khẩu lúc tạo volume lần đầu. Hoặc đổi lại mật khẩu cũ, hoặc đổi trong DB: `docker compose exec db psql -U hiepdung -d hiep_dung_cms -c "ALTER USER hiepdung PASSWORD 'mat_khau_moi';"`. (Xoá volume `docker compose down -v` cũng được nhưng **mất toàn bộ dữ liệu dev**.)

## Thiết kế sẵn cho Giai đoạn 2

- **Công cụ tính khối lượng / giá phôi**: thêm `src/lib/khoiLuongPhoi.ts` (hàm thuần theo công thức trong đặc tả, có test) và một `HopThoai`; “Thêm vào báo giá” chỉ cần nối một `DongHangMuc` vào `bg.danhSachDong` như nút “Thêm dòng” trong `BaoGiaSua.tsx`.
- **Nhập nhanh bằng giọng nói / ghi chú thô**: thêm tuyến `POST /api/tach-dong` trên máy chủ (giữ khoá API AI ở máy chủ, không đặt trong trình duyệt), trả về `DongHangMuc[]`; giao diện hiển thị lại bằng `DanhSachDong` để kiểm tra rồi nối vào báo giá. Giọng nói: Web Speech API (`lang = 'vi-VN'`).
- **Công nợ theo báo giá** (khi không xuất hoá đơn): hiện công nợ tính theo hoá đơn; có thể cho phiếu thu gắn `baoGiaId` và tính nợ theo báo giá đã chốt.
- **Xuất Word (.docx)**: thêm `src/docx/` với hàm `mauBaoGiaDocx(bg, kh, cd)` cùng tham số như mẫu PDF (thư viện `docx`), gắn thêm nút trên `XemTruoc.tsx`.

## Công nghệ

React 18, TypeScript, Vite, React Router · Express 4, Prisma 7 (driver adapter pg), PostgreSQL (nhúng qua `embedded-postgres`) · Electron, electron-builder · pdfmake (tạo PDF), pdf.js (xem trước) · Vitest.
