/** Nhà cung cấp, sổ hoá đơn mua vào / bán ra, file hoá đơn đính kèm. */
import express from 'express';
import type { Prisma } from '../generated/prisma/client';
import type { HoaDon, NhaCungCap, TepHoaDon, TomTatHoaDon } from '../../src/modules/hoaDon/kieu';
import { tongHoaDon } from '../../src/modules/hoaDon/kieu';
import {
  chietKhauRaApp,
  chietKhauVaoDB,
  chuoi,
  chuoiRaNgay,
  ngayRaChuoi,
  phanTram,
  so,
  soLuong,
  tien,
  trongDanhSach,
} from '../anhXa';
import { prisma } from '../prisma';
import { boc, khoangNgay, LoiApi, thamSo, traVe } from '../tienIch';

/* ---------- Nhà cung cấp ---------- */

const nccRaApp = (n: Prisma.NhaCungCapGetPayload<object>): NhaCungCap => ({ ...n, ngayTao: n.ngayTao.getTime() });
const nccVaoDB = (n: Partial<NhaCungCap>) => ({
  tenCongTy: chuoi(n.tenCongTy).trim(),
  diaChi: chuoi(n.diaChi),
  maSoThue: chuoi(n.maSoThue),
  nguoiLienHe: chuoi(n.nguoiLienHe),
  soDienThoai: chuoi(n.soDienThoai),
  email: chuoi(n.email),
  soTaiKhoan: chuoi(n.soTaiKhoan),
  nganHang: chuoi(n.nganHang),
  ghiChu: chuoi(n.ghiChu),
});

/* ---------- Hoá đơn ---------- */

const KEM_HOA_DON = { danhSachDong: { orderBy: { stt: 'asc' } } } satisfies Prisma.HoaDonInclude;
type HoaDonDB = Prisma.HoaDonGetPayload<{ include: typeof KEM_HOA_DON }>;

function hoaDonRaApp(h: HoaDonDB): HoaDon {
  return {
    id: h.id,
    loai: h.loai,
    kyHieu: h.kyHieu,
    soHoaDon: h.soHoaDon,
    ngayHoaDon: ngayRaChuoi(h.ngayHoaDon),
    khachHangId: h.khachHangId,
    nhaCungCapId: h.nhaCungCapId,
    tenDoiTac: h.tenDoiTac,
    maSoThueDoiTac: h.maSoThueDoiTac,
    diaChiDoiTac: h.diaChiDoiTac,
    baoGiaId: h.baoGiaId,
    tyLeVAT: so(h.tyLeVAT),
    chietKhau: chietKhauRaApp(h.kieuChietKhau, h.giaTriChietKhau),
    hanThanhToan: ngayRaChuoi(h.hanThanhToan),
    trangThai: h.trangThai,
    ghiChu: h.ghiChu,
    danhSachDong: h.danhSachDong.map((d) => ({
      id: d.id,
      tenHang: d.tenHang,
      donViTinh: d.donViTinh,
      soLuong: so(d.soLuong),
      donGia: so(d.donGia),
    })),
    ngayTao: h.ngayTao.getTime(),
    ngaySua: h.ngaySua.getTime(),
  };
}

function hoaDonVaoDB(h: Partial<HoaDon>) {
  const loai = trongDanhSach(h.loai, ['muaVao', 'banRa'] as const, 'banRa');
  return {
    loai,
    kyHieu: chuoi(h.kyHieu).trim(),
    soHoaDon: chuoi(h.soHoaDon).trim(),
    ngayHoaDon: chuoiRaNgay(h.ngayHoaDon) ?? new Date(),
    tenDoiTac: chuoi(h.tenDoiTac).trim(),
    maSoThueDoiTac: chuoi(h.maSoThueDoiTac).trim(),
    diaChiDoiTac: chuoi(h.diaChiDoiTac),
    tyLeVAT: phanTram(h.tyLeVAT),
    ...chietKhauVaoDB(h.chietKhau),
    hanThanhToan: chuoiRaNgay(h.hanThanhToan),
    trangThai: trongDanhSach(h.trangThai, ['hieuLuc', 'huy'] as const, 'hieuLuc'),
    ghiChu: chuoi(h.ghiChu),
  };
}

const dongHoaDonVaoDB = (ds: unknown) =>
  (Array.isArray(ds) ? ds : []).slice(0, 500).map((d, i) => ({
    stt: i + 1,
    tenHang: chuoi(d?.tenHang),
    donViTinh: chuoi(d?.donViTinh),
    soLuong: soLuong(d?.soLuong),
    donGia: tien(d?.donGia),
  }));

/** Các cột cần cho danh sách: dòng (để tính tổng), số tiền đã thanh toán, số file */
const CHON_TOM_TAT = {
  ...KEM_HOA_DON,
  phieuThuChi: { select: { soTien: true } },
  _count: { select: { tepDinhKem: true } },
} satisfies Prisma.HoaDonInclude;

function tomTatHoaDonRaApp(h: Prisma.HoaDonGetPayload<{ include: typeof CHON_TOM_TAT }>): TomTatHoaDon {
  const t = tongHoaDon(hoaDonRaApp(h));
  return {
    id: h.id,
    loai: h.loai,
    kyHieu: h.kyHieu,
    soHoaDon: h.soHoaDon,
    ngayHoaDon: ngayRaChuoi(h.ngayHoaDon),
    khachHangId: h.khachHangId,
    nhaCungCapId: h.nhaCungCapId,
    tenDoiTac: h.tenDoiTac,
    trangThai: h.trangThai,
    hanThanhToan: ngayRaChuoi(h.hanThanhToan),
    tienTruocThue: t.sauChietKhau,
    tienThue: t.tienVAT,
    tong: t.tongThanhToan,
    daThanhToan: h.phieuThuChi.reduce((s, p) => s + so(p.soTien), 0),
    soTep: h._count.tepDinhKem,
  };
}

/** Danh sách hoá đơn tóm tắt — dùng cho màn Hoá đơn, công nợ, tổng quan */
export async function dsTomTatHoaDon(where: Prisma.HoaDonWhereInput): Promise<TomTatHoaDon[]> {
  const ds = await prisma.hoaDon.findMany({
    where,
    include: CHON_TOM_TAT,
    orderBy: [{ ngayHoaDon: 'desc' }, { ngayTao: 'desc' }],
  });
  return ds.map(tomTatHoaDonRaApp);
}

/* ---------- File đính kèm ---------- */

const TEP_TOI_DA = 15 * 1024 * 1024;
const tepRaApp = (t: { id: string; hoaDonId: string; tenFile: string; kieuFile: string; kichThuoc: number; ngayTao: Date }): TepHoaDon => ({
  id: t.id,
  hoaDonId: t.hoaDonId,
  tenFile: t.tenFile,
  kieuFile: t.kieuFile,
  kichThuoc: t.kichThuoc,
  ngayTao: t.ngayTao.getTime(),
});
const CHON_TEP = { id: true, hoaDonId: true, tenFile: true, kieuFile: true, kichThuoc: true, ngayTao: true } as const;

/** Tên file an toàn cho header Content-Disposition */
const tenFileTai = (ten: string) => `attachment; filename*=UTF-8''${encodeURIComponent(ten)}`;

/* ---------- Tuyến ---------- */

export const tuyenHoaDon = express.Router();

// Nhà cung cấp: hoá đơn, thu chi đều chọn được và thêm mới tại chỗ
tuyenHoaDon.get(
  '/nha-cung-cap',
  boc(async (_req, res) => {
    res.json((await prisma.nhaCungCap.findMany({ orderBy: { tenCongTy: 'asc' } })).map(nccRaApp));
  }),
);
tuyenHoaDon.put(
  '/nha-cung-cap/:id',
  boc(async (req, res) => {
    const id = thamSo(req);
    const duLieu = nccVaoDB(req.body ?? {});
    if (!duLieu.tenCongTy) throw new LoiApi(400, 'Thiếu tên nhà cung cấp');
    res.json(nccRaApp(await prisma.nhaCungCap.upsert({ where: { id }, create: { id, ...duLieu }, update: duLieu })));
  }),
);
tuyenHoaDon.delete(
  '/nha-cung-cap/:id',
  boc(async (req, res) => {
    // Hoá đơn / phiếu của nhà cung cấp được giữ lại (khoá ngoại SET NULL); hoá đơn vẫn còn tên đối tác đã ghi
    await prisma.nhaCungCap.deleteMany({ where: { id: thamSo(req) } });
    res.status(204).end();
  }),
);

/** ?loai=banRa|muaVao, ?thang= hoặc ?tu=&den=; ?tatCa=1 bỏ lọc ngày */
tuyenHoaDon.get(
  '/hoa-don',
  boc(async (req, res) => {
    const loai = req.query.loai === 'muaVao' || req.query.loai === 'banRa' ? req.query.loai : undefined;
    const { tu, den } = khoangNgay(req.query);
    const where: Prisma.HoaDonWhereInput = {
      ...(loai ? { loai } : {}),
      ...(req.query.tatCa === '1' ? {} : { ngayHoaDon: { gte: tu, lt: den } }),
      ...(req.query.baoGiaId ? { baoGiaId: String(req.query.baoGiaId) } : {}),
    };
    res.json(await dsTomTatHoaDon(where));
  }),
);

tuyenHoaDon.get(
  '/hoa-don/:id',
  boc(async (req, res) => {
    const h = await prisma.hoaDon.findUnique({ where: { id: thamSo(req) }, include: KEM_HOA_DON });
    traVe(res, h && hoaDonRaApp(h), 'Không tìm thấy hoá đơn');
  }),
);

tuyenHoaDon.put(
  '/hoa-don/:id',
  boc(async (req, res) => {
    const id = thamSo(req);
    const h = req.body as Partial<HoaDon>;
    const cot = hoaDonVaoDB(h);
    const lienKet = {
      khachHangId: cot.loai === 'banRa' ? chuoi(h.khachHangId) || null : null,
      nhaCungCapId: cot.loai === 'muaVao' ? chuoi(h.nhaCungCapId) || null : null,
      baoGiaId: cot.loai === 'banRa' ? chuoi(h.baoGiaId) || null : null,
    };
    const kq = await prisma.$transaction(async (tx) => {
      // Liên kết tới bản ghi đã bị xoá ở máy khác thì bỏ, không báo lỗi khoá ngoại
      if (lienKet.khachHangId && !(await tx.khachHang.findUnique({ where: { id: lienKet.khachHangId }, select: { id: true } })))
        lienKet.khachHangId = null;
      if (lienKet.nhaCungCapId && !(await tx.nhaCungCap.findUnique({ where: { id: lienKet.nhaCungCapId }, select: { id: true } })))
        lienKet.nhaCungCapId = null;
      if (lienKet.baoGiaId && !(await tx.baoGia.findUnique({ where: { id: lienKet.baoGiaId }, select: { id: true } })))
        lienKet.baoGiaId = null;
      const dong = { create: dongHoaDonVaoDB(h.danhSachDong) };
      const ton = await tx.hoaDon.findUnique({ where: { id }, select: { id: true } });
      if (ton) await tx.dongHoaDon.deleteMany({ where: { hoaDonId: id } });
      return ton
        ? tx.hoaDon.update({ where: { id }, data: { ...cot, ...lienKet, danhSachDong: dong }, include: KEM_HOA_DON })
        : tx.hoaDon.create({ data: { id, ...cot, ...lienKet, danhSachDong: dong }, include: KEM_HOA_DON });
    });
    res.json(hoaDonRaApp(kq));
  }),
);

tuyenHoaDon.delete(
  '/hoa-don/:id',
  boc(async (req, res) => {
    // Phiếu thu / chi đã gắn được giữ lại (SET NULL); file đính kèm xoá theo
    await prisma.hoaDon.deleteMany({ where: { id: thamSo(req) } });
    res.status(204).end();
  }),
);

tuyenHoaDon.get(
  '/hoa-don/:id/tep',
  boc(async (req, res) => {
    const ds = await prisma.tepHoaDon.findMany({ where: { hoaDonId: thamSo(req) }, select: CHON_TEP, orderBy: { ngayTao: 'asc' } });
    res.json(ds.map(tepRaApp));
  }),
);

/** Tải file lên: thân là dữ liệu nhị phân, tên file ở ?ten= */
tuyenHoaDon.post(
  '/hoa-don/:id/tep',
  express.raw({ type: () => true, limit: TEP_TOI_DA }),
  boc(async (req, res) => {
    const hoaDonId = thamSo(req);
    const duLieu = req.body as Buffer;
    const tenFile = chuoi(req.query.ten).trim().slice(0, 200) || 'hoa-don';
    if (!Buffer.isBuffer(duLieu) || !duLieu.length) throw new LoiApi(400, 'File trống');
    if (!(await prisma.hoaDon.findUnique({ where: { id: hoaDonId }, select: { id: true } }))) {
      throw new LoiApi(404, 'Không tìm thấy hoá đơn — hãy lưu hoá đơn trước');
    }
    const kieuFile = chuoi(req.headers['x-kieu-file']).slice(0, 100) || 'application/octet-stream';
    const t = await prisma.tepHoaDon.create({
      data: { hoaDonId, tenFile, kieuFile, kichThuoc: duLieu.length, duLieu: new Uint8Array(duLieu) },
      select: CHON_TEP,
    });
    res.status(201).json(tepRaApp(t));
  }),
);

tuyenHoaDon.get(
  '/tep-hoa-don/:id',
  boc(async (req, res) => {
    const t = await prisma.tepHoaDon.findUnique({ where: { id: thamSo(req) } });
    if (!t) throw new LoiApi(404, 'Không tìm thấy file');
    res.setHeader('Content-Type', t.kieuFile);
    res.setHeader('Content-Disposition', tenFileTai(t.tenFile));
    res.send(Buffer.from(t.duLieu));
  }),
);

tuyenHoaDon.delete(
  '/tep-hoa-don/:id',
  boc(async (req, res) => {
    await prisma.tepHoaDon.deleteMany({ where: { id: thamSo(req) } });
    res.status(204).end();
  }),
);

/** Lập hoá đơn bán ra từ báo giá: trả về bản nháp (chưa lưu) để người dùng kiểm tra rồi mới lưu */
tuyenHoaDon.get(
  '/hoa-don-tu-bao-gia/:baoGiaId',
  boc(async (req, res) => {
    const bg = await prisma.baoGia.findUnique({
      where: { id: thamSo(req, 'baoGiaId') },
      include: { danhSachDong: { orderBy: { stt: 'asc' } }, khachHang: true },
    });
    if (!bg) throw new LoiApi(404, 'Không tìm thấy báo giá');
    const nhap: Partial<HoaDon> = {
      loai: 'banRa',
      khachHangId: bg.khachHangId,
      tenDoiTac: bg.khachHang?.tenCongTy ?? '',
      maSoThueDoiTac: bg.khachHang?.maSoThue ?? '',
      diaChiDoiTac: bg.khachHang?.diaChi ?? '',
      baoGiaId: bg.id,
      tyLeVAT: so(bg.tyLeVAT),
      chietKhau: chietKhauRaApp(bg.kieuChietKhau, bg.giaTriChietKhau),
      ghiChu: `Theo báo giá ${bg.soBaoGia}`,
      // Dòng tiêu đề phần (I, II…) không lên hoá đơn
      danhSachDong: bg.danhSachDong
        .filter((d) => d.loai === 'hang')
        .map((d) => ({
          id: d.id,
          tenHang: [d.tenHangMuc, d.quyCach].filter(Boolean).join(' – '),
          donViTinh: d.donViTinh,
          soLuong: so(d.soLuong),
          donGia: so(d.donGia),
        })),
    };
    res.json(nhap);
  }),
);

/** Thuế GTGT trong kỳ: đầu ra, đầu vào, phải nộp (tham khảo) */
tuyenHoaDon.get(
  '/thue-gtgt',
  boc(async (req, res) => {
    const { tu, den } = khoangNgay(req.query);
    const ds = await dsTomTatHoaDon({ ngayHoaDon: { gte: tu, lt: den }, trangThai: 'hieuLuc' });
    const cong = (loai: string) => {
      const l = ds.filter((h) => h.loai === loai);
      return { soHoaDon: l.length, tienTruocThue: l.reduce((s, h) => s + h.tienTruocThue, 0), tienThue: l.reduce((s, h) => s + h.tienThue, 0) };
    };
    const dauRa = cong('banRa');
    const dauVao = cong('muaVao');
    res.json({ dauRa, dauVao, phaiNop: dauRa.tienThue - dauVao.tienThue });
  }),
);

