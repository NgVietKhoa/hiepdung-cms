/** Xuất bảng chấm công và bảng lương tháng ra Excel. Thư viện exceljs chỉ tải khi bấm nút lần đầu. */
import type { Worksheet } from 'exceljs';
import type { CaiDat } from '../../db/kieu';
import { taiFile } from '../../pdf/xuat';
import { cacNgayTrongThang, TEN_THU_NGAN, tenThang, thuCuaNgay } from '../../lib/thang';
import type { BangCong, DongLuong } from './kieu';
import { tinhLuong } from './tinhLuong';

type ExcelJS = typeof import('exceljs');
let excelDangTai: Promise<ExcelJS> | null = null;
const layExcel = () =>
  (excelDangTai ??= import('exceljs').then((m) => ((m as unknown as { default?: ExcelJS }).default ?? m) as ExcelJS));

const LOAI_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const FONT = 'Times New Roman';
const VIEN = { style: 'thin', color: { argb: 'FF666666' } } as const;
const KE_O = { top: VIEN, left: VIEN, bottom: VIEN, right: VIEN };
const SO_TIEN = '#,##0';
const SO_LE = '#,##0.##';

const argb = (mau: string) => `FF${mau.replace('#', '').toUpperCase()}`;

/** Tiêu đề: tên xưởng, tên bảng, tháng — gộp hết bề ngang */
function dauTrang(ws: Worksheet, soCot: number, cd: CaiDat, tieuDe: string, thang: string) {
  const dong = (r: number, chu: string, co: number, dam = false) => {
    ws.mergeCells(r, 1, r, soCot);
    const o = ws.getCell(r, 1);
    o.value = chu;
    o.font = { name: FONT, size: co, bold: dam };
    o.alignment = { horizontal: r === 1 ? 'left' : 'center', vertical: 'middle' };
  };
  dong(1, cd.tenDonVi, 11, true);
  dong(2, tieuDe, 15, true);
  dong(3, tenThang(thang), 11);
  ws.getRow(2).height = 24;
}

function keBang(ws: Worksheet, tuDong: number, denDong: number, soCot: number) {
  for (let r = tuDong; r <= denDong; r++) {
    for (let c = 1; c <= soCot; c++) {
      const o = ws.getCell(r, c);
      o.border = KE_O;
      o.font = { name: FONT, size: 10, ...(o.font ?? {}) };
    }
  }
}

async function ghiFile(wb: import('exceljs').Workbook, tenFile: string) {
  const buf = await wb.xlsx.writeBuffer();
  taiFile(new Blob([buf], { type: LOAI_EXCEL }), tenFile);
}

export async function xuatBangCongExcel(bang: BangCong, cd: CaiDat): Promise<void> {
  const ExcelJS = await layExcel();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Chấm công', { pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const ngay = cacNgayTrongThang(bang.thang);
  const loai = new Map(bang.loaiCong.map((l) => [l.id, l]));
  const soCot = 2 + ngay.length + 2 + bang.loaiCong.length;
  dauTrang(ws, soCot, cd, 'BẢNG CHẤM CÔNG', bang.thang);

  // Dòng đầu bảng: STT, Họ tên, ngày 1..n (kèm thứ), Công, TC, số ngày theo từng ký hiệu
  const R0 = 5;
  const dau = ['STT', 'Họ và tên', ...ngay.map((d) => `${Number(d.slice(8))}\n${TEN_THU_NGAN[thuCuaNgay(d)]}`), 'Số công', 'Giờ TC', ...bang.loaiCong.map((l) => l.kyHieu)];
  ws.getRow(R0).values = dau;
  ws.getRow(R0).height = 30;
  ws.getRow(R0).eachCell((o) => {
    o.font = { name: FONT, size: 10, bold: true };
    o.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    o.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF2F6' } };
  });
  ngay.forEach((d, i) => {
    if (cd.ngayNghiTuan.includes(thuCuaNgay(d))) ws.getCell(R0, 3 + i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE2E0' } };
  });

  bang.nhanVien.forEach((nv, i) => {
    const r = R0 + 1 + i;
    const oCuaNv = bang.o.filter((x) => x.nhanVienId === nv.id);
    const theoNgay = new Map(oCuaNv.map((x) => [x.ngay, x]));
    const l = tinhLuong(nv, oCuaNv, bang.loaiCong);
    ws.getRow(r).values = [
      i + 1,
      nv.hoTen,
      ...ngay.map((d) => {
        const x = theoNgay.get(d);
        const kh = x?.loaiCongId ? (loai.get(x.loaiCongId)?.kyHieu ?? '') : '';
        return x?.gioTangCa ? `${kh}+${x.gioTangCa}` : kh;
      }),
      l.soCong,
      l.gioTangCa,
      ...bang.loaiCong.map((lc) => l.soNgayTheoLoai[lc.id] ?? 0),
    ];
    ngay.forEach((d, j) => {
      const o = ws.getCell(r, 3 + j);
      o.alignment = { horizontal: 'center' };
      const x = theoNgay.get(d);
      const mau = x?.loaiCongId ? loai.get(x.loaiCongId)?.mau : '';
      if (mau) o.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(mau) } };
      if (x?.ghiChu) o.note = x.ghiChu;
    });
    for (let c = 3 + ngay.length; c <= soCot; c++) ws.getCell(r, c).numFmt = SO_LE;
  });
  const cuoi = R0 + bang.nhanVien.length;
  keBang(ws, R0, cuoi, soCot);
  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 24;
  for (let c = 3; c < 3 + ngay.length; c++) ws.getColumn(c).width = 4.6;
  for (let c = 3 + ngay.length; c <= soCot; c++) ws.getColumn(c).width = 8;
  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: R0 }];

  const chuGiai = bang.loaiCong.map((l) => `${l.kyHieu}: ${l.ten} (${l.heSo} công)`).join('   ·   ');
  ws.mergeCells(cuoi + 2, 1, cuoi + 2, soCot);
  ws.getCell(cuoi + 2, 1).value = `Ký hiệu — ${chuGiai}   ·   +n: số giờ tăng ca`;
  ws.getCell(cuoi + 2, 1).font = { name: FONT, size: 10, italic: true };

  await ghiFile(wb, `ChamCong_${bang.thang}.xlsx`);
}

export async function xuatBangLuongExcel(thang: string, ds: DongLuong[], cd: CaiDat): Promise<void> {
  const ExcelJS = await layExcel();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Bảng lương', { pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const cot = ['STT', 'Họ và tên', 'Chức vụ', 'Số công', 'Lương/công', 'Tiền công', 'Giờ TC', 'Tiền/giờ TC', 'Tiền TC', 'Phụ cấp', 'Tạm ứng', 'Thực lĩnh', 'Số TK', 'Ngân hàng', 'Ký nhận'];
  const soCot = cot.length;
  dauTrang(ws, soCot, cd, 'BẢNG THANH TOÁN LƯƠNG', thang);
  const R0 = 5;
  ws.getRow(R0).values = cot;
  ws.getRow(R0).height = 30;
  ws.getRow(R0).eachCell((o) => {
    o.font = { name: FONT, size: 10, bold: true };
    o.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    o.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF2F6' } };
  });
  ds.forEach((l, i) => {
    const r = R0 + 1 + i;
    // Các cột tiền là công thức để sửa số công / tạm ứng trong Excel là tự tính lại
    ws.getRow(r).values = [i + 1, l.hoTen, l.chucVu, l.soCong, l.luongNgay, null, l.gioTangCa, l.luongGioTangCa, null, l.phuCap, l.tamUng, null, l.soTaiKhoan, l.nganHang, ''];
    ws.getCell(r, 6).value = { formula: `ROUND(D${r}*E${r},0)`, result: l.tienCong };
    ws.getCell(r, 9).value = { formula: `ROUND(G${r}*H${r},0)`, result: l.tienTangCa };
    ws.getCell(r, 12).value = { formula: `F${r}+I${r}+J${r}-K${r}`, result: l.thucLinh };
    ws.getCell(r, 12).font = { name: FONT, size: 10, bold: true };
    [4, 7].forEach((c) => (ws.getCell(r, c).numFmt = SO_LE));
    [5, 6, 8, 9, 10, 11, 12].forEach((c) => (ws.getCell(r, c).numFmt = SO_TIEN));
  });
  const rTong = R0 + ds.length + 1;
  ws.mergeCells(rTong, 1, rTong, 3);
  ws.getCell(rTong, 1).value = 'Tổng cộng';
  ws.getCell(rTong, 1).alignment = { horizontal: 'center' };
  for (const c of [4, 6, 7, 9, 10, 11, 12]) {
    const chu = ws.getColumn(c).letter;
    ws.getCell(rTong, c).value = ds.length ? { formula: `SUM(${chu}${R0 + 1}:${chu}${rTong - 1})` } : 0;
    ws.getCell(rTong, c).numFmt = c === 4 || c === 7 ? SO_LE : SO_TIEN;
  }
  ws.getRow(rTong).font = { name: FONT, size: 10, bold: true };
  keBang(ws, R0, rTong, soCot);
  [5, 24, 14, 8, 12, 13, 8, 11, 12, 12, 12, 14, 16, 14, 12].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: R0 }];

  const r = rTong + 2;
  ws.mergeCells(r, 1, r, 4);
  ws.mergeCells(r, 10, r, 14);
  ws.getCell(r, 1).value = 'Người lập bảng';
  ws.getCell(r, 10).value = cd.chucVu || 'Chủ xưởng';
  [1, 10].forEach((c) => {
    ws.getCell(r, c).font = { name: FONT, size: 11, bold: true };
    ws.getCell(r, c).alignment = { horizontal: 'center' };
  });

  await ghiFile(wb, `BangLuong_${thang}.xlsx`);
}
