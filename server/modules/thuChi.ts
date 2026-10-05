/** Phiếu thu / chi, sổ quỹ, công nợ phải thu / phải trả. */
import express from 'express';
import type { Prisma } from '../generated/prisma/client';
import type { CongNo, PhieuThuChi, SoQuy, TienTheoHinhThuc } from '../../src/modules/thuChi/kieu';
import { tienTrong } from '../../src/modules/thuChi/kieu';
import { conNoHoaDon } from '../../src/modules/hoaDon/kieu';
import { homNayISO } from '../../src/lib/dinhDang';
import { chuoi, chuoiRaNgay, ngayRaChuoi, so, tien, trongDanhSach } from '../anhXa';
import { layCaiDat } from '../dichVu';
import { prisma } from '../prisma';
import { baoTrungSo, boc, capSoPhieu, KHOA_CAP_SO, khoangNgay, LoiApi, thamSo } from '../tienIch';
import { canQuyen, coQuyen } from '../xacThuc';
import { dsTomTatHoaDon } from './hoaDon';

const phieuRaApp = (p: Prisma.PhieuThuChiGetPayload<object>): PhieuThuChi => ({
  id: p.id,
  loai: p.loai,
  soPhieu: p.soPhieu,
  ngay: ngayRaChuoi(p.ngay),
  soTien: so(p.soTien),
  hinhThuc: p.hinhThuc,
  danhMuc: p.danhMuc,
  khachHangId: p.khachHangId,
  nhaCungCapId: p.nhaCungCapId,
  nhanVienId: p.nhanVienId,
  hoaDonId: p.hoaDonId,
  truVaoLuong: p.truVaoLuong,
  nguoiNopNhan: p.nguoiNopNhan,
  noiDung: p.noiDung,
  nguoiLap: p.nguoiLap,
  ngayTao: p.ngayTao.getTime(),
});

/** Cộng tiền theo hình thức từ kết quả groupBy */
function congTheoHinhThuc(nhom: { hinhThuc: string; _sum: { soTien: Prisma.Decimal | null } }[]): TienTheoHinhThuc {
  const t = tienTrong();
  for (const g of nhom) {
    const v = so(g._sum.soTien);
    if (g.hinhThuc === 'tienMat') t.tienMat += v;
    else t.chuyenKhoan += v;
    t.tong += v;
  }
  return t;
}
const tru = (a: TienTheoHinhThuc, b: TienTheoHinhThuc): TienTheoHinhThuc => ({
  tienMat: a.tienMat - b.tienMat,
  chuyenKhoan: a.chuyenKhoan - b.chuyenKhoan,
  tong: a.tong - b.tong,
});
const cong = (a: TienTheoHinhThuc, b: TienTheoHinhThuc): TienTheoHinhThuc => ({
  tienMat: a.tienMat + b.tienMat,
  chuyenKhoan: a.chuyenKhoan + b.chuyenKhoan,
  tong: a.tong + b.tong,
});

async function tongPhieu(loai: 'thu' | 'chi', ngay: { lt: Date; gte?: Date }) {
  // Gán ra biến trước: truyền thẳng vào hàm thì TypeScript suy sai kiểu tham số của groupBy
  const nhom = await prisma.phieuThuChi.groupBy({ by: ['hinhThuc'], where: { loai, ngay }, _sum: { soTien: true } });
  return congTheoHinhThuc(nhom);
}

export async function soQuy(tu: Date, den: Date): Promise<SoQuy> {
  const [thuTruoc, chiTruoc, thu, chi] = await Promise.all([
    tongPhieu('thu', { lt: tu }),
    tongPhieu('chi', { lt: tu }),
    tongPhieu('thu', { gte: tu, lt: den }),
    tongPhieu('chi', { gte: tu, lt: den }),
  ]);
  const tonDau = tru(thuTruoc, chiTruoc);
  return { tonDau, thu, chi, tonCuoi: tru(cong(tonDau, thu), chi) };
}

/** Công nợ theo đối tác: tổng hoá đơn hiệu lực − tổng phiếu thu (khách) / phiếu chi (nhà cung cấp) của đối tác đó */
export async function congNo(loai: 'phaiThu' | 'phaiTra'): Promise<CongNo[]> {
  const laThu = loai === 'phaiThu';
  const homNay = homNayISO();
  const [hoaDon, phieu, doiTac] = await Promise.all([
    dsTomTatHoaDon({ loai: laThu ? 'banRa' : 'muaVao', trangThai: 'hieuLuc' }),
    prisma.phieuThuChi.groupBy({
      by: [laThu ? 'khachHangId' : 'nhaCungCapId'],
      where: { loai: laThu ? 'thu' : 'chi' },
      _sum: { soTien: true },
    }),
    laThu
      ? prisma.khachHang.findMany({ select: { id: true, tenCongTy: true, soDienThoai: true } })
      : prisma.nhaCungCap.findMany({ select: { id: true, tenCongTy: true, soDienThoai: true } }),
  ]);
  const daTra = new Map(
    phieu.map((g) => [(laThu ? (g as { khachHangId: string | null }).khachHangId : (g as { nhaCungCapId: string | null }).nhaCungCapId) ?? '', so(g._sum.soTien)]),
  );
  const kq = new Map<string, CongNo>();
  for (const dt of doiTac) {
    kq.set(dt.id, { doiTacId: dt.id, tenDoiTac: dt.tenCongTy, soDienThoai: dt.soDienThoai, tongHoaDon: 0, daThanhToan: daTra.get(dt.id) ?? 0, conNo: 0, soHoaDon: 0, quaHan: 0 });
  }
  // Hoá đơn không gắn đối tác trong danh bạ (khách lẻ…): gộp một dòng, đã trả = các phiếu gắn đúng hoá đơn đó
  const khongDanhBa: CongNo = { doiTacId: '', tenDoiTac: '(Không có trong danh bạ)', soDienThoai: '', tongHoaDon: 0, daThanhToan: 0, conNo: 0, soHoaDon: 0, quaHan: 0 };
  for (const h of hoaDon) {
    const id = (laThu ? h.khachHangId : h.nhaCungCapId) ?? '';
    const muc = kq.get(id) ?? khongDanhBa;
    muc.tongHoaDon += h.tong;
    muc.soHoaDon++;
    if (muc === khongDanhBa) muc.daThanhToan += h.daThanhToan;
    if (h.hanThanhToan && h.hanThanhToan < homNay) muc.quaHan += Math.max(0, conNoHoaDon(h));
  }
  if (khongDanhBa.soHoaDon) kq.set('', khongDanhBa);
  return [...kq.values()]
    .map((m) => ({ ...m, conNo: m.tongHoaDon - m.daThanhToan, quaHan: Math.min(m.quaHan, Math.max(0, m.tongHoaDon - m.daThanhToan)) }))
    .filter((m) => m.tongHoaDon || m.daThanhToan)
    .sort((a, b) => b.conNo - a.conNo);
}

/* ---------- Tuyến ---------- */

export const tuyenThuChi = express.Router();

/** ?thang= hoặc ?tu=&den=, ?loai=thu|chi; ?hoaDonId= (bỏ lọc ngày) — thanh toán của một hoá đơn */
tuyenThuChi.get(
  '/phieu-thu-chi',
  canQuyen('thuChi', 'hoaDon'),
  boc(async (req, res) => {
    const hoaDonId = req.query.hoaDonId ? String(req.query.hoaDonId) : undefined;
    if (!hoaDonId && !coQuyen(req, 'thuChi')) throw new LoiApi(403, 'Tài khoản của bạn không có quyền xem sổ thu chi');
    const { tu, den } = khoangNgay(req.query);
    const loai = req.query.loai === 'thu' || req.query.loai === 'chi' ? req.query.loai : undefined;
    const ds = await prisma.phieuThuChi.findMany({
      where: hoaDonId ? { hoaDonId } : { ngay: { gte: tu, lt: den }, ...(loai ? { loai } : {}) },
      orderBy: [{ ngay: 'desc' }, { soPhieu: 'desc' }],
    });
    res.json(ds.map(phieuRaApp));
  }),
);

/**
 * Tạo / sửa phiếu. Số trống → máy chủ cấp. Gắn hoá đơn mà chưa chọn đối tác thì lấy đối tác của hoá đơn.
 * Người chỉ có quyền chấm công được lập phiếu chi tạm ứng lương (trừ vào lương).
 */
tuyenThuChi.put(
  '/phieu-thu-chi/:id',
  canQuyen('thuChi', 'chamCong', 'hoaDon'),
  boc(async (req, res) => {
    const id = thamSo(req);
    const p = req.body as Partial<PhieuThuChi>;
    const loai = trongDanhSach(p.loai, ['thu', 'chi'] as const, 'thu');
    const laTamUng = loai === 'chi' && Boolean(p.truVaoLuong) && Boolean(p.nhanVienId);
    const laThanhToanHD = Boolean(p.hoaDonId);
    if (!coQuyen(req, 'thuChi') && !(coQuyen(req, 'chamCong') && laTamUng) && !(coQuyen(req, 'hoaDon') && laThanhToanHD)) {
      throw new LoiApi(403, 'Tài khoản của bạn không có quyền lập phiếu thu chi');
    }
    const soTien = tien(p.soTien);
    if (!soTien) throw new LoiApi(400, 'Số tiền phải lớn hơn 0');
    const ngay = chuoiRaNgay(p.ngay) ?? chuoiRaNgay(homNayISO())!;
    const soGui = chuoi(p.soPhieu).trim();
    const kq = await baoTrungSo(soGui, () =>
      prisma.$transaction(async (tx) => {
        const cu = await tx.phieuThuChi.findUnique({ where: { id } });
        if (cu && !coQuyen(req, 'thuChi') && !(cu.truVaoLuong || cu.hoaDonId)) {
          throw new LoiApi(403, 'Tài khoản của bạn không có quyền sửa phiếu này');
        }
        let khachHangId = chuoi(p.khachHangId) || null;
        let nhaCungCapId = chuoi(p.nhaCungCapId) || null;
        const nhanVienId = chuoi(p.nhanVienId) || null;
        const hoaDonId = chuoi(p.hoaDonId) || null;
        if (hoaDonId) {
          const hd = await tx.hoaDon.findUnique({ where: { id: hoaDonId }, select: { loai: true, khachHangId: true, nhaCungCapId: true } });
          if (!hd) throw new LoiApi(400, 'Không tìm thấy hoá đơn');
          if ((hd.loai === 'banRa') !== (loai === 'thu')) {
            throw new LoiApi(400, hd.loai === 'banRa' ? 'Hoá đơn bán ra thì lập phiếu thu' : 'Hoá đơn mua vào thì lập phiếu chi');
          }
          khachHangId ??= hd.khachHangId;
          nhaCungCapId ??= hd.nhaCungCapId;
        }
        let soPhieu = soGui || cu?.soPhieu || '';
        // Đổi loại (thu ↔ chi) mà số do máy cấp thì cấp lại theo ký hiệu mới
        if (!soGui && cu && cu.loai !== loai) soPhieu = '';
        if (!soPhieu) {
          const cd = await layCaiDat(tx);
          soPhieu = await capSoPhieu(
            tx,
            loai === 'thu' ? KHOA_CAP_SO.phieuThu : KHOA_CAP_SO.phieuChi,
            loai === 'thu' ? cd.tienToPhieuThu : cd.tienToPhieuChi,
            ngay,
            cd.soChuSo,
            async (dau) => (await tx.phieuThuChi.findMany({ where: { soPhieu: { startsWith: dau } }, select: { soPhieu: true } })).map((x) => x.soPhieu),
          );
        }
        const duLieu = {
          loai,
          soPhieu,
          ngay,
          soTien,
          hinhThuc: trongDanhSach(p.hinhThuc, ['tienMat', 'chuyenKhoan'] as const, 'tienMat'),
          danhMuc: chuoi(p.danhMuc).trim(),
          khachHangId,
          nhaCungCapId,
          nhanVienId,
          hoaDonId,
          truVaoLuong: laTamUng,
          nguoiNopNhan: chuoi(p.nguoiNopNhan).trim(),
          noiDung: chuoi(p.noiDung),
        };
        return cu
          ? tx.phieuThuChi.update({ where: { id }, data: duLieu })
          : tx.phieuThuChi.create({ data: { id, ...duLieu, nguoiLap: req.nguoiDung!.hoTen } });
      }),
    ).catch((e) => {
      if (e?.code === 'P2003') throw new LoiApi(400, 'Đối tượng (khách / nhà cung cấp / nhân viên) không còn tồn tại');
      throw e;
    });
    res.json(phieuRaApp(kq));
  }),
);

tuyenThuChi.delete(
  '/phieu-thu-chi/:id',
  canQuyen('thuChi', 'chamCong', 'hoaDon'),
  boc(async (req, res) => {
    const id = thamSo(req);
    const p = await prisma.phieuThuChi.findUnique({ where: { id } });
    if (p && !coQuyen(req, 'thuChi') && !((p.truVaoLuong && coQuyen(req, 'chamCong')) || (p.hoaDonId && coQuyen(req, 'hoaDon')))) {
      throw new LoiApi(403, 'Tài khoản của bạn không có quyền xoá phiếu này');
    }
    await prisma.phieuThuChi.deleteMany({ where: { id } });
    res.status(204).end();
  }),
);

/** Tạm ứng của một nhân viên trong tháng (màn Bảng lương) */
tuyenThuChi.get(
  '/tam-ung',
  canQuyen('chamCong', 'thuChi'),
  boc(async (req, res) => {
    const { tu, den } = khoangNgay(req.query);
    const ds = await prisma.phieuThuChi.findMany({
      where: { loai: 'chi', truVaoLuong: true, ngay: { gte: tu, lt: den }, ...(req.query.nhanVienId ? { nhanVienId: String(req.query.nhanVienId) } : {}) },
      orderBy: { ngay: 'asc' },
    });
    res.json(ds.map(phieuRaApp));
  }),
);

tuyenThuChi.get(
  '/so-quy',
  canQuyen('thuChi'),
  boc(async (req, res) => {
    const { tu, den } = khoangNgay(req.query);
    res.json(await soQuy(tu, den));
  }),
);

tuyenThuChi.get(
  '/cong-no',
  canQuyen('thuChi'),
  boc(async (req, res) => res.json(await congNo(req.query.loai === 'phaiTra' ? 'phaiTra' : 'phaiThu'))),
);
