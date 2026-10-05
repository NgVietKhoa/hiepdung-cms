/**
 * Xuất báo giá / biên bản nghiệm thu ra Excel (.xlsx). Thành tiền và các dòng tổng là công thức thật
 * (ROUND / SUM / MIN, cùng cách làm tròn như ứng dụng) nên sửa số lượng, đơn giá trong Excel là tổng tự tính lại.
 * Thư viện exceljs chỉ tải khi bấm "Excel" lần đầu.
 */
import type { Workbook, Worksheet } from 'exceljs';
import type { BaoGia, BienBanNghiemThu, CaiDat, ChietKhau, DongHangMuc, KhachHang, NguoiDaiDien } from '../db/kieu';
import { dinhDangNgay, ngayThangNam } from '../lib/dinhDang';
import { docTienBangChu } from '../lib/docSo';
import { caiDatHienThi } from '../lib/hienThiXuong';
import { danhSo } from '../lib/phanMuc';
import { thanhTienBaoGia, thanhTienNghiemThu, tongBaoGia, tongNghiemThu } from '../lib/tinhTien';
import { NEN_PHAN } from './mauChung';
import {
  CAU_CHAO_BAO_GIA,
  CAU_KET_BAO_GIA,
  CAU_KET_NGHIEM_THU,
  CHAM,
  type DongTong,
  cacDongTongBaoGia,
  cacDongTongNghiemThu,
  canCuNghiemThu,
  dieuKhoanBaoGia,
  dongCoNoiDung,
  nguoiLienHe,
  tenKemGhiChu,
} from './noiDung';

type ExcelJS = typeof import('exceljs');
let excelDangTai: Promise<ExcelJS> | null = null;
const layExcel = () =>
  (excelDangTai ??= import('exceljs').then((m) => ((m as unknown as { default?: ExcelJS }).default ?? m) as ExcelJS));

const LOAI_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const SO_TIEN = '#,##0';
const VIEN = { style: 'thin', color: { argb: 'FF444444' } } as const;
const KE_O = { top: VIEN, left: VIEN, bottom: VIEN, right: VIEN };
const FONT = 'Times New Roman';

/** Định dạng số lượng: số nguyên không có phần thập phân, số lẻ giữ tối đa 3 chữ số */
const dangSoLuong = (n: number) => (Number.isInteger(n) ? '#,##0' : '#,##0.###');

/** Ghi tuần tự từng dòng lên trang tính; `soCot` là số cột của bảng hạng mục (các dòng chữ gộp hết bề ngang) */
function taoBut(ws: Worksheet, soCot: number, rongCot: number[]) {
  let r = 1;
  const kyTuMoiDong = rongCot.reduce((a, b) => a + b, 0) * 1.1;

  /** Chữ gộp cả hàng; tự tăng chiều cao nếu dài phải xuống dòng */
  const dong = (
    text: string,
    k: { dam?: boolean; nghieng?: boolean; co?: number; canh?: 'left' | 'center' | 'right' | 'justify'; mau?: string; gachChan?: boolean; cach?: number } = {},
  ) => {
    r += k.cach ?? 0;
    const o = ws.getCell(r, 1);
    o.value = text;
    ws.mergeCells(r, 1, r, soCot);
    o.font = { name: FONT, size: k.co ?? 12, bold: k.dam, italic: k.nghieng, underline: k.gachChan, color: k.mau ? { argb: k.mau } : undefined };
    o.alignment = { horizontal: k.canh ?? 'left', vertical: 'middle', wrapText: true };
    const soDong = text.split('\n').reduce((t, x) => t + Math.max(1, Math.ceil(x.length / kyTuMoiDong)), 0);
    if (soDong > 1) ws.getRow(r).height = 16 * soDong;
    return r++;
  };
  const trong = () => r++;
  const hienTai = () => r;
  const tang = () => r++;
  return { dong, trong, hienTai, tang };
}

function oBang(ws: Worksheet, r: number, c: number, giaTri: unknown, k: { dam?: boolean; canh?: 'left' | 'center' | 'right'; dinhDang?: string; nen?: string } = {}) {
  const o = ws.getCell(r, c);
  o.value = giaTri as never;
  o.font = { name: FONT, size: 11, bold: k.dam };
  o.alignment = { horizontal: k.canh ?? 'left', vertical: 'middle', wrapText: true };
  o.border = KE_O;
  if (k.dinhDang) o.numFmt = k.dinhDang;
  if (k.nen) o.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: k.nen } };
  return o;
}

/** Chiều cao hàng vừa đủ cho chữ trong ô tên (xuống dòng ở "\n" và khi dài quá `kyTuMoiDong` ký tự) */
function caoVuaChu(ws: Worksheet, r: number, chu: string, kyTuMoiDong: number) {
  const soDong = chu.split('\n').reduce((t, x) => t + Math.max(1, Math.ceil(x.length / kyTuMoiDong)), 0);
  if (soDong > 1) ws.getRow(r).height = 15 * soDong + 2;
}

/**
 * Ghi các dòng bảng hạng mục từ hàng `rDong1`. Dòng phần (I, II…): số La Mã + tên gộp hết các cột còn lại.
 * Hạng mục ghi bằng `ghiHang`. Trả về dải ô thành tiền của các hạng mục (vd. "G12:G14,G16:G18") cho dòng "Cộng".
 */
function ghiCacDong<D extends DongHangMuc>(
  ws: Worksheet,
  rDong1: number,
  ds: D[],
  tien: (d: D) => number,
  cotTien: number,
  soCot: number,
  ghiHang: (r: number, d: D, stt: string, tien: number) => void,
): string {
  const chuCot = ws.getColumn(cotTien).letter;
  const so = danhSo(ds, tien);
  const cacDai: string[] = [];
  let batDauDai = -1;
  const dongDai = (r: number) => {
    if (batDauDai >= 0 && r > batDauDai) cacDai.push(`${chuCot}${batDauDai}:${chuCot}${r - 1}`);
    batDauDai = -1;
  };
  so.forEach((x, i) => {
    const r = rDong1 + i;
    if (!x.laPhan) {
      if (batDauDai < 0) batDauDai = r;
      ghiHang(r, x.dong, x.stt, x.tien);
      return;
    }
    dongDai(r);
    const nen = `FF${NEN_PHAN.slice(1).toUpperCase()}`;
    oBang(ws, r, 1, x.stt, { dam: true, canh: 'center', nen });
    ws.mergeCells(r, 2, r, soCot);
    oBang(ws, r, 2, x.dong.tenHangMuc, { dam: true, nen });
    for (let c = 3; c <= soCot; c++) ws.getCell(r, c).border = KE_O;
  });
  dongDai(rDong1 + so.length);
  return cacDai.join(',');
}

/**
 * Các dòng tổng bằng công thức: nhãn gộp các cột trước cột tiền, số tiền ở `cotTien`.
 * `vungThanhTien`: dải ô thành tiền các hạng mục (vd. "G12:G20" hoặc "G12:G14,G16:G18"), rỗng nếu chưa có hạng mục nào.
 */
function ghiDongTong(
  ws: Worksheet,
  batDau: number,
  cacDong: DongTong[],
  cotTien: number,
  soCot: number,
  vungThanhTien: string,
  chietKhau: ChietKhau,
  tyLeVAT: number,
) {
  const chuCot = ws.getColumn(cotTien).letter;
  const viTri: Partial<Record<DongTong['loai'], string>> = {};
  cacDong.forEach((t, i) => {
    const r = batDau + i;
    viTri[t.loai] = `${chuCot}${r}`;
  });
  const cong = viTri.cong!;
  const ck = viTri.chietKhau;
  const sauCk = ck ? `(${cong}+${ck})` : cong;
  const congThuc: Record<DongTong['loai'], string> = {
    cong: vungThanhTien ? `SUM(${vungThanhTien})` : '0',
    chietKhau:
      chietKhau.kieu === 'phanTram'
        ? `-MIN(ROUND(${cong}*${chietKhau.giaTri || 0}/100,0),${cong})`
        : `-MIN(${Math.round(chietKhau.giaTri || 0)},${cong})`,
    sauChietKhau: sauCk,
    vat: `ROUND(${sauCk}*${tyLeVAT}/100,0)`,
    tong: viTri.vat ? `${sauCk}+${viTri.vat}` : sauCk,
  };
  cacDong.forEach((t, i) => {
    const r = batDau + i;
    ws.mergeCells(r, 1, r, cotTien - 1);
    oBang(ws, r, 1, t.nhan, { dam: t.dam, canh: 'right' });
    for (let c = 2; c < cotTien; c++) ws.getCell(r, c).border = KE_O;
    oBang(ws, r, cotTien, { formula: congThuc[t.loai], result: t.giaTri }, { dam: t.dam, canh: 'right', dinhDang: SO_TIEN });
    for (let c = cotTien + 1; c <= soCot; c++) oBang(ws, r, c, '');
  });
  return batDau + cacDong.length;
}

function taoSo(ExcelJS: ExcelJS, tacGia: string): Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = tacGia;
  wb.created = new Date();
  return wb;
}

function trangTinh(wb: Workbook, ten: string, rongCot: number[]) {
  const ws = wb.addWorksheet(ten, {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });
  ws.columns = rongCot.map((width) => ({ width }));
  return ws;
}

async function dongGoi(wb: Workbook): Promise<Blob> {
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: LOAI_EXCEL });
}

/* ================= Báo giá ================= */

export async function excelBaoGia(bg: BaoGia, kh: KhachHang | undefined, caiDat: CaiDat): Promise<Blob> {
  const ExcelJS = await layExcel();
  const cd = caiDatHienThi(caiDat);
  const dong = dongCoNoiDung(bg.danhSachDong);
  const tien = thanhTienBaoGia;
  const tong = tongBaoGia(bg);

  const wb = taoSo(ExcelJS, cd.tenDonVi);
  const rongCot = [6, 36, 20, 8, 10, 14, 16];
  const ws = trangTinh(wb, 'Báo giá', rongCot);
  const but = taoBut(ws, rongCot.length, rongCot);

  but.dong(cd.tenDonVi.toUpperCase(), { dam: true, co: 14, mau: 'FF0B3D6B' });
  for (const [nhan, v] of [
    ['Địa chỉ', cd.diaChi],
    ['Mã số thuế', cd.maSoThue],
    ['Điện thoại', cd.dienThoai],
    ['Email', cd.email],
  ]) {
    if (v?.trim()) but.dong(`${nhan}: ${v}`);
  }
  but.trong();
  but.dong('BẢNG BÁO GIÁ', { dam: true, co: 18, canh: 'center' });
  but.dong(`Số: ${bg.soBaoGia}   –   Ngày: ${dinhDangNgay(bg.ngayLap)}`, { nghieng: true, canh: 'center' });
  but.trong();
  but.dong(`Kính gửi: ${kh?.tenCongTy || '.......................................'}`, { dam: true });
  if (nguoiLienHe(kh)) but.dong(nguoiLienHe(kh));
  if (kh?.diaChi) but.dong(`Địa chỉ: ${kh.diaChi}`);
  if (bg.tieuDe) but.dong(`Về việc: ${bg.tieuDe}`);
  but.dong(CAU_CHAO_BAO_GIA(cd.tenDonVi), { cach: 1 });
  but.trong();

  // Bảng hạng mục
  const rDau = but.tang();
  ['STT', 'Tên hàng hoá / dịch vụ', 'Quy cách', 'ĐVT', 'Số lượng', 'Đơn giá (đ)', 'Thành tiền (đ)'].forEach((t, i) =>
    oBang(ws, rDau, i + 1, t, { dam: true, canh: 'center', nen: 'FFE8E8E8' }),
  );
  ws.getRow(rDau).height = 30;
  const rDong1 = rDau + 1;
  const vung = ghiCacDong(ws, rDong1, dong, tien, 7, 7, (r, x, stt, t) => {
    oBang(ws, r, 1, Number(stt), { canh: 'center' });
    oBang(ws, r, 2, tenKemGhiChu(x));
    oBang(ws, r, 3, x.quyCach);
    oBang(ws, r, 4, x.donViTinh, { canh: 'center' });
    oBang(ws, r, 5, x.soLuong, { canh: 'right', dinhDang: dangSoLuong(x.soLuong) });
    oBang(ws, r, 6, x.donGia, { canh: 'right', dinhDang: SO_TIEN });
    oBang(ws, r, 7, { formula: `ROUND(E${r}*F${r},0)`, result: t }, { canh: 'right', dinhDang: SO_TIEN });
    caoVuaChu(ws, r, tenKemGhiChu(x), 40);
  });
  const rSauBang = ghiDongTong(ws, rDong1 + dong.length, cacDongTongBaoGia(bg, tong), 7, 7, vung, bg.chietKhau, bg.tyLeVAT);
  while (but.hienTai() < rSauBang) but.tang();

  but.dong(`Bằng chữ: ${docTienBangChu(tong.tongThanhToan, { dungTu: cd.docSoTu })}.`, { nghieng: true, cach: 0 });
  const dieuKhoan = dieuKhoanBaoGia(bg, cd);
  if (dieuKhoan.length) {
    but.dong('ĐIỀU KHOẢN', { dam: true, cach: 1 });
    dieuKhoan.forEach((x) => but.dong(`• ${x}`));
  }
  but.dong(CAU_KET_BAO_GIA, { nghieng: true, cach: 1 });
  but.trong();
  but.dong(`ĐẠI DIỆN ${cd.tenDonVi.toUpperCase()}`, { dam: true, canh: 'right' });
  if (cd.chucVu) but.dong(cd.chucVu, { canh: 'right' });
  but.dong('(Ký, ghi rõ họ tên)', { nghieng: true, canh: 'right', co: 10 });
  but.dong(cd.nguoiDaiDien || '', { dam: true, canh: 'right', cach: 4 });

  ws.pageSetup.printTitlesRow = `${rDau}:${rDau}`;
  return dongGoi(wb);
}

/* ================= Biên bản nghiệm thu ================= */

export async function excelNghiemThu(
  nt: BienBanNghiemThu,
  kh: KhachHang | undefined,
  bg: BaoGia | undefined,
  caiDat: CaiDat,
): Promise<Blob> {
  const ExcelJS = await layExcel();
  const cd = caiDatHienThi(caiDat);
  const dong = dongCoNoiDung(nt.danhSachDong);
  const tien = thanhTienNghiemThu;
  const tong = tongNghiemThu(nt);

  const wb = taoSo(ExcelJS, cd.tenDonVi);
  const rongCot = [6, 32, 18, 8, 10, 10, 13, 15, 11];
  const ws = trangTinh(wb, 'Nghiệm thu', rongCot);
  const but = taoBut(ws, rongCot.length, rongCot);

  but.dong('CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM', { dam: true, canh: 'center' });
  but.dong('Độc lập – Tự do – Hạnh phúc', { dam: true, canh: 'center', gachChan: true });
  but.dong(cd.tenDonVi.toUpperCase(), { dam: true, canh: 'left', co: 11, cach: 1 });
  but.dong('BIÊN BẢN NGHIỆM THU', { dam: true, co: 18, canh: 'center', cach: 1 });
  if (nt.tieuDe) but.dong(`(V/v: ${nt.tieuDe})`, { canh: 'center' });
  but.dong(`Số: ${nt.soBienBan}`, { nghieng: true, canh: 'center' });
  but.trong();
  canCuNghiemThu(nt, bg).forEach((x) => but.dong(`• ${x}`));
  but.dong(`Hôm nay, ${ngayThangNam(nt.ngayNghiemThu)}, tại ${nt.diaDiem || CHAM}, chúng tôi gồm:`, { cach: 1 });

  const daiDien = (ds: NguoiDaiDien[]) => {
    const coTen = ds.filter((n) => n.hoTen.trim() || n.chucVu.trim());
    const hienThi = coTen.length ? coTen : [{ hoTen: '', chucVu: '' }];
    const ghi = (n: NguoiDaiDien, nhan: string) => but.dong(`${nhan}${n.hoTen || CHAM}     Chức vụ: ${n.chucVu || '....................'}`);
    if (hienThi.length === 1) return ghi(hienThi[0], '- Đại diện: Ông/Bà ');
    but.dong('- Đại diện gồm:');
    hienThi.forEach((n) => ghi(n, '   + Ông/Bà '));
  };
  const mstDt = (mst?: string, dt?: string) => {
    const phan = [mst?.trim() && `Mã số thuế: ${mst}`, dt?.trim() && `Điện thoại: ${dt}`].filter(Boolean);
    if (phan.length) but.dong(`- ${phan.join('     ')}`);
  };

  but.dong(`BÊN A (Bên giao việc): ${(kh?.tenCongTy || CHAM).toUpperCase()}`, { dam: true, cach: 1 });
  if (kh?.diaChi) but.dong(`- Địa chỉ: ${kh.diaChi}`);
  mstDt(kh?.maSoThue, kh?.soDienThoai);
  daiDien(nt.thanhPhanBenA);
  but.dong(`BÊN B (Bên nhận việc): ${cd.tenDonVi.toUpperCase()}`, { dam: true, cach: 1 });
  if (cd.diaChi) but.dong(`- Địa chỉ: ${cd.diaChi}`);
  mstDt(cd.maSoThue, cd.dienThoai);
  daiDien(nt.thanhPhanBenB);
  but.dong('Hai bên cùng tiến hành nghiệm thu khối lượng công việc như sau:', { cach: 1 });
  but.trong();

  const rDau = but.tang();
  ['STT', 'Hạng mục', 'Quy cách', 'ĐVT', 'SL theo báo giá', 'SL thực tế', 'Đơn giá (đ)', 'Thành tiền (đ)', 'Đánh giá'].forEach((t, i) =>
    oBang(ws, rDau, i + 1, t, { dam: true, canh: 'center', nen: 'FFE8E8E8' }),
  );
  ws.getRow(rDau).height = 30;
  const rDong1 = rDau + 1;
  const vung = ghiCacDong(ws, rDong1, dong, tien, 8, 9, (r, x, stt, t) => {
    oBang(ws, r, 1, Number(stt), { canh: 'center' });
    oBang(ws, r, 2, tenKemGhiChu(x));
    oBang(ws, r, 3, x.quyCach);
    oBang(ws, r, 4, x.donViTinh, { canh: 'center' });
    oBang(ws, r, 5, x.soLuong, { canh: 'right', dinhDang: dangSoLuong(x.soLuong) });
    oBang(ws, r, 6, x.soLuongThucTe, { canh: 'right', dinhDang: dangSoLuong(x.soLuongThucTe), dam: x.soLuongThucTe !== x.soLuong });
    oBang(ws, r, 7, x.donGia, { canh: 'right', dinhDang: SO_TIEN });
    oBang(ws, r, 8, { formula: `ROUND(F${r}*G${r},0)`, result: t }, { canh: 'right', dinhDang: SO_TIEN });
    oBang(ws, r, 9, x.datKhongDat === 'dat' ? 'Đạt' : 'Không đạt', { canh: 'center' });
    caoVuaChu(ws, r, tenKemGhiChu(x), 36);
  });
  const rSauBang = ghiDongTong(ws, rDong1 + dong.length, cacDongTongNghiemThu(nt, tong), 8, 9, vung, nt.chietKhau, nt.tyLeVAT);
  while (but.hienTai() < rSauBang) but.tang();

  but.dong(`Bằng chữ: ${docTienBangChu(tong.tongThanhToan, { dungTu: cd.docSoTu })}.`, { nghieng: true });
  but.dong('KẾT LUẬN:', { dam: true, cach: 1 });
  but.dong(nt.ketLuan || CHAM, { canh: 'justify' });
  but.dong(CAU_KET_NGHIEM_THU, { cach: 1 });
  but.trong();

  // Chữ ký hai bên: Bên A ở nửa trái (cột A–C), Bên B ở nửa phải (cột F–I)
  const kyHaiBen = (trai: string, phai: string, k: { dam?: boolean; nghieng?: boolean; co?: number } = {}) => {
    const r = but.tang();
    for (const [c1, c2, text] of [[1, 3, trai], [6, 9, phai]] as const) {
      ws.mergeCells(r, c1, r, c2);
      const o = ws.getCell(r, c1);
      o.value = text;
      o.font = { name: FONT, size: k.co ?? 12, bold: k.dam, italic: k.nghieng };
      o.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  };
  kyHaiBen('ĐẠI DIỆN BÊN A', 'ĐẠI DIỆN BÊN B', { dam: true });
  kyHaiBen('(Ký, ghi rõ họ tên)', '(Ký, ghi rõ họ tên)', { nghieng: true, co: 10 });
  but.trong();
  but.trong();
  but.trong();
  kyHaiBen(nt.thanhPhanBenA[0]?.hoTen ?? '', nt.thanhPhanBenB[0]?.hoTen ?? '', { dam: true });

  ws.pageSetup.printTitlesRow = `${rDau}:${rDau}`;
  return dongGoi(wb);
}
