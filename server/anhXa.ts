/**
 * Chuyển đổi qua lại giữa bản ghi Prisma và kiểu dữ liệu của ứng dụng (src/db/kieu.ts).
 * - Decimal → number; ngày @db.Date → "YYYY-MM-DD"; DateTime → mili-giây.
 * - Dữ liệu từ trình duyệt được làm sạch trước khi ghi (chuỗi, số, giá trị enum hợp lệ).
 */
import { Prisma } from './generated/prisma/client';
import type {
  CotHangMuc,
  AnhDinhKem,
  BaoGia,
  BienBanNghiemThu,
  CaiDat,
  ChietKhau,
  DongHangMuc,
  DongNghiemThu,
  HangMuc,
  KhachHang,
  NguoiDaiDien,
  TomTatBaoGia,
  TomTatNghiemThu,
} from '../src/db/kieu';
import { CAI_DAT_TRONG } from '../src/db/macDinh';
import { laTruongXuong } from '../src/lib/hienThiXuong';
import { chuanHoaGiaTriCotThem } from '../src/lib/cotHangMuc';
import { demHangMuc } from '../src/lib/phanMuc';
import { tongBaoGia, tongNghiemThu } from '../src/lib/tinhTien';

/* ---------- Tiện ích ---------- */

export const so = (d: Prisma.Decimal | number | null | undefined) => (d == null ? 0 : Number(d));
export const ngayRaChuoi = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

export const chuoi = (x: unknown, macDinh = ''): string => (x == null ? macDinh : String(x));
const soHuuHan = (x: unknown, macDinh = 0): number => {
  const n = Number(x);
  return Number.isFinite(n) ? n : macDinh;
};
/** Số trong khoảng [min, max], làm tròn `soLe` chữ số thập phân — giới hạn theo kiểu cột DB để không lỗi tràn số */
export const soTrongKhoang = (x: unknown, min: number, max: number, soLe: number, macDinh = min): number => {
  const k = 10 ** soLe;
  return Math.round(Math.min(max, Math.max(min, soHuuHan(x, macDinh))) * k) / k;
};
/** Giới hạn theo kiểu cột: Decimal(15,0) tiền, Decimal(14,3) số lượng, Decimal(5,2) phần trăm, Decimal(15,2) chiết khấu */
const TIEN_TOI_DA = 999_999_999_999_999;
const SO_LUONG_TOI_DA = 99_999_999_999.999;
const CHIET_KHAU_TIEN_TOI_DA = 9_999_999_999_999.99;
const SO_NGAY_TOI_DA = 3650;
export const tien = (x: unknown) => soTrongKhoang(x, 0, TIEN_TOI_DA, 0);
export const soLuong = (x: unknown) => soTrongKhoang(x, 0, SO_LUONG_TOI_DA, 3);
export const phanTram = (x: unknown, macDinh = 0) => soTrongKhoang(x, 0, 100, 2, macDinh);
const soNgay = (x: unknown, macDinh: number) => soTrongKhoang(x, 0, SO_NGAY_TOI_DA, 0, macDinh);
/** Danh sách chữ trong cài đặt: bỏ trống, bỏ trùng, giới hạn số mục và độ dài */
const dsChu = (x: unknown): string[] =>
  Array.isArray(x)
    ? [...new Set(x.filter((v): v is string => typeof v === 'string').map((v) => v.trim().slice(0, 40)).filter(Boolean))].slice(0, 50)
    : [];
/** Các mức VAT: 0–100%, bỏ trùng, xếp tăng dần */
const dsPhanTram = (x: unknown): number[] =>
  Array.isArray(x)
    ? [...new Set(x.filter((v) => v !== '' && v != null && Number.isFinite(Number(v))).map((v) => phanTram(v)))]
        .sort((a, b) => a - b)
        .slice(0, 20)
    : [];
/** "2026-10-01" → Date UTC 00:00 (cột @db.Date) */
export function chuoiRaNgay(s: unknown): Date | null {
  const t = chuoi(s);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
export function trongDanhSach<T extends string>(x: unknown, hopLe: readonly T[], macDinh: T): T {
  return hopLe.includes(x as T) ? (x as T) : macDinh;
}
export const chietKhauRaApp = (kieu: string, giaTri: Prisma.Decimal): ChietKhau => ({
  kieu: kieu as ChietKhau['kieu'],
  giaTri: so(giaTri),
});
const nguoiDaiDien = (x: unknown): NguoiDaiDien[] =>
  Array.isArray(x) ? x.map((n) => ({ hoTen: chuoi(n?.hoTen), chucVu: chuoi(n?.chucVu) })) : [];

/* ---------- Khách hàng ---------- */

export function khachHangRaApp(k: Prisma.KhachHangGetPayload<object>): KhachHang {
  return { ...k, ngayTao: k.ngayTao.getTime() };
}
export function khachHangVaoDB(k: Partial<KhachHang>) {
  return {
    tenCongTy: chuoi(k.tenCongTy).trim(),
    diaChi: chuoi(k.diaChi),
    maSoThue: chuoi(k.maSoThue),
    nguoiLienHe: chuoi(k.nguoiLienHe),
    chucVu: chuoi(k.chucVu),
    soDienThoai: chuoi(k.soDienThoai),
    email: chuoi(k.email),
    ghiChu: chuoi(k.ghiChu),
  };
}

/* ---------- Hạng mục ---------- */

export function hangMucRaApp(h: Prisma.HangMucGetPayload<object>): HangMuc {
  return { ...h, donGiaMacDinh: so(h.donGiaMacDinh) };
}
export function hangMucVaoDB(h: Partial<HangMuc>) {
  return {
    ten: chuoi(h.ten).trim(),
    // Để trống → undefined: tạo mới thì DB lấy @default, cập nhật thì giữ giá trị cũ
    donViTinh: chuoi(h.donViTinh).trim() || undefined,
    donGiaMacDinh: tien(h.donGiaMacDinh),
    nhom: chuoi(h.nhom).trim() || undefined,
    moTa: chuoi(h.moTa),
  };
}

/* ---------- Báo giá ---------- */

export const KEM_BAO_GIA = { danhSachDong: { orderBy: { stt: 'asc' } } } satisfies Prisma.BaoGiaInclude;
type BaoGiaDB = Prisma.BaoGiaGetPayload<{ include: typeof KEM_BAO_GIA }>;

/** Phần chung của dòng báo giá và dòng nghiệm thu */
type DongDB = Omit<Prisma.DongBaoGiaGetPayload<object>, 'baoGiaId'>;
const dongRaApp = (d: DongDB): DongHangMuc => ({
  id: d.id,
  loai: d.loai,
  tenHangMuc: d.tenHangMuc,
  chiTiet: d.chiTiet,
  quyCach: d.quyCach,
  donViTinh: d.donViTinh,
  soLuong: so(d.soLuong),
  donGia: so(d.donGia),
  ghiChu: d.ghiChu,
  cotThem: chuanHoaGiaTriCotThem(d.cotThem),
});

export function baoGiaRaApp(b: BaoGiaDB): BaoGia {
  return {
    id: b.id,
    soBaoGia: b.soBaoGia,
    ngayLap: ngayRaChuoi(b.ngayLap),
    khachHangId: b.khachHangId,
    tieuDe: b.tieuDe,
    danhSachDong: b.danhSachDong.map(dongRaApp),
    tyLeVAT: so(b.tyLeVAT),
    chietKhau: chietKhauRaApp(b.kieuChietKhau, b.giaTriChietKhau),
    thoiGianGiaoHang: b.thoiGianGiaoHang,
    hieuLucBaoGia: b.hieuLucBaoGia,
    dieuKhoanThanhToan: b.dieuKhoanThanhToan,
    ghiChu: b.ghiChu,
    trangThai: b.trangThai,
    ngayTao: b.ngayTao.getTime(),
    ngaySua: b.ngaySua.getTime(),
  };
}

/** Dòng chi tiết: chỉ giữ chuỗi (kể cả dòng trống đang gõ dở), tối đa 50 dòng × 500 ký tự */
const chiTietVaoDB = (x: unknown): string[] =>
  Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string').slice(0, 50).map((v) => v.slice(0, 500)) : [];

/** Dòng phần (I, II…) chỉ có tên — số lượng, tiền, chi tiết luôn rỗng để không lọt vào tổng */
const dongVaoDB = (d: Partial<DongHangMuc>, stt: number) => {
  const laPhan = d.loai === 'phan';
  return {
    id: chuoi(d.id) || undefined,
    stt,
    loai: laPhan ? ('phan' as const) : ('hang' as const),
    tenHangMuc: chuoi(d.tenHangMuc),
    chiTiet: laPhan ? [] : chiTietVaoDB(d.chiTiet),
    quyCach: laPhan ? '' : chuoi(d.quyCach),
    donViTinh: laPhan ? '' : chuoi(d.donViTinh),
    soLuong: laPhan ? 0 : soLuong(d.soLuong),
    donGia: laPhan ? 0 : tien(d.donGia),
    ghiChu: chuoi(d.ghiChu),
    cotThem: chuanHoaGiaTriCotThem(d.cotThem),
  };
};

/** Chiết khấu: theo % thì 0–100, theo số tiền thì không âm và vừa cột Decimal(15,2) */
export function chietKhauVaoDB(ck: Partial<ChietKhau> | undefined) {
  const kieuChietKhau = trongDanhSach(ck?.kieu, ['phanTram', 'soTien'] as const, 'phanTram');
  return {
    kieuChietKhau,
    giaTriChietKhau:
      kieuChietKhau === 'phanTram' ? phanTram(ck?.giaTri) : soTrongKhoang(ck?.giaTri, 0, CHIET_KHAU_TIEN_TOI_DA, 2),
  };
}

/** Các cột của bảng bao_gia (không gồm id, số, dòng) */
export function baoGiaVaoDB(b: Partial<BaoGia>) {
  return {
    ngayLap: chuoiRaNgay(b.ngayLap) ?? new Date(),
    tieuDe: chuoi(b.tieuDe),
    tyLeVAT: phanTram(b.tyLeVAT),
    ...chietKhauVaoDB(b.chietKhau),
    thoiGianGiaoHang: chuoi(b.thoiGianGiaoHang),
    hieuLucBaoGia: soNgay(b.hieuLucBaoGia, CAI_DAT_TRONG.hieuLucMacDinh),
    dieuKhoanThanhToan: chuoi(b.dieuKhoanThanhToan),
    ghiChu: chuoi(b.ghiChu),
    trangThai: trongDanhSach(b.trangThai, ['nhap', 'daGui', 'daChot', 'huy'] as const, 'nhap'),
  };
}
export const dongBaoGiaVaoDB = (ds: unknown) =>
  (Array.isArray(ds) ? ds : []).map((d, i) => dongVaoDB(d, i + 1));

/** Các cột cần cho danh sách báo giá (không lấy tên, chi tiết… của dòng) */
export const CHON_TOM_TAT_BAO_GIA = {
  id: true,
  soBaoGia: true,
  ngayLap: true,
  khachHangId: true,
  tieuDe: true,
  trangThai: true,
  tyLeVAT: true,
  kieuChietKhau: true,
  giaTriChietKhau: true,
  danhSachDong: { select: { loai: true, soLuong: true, donGia: true } },
} satisfies Prisma.BaoGiaSelect;

export function tomTatBaoGiaRaApp(b: Prisma.BaoGiaGetPayload<{ select: typeof CHON_TOM_TAT_BAO_GIA }>): TomTatBaoGia {
  const danhSachDong = b.danhSachDong.map((d) => ({ loai: d.loai, soLuong: so(d.soLuong), donGia: so(d.donGia) }));
  const chietKhau = chietKhauRaApp(b.kieuChietKhau, b.giaTriChietKhau);
  return {
    id: b.id,
    so: b.soBaoGia,
    ngay: ngayRaChuoi(b.ngayLap),
    khachHangId: b.khachHangId,
    tieuDe: b.tieuDe,
    trangThai: b.trangThai,
    soHangMuc: demHangMuc(danhSachDong),
    tong: tongBaoGia({ danhSachDong, chietKhau, tyLeVAT: so(b.tyLeVAT) }).tongThanhToan,
  };
}

/* ---------- Nghiệm thu ---------- */

export const KEM_NGHIEM_THU = {
  danhSachDong: { orderBy: { stt: 'asc' } },
  _count: { select: { anhDinhKem: true } },
} satisfies Prisma.NghiemThuInclude;
type NghiemThuDB = Prisma.NghiemThuGetPayload<{ include: typeof KEM_NGHIEM_THU }>;

export function nghiemThuRaApp(n: NghiemThuDB): BienBanNghiemThu {
  return {
    id: n.id,
    soBienBan: n.soBienBan,
    baoGiaId: n.baoGiaId,
    khachHangId: n.khachHangId,
    ngayNghiemThu: ngayRaChuoi(n.ngayNghiemThu),
    diaDiem: n.diaDiem,
    canCuHopDong: n.canCuHopDong,
    ngayCanCu: ngayRaChuoi(n.ngayCanCu),
    tieuDe: n.tieuDe,
    thanhPhanBenA: nguoiDaiDien(n.thanhPhanBenA),
    thanhPhanBenB: nguoiDaiDien(n.thanhPhanBenB),
    danhSachDong: n.danhSachDong.map<DongNghiemThu>((d) => ({
      ...dongRaApp(d),
      soLuongThucTe: so(d.soLuongThucTe),
      datKhongDat: d.datKhongDat,
    })),
    tyLeVAT: so(n.tyLeVAT),
    chietKhau: chietKhauRaApp(n.kieuChietKhau, n.giaTriChietKhau),
    ketLuan: n.ketLuan,
    soAnh: n._count.anhDinhKem,
    trangThai: n.trangThai,
    ngayTao: n.ngayTao.getTime(),
    ngaySua: n.ngaySua.getTime(),
  };
}

export function nghiemThuVaoDB(n: Partial<BienBanNghiemThu>) {
  return {
    ngayNghiemThu: chuoiRaNgay(n.ngayNghiemThu) ?? new Date(),
    diaDiem: chuoi(n.diaDiem),
    canCuHopDong: chuoi(n.canCuHopDong),
    ngayCanCu: chuoiRaNgay(n.ngayCanCu),
    tieuDe: chuoi(n.tieuDe),
    thanhPhanBenA: nguoiDaiDien(n.thanhPhanBenA) as unknown as Prisma.InputJsonValue,
    thanhPhanBenB: nguoiDaiDien(n.thanhPhanBenB) as unknown as Prisma.InputJsonValue,
    tyLeVAT: phanTram(n.tyLeVAT),
    ...chietKhauVaoDB(n.chietKhau),
    ketLuan: chuoi(n.ketLuan),
    trangThai: trongDanhSach(n.trangThai, ['nhap', 'daKy', 'huy'] as const, 'nhap'),
  };
}
export const dongNghiemThuVaoDB = (ds: unknown) =>
  (Array.isArray(ds) ? ds : []).map((d: Partial<DongNghiemThu>, i) => ({
    ...dongVaoDB(d, i + 1),
    soLuongThucTe: d.loai === 'phan' ? 0 : soLuong(d.soLuongThucTe),
    datKhongDat: trongDanhSach(d.datKhongDat, ['dat', 'khongDat'] as const, 'dat'),
  }));

/** Các cột cần cho danh sách biên bản */
export const CHON_TOM_TAT_NGHIEM_THU = {
  id: true,
  soBienBan: true,
  ngayNghiemThu: true,
  khachHangId: true,
  baoGiaId: true,
  tieuDe: true,
  trangThai: true,
  tyLeVAT: true,
  kieuChietKhau: true,
  giaTriChietKhau: true,
  danhSachDong: { select: { loai: true, soLuongThucTe: true, donGia: true } },
} satisfies Prisma.NghiemThuSelect;

export function tomTatNghiemThuRaApp(
  n: Prisma.NghiemThuGetPayload<{ select: typeof CHON_TOM_TAT_NGHIEM_THU }>,
): TomTatNghiemThu {
  const danhSachDong = n.danhSachDong.map((d) => ({
    loai: d.loai,
    soLuong: 0,
    soLuongThucTe: so(d.soLuongThucTe),
    donGia: so(d.donGia),
  }));
  const chietKhau = chietKhauRaApp(n.kieuChietKhau, n.giaTriChietKhau);
  return {
    id: n.id,
    so: n.soBienBan,
    ngay: ngayRaChuoi(n.ngayNghiemThu),
    khachHangId: n.khachHangId,
    baoGiaId: n.baoGiaId,
    tieuDe: n.tieuDe,
    trangThai: n.trangThai,
    soHangMuc: demHangMuc(danhSachDong),
    tong: tongNghiemThu({ danhSachDong, chietKhau, tyLeVAT: so(n.tyLeVAT) }).tongThanhToan,
  };
}

/* ---------- Ảnh ---------- */

export const anhRaApp = (a: Prisma.AnhNghiemThuGetPayload<object>): AnhDinhKem => ({ ...a });

/* ---------- Cài đặt ---------- */

export function caiDatRaApp(c: Prisma.CaiDatGetPayload<object> | null): CaiDat {
  if (!c) return { ...CAI_DAT_TRONG };
  return {
    ...CAI_DAT_TRONG,
    ...c,
    id: 'caiDat',
    vatMacDinh: so(c.vatMacDinh),
    truongAn: c.truongAn.filter(laTruongXuong),
    luaChonVAT: c.luaChonVAT.map(so),
    lanSaoLuuCuoi: c.lanSaoLuuCuoi ? c.lanSaoLuuCuoi.getTime() : null,
  };
}

/** Chỉ nhận các trường có trong cài đặt; trường không gửi lên thì giữ nguyên. */
export function caiDatVaoDB(c: Partial<CaiDat>) {
  const d = { ...CAI_DAT_TRONG, ...c };
  return {
    tenDonVi: chuoi(d.tenDonVi),
    diaChi: chuoi(d.diaChi),
    maSoThue: chuoi(d.maSoThue),
    dienThoai: chuoi(d.dienThoai),
    email: chuoi(d.email),
    soTaiKhoan: chuoi(d.soTaiKhoan),
    nganHang: chuoi(d.nganHang),
    chiNhanh: chuoi(d.chiNhanh),
    chuTaiKhoan: chuoi(d.chuTaiKhoan),
    nguoiDaiDien: chuoi(d.nguoiDaiDien),
    chucVu: chuoi(d.chucVu),
    logo: chuoi(d.logo),
    vatMacDinh: phanTram(d.vatMacDinh, CAI_DAT_TRONG.vatMacDinh),
    hieuLucMacDinh: soNgay(d.hieuLucMacDinh, CAI_DAT_TRONG.hieuLucMacDinh),
    thoiGianGiaoHangMacDinh: chuoi(d.thoiGianGiaoHangMacDinh),
    dieuKhoanThanhToanMacDinh: chuoi(d.dieuKhoanThanhToanMacDinh),
    ketLuanMacDinh: chuoi(d.ketLuanMacDinh),
    diaDiemNghiemThuMacDinh: chuoi(d.diaDiemNghiemThuMacDinh),
    tienToBaoGia: chuoi(d.tienToBaoGia).trim() || CAI_DAT_TRONG.tienToBaoGia,
    tienToNghiemThu: chuoi(d.tienToNghiemThu).trim() || CAI_DAT_TRONG.tienToNghiemThu,
    soChuSo: soTrongKhoang(d.soChuSo, 1, 6, 0, CAI_DAT_TRONG.soChuSo),
    docSoTu: Boolean(d.docSoTu),
    truongAn: (Array.isArray(d.truongAn) ? d.truongAn : []).filter(laTruongXuong),
    danhSachDonViTinh: dsChu(d.danhSachDonViTinh),
    nhomHangMuc: dsChu(d.nhomHangMuc),
    luaChonVAT: dsPhanTram(d.luaChonVAT),
    lanSaoLuuCuoi: d.lanSaoLuuCuoi ? new Date(d.lanSaoLuuCuoi) : null,
    tienToPhieuThu: chuoi(d.tienToPhieuThu).trim() || CAI_DAT_TRONG.tienToPhieuThu,
    tienToPhieuChi: chuoi(d.tienToPhieuChi).trim() || CAI_DAT_TRONG.tienToPhieuChi,
    tienToPhieuNhap: chuoi(d.tienToPhieuNhap).trim() || CAI_DAT_TRONG.tienToPhieuNhap,
    tienToPhieuXuat: chuoi(d.tienToPhieuXuat).trim() || CAI_DAT_TRONG.tienToPhieuXuat,
    danhMucThu: dsChu(d.danhMucThu),
    danhMucChi: dsChu(d.danhMucChi),
    nhomVatTu: dsChu(d.nhomVatTu),
    ngayNghiTuan: (Array.isArray(d.ngayNghiTuan) ? [...new Set(d.ngayNghiTuan.map(Number))] : []).filter(
      (n) => Number.isInteger(n) && n >= 0 && n <= 6,
    ),
  };
}

/* ---------- Cột bảng hạng mục ---------- */

export const cotRaApp = (c: Prisma.CotHangMucGetPayload<object>): CotHangMuc => ({ ...c });

/** Các cột ghi vào DB (đã qua chuanHoaDsCot); thứ tự theo vị trí trong danh sách */
export const cotVaoDB = (c: CotHangMuc) => ({
  truong: c.truong,
  tieuDe: c.tieuDe,
  goiY: c.goiY,
  kieu: c.kieu,
  an: c.an,
  batBuoc: c.batBuoc,
  doRong: c.doRong,
  heSoGian: c.heSoGian,
  thuTu: c.thuTu,
});
