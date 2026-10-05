# CMS xưởng cơ khí Hiệp Dung

Hệ thống quản lý cho xưởng cơ khí (phát triển từ ứng dụng **Báo giá nhanh**). Dùng tốt trên điện thoại lẫn máy tính, **dùng chung một cơ sở dữ liệu**. Các module:

| Module | Chức năng |
|---|---|
| **Tổng quan** | Doanh thu, thu – chi, tồn quỹ, công nợ, báo giá chờ chốt, chấm công hôm nay, vật tư sắp hết, biểu đồ thu – chi 6 tháng |
| **Báo giá & nghiệm thu** | Như bản cũ: báo giá, biên bản nghiệm thu, khách hàng, danh mục hạng mục; xuất PDF / Word / Excel, gửi Zalo |
| **Chấm công & lương** | Nhân viên; bảng chấm công tháng (chọn ký hiệu rồi bấm ô, tăng ca, ghi chú); bảng lương công nhật (công × lương/công + tăng ca + phụ cấp − tạm ứng); xuất Excel; nhân viên tự xem **Công của tôi** |
| **Hoá đơn** | Sổ theo dõi hoá đơn **mua vào / bán ra** (không phát hành HĐĐT): dòng hàng, chiết khấu, VAT, hạn thanh toán, file PDF/XML đính kèm, lập từ báo giá, ghi tiền thu / trả; thuế GTGT phải nộp tạm tính; nhà cung cấp |
| **Thu chi & công nợ** | Phiếu thu / chi (tự đánh số PT-, PC-), tiền mặt / chuyển khoản, sổ quỹ theo tháng; công nợ phải thu / phải trả theo đối tác, quá hạn |
| **Kho vật tư** | Vật tư, phiếu nhập / xuất (PN-, PX-), tồn kho tính từ phiếu, chặn xuất quá tồn, thẻ kho, cảnh báo dưới mức tồn tối thiểu |
| **Landing page** (khung tạm) | Nội dung theo khối, thư viện ảnh, SEO, khách để lại liên hệ; **API công khai** cho trang landing làm riêng |
| **Tài khoản & quyền** | Mỗi người một tài khoản; vai trò (Quản trị / Kế toán / Nhân viên… sửa được) quyết định dùng module nào |

- Chạy bằng **Docker** gồm 3 phần: **db** (PostgreSQL), **api** (Node.js + Express + Prisma), **web** (giao diện React, phục vụ bằng nginx).
- Tự lưu liên tục ở báo giá, nghiệm thu, hoá đơn; mất mạng hay lỡ đóng trang vẫn không mất phần đang nhập.
- Danh mục, ký hiệu, vai trò… đều là dữ liệu trong DB (sửa trong ứng dụng); giá trị ban đầu ở `prisma/duLieuBanDau.ts`, nạp bằng `npm run db:seed`.

## 1. Cấu hình (.env)

```bash
cp .env.example .env      # Windows: copy .env.example .env
```

Mở `.env` và sửa theo máy của bạn:

| Biến | Ý nghĩa | Mặc định |
|---|---|---|
| `POSTGRES_PORT` | Cổng PostgreSQL mở ra máy thật (Prisma, DBeaver, pgAdmin kết nối vào) | `5432` |
| `API_PORT` | Cổng máy chủ API (container `api`; cũng là cổng của `npm run dev:api`) | `3000` |
| `WEB_PORT` | Cổng giao diện khi chạy Docker (container `web`) — **mở cổng này để dùng**. Chỉ đổi ở đây, không sửa vế `:80` trong `docker-compose.yml` | `5175` |
| `DEV_PORT` | Cổng giao diện khi phát triển bằng `npm run dev` | `5173` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Tài khoản và tên CSDL | `hiepdung` / — / `hiep_dung_cms` |
| `POSTGRES_HOST` | Máy chứa DB khi chạy API trực tiếp trên máy (Docker tự đổi thành `db`) | `localhost` |
| `DATABASE_URL` | Chuỗi kết nối cho Prisma (đọc trong `prisma.config.ts` và `server/prisma.ts`); **tự ghép** từ các biến trên, thường không cần sửa | |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Tài khoản **Quản trị đầu tiên** do seed tạo khi DB chưa có tài khoản nào. Mật khẩu để trống → seed tạo mật khẩu ngẫu nhiên và in ra log (`docker compose logs api`). Sau đó đổi mật khẩu trong ứng dụng; sửa biến này không còn tác dụng. (`APP_PASSWORD` của bản cũ vẫn được nhận làm `ADMIN_PASSWORD`) | `admin` / trống |
| `APP_SECRET` | Chuỗi bí mật ký phiên đăng nhập — **bắt buộc** đặt chuỗi ngẫu nhiên dài (không đặt thì mỗi lần khởi động lại máy chủ mọi người phải đăng nhập lại) | |
| `LANDING_ORIGIN` | Tên miền trang landing được gọi API công khai (CORS), cách nhau dấu phẩy. Trống = cho phép mọi nơi | trống |
| `SEED_DU_LIEU_MAU` | Lần chạy đầu (DB trống) tự nạp dữ liệu mẫu | `true` |
| `TZ` | Múi giờ máy chủ | `Asia/Ho_Chi_Minh` |

Tạo chuỗi ngẫu nhiên cho `APP_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

> `.env` trên máy dựng dự án đặt `POSTGRES_PORT=5433`, `DEV_PORT=5174` vì cổng 5432 và 5173 đang bị chương trình khác dùng. Đổi lại tuỳ ý. **Nếu đổi `POSTGRES_PASSWORD` sau khi DB đã được tạo**, Postgres vẫn giữ mật khẩu cũ trong volume — xem mục Câu hỏi thường gặp.

## 2. Chạy bằng Docker (dùng thật)

Cần Docker Desktop (Windows/Mac) hoặc Docker Engine (Linux).

```bash
docker compose up -d --build
```

Lệnh này build image `api` và `web`, tải image `db` (PostgreSQL chính thức, không cần build) rồi chạy cả ba theo thứ tự **db → api → web** (mỗi phần đợi phần trước sẵn sàng). Container `api` tự áp dụng migration và chạy seed (cài đặt ban đầu, cột bảng hạng mục, đơn vị tính, nhóm, mức VAT); lần đầu tự nạp **dữ liệu mẫu** (3 khách hàng, 15 hạng mục, 2 báo giá, 1 biên bản).

Mở `http://127.0.0.1:<WEB_PORT>` (mặc định http://127.0.0.1:5175).

Trên điện thoại cùng mạng Wi-Fi: mở `http://<IP máy chạy Docker>:<WEB_PORT>`, ví dụ `http://192.168.1.10:5175`, rồi chọn **“Thêm vào màn hình chính”**.

Khi bắt đầu dùng thật: **Cài đặt** → nhập thông tin xưởng, tài khoản ngân hàng, tải logo → **Xoá toàn bộ dữ liệu** để bỏ dữ liệu mẫu (cài đặt xưởng được giữ).

Lệnh hay dùng:

```bash
docker compose ps                   # xem trạng thái db / api / web
docker compose logs -f api          # xem nhật ký máy chủ API
docker compose down                 # tắt (dữ liệu vẫn giữ trong volume du_lieu_postgres)
docker compose up -d --build        # cập nhật sau khi sửa mã (build lại api + web)
```

## 3. Phát triển trên máy

```bash
npm install
npm run db:up        # chỉ chạy PostgreSQL trong Docker
npm run db:deploy    # áp dụng migration (lần đầu)
npm run db:seed      # nạp dữ liệu ban đầu còn thiếu (cài đặt, cột bảng hạng mục, dữ liệu mẫu lần đầu…) — chạy lại không sao
npm run db:generate  # sinh Prisma Client vào server/generated (dev:api và build cũng tự chạy)
npm run dev:api      # máy chủ API, cổng API_PORT, tự khởi động lại khi sửa mã
npm run dev          # giao diện, cổng DEV_PORT — mở http://127.0.0.1:<DEV_PORT>
```

Vite tự chuyển tiếp mọi yêu cầu `/api` sang `127.0.0.1:API_PORT` (đang chạy `docker compose up -d` thì dùng luôn container `api`, khỏi `dev:api`).

**Prisma 7:** chuỗi kết nối không còn nằm trong `schema.prisma`. Prisma CLI (migrate, studio…) đọc từ `prisma.config.ts`; máy chủ kết nối qua driver adapter `@prisma/adapter-pg` trong `server/prisma.ts`. Prisma Client được sinh vào `server/generated/` (không đưa vào kho mã).

| Lệnh | Việc |
|---|---|
| `npm test` | Unit test: đọc số thành chữ, tính tiền, đánh số, mẫu PDF |
| `npm run build` | Kiểm tra kiểu (giao diện + máy chủ) và đóng gói giao diện vào `dist/` |
| `npm start` | Chạy máy chủ không cần Docker (phục vụ luôn `dist/` nếu đã `npm run build`) |
| `npm run db:migrate` | Sau khi sửa `prisma/schema.prisma`: tạo migration mới |
| `npm run db:seed` | Nạp dữ liệu ban đầu từ `prisma/seed.ts` (chỉ thêm phần còn thiếu, không ghi đè). Docker tự chạy khi khởi động |
| `npm run db:studio` | Mở Prisma Studio để xem/sửa dữ liệu trực tiếp |

## 4. Đưa ra Internet (HTTPS)

Nút **Gửi Zalo** cần **HTTPS** (yêu cầu của trình duyệt). Trên `http://192.168...` vẫn dùng được Tải PDF / In.

Cách đơn giản: đặt máy chủ (VPS hoặc máy trong xưởng) sau **Caddy** / **Nginx** / **Cloudflare Tunnel** trỏ về cổng `WEB_PORT`. Ví dụ Caddy (tự lấy chứng chỉ HTTPS):

```
cms.ten-mien-cua-ban.vn {
    reverse_proxy 127.0.0.1:5175
}
```

Khi đưa ra Internet: dùng mật khẩu mạnh cho các tài khoản, đặt `APP_SECRET` ngẫu nhiên, và **không mở cổng `POSTGRES_PORT`, `API_PORT`** ra ngoài: chỉ cần `WEB_PORT` (web tự chuyển `/api` sang api qua mạng nội bộ Docker). Có thể xoá dòng `ports` của `db` và `api` trong `docker-compose.yml` nếu không cần kết nối trực tiếp.

## 5. Sao lưu

- **Cài đặt → Tải file sao lưu**: tải toàn bộ dữ liệu (kèm ảnh) thành một file JSON. **Khôi phục từ file sao lưu** thay toàn bộ dữ liệu trên máy chủ bằng nội dung file. File sao lưu từ **bản cũ chạy trên trình duyệt (IndexedDB)** cũng khôi phục được — dùng để chuyển dữ liệu cũ sang.
- File sao lưu JSON chỉ gồm phần **báo giá** (cài đặt, khách hàng, hạng mục, báo giá, biên bản, ảnh). **Toàn bộ hệ thống** (tài khoản, chấm công, hoá đơn kèm file, thu chi, kho, landing) sao lưu ở mức CSDL:
  `docker compose exec db pg_dump -U hiepdung -Fc hiep_dung_cms > saoluu.dump` — khôi phục: `docker compose exec -T db pg_restore -U hiepdung -d hiep_dung_cms --clean < saoluu.dump`
- Nên đặt lịch chạy `pg_dump` hằng ngày (Task Scheduler / cron) và cất file ra nơi khác.

## Kiến trúc & cấu trúc thư mục

```
docker-compose.yml       db (postgres:16) → api → web
docker/
├── api.Dockerfile       Image máy chủ API (prisma migrate deploy → tsx server)
├── web.Dockerfile       Build giao diện bằng Vite, phục vụ bằng nginx
└── nginx.conf           File tĩnh + chuyển /api sang container api
prisma.config.ts         Cấu hình Prisma CLI (đường dẫn schema, migration, DATABASE_URL)
.env.example             Mẫu cấu hình cổng, mật khẩu
prisma/
├── schema.prisma        Mô hình dữ liệu
├── seed.ts              Dữ liệu ban đầu (npm run db:seed): chỉ thêm phần còn thiếu
├── duLieuBanDau.ts      Giá trị ban đầu của cài đặt (tên xưởng mẫu, điều khoản, đơn vị tính, nhóm, mức VAT)
└── migrations/          Migration SQL (đưa vào kho mã)
server/                  Máy chủ API
├── index.ts             Các tuyến /api/* (báo giá + gắn các module), phân quyền, phục vụ dist/, xử lý lỗi
├── dichVu.ts            Nghiệp vụ báo giá: lưu chứng từ, cấp số, ảnh, sao lưu, dữ liệu mẫu
├── anhXa.ts             Chuyển đổi bản ghi Prisma ⇄ kiểu dữ liệu ứng dụng, làm sạch dữ liệu vào (dùng chung)
├── xacThuc.ts           Tài khoản: mật khẩu scrypt, phiên ký HMAC 30 ngày, canQuyen(...) theo module
├── tienIch.ts           boc(), khoảng ngày theo tháng, cấp số phiếu có khoá
├── datLaiMatKhau.ts     npm run dat-lai-mat-khau -- <tên> <mật khẩu> (khi quên mật khẩu)
├── modules/             Mỗi module một Router: taiKhoan, chamCong, hoaDon, thuChi, kho, landing (+ API công khai), tongQuan
├── prisma.ts            PrismaClient + adapter PostgreSQL
├── moiTruong.ts         Đọc .env
└── generated/           Prisma Client (tự sinh)
src/                     Giao diện (React + Vite)
├── db/
│   ├── kieu.ts          Kiểu dữ liệu dùng chung giao diện ⇄ máy chủ
│   ├── api.ts           Gọi API, báo mất kết nối / cần đăng nhập
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
├── components/, pages/  Giao diện báo giá + khung chung (menu theo quyền: components/menu.ts)
├── db/quyen.ts          Danh sách quyền (module); db/phien.tsx: người đang đăng nhập
└── modules/             Các module CMS — mỗi thư mục: kieu.ts (kiểu dùng chung với máy chủ) + các trang
    ├── api.ts           Gọi API của các module
    ├── tongQuan/  taiKhoan/  chamCong/ (tinhLuong.ts +test, xuatExcel.ts)
    └── hoaDon/  thuChi/  kho/  landing/
```

**Thêm module mới:** model trong `schema.prisma` → `npm run db:migrate`; kiểu ở `src/modules/<tên>/kieu.ts`; Router ở `server/modules/<tên>.ts` (gắn trong `server/index.ts`, kiểm tra quyền bằng `canQuyen`); quyền mới thêm vào `src/db/quyen.ts`; trang + mục menu (`src/components/menu.ts`) + route (`src/App.tsx`).

### Mô hình dữ liệu (PostgreSQL)

- Báo giá: `khach_hang`, `hang_muc`, `bao_gia` → `dong_bao_gia`, `nghiem_thu` → `dong_nghiem_thu` + `anh_nghiem_thu`, `cai_dat` (1 dòng), `cot_hang_muc`.
- Tài khoản: `vai_tro` (quyền là mảng mã module), `nguoi_dung` (gắn `nhan_vien` để xem công của mình; `phien_ban` tăng khi đổi mật khẩu / khoá → các phiên cũ hết hiệu lực).
- Chấm công: `nhan_vien`, `loai_cong` (ký hiệu X, N, P… + hệ số công), `cham_cong` (một ô = nhân viên × ngày, `UNIQUE`).
- Hoá đơn: `nha_cung_cap`, `hoa_don` → `dong_hoa_don` + `tep_hoa_don` (file lưu trong DB, tối đa 15 MB).
- Thu chi: `phieu_thu_chi` (gắn khách / NCC / nhân viên / hoá đơn; `tru_vao_luong` = tạm ứng).
- Kho: `vat_tu`, `phieu_kho` → `dong_phieu_kho`. **Tồn kho không lưu** mà tính từ phiếu.
- Landing: `khoi_landing`, `anh_landing`, `lien_he_landing`, `cai_dat_landing` (1 dòng).
Tiền: `Decimal(15,0)` (đồng); số lượng: `Decimal(14,3)`. **Thành tiền và tổng không lưu** mà luôn tính lại từ số lượng × đơn giá nên không bao giờ lệch. Xoá báo giá → biên bản đã lập vẫn giữ (khoá ngoại `SET NULL`); xoá biên bản → dòng và ảnh xoá theo (`CASCADE`).

### API chính

| | |
|---|---|
| `GET /api/suc-khoe`, `GET /api/phien`, `POST /api/dang-nhap` | Không cần đăng nhập |
| `GET/PUT /api/cai-dat` | Cài đặt |
| `GET /api/khach-hang`, `PUT/DELETE /api/khach-hang/:id` | Khách hàng (PUT = tạo hoặc sửa) |
| `GET /api/hang-muc`, `PUT/DELETE /api/hang-muc/:id` | Danh mục |
| `GET /api/bao-gia`, `GET/PUT/DELETE /api/bao-gia/:id` | Danh sách chỉ trả bản tóm tắt kèm tổng tiền (không kèm dòng); `GET /:id` trả đầy đủ. PUT ghi cả chứng từ kèm dòng; số trống → máy chủ cấp số |
| `GET /api/nghiem-thu[?baoGiaId=]`, `GET/PUT/DELETE /api/nghiem-thu/:id` | Như trên |
| `GET/POST /api/nghiem-thu/:id/anh`, `PATCH/DELETE /api/anh/:id` | Ảnh nghiệm thu |
| `GET /api/sao-luu` (JSON ghi từng phần), `POST /api/sao-luu/da-tai`, `POST /api/khoi-phuc`, `POST /api/du-lieu-mau`, `DELETE /api/du-lieu`, `POST /api/don-nhap-rong` | Bảo trì |
| `GET/PUT/DELETE /api/tai-khoan[/:id]`, `/api/vai-tro[/:id]`, `POST /api/toi/doi-mat-khau` | Tài khoản & quyền |
| `/api/nhan-vien`, `/api/loai-cong`, `GET/PUT /api/cham-cong?thang=`, `GET /api/bang-luong?thang=`, `GET /api/cong-cua-toi?thang=` | Chấm công (PUT ghi nhiều ô; ô trống = xoá) |
| `/api/nha-cung-cap`, `/api/hoa-don[/:id]`, `/api/hoa-don/:id/tep`, `/api/tep-hoa-don/:id`, `GET /api/hoa-don-tu-bao-gia/:id`, `GET /api/thue-gtgt` | Hoá đơn |
| `/api/phieu-thu-chi[/:id]`, `GET /api/so-quy`, `GET /api/cong-no?loai=phaiThu\|phaiTra`, `GET /api/tam-ung` | Thu chi |
| `/api/vat-tu[/:id]`, `GET /api/vat-tu/:id/the-kho`, `/api/phieu-kho[/:id]` | Kho |
| `/api/landing/khoi`, `/anh`, `/lien-he`, `/cai-dat` | Quản lý landing |
| `GET /api/cong-khai/trang`, `GET /api/cong-khai/anh/:id`, `GET /api/cong-khai/logo`, `POST /api/cong-khai/lien-he` | **Công khai cho trang landing** (không cần đăng nhập, có CORS). Dữ liệu trả về: kiểu `TrangCongKhai` trong `src/modules/landing/kieu.ts` |
| `GET /api/tong-quan?thang=` | Tổng quan |

Lọc theo tháng: `?thang=YYYY-MM` (hoặc `?tu=YYYY-MM-DD&den=YYYY-MM-DD`).

## Ghi chú về các lựa chọn thiết kế

| Vấn đề | Cách xử lý |
|---|---|
| Đánh số chứng từ khi nhiều máy dùng chung | **Máy chủ cấp số** trong giao dịch có khoá `pg_advisory_xact_lock`, cột số có ràng buộc `UNIQUE`. Đã thử 20 yêu cầu tạo đồng thời → 20 số liên tiếp, không trùng. Số tự về 001 khi sang năm; sửa tay được, trùng thì báo lỗi rõ ràng. |
| Không mất dữ liệu khi mất mạng / đóng trang | Mỗi lần sửa: ghi ngay bản nháp tạm vào localStorage (đồng bộ), gửi máy chủ sau 0,4 giây. Mất mạng → hiện thanh báo, tự thử lại mỗi 5 giây. Lần mở sau gửi lại bản nháp tạm còn sót. |
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

- **Báo lỗi cổng đã được dùng (port is already allocated)** → đổi `POSTGRES_PORT` / `API_PORT` / `WEB_PORT` / `DEV_PORT` trong `.env`.
- **Mở `localhost:...` bị treo, `127.0.0.1:...` thì được** → trên Windows, `localhost` có thể trỏ vào IPv6 `::1` đang bị chương trình khác (vd. WSL) giữ cùng cổng. Dùng `127.0.0.1` hoặc đổi sang cổng khác.
- **Đổi `POSTGRES_PASSWORD` rồi app không kết nối được DB** → Postgres chỉ đọc mật khẩu lúc tạo volume lần đầu. Hoặc đổi lại mật khẩu cũ, hoặc đổi trong DB: `docker compose exec db psql -U hiepdung -d hiep_dung_cms -c "ALTER USER hiepdung PASSWORD 'mat_khau_moi';"`. (Xoá volume `docker compose down -v` cũng được nhưng **mất toàn bộ dữ liệu**.)
- **Quên mật khẩu** → người có quyền Tài khoản đặt lại trong màn **Tài khoản & quyền**. Quên cả mật khẩu Quản trị: `docker compose exec api npx tsx server/datLaiMatKhau.ts admin <mật khẩu mới>` (khi dev: `npm run dat-lai-mat-khau -- admin <mật khẩu mới>`).
- **Lần chạy đầu** → `docker compose up -d --build` tự chạy migration và seed (cài đặt, vai trò, tài khoản `admin`, ký hiệu công, danh mục thu chi / vật tư, khung landing, dữ liệu mẫu báo giá). Chưa đặt `ADMIN_PASSWORD` thì xem mật khẩu tạm của `admin` trong `docker compose logs api`.

## Thiết kế sẵn cho Giai đoạn 2

- **Công cụ tính khối lượng / giá phôi**: thêm `src/lib/khoiLuongPhoi.ts` (hàm thuần theo công thức trong đặc tả, có test) và một `HopThoai`; “Thêm vào báo giá” chỉ cần nối một `DongHangMuc` vào `bg.danhSachDong` như nút “Thêm dòng” trong `BaoGiaSua.tsx`.
- **Nhập nhanh bằng giọng nói / ghi chú thô**: thêm tuyến `POST /api/tach-dong` trên máy chủ (giữ khoá API AI ở máy chủ, không đặt trong trình duyệt), trả về `DongHangMuc[]`; giao diện hiển thị lại bằng `DanhSachDong` để kiểm tra rồi nối vào báo giá. Giọng nói: Web Speech API (`lang = 'vi-VN'`).
- **Công nợ theo báo giá** (khi không xuất hoá đơn): hiện công nợ tính theo hoá đơn; có thể cho phiếu thu gắn `baoGiaId` và tính nợ theo báo giá đã chốt.
- **Xuất Word (.docx)**: thêm `src/docx/` với hàm `mauBaoGiaDocx(bg, kh, cd)` cùng tham số như mẫu PDF (thư viện `docx`), gắn thêm nút trên `XemTruoc.tsx`.

## Công nghệ

React 18, TypeScript, Vite, React Router · Express 4, Prisma 7 (driver adapter pg), PostgreSQL 16 · pdfmake (tạo PDF), pdf.js (xem trước) · Vitest · Docker Compose.
