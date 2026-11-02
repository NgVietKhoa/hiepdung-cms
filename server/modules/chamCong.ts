/** Nhân viên, ký hiệu công, bảng chấm công tháng, bảng lương. */
import express from 'express';
import type { Prisma } from '../generated/prisma/client';
import type { BangCong, DongLuong, LoaiCong, NhanVien, OCong } from '../../src/modules/chamCong/kieu';
import { tinhLuong } from '../../src/modules/chamCong/tinhLuong';
import { khoangThang } from '../../src/lib/thang';
import { chuoi, chuoiRaNgay, ngayRaChuoi, so, soTrongKhoang, tien } from '../anhXa';
import { prisma } from '../prisma';
import { boc, lanLuot, LoiApi, thamSo, thangTuQuery, type Tx } from '../tienIch';

/* ---------- Chuyển đổi ---------- */

const nhanVienRaApp = (n: Prisma.NhanVienGetPayload<object>): NhanVien => ({
  id: n.id,
  maNhanVien: n.maNhanVien,
  hoTen: n.hoTen,
  chucVu: n.chucVu,
  soDienThoai: n.soDienThoai,
  cccd: n.cccd,
  diaChi: n.diaChi,
  ngayVaoLam: ngayRaChuoi(n.ngayVaoLam),
  luongNgay: so(n.luongNgay),
  luongGioTangCa: so(n.luongGioTangCa),
  phuCapThang: so(n.phuCapThang),
  soTaiKhoan: n.soTaiKhoan,
  nganHang: n.nganHang,
  dangLam: n.dangLam,
  ghiChu: n.ghiChu,
  thuTu: n.thuTu,
});

const nhanVienVaoDB = (n: Partial<NhanVien>) => ({
  maNhanVien: chuoi(n.maNhanVien).trim(),
  hoTen: chuoi(n.hoTen).trim(),
  chucVu: chuoi(n.chucVu),
  soDienThoai: chuoi(n.soDienThoai),
  cccd: chuoi(n.cccd),
  diaChi: chuoi(n.diaChi),
  ngayVaoLam: chuoiRaNgay(n.ngayVaoLam),
  luongNgay: tien(n.luongNgay),
  luongGioTangCa: tien(n.luongGioTangCa),
  phuCapThang: tien(n.phuCapThang),
  soTaiKhoan: chuoi(n.soTaiKhoan),
  nganHang: chuoi(n.nganHang),
  dangLam: n.dangLam !== false,
  ghiChu: chuoi(n.ghiChu),
});

const loaiCongRaApp = (l: Prisma.LoaiCongGetPayload<object>): LoaiCong => ({ ...l, heSo: so(l.heSo) });

const oRaApp = (c: Prisma.ChamCongGetPayload<object>): OCong => ({
  nhanVienId: c.nhanVienId,
  ngay: ngayRaChuoi(c.ngay),
  loaiCongId: c.loaiCongId,
  gioTangCa: so(c.gioTangCa),
  ghiChu: c.ghiChu,
});

const THU_TU_NV = [{ thuTu: 'asc' }, { hoTen: 'asc' }] satisfies Prisma.NhanVienOrderByWithRelationInput[];

/* ---------- Nghiệp vụ ---------- */

async function dsLoaiCong(tx: Tx = prisma): Promise<LoaiCong[]> {
  return (await tx.loaiCong.findMany({ orderBy: [{ thuTu: 'asc' }, { kyHieu: 'asc' }] })).map(loaiCongRaApp);
}

function khoangDate(thang: string) {
  const k = khoangThang(thang);
  return { gte: chuoiRaNgay(k.tu)!, lt: chuoiRaNgay(k.den)! };
}

async function bangCong(thang: string): Promise<BangCong> {
  const ngay = khoangDate(thang);
  const [o, loaiCong] = await Promise.all([
    prisma.chamCong.findMany({ where: { ngay } }),
    dsLoaiCong(),
  ]);
  const coCong = [...new Set(o.map((c) => c.nhanVienId))];
  const nhanVien = await prisma.nhanVien.findMany({
    where: { OR: [{ dangLam: true }, { id: { in: coCong } }] },
    orderBy: THU_TU_NV,
  });
  return { thang, nhanVien: nhanVien.map(nhanVienRaApp), loaiCong, o: o.map(oRaApp) };
}

/** Tạm ứng (phiếu chi trừ vào lương) của từng nhân viên trong tháng */
async function tamUngTheoNhanVien(thang: string): Promise<Map<string, number>> {
  const nhom = await prisma.phieuThuChi.groupBy({
    by: ['nhanVienId'],
    where: { loai: 'chi', truVaoLuong: true, ngay: khoangDate(thang), nhanVienId: { not: null } },
    _sum: { soTien: true },
  });
  return new Map(nhom.map((g) => [g.nhanVienId!, so(g._sum.soTien)]));
}

async function bangLuong(thang: string): Promise<DongLuong[]> {
  const [bc, tamUng] = await Promise.all([bangCong(thang), tamUngTheoNhanVien(thang)]);
  return bc.nhanVien.map((nv) =>
    tinhLuong(
      nv,
      bc.o.filter((o) => o.nhanVienId === nv.id),
      bc.loaiCong,
      tamUng.get(nv.id) ?? 0,
    ),
  );
}

/* ---------- Tuyến ---------- */

export const tuyenChamCong = express.Router();

// Danh sách nhân viên: chấm công và thu chi (chọn người nhận tiền) đều cần
tuyenChamCong.get(
  '/nhan-vien',
  boc(async (_req, res) => {
    res.json((await prisma.nhanVien.findMany({ orderBy: THU_TU_NV })).map(nhanVienRaApp));
  }),
);

tuyenChamCong.put(
  '/nhan-vien/:id',
  boc(async (req, res) => {
    const id = thamSo(req);
    const duLieu = nhanVienVaoDB(req.body ?? {});
    if (!duLieu.hoTen) throw new LoiApi(400, 'Thiếu họ tên nhân viên');
    const thuTu = (await prisma.nhanVien.aggregate({ _max: { thuTu: true } }))._max.thuTu ?? 0;
    const kq = await prisma.nhanVien.upsert({
      where: { id },
      create: { id, ...duLieu, thuTu: thuTu + 1 },
      update: duLieu,
    });
    res.json(nhanVienRaApp(kq));
  }),
);

tuyenChamCong.delete(
  '/nhan-vien/:id',
  boc(async (req, res) => {
    const id = thamSo(req);
    const [soCong, soPhieu] = await Promise.all([
      prisma.chamCong.count({ where: { nhanVienId: id } }),
      prisma.phieuThuChi.count({ where: { nhanVienId: id } }),
    ]);
    if (soCong || soPhieu) {
      throw new LoiApi(400, 'Nhân viên đã có dữ liệu chấm công / phiếu chi — hãy đánh dấu "Đã nghỉ việc" thay vì xoá');
    }
    await prisma.nhanVien.deleteMany({ where: { id } });
    res.status(204).end();
  }),
);

/** Đổi thứ tự hiện trên bảng công: gửi danh sách id theo thứ tự mới */
tuyenChamCong.post(
  '/nhan-vien/thu-tu',
  boc(async (req, res) => {
    const ids = Array.isArray(req.body) ? req.body.map((x: unknown) => chuoi(x)) : [];
    await prisma.$transaction((tx) => lanLuot(ids, (id, i) => tx.nhanVien.updateMany({ where: { id }, data: { thuTu: i + 1 } })));
    res.status(204).end();
  }),
);

// Ký hiệu công
/** Ghi cả danh sách ký hiệu công theo thứ tự; ký hiệu bị bỏ mà đã dùng trên bảng công thì báo lỗi */
tuyenChamCong.put(
  '/loai-cong',
  boc(async (req, res) => {
    const ds = (Array.isArray(req.body) ? req.body : []).map((l: Partial<LoaiCong>, i: number) => ({
      id: chuoi(l.id),
      kyHieu: chuoi(l.kyHieu).trim().slice(0, 6),
      ten: chuoi(l.ten).trim(),
      heSo: soTrongKhoang(l.heSo, 0, 9.99, 2),
      mau: /^#[0-9a-f]{6}$/i.test(chuoi(l.mau)) ? chuoi(l.mau) : '',
      thuTu: i,
    }));
    if (ds.some((l) => !l.id || !l.kyHieu || !l.ten)) throw new LoiApi(400, 'Mỗi ký hiệu công cần có ký hiệu và tên');
    if (new Set(ds.map((l) => l.kyHieu.toLowerCase())).size !== ds.length) throw new LoiApi(400, 'Ký hiệu công bị trùng');
    const kq = await prisma.$transaction(async (tx) => {
      const giu = ds.map((l) => l.id);
      const bo = await tx.loaiCong.findMany({ where: { id: { notIn: giu } }, include: { _count: { select: { chamCong: true } } } });
      const dangDung = bo.filter((l) => l._count.chamCong);
      if (dangDung.length) {
        throw new LoiApi(400, `Ký hiệu ${dangDung.map((l) => l.kyHieu).join(', ')} đã dùng trên bảng công, không xoá được`);
      }
      await tx.loaiCong.deleteMany({ where: { id: { notIn: giu } } });
      // Đổi ký hiệu tạm trước để không vướng UNIQUE khi hai ký hiệu đổi chỗ cho nhau
      await lanLuot(ds, (l) => tx.loaiCong.updateMany({ where: { id: l.id }, data: { kyHieu: `~${l.id}` } }));
      await lanLuot(ds, (l) => tx.loaiCong.upsert({ where: { id: l.id }, create: l, update: l }));
      return dsLoaiCong(tx);
    });
    res.json(kq);
  }),
);

tuyenChamCong.get(
  '/cham-cong',
  boc(async (req, res) => res.json(await bangCong(thangTuQuery(req.query)))),
);

/** Ghi nhiều ô một lúc. Ô gửi lên không có công, không tăng ca, không ghi chú = xoá ô đó */
tuyenChamCong.put(
  '/cham-cong',
  boc(async (req, res) => {
    const ds = (Array.isArray(req.body) ? req.body : []).slice(0, 2000).map((o: Partial<OCong>) => ({
      nhanVienId: chuoi(o.nhanVienId),
      ngay: chuoiRaNgay(o.ngay),
      loaiCongId: chuoi(o.loaiCongId) || null,
      gioTangCa: soTrongKhoang(o.gioTangCa, 0, 24, 2),
      ghiChu: chuoi(o.ghiChu).slice(0, 500),
    }));
    if (ds.some((o) => !o.nhanVienId || !o.ngay)) throw new LoiApi(400, 'Ô chấm công thiếu nhân viên hoặc ngày');
    await prisma.$transaction(async (tx) => {
      await lanLuot(ds, async (o) => {
        const khoa = { nhanVienId_ngay: { nhanVienId: o.nhanVienId, ngay: o.ngay! } };
        if (!o.loaiCongId && !o.gioTangCa && !o.ghiChu) {
          await tx.chamCong.deleteMany({ where: { nhanVienId: o.nhanVienId, ngay: o.ngay! } });
          return;
        }
        const duLieu = { loaiCongId: o.loaiCongId, gioTangCa: o.gioTangCa, ghiChu: o.ghiChu };
        await tx.chamCong.upsert({ where: khoa, create: { nhanVienId: o.nhanVienId, ngay: o.ngay!, ...duLieu }, update: duLieu });
      });
    }).catch((e) => {
      if (e?.code === 'P2003') throw new LoiApi(400, 'Nhân viên hoặc ký hiệu công không còn tồn tại — tải lại trang');
      throw e;
    });
    res.status(204).end();
  }),
);

tuyenChamCong.get(
  '/bang-luong',
  boc(async (req, res) => res.json(await bangLuong(thangTuQuery(req.query)))),
);
