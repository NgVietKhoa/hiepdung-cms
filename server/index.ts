/** Máy chủ API CMS xưởng cơ khí: Express + Prisma. Khi đã build giao diện thì phục vụ luôn thư mục dist/. */
import './moiTruong';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { Prisma } from './generated/prisma/client';
import { MOI_TRUONG } from './moiTruong';
import { prisma } from './prisma';
import * as dv from './dichVu';
import { LoiLuuFile, luuFile } from './luuFile';
import { boc, thamSo } from './tienIch';
import { tuyenChamCong } from './modules/chamCong';
import { tuyenHoaDon } from './modules/hoaDon';
import { tuyenThuChi } from './modules/thuChi';
import { tuyenTongQuan } from './modules/tongQuan';

const app = express();
app.disable('x-powered-by');

app.get('/api/suc-khoe', boc(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true });
}));

// Lưu file xuất (PDF / Word / Excel) vào thư mục trên máy — nhận dữ liệu nhị phân, tên file ở ?ten=
app.post('/api/luu-file', express.raw({ type: () => true, limit: '100mb' }), boc(async (req, res) => {
  try {
    res.json(await luuFile(req.query.ten, req.body as Buffer));
  } catch (e) {
    if (e instanceof LoiLuuFile) throw new dv.LoiApi(400, e.message);
    throw e;
  }
}));
// File khôi phục có thể chứa nhiều ảnh nên cho phép lớn hơn
app.use('/api/khoi-phuc', express.json({ limit: '500mb' }));
app.use('/api', express.json({ limit: '20mb' }));

// Cài đặt
app.get('/api/cai-dat', boc(async (_req, res) => res.json(await dv.layCaiDat())));
app.put('/api/cai-dat', boc(async (req, res) => res.json(await dv.luuCaiDat(req.body ?? {}))));

// Khách hàng — dùng chung cho báo giá, hoá đơn, thu chi
app.get('/api/khach-hang', boc(async (_req, res) => res.json(await dv.dsKhachHang())));
app.put('/api/khach-hang/:id', boc(async (req, res) => res.json(await dv.luuKhachHang(thamSo(req), req.body ?? {}))));
app.delete('/api/khach-hang/:id', boc(async (req, res) => {
  await dv.xoaKhachHang(thamSo(req));
  res.status(204).end();
}));
app.get('/api/khach-hang/:id/so-bao-gia', boc(async (req, res) => {
  res.json({ so: await dv.demBaoGiaCuaKhach(thamSo(req)) });
}));

// Cột bảng nhập hạng mục (Cài đặt) — PUT ghi cả danh sách theo thứ tự
app.get('/api/cot-hang-muc', boc(async (_req, res) => res.json(await dv.dsCotHangMuc())));
app.put('/api/cot-hang-muc', boc(async (req, res) => res.json(await dv.luuDsCotHangMuc(req.body))));

// Danh mục hạng mục
app.get('/api/hang-muc', boc(async (_req, res) => res.json(await dv.dsHangMuc())));
app.put('/api/hang-muc/:id', boc(async (req, res) => res.json(await dv.luuHangMuc(thamSo(req), req.body ?? {}))));
app.delete('/api/hang-muc/:id', boc(async (req, res) => {
  await dv.xoaHangMuc(thamSo(req));
  res.status(204).end();
}));

// Báo giá — danh sách chỉ trả bản tóm tắt (kèm tổng tiền); GET /:id trả đầy đủ.
// PUT ghi cả chứng từ (tạo mới nếu chưa có, số trống thì máy chủ tự cấp).
// Hoá đơn (lập từ báo giá) cũng cần xem danh sách
app.get('/api/bao-gia', boc(async (_req, res) => res.json(await dv.dsTomTatBaoGia())));
app.get('/api/bao-gia/:id', boc(async (req, res) => {
  const b = await dv.layBaoGia(thamSo(req));
  if (!b) throw new dv.LoiApi(404, 'Không tìm thấy báo giá');
  res.json(b);
}));
app.put('/api/bao-gia/:id', boc(async (req, res) => {
  const kq = await dv.luuBaoGia({ ...req.body, id: thamSo(req) }, req.query.chiCapNhat === '1');
  res.json(kq);
}));
app.delete('/api/bao-gia/:id', boc(async (req, res) => {
  await dv.xoaBaoGia(thamSo(req));
  res.status(204).end();
}));

// Biên bản nghiệm thu — danh sách tóm tắt, lọc được theo ?baoGiaId=
app.get('/api/nghiem-thu', boc(async (req, res) => {
  res.json(await dv.dsTomTatNghiemThu(req.query.baoGiaId ? String(req.query.baoGiaId) : undefined));
}));
app.get('/api/nghiem-thu/:id', boc(async (req, res) => {
  const n = await dv.layNghiemThu(thamSo(req));
  if (!n) throw new dv.LoiApi(404, 'Không tìm thấy biên bản');
  res.json(n);
}));
app.put('/api/nghiem-thu/:id', boc(async (req, res) => {
  res.json(await dv.luuNghiemThu({ ...req.body, id: thamSo(req) }, req.query.chiCapNhat === '1'));
}));
app.delete('/api/nghiem-thu/:id', boc(async (req, res) => {
  await dv.xoaNghiemThu(thamSo(req));
  res.status(204).end();
}));

// Ảnh nghiệm thu
app.get('/api/nghiem-thu/:id/anh', boc(async (req, res) => res.json(await dv.dsAnh(thamSo(req)))));
app.post('/api/nghiem-thu/:id/anh', boc(async (req, res) => {
  res.status(201).json(await dv.themAnh(thamSo(req), req.body?.duLieu, req.body?.ghiChu));
}));
app.patch('/api/anh/:id', boc(async (req, res) => {
  await dv.suaGhiChuAnh(thamSo(req), req.body?.ghiChu);
  res.status(204).end();
}));
app.delete('/api/anh/:id', boc(async (req, res) => {
  await dv.xoaAnh(thamSo(req));
  res.status(204).end();
}));

// Bảo trì dữ liệu báo giá
app.post('/api/don-nhap-rong', boc(async (_req, res) => res.json({ daXoa: await dv.donNhapRong() })));
// Bản desktop gọi sau khi sao lưu toàn bộ xong (để nhắc sao lưu định kỳ)
app.post('/api/sao-luu/da-tai', boc(async (_req, res) => {
  await dv.ghiNhanDaSaoLuu();
  res.status(204).end();
}));
app.post('/api/du-lieu-mau', boc(async (_req, res) => {
  await dv.napDuLieuMau();
  res.status(204).end();
}));
app.delete('/api/du-lieu', boc(async (_req, res) => {
  await dv.xoaToanBo();
  res.status(204).end();
}));

/* ---------- Các module CMS ---------- */

app.use('/api', tuyenTongQuan);
app.use('/api', tuyenChamCong);
app.use('/api', tuyenHoaDon);
app.use('/api', tuyenThuChi);

app.use('/api', (_req, res) => res.status(404).json({ loi: 'Không có đường dẫn này' }));

/* ---------- Giao diện đã build ---------- */

const thuMucGiaoDien = resolve(process.cwd(), 'dist');
if (existsSync(thuMucGiaoDien)) {
  app.use(express.static(thuMucGiaoDien, { index: false, maxAge: '30d' }));
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(resolve(thuMucGiaoDien, 'index.html'));
  });
}

/* ---------- Xử lý lỗi chung ---------- */

app.use((loi: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (loi instanceof dv.LoiApi) return res.status(loi.trangThai).json({ loi: loi.message });
  if ((loi as { type?: string })?.type === 'entity.too.large') {
    return res.status(413).json({ loi: 'Dữ liệu gửi lên quá lớn' });
  }
  if (loi instanceof Prisma.PrismaClientKnownRequestError && loi.code === 'P2002') {
    return res.status(409).json({ loi: 'Dữ liệu bị trùng (số chứng từ hoặc mã đã tồn tại)' });
  }
  if (loi instanceof Prisma.PrismaClientKnownRequestError && loi.code === 'P2003') {
    return res.status(409).json({ loi: 'Dữ liệu đang được dùng ở nơi khác hoặc liên kết không còn tồn tại' });
  }
  console.error(loi);
  res.status(500).json({ loi: 'Lỗi máy chủ, vui lòng thử lại' });
});

async function khoiDong() {
  await dv.kiemTraDuLieuBanDau();
  // Không có đăng nhập: chỉ nhận kết nối từ chính máy này
  app.listen(MOI_TRUONG.cong, '127.0.0.1', () => {
    console.log(`CMS xưởng cơ khí: http://127.0.0.1:${MOI_TRUONG.cong}`);
  });
}

khoiDong().catch((e) => {
  console.error('Không khởi động được máy chủ:', e);
  process.exit(1);
});
